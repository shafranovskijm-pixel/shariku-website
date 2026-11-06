import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const CONSENT_VERSION = "2026-11-07";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DIGITS = /^\d+$/;
const SERVICE_NAMES = { balloons: "Шары", flowers: "Цветы", decoration: "Оформление", other: "Другое" };
export const safeEqual = (a, b) => typeof a === "string" && typeof b === "string" && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const json = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
const failure = (code, status) => json({ ok: false, delivered: false, code }, status);
const digest = value => createHash("sha256").update(value).digest("hex");
const orderFingerprint = ({ analyticsConsent, clientId, yclid, ...core }) => digest(JSON.stringify(core));
const rubles = kopecks => (kopecks / 100).toFixed(2).replace(".", ",");

export function normalizeOrder(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !UUID.test(input.requestId || "")) return null;
  if (input.website || input.consent !== true || input.consentVersion !== CONSENT_VERSION) return null;
  const phone = typeof input.phone === "string" ? input.phone.replace(/[\s()+-]/g, "") : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const details = typeof input.details === "string" ? input.details.trim() : "";
  const service = input.service;
  if (!/^\d{10,15}$/.test(phone) || name.length > 80 || details.length < 5 || details.length > 1000 || typeof service !== "string" || !Object.hasOwn(SERVICE_NAMES, service)) return null;
  const eventDate = typeof input.eventDate === "string" ? input.eventDate : "";
  if (eventDate && (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || Number.isNaN(Date.parse(eventDate)) || new Date(eventDate).toISOString().slice(0, 10) !== eventDate)) return null;
  if (input.analyticsConsent !== undefined && typeof input.analyticsConsent !== "boolean") return null;
  const analyticsConsent = input.analyticsConsent === true;
  const clientId = analyticsConsent && typeof input.clientId === "string" ? input.clientId : "";
  const yclid = analyticsConsent && typeof input.yclid === "string" ? input.yclid : "";
  if (clientId && (!/^[1-9]\d*$/.test(clientId) || clientId.length > 30)) return null;
  if (yclid && (!DIGITS.test(yclid) || yclid.length > 100)) return null;
  return { requestId: input.requestId.toLowerCase(), name, phone, service, details, eventDate, consent: true, consentVersion: CONSENT_VERSION, analyticsConsent, clientId, yclid, isTest: input.isTest === true };
}

export function originAllowed(origin, env) {
  return ["https://shariku.ru", "https://www.shariku.ru", ...(env.SHARIKU_ALLOWED_ORIGINS || "").split(",").map(x => x.trim()).filter(Boolean)].includes(origin);
}

export function parseAmount(text) {
  if (typeof text !== "string" || !/^\d{1,7}(?:[.,]\d{1,2})?$/.test(text.trim())) return null;
  const amount = Math.round(Number(text.trim().replace(",", ".")) * 100);
  return Number.isSafeInteger(amount) && amount > 0 && amount <= 1000000000 ? amount : null;
}

