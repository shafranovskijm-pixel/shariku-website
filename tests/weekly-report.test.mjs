import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { SCHEMA, SalesStore } from "../lib/server/sales-store.mjs";
import { REPORT_COUNTER_ID, previousFullWeek, reportConfiguration, fetchMetrikaWeek, runWeeklyReport } from "../server-node/report.mjs";

const MANAGER = "5550254442";
const NOW = "2026-11-09T00:00:00Z"; // Monday 10:00 in Vladivostok.
const env = { SHARIKU_MANAGER_USER_ID: MANAGER, SHARIKU_METRIKA_READ_TOKEN: "mock-read-token", SHARIKU_TELEGRAM_BOT_TOKEN: "mock-bot-token", SHARIKU_REPORT_PAID_GOAL_ID: "700000001" };
function fixture() {
  const db = new DatabaseSync(":memory:"); db.exec(SCHEMA);
  const store = new SalesStore(db); store.bindManager(MANAGER, MANAGER, 1);
  return { db, store };
}
function stats(url, values) {
  const q = new URL(url).searchParams;
  const metrics = q.get("metrics").split(",");
  return Response.json({ query: { ids: [REPORT_COUNTER_ID], metrics, date1: q.get("date1"), date2: q.get("date2"), timezone: q.get("timezone") }, totals: values || metrics.map((_, index) => index === 0 ? 72 : index === 1 ? 54 : 2), sampled: false, data: [] });
}
function mockFetch({ metrika, telegram } = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.startsWith("https://api-metrika.yandex.net/")) return metrika ? metrika(url, options) : stats(url);
    if (url.startsWith("https://api.telegram.org/")) return telegram ? telegram(url, options) : Response.json({ ok: true, result: { message_id: 123 } });
    throw new Error("Unexpected destination");
  };
  return { calls, fetchImpl };
}
const options = fetchImpl => ({ fetchImpl, now: () => NOW });
const periodKey = "111239502:Asia/Vladivostok:2026-11-02:2026-11-08";

test("full week follows Vladivostok calendar at UTC/day/year boundaries", () => {
  assert.deepEqual(previousFullWeek(NOW), { date1: "2026-11-02", date2: "2026-11-08" });
  assert.deepEqual(previousFullWeek("2026-11-08T14:00:00Z"), { date1: "2026-11-02", date2: "2026-11-08" });
  assert.deepEqual(previousFullWeek("2026-11-08T13:59:59Z"), { date1: "2026-10-26", date2: "2026-11-01" });
  assert.deepEqual(previousFullWeek("2027-01-04T00:00:00Z"), { date1: "2026-12-28", date2: "2027-01-03" });
});

test("without a separate read token job is disabled before database or network access", async () => {
  const result = await runWeeklyReport({ manager() { throw new Error("Must not be called"); } }, {}, { fetchImpl() { throw new Error("Must not be called"); } });
  assert.deepEqual(result, { status: "disabled", reason: "METRIKA_NOT_CONFIGURED" });
});

test("report cannot go to an unbound, group or unexpected manager", async () => {
  for (const manager of [null, { user_id: "123", chat_id: "123" }, { user_id: MANAGER, chat_id: "-100123" }]) {
    const result = await runWeeklyReport({ manager: () => manager }, env, { fetchImpl() { throw new Error("No network allowed"); } });
    assert.equal(result.reason, "MANAGER_NOT_BOUND");
  }
});

test("report uses official API, explicit +10 timezone, distinct clicks/sales and one send per week", async () => {
  const f = fixture(); const network = mockFetch();
  try {
    assert.equal((await runWeeklyReport(f.store, env, options(network.fetchImpl))).status, "sent");
    assert.equal(f.store.report(periodKey).telegram_message_id, 123);
    const reads = network.calls.filter(call => call.url.includes("api-metrika")); assert.equal(reads.length, 2);
    for (const call of reads) {
      const q = new URL(call.url).searchParams;
      assert.equal(q.get("ids"), "111239502"); assert.equal(q.get("timezone"), "+10:00");
      assert.equal(q.get("accuracy"), "full"); assert.equal(call.options.headers.Authorization, "OAuth mock-read-token");
      assert.equal(call.url.includes("mock-read-token"), false); assert.equal(call.options.redirect, "error");
    }
    const send = network.calls.find(call => call.url.includes("api.telegram"));
    const message = JSON.parse(send.options.body);
    assert.equal(message.chat_id, MANAGER); assert.match(message.text, /Нажатия на телефон: 2/);
    assert.match(message.text, /Переходы в мессенджеры: 2/); assert.match(message.text, /Оплата заказа — достижения цели в Метрике: 2/);
    assert.match(message.text, /не продажи/); assert.match(message.text, /не равны числу уникальных покупателей/);
    const count = network.calls.length;
    assert.equal((await runWeeklyReport(f.store, env, options(network.fetchImpl))).status, "already_sent");
    assert.equal(network.calls.length, count);
  } finally { f.db.close(); }
});

