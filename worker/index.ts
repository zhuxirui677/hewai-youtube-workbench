/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { assertVideoReady, buildRealityPrompt, reviewShot, type VideoWorkflow, type WorkflowShot } from "./ai-workflow";

interface Env {
  ASSETS: Fetcher;
  DB?: D1Database;
  BAILIAN_API_KEY?: string;
  BAILIAN_BASE_URL?: string;
  BAILIAN_TEXT_MODEL?: string;
  BAILIAN_IMAGE_MODEL?: string;
  BAILIAN_VIDEO_MODEL?: string;
  PUBLIC_TEST_ACCESS_CODE?: string;
  OSS_HEWEI_ACCESS_KEY_ID?: string;
  OSS_HEWEI_ACCESS_KEY_SECRET?: string;
  OSS_HECHENG_ACCESS_KEY_ID?: string;
  OSS_HECHENG_ACCESS_KEY_SECRET?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

type Brand = "hiitio" | "hecheng";

const OSS_TARGETS = {
  hiitio: { bucket: "ai-hewei-socialmedia", label: "HIITIO/海外账号", id: "OSS_HEWEI_ACCESS_KEY_ID", secret: "OSS_HEWEI_ACCESS_KEY_SECRET" },
  hecheng: { bucket: "ai-hecheng-socialmedia", label: "浙江和诚电气/国内账号", id: "OSS_HECHENG_ACCESS_KEY_ID", secret: "OSS_HECHENG_ACCESS_KEY_SECRET" },
} as const;

const CORS_ORIGINS = new Set(["https://zhuxirui677.github.io", "http://localhost:3000", "http://localhost:4173"]);

function corsHeaders(request?: Request) {
  const origin = request?.headers.get("origin") || "";
  return {
    "access-control-allow-origin": CORS_ORIGINS.has(origin) ? origin : "https://zhuxirui677.github.io",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,x-test-access-code",
    vary: "Origin",
  };
}

function json(data: unknown, status = 200, request?: Request) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...corsHeaders(request) } });
}

function requireAuthenticatedSiteUser(request: Request) {
  if (request.headers.get("oai-authenticated-user-id")) return null;
  return json({ error: "公开访客只能查看工作台。AI 生成、数据库写入和素材上传需要管理员登录。" }, 401, request);
}

class HttpError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hasValidTestCode(request: Request, env: Env) {
  const expected = env.PUBLIC_TEST_ACCESS_CODE || "";
  const supplied = request.headers.get("x-test-access-code") || "";
  if (!expected || !supplied) return false;
  return (await digest(expected)) === (await digest(supplied));
}

async function authorizeWorkflow(request: Request, env: Env) {
  if (request.headers.get("oai-authenticated-user-id")) return { isTestUser: false };
  if (await hasValidTestCode(request, env)) return { isTestUser: true };
  throw new HttpError("请输入有效的国内测试码；管理员也可以登录后使用完整功能。", 401);
}

async function checkAndRecordTestUsage(request: Request, env: Env, action: "create" | "storyboard" | "keyframe" | "video") {
  if (!env.DB) throw new HttpError("AI 工作流数据库尚未绑定。", 503);
  const limits = { create: 6, storyboard: 3, keyframe: 6, video: 1 } as const;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const source = `${request.headers.get("cf-connecting-ip") || "local"}|${request.headers.get("user-agent") || "unknown"}`;
  const clientHash = await digest(source);
  const state = `test_usage:${action}:${clientHash}`;
  const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM ai_video_workflows WHERE state = ? AND created_at >= ?").bind(state, since).first<{ count: number }>();
  if (Number(row?.count || 0) >= limits[action]) throw new HttpError(`该测试来源 24 小时内的${action === "storyboard" ? "脚本分镜" : action === "keyframe" ? "关键帧" : action === "video" ? "视频" : "新建任务"}额度已用完，请稍后再试或联系管理员。`, 429);
  const now = new Date().toISOString();
  await env.DB.prepare("INSERT INTO ai_video_workflows (id,title,state,payload,created_at,updated_at) VALUES (?,?,?,?,?,?)")
    .bind(`usage-${crypto.randomUUID()}`, "国内测试额度记录", state, JSON.stringify({ action }), now, now).run();
}

function workflowBase(env: Env) {
  return (env.BAILIAN_BASE_URL || "").replace(/\/$/, "");
}

async function readJson(request: Request) {
  try { return await request.json() as Record<string, any>; }
  catch { throw new Error("请求 JSON 无效。"); }
}

