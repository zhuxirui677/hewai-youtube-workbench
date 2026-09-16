import assert from "node:assert/strict";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

const env = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
};

const ctx = { waitUntil() {}, passThroughOnException() {} };

test("server-renders the social workbench", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), env, ctx);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>和为 YouTube 社媒工作台<\/title>/i);
  assert.match(html, /和为社媒/);
});

test("rejects OSS uploads when brand is missing", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(new Request("http://localhost/api/oss/upload?key=tests%2Ffile.json", { method: "POST", body: "{}" }), env, ctx);
  assert.equal(response.status, 400);
  const result = await response.json();
  assert.match(result.error, /必须选择品牌账号/);
});

test("rejects unknown OSS brands", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(new Request("http://localhost/api/oss/upload?brand=unknown&key=tests%2Ffile.json", { method: "POST", body: "{}" }), env, ctx);
  assert.equal(response.status, 400);
});
