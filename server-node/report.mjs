/**
 * Optional weekly report for the already bound manager in the order bot.
 * Run by the host scheduler on Monday at 10:00 Asia/Vladivostok, after the
 * additive database migration. No scheduler or permissions are created here.
 * SHARIKU_METRIKA_READ_TOKEN must be a separately authorized read-only token.
 * SHARIKU_REPORT_PAID_GOAL_ID is the numeric ID of the actual paid-order goal,
 * never the delivered-request goal. Missing paid goal is shown as unconfigured.
 * Missing read token disables this job before it accesses the database/network.
 */
import { pathToFileURL } from "node:url";
import { SalesStore, openSalesDatabase } from "../lib/server/sales-store.mjs";

export const REPORT_COUNTER_ID = 111239502;
export const REPORT_TIMEZONE = "Asia/Vladivostok";
export const REPORT_OFFSET = "+10:00";
const DAY = 86400000;
const BASE_METRICS = ["ym:s:visits", "ym:s:users", "ym:s:percentNewVisitors", "ym:s:bounceRate", "ym:s:pageDepth", "ym:s:avgVisitDurationSeconds"];
const RU = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });
const dateString = date => date.toISOString().slice(0, 10);

export function previousFullWeek(now = new Date()) {
  const date = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid report date");
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: REPORT_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date).map(part => [part.type, part.value]));
  const localCalendarDate = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)));
  const thisMonday = new Date(localCalendarDate.getTime() - ((localCalendarDate.getUTCDay() + 6) % 7) * DAY);
  return { date1: dateString(new Date(thisMonday.getTime() - 7 * DAY)), date2: dateString(new Date(thisMonday.getTime() - DAY)) };
}

function earlierWeek(period) {
  return { date1: dateString(new Date(Date.parse(`${period.date1}T00:00:00Z`) - 7 * DAY)), date2: dateString(new Date(Date.parse(`${period.date2}T00:00:00Z`) - 7 * DAY)) };
}

export function reportConfiguration(env) {
  const phone = env.SHARIKU_REPORT_PHONE_GOAL_ID || "594991443";
  const messenger = env.SHARIKU_REPORT_MESSENGER_GOAL_ID || "594991444";
  const paid = env.SHARIKU_REPORT_PAID_GOAL_ID || "";
  const goals = [phone, messenger, ...(paid ? [paid] : [])];
  if (goals.some(value => !/^[1-9]\d{0,15}$/.test(value)) || new Set(goals).size !== goals.length || paid === "675278624") throw new Error("INVALID_REPORT_GOALS");
  return { phone, messenger, paid, metrics: [...BASE_METRICS, ...goals.map(id => `ym:s:goal${id}reaches`)] };
}

export async function fetchMetrikaWeek(token, period, config, fetchImpl = fetch) {
  const query = new URLSearchParams({ ids: String(REPORT_COUNTER_ID), metrics: config.metrics.join(","), date1: period.date1, date2: period.date2, timezone: REPORT_OFFSET, accuracy: "full" });
  let response;
  try {
    response = await fetchImpl(`https://api-metrika.yandex.net/stat/v1/data?${query}`, { headers: { Authorization: `OAuth ${token}` }, signal: AbortSignal.timeout(15000), redirect: "error" });
  } catch { throw new Error("METRIKA_UNAVAILABLE"); }
  if (!response.ok) throw new Error("METRIKA_UNAVAILABLE");
  let data;
  try { data = await response.json(); } catch { throw new Error("METRIKA_INVALID_RESPONSE"); }
  const ids = Array.isArray(data?.query?.ids) ? data.query.ids.map(String) : [];
  if (ids.length !== 1 || ids[0] !== String(REPORT_COUNTER_ID) || data.query.date1 !== period.date1 || data.query.date2 !== period.date2 || data.query.timezone !== REPORT_OFFSET || JSON.stringify(data.query.metrics) !== JSON.stringify(config.metrics) || !Array.isArray(data.totals) || data.totals.length !== config.metrics.length || data.totals.some(value => typeof value !== "number" || !Number.isFinite(value) || value < 0)) throw new Error("METRIKA_INVALID_RESPONSE");
  return { values: Object.fromEntries(config.metrics.map((metric, index) => [metric, data.totals[index]])), sampled: data.sampled === true };
}