test("missing, negative, wrong-counter or failed current data is never sent as zero", async () => {
  const malformed = [
    () => Response.json({}),
    () => new Response("Denied", { status: 403 }),
    async url => { const result = await stats(url).json(); result.totals[0] = -1; return Response.json(result); },
    async url => { const result = await stats(url).json(); result.query.ids = [999]; return Response.json(result); },
    async url => { const result = await stats(url).json(); result.query.timezone = "+03:00"; return Response.json(result); },
    async url => { const result = await stats(url).json(); result.totals.pop(); return Response.json(result); },
  ];
  for (const metrika of malformed) {
    const f = fixture(); const network = mockFetch({ metrika });
    try {
      const result = await runWeeklyReport(f.store, env, options(network.fetchImpl));
      assert.equal(result.status, "failed"); assert.equal(network.calls.some(call => call.url.includes("api.telegram")), false);
      assert.equal(f.store.report(periodKey), null);
    } finally { f.db.close(); }
  }
});

test("confirmed zero values remain zero; unconfigured sale goal is not invented", async () => {
  const f = fixture(); const network = mockFetch({ metrika: url => stats(url, new URL(url).searchParams.get("metrics").split(",").map(() => 0)) });
  try {
    const config = { ...env }; delete config.SHARIKU_REPORT_PAID_GOAL_ID;
    assert.equal((await runWeeklyReport(f.store, config, options(network.fetchImpl))).status, "sent");
    const text = JSON.parse(network.calls.find(call => call.url.includes("api.telegram")).options.body).text;
    assert.match(text, /Визиты: 0/); assert.match(text, /Цель оплаченных заказов в отчёте ещё не подключена/);
    assert.equal(text.includes("NaN"), false); assert.equal(text.includes("Infinity"), false);
  } finally { f.db.close(); }
});

test("failed comparison is explicitly unavailable while current valid report is delivered", async () => {
  const f = fixture();
  const network = mockFetch({ metrika: url => new URL(url).searchParams.get("date1") === "2026-10-26" ? new Response("Unavailable", { status: 503 }) : stats(url) });
  try {
    assert.equal((await runWeeklyReport(f.store, env, options(network.fetchImpl))).status, "sent");
    const text = JSON.parse(network.calls.find(call => call.url.includes("api.telegram")).options.body).text;
    assert.match(text, /Сравнение с предыдущей неделей недоступно/); assert.equal(text.includes("ранее 0"), false);
  } finally { f.db.close(); }
});

test("unknown Telegram delivery is persisted and blocks all automatic re-sends", async () => {
  const f = fixture(); const network = mockFetch({ telegram: () => { throw new Error("Network timeout"); } });
  try {
    assert.equal((await runWeeklyReport(f.store, env, options(network.fetchImpl))).reason, "DELIVERY_UNCONFIRMED");
    assert.equal(f.store.report(periodKey).status, "uncertain");
    const count = network.calls.length;
    assert.equal((await runWeeklyReport(f.store, env, options(network.fetchImpl))).status, "review_required");
    assert.equal(network.calls.length, count);
  } finally { f.db.close(); }
});

test("confirmed Telegram rejection permits explicit retry but never records sent", async () => {
  const f = fixture(); const network = mockFetch({ telegram: () => Response.json({ ok: false }, { status: 400 }) });
  try {
    assert.equal((await runWeeklyReport(f.store, env, options(network.fetchImpl))).reason, "DELIVERY_REJECTED");
    assert.equal(f.store.report(periodKey).status, "failed");
    assert.equal((await runWeeklyReport(f.store, env, options(network.fetchImpl))).status, "failed");
    assert.equal(network.calls.filter(call => call.url.includes("api.telegram")).length, 2);
  } finally { f.db.close(); }
});

test("parallel runs atomically claim only one weekly Telegram message", async () => {
  const f = fixture(); const network = mockFetch();
  try {
    const results = await Promise.all([runWeeklyReport(f.store, env, options(network.fetchImpl)), runWeeklyReport(f.store, env, options(network.fetchImpl))]);
    assert.equal(results.filter(result => result.status === "sent").length, 1);
    assert.equal(network.calls.filter(call => call.url.includes("api.telegram")).length, 1);
  } finally { f.db.close(); }
});

test("delivered-request, duplicated and malformed goals cannot be configured as paid sales", () => {
  for (const goal of ["675278624", "594991444", "594991443", "not-a-goal", "0"]) assert.throws(() => reportConfiguration({ ...env, SHARIKU_REPORT_PAID_GOAL_ID: goal }));
});

test("Metrika fetch validates exact metric response instead of substituting defaults", async () => {
  const config = reportConfiguration(env); const period = previousFullWeek(NOW);
  await assert.rejects(fetchMetrikaWeek("mock", period, config, async url => {
    const body = await stats(url).json(); body.query.metrics.reverse(); return Response.json(body);
  }), /INVALID_RESPONSE/);
});
