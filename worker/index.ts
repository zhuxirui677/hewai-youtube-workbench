/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
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

    if (url.pathname === "/api/oss/upload") {
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