async function loadWorkflow(env: Env, id: string): Promise<VideoWorkflow | null> {
  if (!env.DB) throw new Error("后端尚未绑定 D1 数据库。");
  const row = await env.DB.prepare("SELECT payload FROM ai_video_workflows WHERE id = ?").bind(id).first<{ payload: string }>();
  return row ? JSON.parse(row.payload) as VideoWorkflow : null;
}

async function saveWorkflow(env: Env, workflow: VideoWorkflow) {
  if (!env.DB) throw new Error("后端尚未绑定 D1 数据库。");
  await env.DB.prepare("INSERT INTO ai_video_workflows (id,title,state,payload,created_at,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,state=excluded.state,payload=excluded.payload,updated_at=excluded.updated_at")
    .bind(workflow.id, workflow.title, workflow.state, JSON.stringify(workflow), workflow.createdAt, workflow.updatedAt).run();
}

async function bailian(env: Env, path: string, body: unknown, asyncMode = false) {
  if (!env.BAILIAN_API_KEY || !workflowBase(env)) throw new Error("百炼后端密钥或 API Host 尚未配置。");
  const response = await fetch(`${workflowBase(env)}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.BAILIAN_API_KEY}`, ...(asyncMode ? { "X-DashScope-Async": "enable" } : {}) },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(data?.message || data?.error?.message || data?.raw || `百炼接口 HTTP ${response.status}`);
  return data;
}

function parseModelJson(text: string) {
  const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(clean); } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("模型没有返回可解析的 JSON。");
    return JSON.parse(match[0]);
  }
}

async function workflowApi(request: Request, env: Env, url: URL, isTestUser: boolean) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  const parts = url.pathname.split("/").filter(Boolean);
  const id = parts[3];
  const action = parts[4];
  if (!env.DB) return json({ error: "AI 工作流数据库尚未绑定。请先创建 D1 并执行 drizzle/0001_ai_video_workflows.sql。" }, 503, request);

  if (request.method === "POST" && parts.length === 3) {
    if (isTestUser) await checkAndRecordTestUsage(request, env, "create");
    const body = await readJson(request);
    const now = new Date().toISOString();
    const workflow: VideoWorkflow = { id: crypto.randomUUID(), title: String(body.title || "非洲品牌真实性视频"), state: "fact_review", brief: body.brief || {}, shots: [], createdAt: now, updatedAt: now };
    await saveWorkflow(env, workflow);
    return json({ workflow }, 201, request);
  }

  const workflow = id ? await loadWorkflow(env, id) : null;
  if (!workflow) return json({ error: "工作流不存在。" }, 404, request);
  if (request.method === "GET" && parts.length === 4) return json({ workflow }, 200, request);

  if (request.method === "POST" && action === "storyboard") {
    if (isTestUser) await checkAndRecordTestUsage(request, env, "storyboard");
    const result = await bailian(env, "/compatible-mode/v1/chat/completions", { model: env.BAILIAN_TEXT_MODEL || "qwen3.7-plus", messages: [{ role: "system", content: "只输出严格 JSON。事实不确定时必须标记待核验，不得补写为事实。" }, { role: "user", content: buildRealityPrompt(workflow.brief) }], temperature: 0.1 });
    const parsed = parseModelJson(result?.choices?.[0]?.message?.content || "");
    workflow.title = String(parsed.title || workflow.title);
    workflow.shots = (Array.isArray(parsed.shots) ? parsed.shots : []).slice(0, 6).map((shot: any, index: number): WorkflowShot => ({ id: `shot-${index + 1}`, title: String(shot.title || `分镜 ${index + 1}`), visual: String(shot.visual || ""), narration: String(shot.narration || ""), evidence: String(shot.evidence || shot.evidence_needed || "待人工核验"), negativePrompt: String(shot.negativePrompt || "generic Africa, Chinese rural village, pristine machinery, invented text"), review: "pending" }));
    if (!workflow.shots.length) return json({ error: "模型未返回分镜。" }, 502, request);
    workflow.state = "storyboard_ready"; workflow.updatedAt = new Date().toISOString(); await saveWorkflow(env, workflow);
    return json({ workflow }, 200, request);
  }

  if (request.method === "POST" && action === "keyframe") {
    if (isTestUser) await checkAndRecordTestUsage(request, env, "keyframe");
    const body = await readJson(request); const shot = workflow.shots.find((item) => item.id === body.shotId);
    if (!shot) return json({ error: "分镜不存在。" }, 404, request);
    const result = await bailian(env, "/api/v1/services/aigc/multimodal-generation/generation", { model: env.BAILIAN_IMAGE_MODEL || "wan2.7-image", input: { messages: [{ role: "user", content: [{ text: `${shot.visual}\n真实性依据：${shot.evidence}\n排除：${shot.negativePrompt}` }] }] }, parameters: { size: "1920*1080", n: 1 } });
    shot.keyframeUrl = result?.output?.choices?.[0]?.message?.content?.find?.((item: any) => item.image)?.image || result?.output?.results?.[0]?.url || "";
    shot.keyframeTaskId = result?.output?.task_id;
    shot.review = "pending"; workflow.state = "keyframes_review"; workflow.updatedAt = new Date().toISOString(); await saveWorkflow(env, workflow);
    return json({ workflow, result }, 200, request);
  }

  if (request.method === "POST" && action === "review") {
    const body = await readJson(request);
    reviewShot(workflow, String(body.shotId || ""), body.decision === "approved" ? "approved" : "rejected", String(body.note || ""));
    await saveWorkflow(env, workflow); return json({ workflow }, 200, request);
  }

  if (request.method === "POST" && action === "video") {
    assertVideoReady(workflow);
    if (isTestUser) await checkAndRecordTestUsage(request, env, "video");
    const results = [];
    for (const shot of workflow.shots) {
      const result = await bailian(env, "/api/v1/services/aigc/video-generation/video-synthesis", { model: env.BAILIAN_VIDEO_MODEL || "wan3.0-video", input: { prompt: `${shot.visual}。保持第一帧中的人物、设备、建筑与地域细节，不添加文字、Logo 或未经证实的新物体。`, media: [{ type: "first_frame", url: shot.keyframeUrl }] }, parameters: { duration: 5, ratio: "16:9", resolution: "1080P", prompt_extend: false } }, true);
      results.push(result);
    }
    workflow.videoTaskIds = results.map((result) => result?.output?.task_id || result?.task_id).filter(Boolean);
    workflow.videoTaskId = workflow.videoTaskIds[0]; workflow.state = "video_generating"; workflow.updatedAt = new Date().toISOString(); await saveWorkflow(env, workflow);
    return json({ workflow, results }, 202, request);
  }

  return json({ error: "Unsupported workflow operation" }, 405, request);
}