function change(value, before) {
  if (before === undefined) return "";
  if (before === 0) return value === 0 ? " (без изменений)" : " (ранее 0)";
  const delta = (value - before) / before * 100;
  return ` (${delta > 0 ? "+" : ""}${RU.format(delta)}%)`;
}
function duration(seconds) {
  const whole = Math.round(seconds);
  return `${String(Math.floor(whole / 3600)).padStart(2, "0")}:${String(Math.floor(whole / 60) % 60).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

export function formatWeeklyReport(period, current, previous, config) {
  const v = current.values;
  const prior = previous?.values;
  const lines = [
    "Еженедельный отчёт — Шарик",
    `${period.date1} — ${period.date2} · Владивосток (UTC+10)`,
    `shariku.ru · счётчик ${REPORT_COUNTER_ID}`,
    "",
    `Визиты: ${RU.format(v[BASE_METRICS[0]])}${change(v[BASE_METRICS[0]], prior?.[BASE_METRICS[0]])}`,
    `Посетители: ${RU.format(v[BASE_METRICS[1]])}${change(v[BASE_METRICS[1]], prior?.[BASE_METRICS[1]])}`,
    `Доля новых посетителей: ${RU.format(v[BASE_METRICS[2]])}%`,
    `Отказы: ${RU.format(v[BASE_METRICS[3]])}%`,
    `Глубина просмотра: ${RU.format(v[BASE_METRICS[4]])}`,
    `Время на сайте: ${duration(v[BASE_METRICS[5]])}`,
    "",
    "Действия посетителей — события, не продажи:",
    `Нажатия на телефон: ${RU.format(v[`ym:s:goal${config.phone}reaches`])}`,
    `Переходы в мессенджеры: ${RU.format(v[`ym:s:goal${config.messenger}reaches`])}`,
    "",
    config.paid ? `Оплата заказа — достижения цели в Метрике: ${RU.format(v[`ym:s:goal${config.paid}reaches`])}` : "Цель оплаченных заказов в отчёте ещё не подключена.",
    "Достижения целей не равны числу уникальных покупателей. Оплаты относятся к визитам выбранной недели; офлайн-данные могут поступить позднее.",
  ];
  if (!previous) lines.push("Сравнение с предыдущей неделей недоступно.");
  if (current.sampled || previous?.sampled) lines.push("В ответе Метрики применена выборка; показатели могут уточняться.");
  return lines.join("\n");
}

export async function runWeeklyReport(store, env, options = {}) {
  if (!env.SHARIKU_METRIKA_READ_TOKEN) return { status: "disabled", reason: "METRIKA_NOT_CONFIGURED" };
  if (!env.SHARIKU_TELEGRAM_BOT_TOKEN) return { status: "disabled", reason: "BOT_NOT_CONFIGURED" };
  const manager = store.manager();
  if (!manager || manager.user_id !== String(env.SHARIKU_MANAGER_USER_ID) || manager.chat_id !== manager.user_id) return { status: "disabled", reason: "MANAGER_NOT_BOUND" };
  let config;
  try { config = reportConfiguration(env); } catch { return { status: "disabled", reason: "INVALID_REPORT_GOALS" }; }
  const now = options.now ? new Date(options.now()) : new Date();
  const period = previousFullWeek(now);
  const key = `${REPORT_COUNTER_ID}:${REPORT_TIMEZONE}:${period.date1}:${period.date2}`;
  const existing = store.report(key);
  if (existing?.status === "sent") return { status: "already_sent", period };
  if (existing && ["sending", "uncertain"].includes(existing.status)) return { status: "review_required", period };
  const fetchImpl = options.fetchImpl || fetch;
  const results = await Promise.allSettled([
    fetchMetrikaWeek(env.SHARIKU_METRIKA_READ_TOKEN, period, config, fetchImpl),
    fetchMetrikaWeek(env.SHARIKU_METRIKA_READ_TOKEN, earlierWeek(period), config, fetchImpl),
  ]);
  if (results[0].status !== "fulfilled") return { status: "failed", reason: "METRIKA_UNAVAILABLE", period };
  const current = results[0].value;
  const previous = results[1].status === "fulfilled" ? results[1].value : null;
  const text = formatWeeklyReport(period, current, previous, config);
  if (!store.claimReport(key, Math.floor(now.getTime() / 1000))) return { status: "review_required", period };
  let response, result;
  try {
    response = await fetchImpl(`https://api.telegram.org/bot${env.SHARIKU_TELEGRAM_BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: manager.chat_id, text, disable_web_page_preview: true }), signal: AbortSignal.timeout(8000), redirect: "error" });
    result = await response.json();
  } catch {
    store.finishReport(key, "uncertain");
    return { status: "review_required", reason: "DELIVERY_UNCONFIRMED", period };
  }
  if (response.ok && result?.ok === true && Number.isSafeInteger(result.result?.message_id) && result.result.message_id > 0) {
    store.finishReport(key, "sent", result.result.message_id);
    return { status: "sent", period };
  }
  const uncertain = response.status >= 500 || response.ok;
  store.finishReport(key, uncertain ? "uncertain" : "failed");
  return { status: uncertain ? "review_required" : "failed", reason: uncertain ? "DELIVERY_UNCONFIRMED" : "DELIVERY_REJECTED", period };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.umask(0o077);
  if (!process.env.SHARIKU_METRIKA_READ_TOKEN) console.log(JSON.stringify({ status: "disabled", reason: "METRIKA_NOT_CONFIGURED" }));
  else {
    let db;
    try {
      db = openSalesDatabase(process.env.SHARIKU_SQLITE_PATH);
      console.log(JSON.stringify(await runWeeklyReport(new SalesStore(db), process.env)));
    } catch { console.log(JSON.stringify({ status: "failed", reason: "REPORT_UNAVAILABLE" })); process.exitCode = 1; }
    finally { db?.close(); }
  }
}
