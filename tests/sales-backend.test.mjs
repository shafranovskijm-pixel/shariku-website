import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { SCHEMA, SalesStore } from "../lib/server/sales-store.mjs";
import { SalesService, CONSENT_VERSION, conversionFeed, normalizeOrder, parseAmount } from "../lib/server/sales-service.mjs";
import { createSalesServer, clientAddress } from "../server-node/http.mjs";

const NOW = 1794000000;
const MANAGER = "5550254442";
const env = {
 SHARIKU_MANAGER_USER_ID: MANAGER, SHARIKU_TELEGRAM_BOT_TOKEN: "test-token-no-network",
 SHARIKU_TELEGRAM_WEBHOOK_SECRET: "w".repeat(32), SHARIKU_TELEGRAM_BIND_TOKEN: "b".repeat(32),
 SHARIKU_TELEGRAM_BIND_EXPIRES_AT: new Date((NOW + 3600) * 1000).toISOString(),
 SHARIKU_ORDER_HMAC_SECRET: "h".repeat(32), SHARIKU_ORDER_TEST_SECRET: "t".repeat(32),
 SHARIKU_FEED_TOKEN: "f".repeat(32), SHARIKU_METRIKA_TIMEZONE: "Europe/Moscow", SHARIKU_PAID_GOAL: "shariku_order_paid",
};
function fixture({ bind = true, response } = {}) {
  const db = new DatabaseSync(":memory:"); db.exec(SCHEMA); const store = new SalesStore(db);
  if (bind) store.bindManager(MANAGER, MANAGER, NOW);
  const calls = [];
  const fetchImpl = async (url, options) => { calls.push({ method: url.split("/").at(-1), body: JSON.parse(options.body) }); return response ? response(url, options) : Response.json({ ok: true, result: { message_id: calls.length } }); };
  const service = new SalesService(store, env, { fetchImpl, now: () => NOW });
  return { db, store, calls, service, fetchImpl };
}
const payload = additions => ({ requestId: randomUUID(), name: "Тест", phone: "+7 (999) 000-00-00", service: "flowers", details: "Техническая проверка", consent: true, consentVersion: CONSENT_VERSION, analyticsConsent: true, clientId: "123456789", website: "", ...additions });
const orderRequest = (body, headers = {}) => new Request("https://orders.example/api/order-request", { method: "POST", headers: { origin: "https://shariku.ru", "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
const managerMessage = text => ({ message_id: 1, from: { id: Number(MANAGER) }, chat: { id: Number(MANAGER), type: "private" }, text });
const callback = data => ({ id: randomUUID(), from: { id: Number(MANAGER) }, message: { message_id: 1, chat: { id: Number(MANAGER), type: "private" } }, data });
const webhookRequest = update => new Request("https://orders.example/api/telegram/webhook", { method: "POST", headers: { "x-telegram-bot-api-secret-token": env.SHARIKU_TELEGRAM_WEBHOOK_SECRET, "content-type": "application/json" }, body: JSON.stringify(update) });

test("order validation requires genuine consent/version and strips attribution when analytics refused", () => {
  assert.equal(normalizeOrder(payload({ consent: false })), null);
  assert.equal(normalizeOrder(payload({ consentVersion: "old" })), null);
  assert.equal(normalizeOrder(payload({ website: "bot" })), null);
  assert.equal(normalizeOrder(payload({ eventDate: "2026-02-30" })), null);
  for (const service of ["constructor", "toString", "__proto__", {}]) assert.equal(normalizeOrder(payload({ service })), null);
  const p = normalizeOrder(payload({ analyticsConsent: false, clientId: "bad", yclid: "456" }));
  assert.equal(p.clientId, ""); assert.equal(p.yclid, ""); assert.equal(p.phone, "79990000000");
});

test("recipient requires private Start, expected user, valid token and single-use binding", async () => {
  const f = fixture({ bind: false });
  await f.service.onMessage({ ...managerMessage(`/start ${env.SHARIKU_TELEGRAM_BIND_TOKEN}`), from: { id: 123 }, chat: { id: 123, type: "private" } }, NOW);
  assert.equal(f.store.manager(), null);
  await f.service.onMessage({ ...managerMessage(`/start ${env.SHARIKU_TELEGRAM_BIND_TOKEN}`), chat: { id: Number(MANAGER), type: "group" } }, NOW);
  assert.equal(f.store.manager(), null);
  await f.service.onMessage(managerMessage(`/start ${env.SHARIKU_TELEGRAM_BIND_TOKEN}`), NOW + 3601);
  assert.equal(f.store.manager(), null);
  await f.service.onMessage(managerMessage(`/start ${env.SHARIKU_TELEGRAM_BIND_TOKEN}`), NOW);
  assert.equal(f.store.manager().user_id, MANAGER); assert.equal(f.calls.length, 1);
  await f.service.onMessage(managerMessage(`/start ${env.SHARIKU_TELEGRAM_BIND_TOKEN}`), NOW);
  assert.equal(f.calls.length, 1); f.db.close();
});

test("successful receipt is persisted and same ID retry never redelivers", async () => {
  const f = fixture(); const p = payload();
  assert.equal((await f.service.acceptOrder(orderRequest(p), "127.0.0.1")).status, 200);
  const retry = await (await f.service.acceptOrder(orderRequest(p), "127.0.0.1")).json();
  assert.equal(retry.duplicate, true); assert.equal(f.calls.length, 1); assert.equal(f.store.order(p.requestId).delivery_status, "delivered");
  assert.equal((await f.service.acceptOrder(orderRequest({ ...p, details: "Changed details" }), "127.0.0.1")).status, 409); f.db.close();
});

test("unknown Telegram delivery cannot be blindly retried or falsely accepted", async () => {
  const f = fixture({ response: async () => { throw new Error("timeout"); } }); const p = payload();
  const response = await f.service.acceptOrder(orderRequest(p), "127.0.0.1");
  assert.equal(response.status, 503); assert.equal((await response.json()).code, "DELIVERY_UNCONFIRMED");
  await f.service.acceptOrder(orderRequest(p), "127.0.0.1"); assert.equal(f.calls.length, 1); assert.equal(f.store.order(p.requestId).paid_at, null); f.db.close();
});

test("uncertain request may withdraw analytics on same-ID retry without conflict or redelivery", async () => {
  const f = fixture({ response: async () => { throw new Error("timeout"); } }); const p = payload({ yclid: "456" });
  await f.service.acceptOrder(orderRequest(p), "ip");
  f.service.now = () => NOW + 10;
  const response = await f.service.acceptOrder(orderRequest({ ...p, analyticsConsent: false, clientId: "", yclid: "" }), "ip");
  assert.equal(response.status, 503); assert.equal((await response.json()).code, "DELIVERY_UNCONFIRMED");
  const saved = f.store.order(p.requestId).payload;
  assert.equal(saved.analyticsConsent, false); assert.equal(saved.clientId, ""); assert.equal(saved.yclid, ""); assert.equal(saved.phone, "79990000000");
  assert.equal(f.calls.length, 1); assert.equal(f.store.ordersForExport(NOW + 10).length, 0); f.db.close();
});

test("delivered retry clears attribution only, keeps receipt, and changes feed even when last row removed", async () => {
  const f = fixture(); const p = payload({ yclid: "456" }); await f.service.acceptOrder(orderRequest(p), "ip");
  const before = conversionFeed(f.store, env, NOW);
  f.service.now = () => NOW + 20;
  const response = await f.service.acceptOrder(orderRequest({ ...p, analyticsConsent: false, clientId: "", yclid: "" }), "ip");
  const receipt = await response.json(); assert.equal(response.status, 200); assert.equal(receipt.duplicate, true); assert.equal(receipt.delivered, true);
  const saved = f.store.order(p.requestId); assert.equal(saved.payload.analyticsConsent, false); assert.equal(saved.payload.clientId, ""); assert.equal(saved.payload.yclid, ""); assert.equal(saved.payload.details, p.details); assert.equal(saved.delivery_status, "delivered");
  const after = conversionFeed(f.store, env, NOW + 20); assert.equal(after.lastModified, NOW + 20); assert.notEqual(before.etag, after.etag); assert.doesNotMatch(after.csv, new RegExp(p.requestId));
  await f.service.acceptOrder(orderRequest(p), "ip"); assert.equal(f.store.order(p.requestId).payload.analyticsConsent, false); assert.equal(f.calls.length, 1); f.db.close();
});

test("same-ID retry cannot replace original attribution or turn test into real order", async () => {
  const f = fixture(); const p = payload(); await f.service.acceptOrder(orderRequest(p), "ip");
  assert.equal((await f.service.acceptOrder(orderRequest({ ...p, clientId: "999999" }), "ip")).status, 200);
  assert.equal(f.store.order(p.requestId).payload.clientId, p.clientId);
  assert.equal((await f.service.acceptOrder(orderRequest({ ...p, isTest: true }), "ip")).status, 403);
  const rejected = await f.service.acceptOrder(orderRequest({ ...p, isTest: true }, { "x-shariku-test-secret": env.SHARIKU_ORDER_TEST_SECRET }), "ip"); assert.equal(rejected.status, 409); f.db.close();
});

test("unbound receiver accepts no orders and makes no Telegram calls", async () => {
  const f = fixture({ bind: false });
  assert.equal((await f.service.acceptOrder(orderRequest(payload()), "ip")).status, 503);
  assert.equal(f.calls.length, 0); assert.equal(f.store.recentOrders().length, 0); f.db.close();
});

test("webhook secret required and repeated update is idempotent", async () => {
  const f = fixture();
  const bad = webhookRequest({ update_id: 1, message: managerMessage("/help") }); bad.headers.set("x-telegram-bot-api-secret-token", "bad");
  assert.equal((await f.service.webhook(bad)).status, 403); assert.equal(f.calls.length, 0);
  const update = { update_id: 1, message: managerMessage("/help") };
  await f.service.webhook(webhookRequest(update)); await f.service.webhook(webhookRequest(update)); assert.equal(f.calls.length, 1); f.db.close();
});

test("payment requires amount and separate matching confirmation; replay creates exactly one paid audit", async () => {
  const f = fixture(); const p = payload(); await f.service.acceptOrder(orderRequest(p), "ip");
  await f.service.onCallback(callback(`pay:${p.requestId}`), NOW);
  assert.equal(f.store.order(p.requestId).paid_at, null);
  await f.service.onMessage(managerMessage("2500,50"), NOW);
  const flow = f.store.flow(MANAGER); assert.equal(flow.amount_kopecks, 250050);
  await f.service.onCallback(callback(`confirm:${"0".repeat(24)}`), NOW); assert.equal(f.store.order(p.requestId).paid_at, null);
  await f.service.onCallback(callback(`confirm:${flow.nonce}`), NOW);
  await f.service.onCallback(callback(`confirm:${flow.nonce}`), NOW);
  const paid = f.store.order(p.requestId); assert.equal(paid.paid_amount_kopecks, 250050); assert.equal(paid.paid_by, MANAGER);
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM sales_audit WHERE action='paid'").get().n, 1); f.db.close();
});

test("unfinished update is retried after an exception instead of being silently acknowledged", async () => {
  const f = fixture(); const update = { update_id: 99, message: managerMessage("/help") };
  const original = f.service.onMessage.bind(f.service); let fail = true;
  f.service.onMessage = async (...args) => { if (fail) { fail = false; throw new Error("simulated database failure after claim"); } return original(...args); };
  assert.equal((await f.service.webhook(webhookRequest(update))).status, 503);
  assert.equal((await f.service.webhook(webhookRequest(update))).status, 200);
  assert.equal(f.calls.length, 1);
  assert.equal(f.db.prepare("SELECT status FROM sales_updates WHERE update_id=99").get().status, "done"); f.db.close();
});

test("active processing lease returns retryable error; expired crash lease is reclaimed", async () => {
  const f = fixture(); const update = { update_id: 100, message: managerMessage("/help") };
  assert.equal(f.store.claimUpdate(100, NOW), "claimed");
  assert.equal((await f.service.webhook(webhookRequest(update))).status, 503); assert.equal(f.calls.length, 0);
  f.service.now = () => NOW + 31;
  assert.equal((await f.service.webhook(webhookRequest(update))).status, 200); assert.equal(f.calls.length, 1); f.db.close();
});

test("retry after crash following paid mutation never creates another sale", async () => {
  const f = fixture(); const p = payload(); await f.service.acceptOrder(orderRequest(p), "ip");
  f.store.setFlow(MANAGER, p.requestId, "confirm", NOW + 600, 50000, "c".repeat(24));
  const original = f.store.clearFlow.bind(f.store); let fail = true;
  f.store.clearFlow = (...args) => { if (fail) { fail = false; throw new Error("crash after commit before clear"); } return original(...args); };
  const update = { update_id: 101, callback_query: callback(`confirm:${"c".repeat(24)}`) };
  assert.equal((await f.service.webhook(webhookRequest(update))).status, 503);
  assert.equal(f.store.order(p.requestId).paid_amount_kopecks, 50000);
  assert.equal((await f.service.webhook(webhookRequest(update))).status, 200);
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM sales_audit WHERE action='paid'").get().n, 1); f.db.close();
});

test("unauthorized or group callbacks cannot change payment state", async () => {
  const f = fixture(); const p = payload(); await f.service.acceptOrder(orderRequest(p), "ip");
  await f.service.onCallback({ ...callback(`pay:${p.requestId}`), from: { id: 1 } }, NOW);
  await f.service.onCallback({ ...callback(`pay:${p.requestId}`), message: { chat: { id: Number(MANAGER), type: "group" } } }, NOW);
  assert.equal(f.store.flow(MANAGER), null); assert.equal(f.store.order(p.requestId).paid_at, null); f.db.close();
});

test("expired confirmation and cancelled flow cannot pay", async () => {
  const f = fixture(); const p = payload(); await f.service.acceptOrder(orderRequest(p), "ip");
  f.store.setFlow(MANAGER, p.requestId, "confirm", NOW - 1, 100, "a".repeat(24));
  await f.service.onCallback(callback(`confirm:${"a".repeat(24)}`), NOW); assert.equal(f.store.order(p.requestId).paid_at, null);
  f.store.setFlow(MANAGER, p.requestId, "confirm", NOW + 1, 100, "a".repeat(24));
  await f.service.onCallback(callback(`cancel:${"a".repeat(24)}`), NOW); assert.equal(f.store.flow(MANAGER), null); f.db.close();
});

test("export binds initially IN_PROGRESS then updates same ID to paid goal with exact revenue", async () => {
  const f = fixture(); const p = payload(); await f.service.acceptOrder(orderRequest(p), "ip");
  const before = conversionFeed(f.store, env, NOW);
  assert.match(before.csv, /^id;create_date_time;client_uniq_id;client_ids;order_status;revenue\r\n/);
  assert.match(before.csv, /;123456789;IN_PROGRESS;0\r\n$/); assert.doesNotMatch(before.csv, /79990000000|Техническая проверка|Тест/);
  f.store.pay(p.requestId, 300099, MANAGER, NOW + 100);
  const after = conversionFeed(f.store, env, NOW + 100);
  assert.equal(before.csv.split(";")[6], after.csv.split(";")[6]);
  assert.match(after.csv, /;123456789;shariku_order_paid;3000\.99\r\n$/); assert.equal(after.lastModified, NOW + 100); f.db.close();
});

test("test order cannot enter feed even when paid; missing analytics or ClientID excluded", async () => {
  const f = fixture();
  for (const additions of [{ isTest: true }, { analyticsConsent: false }, { clientId: "", yclid: "1234" }]) {
    const p = payload(additions); const headers = p.isTest ? { "x-shariku-test-secret": env.SHARIKU_ORDER_TEST_SECRET } : {};
    await f.service.acceptOrder(orderRequest(p, headers), "ip"); f.store.pay(p.requestId, 50000, MANAGER, NOW);
  }
  assert.equal(conversionFeed(f.store, env, NOW).csv.split("\r\n").length, 2); f.db.close();
});

test("test flag without separate server secret is forbidden", async () => {
  const f = fixture(); assert.equal((await f.service.acceptOrder(orderRequest(payload({ isTest: true })), "ip")).status, 403); assert.equal(f.calls.length, 0); f.db.close();
});

test("amount parser rejects ambiguous/fake amounts and uses kopecks", () => {
  for (const value of ["0", "-1", "1e3", "100 руб", "1,234", "10 000", "NaN", "10000000"]) assert.equal(parseAmount(value), null);
  assert.equal(parseAmount("0,01"), 1); assert.equal(parseAmount("1200.50"), 120050);
});

test("server feed secret, exact CORS and body limits are enforced", async t => {
  const f = fixture(); const server = createSalesServer(f.store, env, { fetchImpl: f.fetchImpl, now: () => NOW });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); f.db.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${base}/integrations/direct/wrong/sales.csv`)).status, 404);
  const feed = await fetch(`${base}/integrations/direct/${env.SHARIKU_FEED_TOKEN}/sales.csv`); assert.equal(feed.status, 200); assert.ok(feed.headers.get("last-modified"));
  const denied = await fetch(`${base}/api/order-request`, { method: "OPTIONS", headers: { origin: "https://evil.example", "access-control-request-method": "POST" } }); assert.equal(denied.status, 403);
  const allowed = await fetch(`${base}/api/order-request`, { method: "OPTIONS", headers: { origin: "https://shariku.ru", "access-control-request-method": "POST", "access-control-request-headers": "content-type" } }); assert.equal(allowed.status, 204); assert.equal(allowed.headers.get("access-control-allow-origin"), "https://shariku.ru");
  const oversized = await fetch(`${base}/api/order-request`, { method: "POST", body: "a".repeat(17000) }); assert.equal(oversized.status, 413);
});

test("IP forwarding trusts only explicitly configured proxy", () => {
  const request = { socket: { remoteAddress: "::ffff:127.0.0.1" }, headers: { "x-real-ip": "192.0.2.2", "x-forwarded-for": "192.0.2.3" } };
  assert.equal(clientAddress(request, {}), "127.0.0.1");
  assert.equal(clientAddress(request, { SHARIKU_TRUSTED_PROXY_ADDRESSES: "127.0.0.1" }), "192.0.2.2");
});
