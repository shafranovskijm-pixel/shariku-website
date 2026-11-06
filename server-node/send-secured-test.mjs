import { randomUUID } from "node:crypto";
const env = process.env;
if (!env.SHARIKU_RECEIVER_URL || !env.SHARIKU_ORDER_TEST_SECRET) throw new Error("Private test settings required");
const base = new URL(env.SHARIKU_RECEIVER_URL);
if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) throw new Error("Use exact HTTPS receiver origin");
const requestId = env.SHARIKU_TEST_REQUEST_ID || randomUUID();
// Deliberately no real analytics identifier: this is not a conversion.
const payload = { requestId, name: "Техническая проверка", phone: "+7 999 000 00 00", service: "other", details: "Технический тест доставки и кнопки оплаты. Не клиент и не заказ. Не отправлять в рекламную статистику.", consent: true, consentVersion: "2026-11-07", analyticsConsent: false, isTest: true, website: "" };
try {
  const response = await fetch(new URL("/api/order-request", base), { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://shariku.ru", "X-Shariku-Test-Secret": env.SHARIKU_ORDER_TEST_SECRET }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20000) });
  const result = await response.json();
  const ok = response.ok && result.ok === true && result.delivered === true && result.requestId === requestId;
  console.log(JSON.stringify({ requestId, ok, delivered: ok, duplicate: result.duplicate === true, code: result.code || null }));
  if (!ok) process.exitCode = 1;
} catch { console.error(JSON.stringify({ requestId, ok: false, delivered: false, code: "UNKNOWN_NETWORK_RESULT_REUSE_SAME_ID" })); process.exitCode = 1; }
