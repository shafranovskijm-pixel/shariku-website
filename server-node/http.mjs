import { createServer } from "node:http";
import { isIP } from "node:net";
import { SalesService, conversionFeed, originAllowed, safeEqual } from "../lib/server/sales-service.mjs";

const json = (body, status) => Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
const normalizeIp = ip => ip?.startsWith("::ffff:") ? ip.slice(7) : ip;
export function clientAddress(request, env) {
  const peer = normalizeIp(request.socket.remoteAddress || "");
  const trusted = (env.SHARIKU_TRUSTED_PROXY_ADDRESSES || "").split(",").map(x => normalizeIp(x.trim())).filter(Boolean);
  const real = request.headers["x-real-ip"];
  return trusted.includes(peer) && typeof real === "string" && isIP(real) ? normalizeIp(real) : peer;
}
async function readBody(incoming) {
  let size = 0;
  const chunks = [];
  for await (const chunk of incoming) {
    size += chunk.length;
    if (size > 16384) throw new Error("BODY_TOO_LARGE");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
export function createSalesServer(store, env, options = {}) {
  const service = new SalesService(store, env, options);
  const server = createServer({ maxHeaderSize: 8192, requestTimeout: 15000, headersTimeout: 10000 }, async (incoming, outgoing) => {
    let response;
    let allowedOrigin = false;
    try {
      const pathname = new URL(incoming.url || "/", "http://receiver.internal").pathname;
      const origin = incoming.headers.origin;
      allowedOrigin = originAllowed(origin, env);
      const method = incoming.method || "GET";
      if (pathname === "/health" && method === "GET") response = json({ ok: true, ready: !!store.manager() }, 200);
      else if (pathname.startsWith("/integrations/direct/") && method === "GET") {
        const token = pathname.match(/^\/integrations\/direct\/([A-Za-z0-9_-]{32,128})\/sales\.csv$/)?.[1];
        if (!env.SHARIKU_FEED_TOKEN || !safeEqual(token, env.SHARIKU_FEED_TOKEN)) response = json({ ok: false }, 404);
        else {
          const feed = conversionFeed(store, env, service.now());
          response = new Response(feed.csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "ETag": `"${feed.etag}"`, "Last-Modified": new Date(feed.lastModified * 1000).toUTCString() } });
        }
      } else if (pathname === "/api/order-request" && method === "OPTIONS") {
        const headers = (incoming.headers["access-control-request-headers"] || "").toLowerCase().split(",").map(x => x.trim()).filter(Boolean);
        response = allowedOrigin && incoming.headers["access-control-request-method"] === "POST" && headers.every(header => header === "content-type")
          ? new Response(null, { status: 204, headers: { "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "600" } })
          : json({ ok: false, code: "CORS_DENIED" }, 403);
      } else if (["/api/order-request", "/api/telegram/webhook"].includes(pathname) && method === "POST") {
        if (Number(incoming.headers["content-length"]) > 16384) response = json({ ok: false, code: "BODY_TOO_LARGE" }, 413);
        else {
          const body = await readBody(incoming);
          const request = new Request(`http://receiver.internal${pathname}`, { method, headers: incoming.headers, body });
          response = pathname === "/api/order-request" ? await service.acceptOrder(request, clientAddress(incoming, env)) : await service.webhook(request);
        }
      } else response = json({ ok: false, code: "NOT_FOUND" }, 404);
    } catch (error) { response = json({ ok: false, delivered: false, code: error.message === "BODY_TOO_LARGE" ? "BODY_TOO_LARGE" : "SERVICE_UNAVAILABLE" }, error.message === "BODY_TOO_LARGE" ? 413 : 503); }
    if (allowedOrigin) { response.headers.set("Access-Control-Allow-Origin", incoming.headers.origin); response.headers.set("Vary", "Origin"); }
    if (!outgoing.destroyed) { outgoing.writeHead(response.status, Object.fromEntries(response.headers)); outgoing.end(Buffer.from(await response.arrayBuffer())); }
  });
  return server;
}