function safeObjectKey(value: string) {
  const normalized = value.replace(/^\/+/, "").replace(/\.{2,}/g, ".");
  if (!normalized || normalized.length > 900 || normalized.split("/").some((part) => !part || part === "." || part === "..")) return null;
  return normalized;
}

async function hmacSha1Base64(secret: string, value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  let binary = "";
  for (const byte of new Uint8Array(signature)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function uploadToOss(request: Request, env: Env) {
  const url = new URL(request.url);
  const brand = url.searchParams.get("brand") as Brand | null;
  if (!brand || !(brand in OSS_TARGETS)) return json({ error: "必须选择品牌账号，禁止上传到未确认的桶。", allowedBrands: Object.keys(OSS_TARGETS) }, 400);
  const objectKey = safeObjectKey(url.searchParams.get("key") || "");
  if (!objectKey) return json({ error: "对象路径无效。" }, 400);
  if (!request.body) return json({ error: "没有收到文件内容。" }, 400);
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 500 * 1024 * 1024) return json({ error: "文件超过 500MB 限制。" }, 413);

  const target = OSS_TARGETS[brand];
  const accessKeyId = env[target.id];
  const accessKeySecret = env[target.secret];
  if (!accessKeyId || !accessKeySecret) return json({ error: `${target.label} OSS 凭证尚未配置。` }, 503);

  const contentType = request.headers.get("content-type") || "application/octet-stream";
  const date = new Date().toUTCString();
  const canonicalResource = `/${target.bucket}/${objectKey}`;
  const signature = await hmacSha1Base64(accessKeySecret, `PUT\n\n${contentType}\n${date}\n${canonicalResource}`);
  const publicUrl = `https://${target.bucket}.oss-cn-hangzhou.aliyuncs.com/${objectKey.split("/").map(encodeURIComponent).join("/")}`;
  const response = await fetch(publicUrl, {
    method: "PUT",
    headers: { "content-type": contentType, date, authorization: `OSS ${accessKeyId}:${signature}` },
    body: request.body,
  });
  if (!response.ok) return json({ error: "OSS 写入失败。", status: response.status, detail: await response.text() }, 502);
  return json({ ok: true, brand, brandLabel: target.label, bucket: target.bucket, objectKey, publicUrl });
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/ai/workflows")) {
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
      try {
        const auth = await authorizeWorkflow(request, env);
        return await workflowApi(request, env, url, auth.isTestUser);
      }
      catch (error) { return json({ error: error instanceof Error ? error.message : "AI 工作流请求失败。" }, error instanceof HttpError ? error.status : 400, request); }
    }

    if (url.pathname === "/api/oss/upload") {
      const unauthorized = requireAuthenticatedSiteUser(request);
      if (unauthorized) return unauthorized;
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      return uploadToOss(request, env);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