export class SalesService {
  constructor(store, env, options = {}) { this.store = store; this.env = env; this.fetch = options.fetchImpl || fetch; this.now = options.now || (() => Math.floor(Date.now() / 1000)); }
  async telegram(method, body) {
    try {
      const response = await this.fetch(`https://api.telegram.org/bot${this.env.SHARIKU_TELEGRAM_BOT_TOKEN}/${method}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000),
      });
      let data; try { data = await response.json(); } catch { return { uncertain: true }; }
      if (response.ok && data?.ok === true) return { ok: true, result: data.result };
      return response.status >= 500 ? { uncertain: true } : { ok: false };
    } catch { return { uncertain: true }; }
  }
  send(chatId, text, keyboard) { return this.telegram("sendMessage", { chat_id: chatId, text, ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}) }); }
  orderText(order) {
    const p = order.payload || order;
    return `${p.isTest ? "ТЕХНИЧЕСКИЙ ТЕСТ — НЕ КЛИЕНТ\n" : "Новый заказ\n"}№ ${p.requestId}\n${SERVICE_NAMES[p.service]}\n${p.name ? `${p.name}\n` : ""}Телефон: +${p.phone}\n${p.eventDate ? `Дата события: ${p.eventDate}\n` : ""}${p.details}\n${order.paid_at ? `\nОПЛАЧЕН: ${rubles(order.paid_amount_kopecks)} ₽` : "\nОплата ещё не подтверждена."}`;
  }
  async acceptOrder(request, address) {
    if (!originAllowed(request.headers.get("origin"), this.env)) return failure("ORIGIN_DENIED", 403);
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return failure("INVALID_CONTENT_TYPE", 415);
    let input; try { input = await request.json(); } catch { return failure("INVALID_REQUEST", 400); }
    const order = normalizeOrder(input);
    if (!order) return failure("INVALID_REQUEST", 400);
    if (order.isTest && (!this.env.SHARIKU_ORDER_TEST_SECRET || !safeEqual(request.headers.get("x-shariku-test-secret"), this.env.SHARIKU_ORDER_TEST_SECRET))) return failure("TEST_DENIED", 403);
    const manager = this.store.manager();
    if (!manager || !this.env.SHARIKU_TELEGRAM_BOT_TOKEN) return failure("NOT_CONNECTED", 503);
    const now = this.now();
    const fingerprint = orderFingerprint(order);
    const existing = this.store.order(order.requestId);
    // Retries may withdraw analytics. They cannot replace the original customer
    // request, introduce attribution, or transfer it to another visitor ID.
    if (existing && orderFingerprint(existing.payload) !== fingerprint) return failure("REQUEST_CONFLICT", 409);
    if (existing && order.analyticsConsent === false) this.store.withdrawAttribution(order.requestId, now);
    if (existing?.delivery_status === "delivered") return json({ ok: true, delivered: true, requestId: order.requestId, duplicate: true });
    if (existing && ["sending", "uncertain"].includes(existing.delivery_status)) return failure("DELIVERY_UNCONFIRMED", 503);
    const ipHash = createHmac("sha256", this.env.SHARIKU_ORDER_HMAC_SECRET).update(address).digest("hex");
    if (!this.store.rateLimit(`ip:${ipHash}`, now, 900, 5) || !this.store.rateLimit("global", now, 3600, 60)) return failure("RATE_LIMITED", 429);
    if (!existing) this.store.createOrder(order, fingerprint, now);
    if (!this.store.claimDelivery(order.requestId)) return failure("DELIVERY_UNCONFIRMED", 503);
    const result = await this.send(manager.chat_id, this.orderText(order), [[{ text: "Заказ оплачен", callback_data: `pay:${order.requestId}` }]]);
    if (result.ok && Number.isSafeInteger(result.result?.message_id)) {
      this.store.delivery(order.requestId, "delivered", result.result.message_id);
      return json({ ok: true, delivered: true, requestId: order.requestId });
    }
    this.store.delivery(order.requestId, result.uncertain ? "uncertain" : "rejected");
    return failure(result.uncertain ? "DELIVERY_UNCONFIRMED" : "DELIVERY_UNAVAILABLE", 503);
  }
  authorized(user, chat) {
    const manager = this.store.manager();
    return manager && chat?.type === "private" && String(user?.id) === manager.user_id && String(chat.id) === manager.chat_id && String(user.id) === String(this.env.SHARIKU_MANAGER_USER_ID);
  }
  async webhook(request) {
    if (!safeEqual(request.headers.get("x-telegram-bot-api-secret-token"), this.env.SHARIKU_TELEGRAM_WEBHOOK_SECRET)) return json({ ok: false }, 403);
    let update; try { update = await request.json(); } catch { return json({ ok: false }, 400); }
    if (!Number.isSafeInteger(update?.update_id)) return json({ ok: false }, 400);
    const now = this.now();
    const claim = this.store.claimUpdate(update.update_id, now);
    if (claim === "done") return json({ ok: true, duplicate: true });
    if (claim === "busy") return json({ ok: false, code: "UPDATE_IN_PROGRESS" }, 503);
    try {
      const message = update.message;
      const callback = update.callback_query;
      if (message && typeof message.text === "string") await this.onMessage(message, now);
      else if (callback) await this.onCallback(callback, now);
      this.store.finishUpdate(update.update_id);
      return json({ ok: true });
    } catch {
      // Do not log the update: it can contain phone numbers and bind tokens.
      this.store.failUpdate(update.update_id);
      return json({ ok: false, code: "UPDATE_RETRY" }, 503);
    }
  }
  async onMessage(message, now) {
    const text = message.text.trim();
    const userId = String(message.from?.id);
    const chatId = String(message.chat?.id);
    const start = text.match(/^\/start(?:@\w+)? ([A-Za-z0-9_-]{32,64})$/);
    if (start && message.chat?.type === "private" && userId === chatId && userId === String(this.env.SHARIKU_MANAGER_USER_ID)) {
      const expiry = Math.floor(Date.parse(this.env.SHARIKU_TELEGRAM_BIND_EXPIRES_AT || "") / 1000);
      if (!this.store.manager() && Number.isFinite(expiry) && now <= expiry && safeEqual(start[1], this.env.SHARIKU_TELEGRAM_BIND_TOKEN)) {
        this.store.bindManager(userId, chatId, now);
        await this.send(chatId, "Кабинет студии «Шарик» подключён. Сюда будут приходить заказы. После получения полной оплаты нажмите «Заказ оплачен», укажите сумму и подтвердите. Команда /orders — последние заказы.");
      }
      return;
    }
    if (!this.authorized(message.from, message.chat)) return;
    if (text === "/start" || text === "/help") { await this.send(chatId, "Кабинет подключён. /orders — последние заказы; /cancel — отменить ввод оплаты. Оплату отмечайте только после фактического получения денег."); return; }
    if (text === "/cancel") { this.store.clearFlow(userId); await this.send(chatId, "Ввод оплаты отменён. Статус заказа не изменён."); return; }
    if (text === "/orders") {
      const orders = this.store.recentOrders(20);
      if (!orders.length) await this.send(chatId, "Заказов пока нет.");
      for (const order of orders) await this.send(chatId, this.orderText(order), order.paid_at ? undefined : [[{ text: "Заказ оплачен", callback_data: `pay:${order.request_id}` }]]);
      return;
    }
    const flow = this.store.flow(userId);
    if (!flow || flow.expires_at < now || flow.stage !== "amount") return;
    const amount = parseAmount(text);
    if (!amount) { await this.send(chatId, "Введите фактически полученную полную сумму в рублях, например 2500 или 2500,50. /cancel — отмена."); return; }
    const nonce = randomBytes(12).toString("hex");
    this.store.setFlow(userId, flow.request_id, "confirm", now + 600, amount, nonce);
    const order = this.store.order(flow.request_id);
    await this.send(chatId, `${order.is_test ? "ТЕСТ — в рекламу не передаётся.\n" : ""}Подтвердить полную оплату заказа № ${flow.request_id} на ${rubles(amount)} ₽?\nНажимайте только после проверки поступления денег.`, [[{ text: `Подтвердить ${rubles(amount)} ₽`, callback_data: `confirm:${nonce}` }], [{ text: "Отмена", callback_data: `cancel:${nonce}` }]]);
  }
  async onCallback(callback, now) {
    const message = callback.message;
    if (!this.authorized(callback.from, message?.chat)) {
      await this.telegram("answerCallbackQuery", { callback_query_id: callback.id, text: "Доступ запрещён", show_alert: true }); return;
    }
    const userId = String(callback.from.id);
    const chatId = String(message.chat.id);
    const data = typeof callback.data === "string" ? callback.data : "";
    const pay = data.match(/^pay:([0-9a-f-]{36})$/);
    if (pay) {
      const order = this.store.order(pay[1]);
      if (!order || order.delivery_status !== "delivered") { await this.answer(callback, "Заказ недоступен"); return; }
      if (order.paid_at) { await this.answer(callback, "Оплата уже отмечена"); return; }
      this.store.setFlow(userId, order.request_id, "amount", now + 600);
      await this.answer(callback, "Укажите сумму в следующем сообщении");
      await this.send(chatId, `Заказ № ${order.request_id}. Введите полную полученную сумму в рублях. Например: 2500. Предоплату не отмечайте как полную оплату. /cancel — отмена.`);
      return;
    }
    const action = data.match(/^(confirm|cancel):([0-9a-f]{24})$/);
    if (!action) { await this.answer(callback, "Неизвестная команда"); return; }
    const flow = this.store.flow(userId);
    if (!flow || flow.expires_at < now || flow.stage !== "confirm" || !safeEqual(action[2], flow.nonce)) { await this.answer(callback, "Подтверждение истекло или уже использовано"); return; }
    if (action[1] === "cancel") { this.store.clearFlow(userId); await this.answer(callback, "Отменено"); return; }
    const changed = this.store.pay(flow.request_id, flow.amount_kopecks, userId, now);
    this.store.clearFlow(userId);
    await this.answer(callback, changed ? "Оплата сохранена" : "Оплата уже была сохранена");
    const order = this.store.order(flow.request_id);
    if (!changed) return;
    const matching = order.payload.analyticsConsent && order.payload.clientId;
    await this.send(chatId, `Оплата заказа № ${order.request_id} сохранена: ${rubles(order.paid_amount_kopecks)} ₽.\n${order.is_test ? "Технический тест: в рекламу не передаётся." : matching ? "Запись подготовлена для передачи в Яндекс. Это не подтверждение рекламного списания." : "В рекламу не передаётся: нет согласия на аналитику или идентификатора рекламного визита."}`);
    await this.telegram("editMessageReplyMarkup", { chat_id: chatId, message_id: order.telegram_message_id, reply_markup: { inline_keyboard: [] } });
  }
  answer(callback, text) { return this.telegram("answerCallbackQuery", { callback_query_id: callback.id, text }); }
}

function counterDate(timestamp, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(timestamp * 1000));
  const p = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

export function conversionFeed(store, env, now) {
  // This timezone must be the actual counter timezone, confirmed before deployment.
  const timezone = env.SHARIKU_METRIKA_TIMEZONE;
  if (!timezone) throw new Error("Counter timezone is required");
  const paidStatus = env.SHARIKU_PAID_GOAL || "PAID";
  if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(paidStatus) || ["IN_PROGRESS", "SPAM", "CANCELLED"].includes(paidStatus)) throw new Error("Invalid paid goal");
  const rows = store.ordersForExport(now);
  const header = "id;create_date_time;client_uniq_id;client_ids;order_status;revenue";
  const lines = rows.map(order => [
    order.request_id, counterDate(order.created_at, timezone), digest(order.payload.clientId).slice(0, 32),
    order.payload.clientId, order.paid_at ? paidStatus : "IN_PROGRESS", order.paid_at ? (order.paid_amount_kopecks / 100).toFixed(2) : "0",
  ].join(";"));
  const csv = `${[header, ...lines].join("\r\n")}\r\n`;
  return { csv, etag: digest(csv), lastModified: Math.max(store.feedModifiedAt(), ...rows.map(order => order.paid_at || order.created_at)) };
}
