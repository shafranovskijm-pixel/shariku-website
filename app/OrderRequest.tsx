"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ORDER_ATTRIBUTION_KEY, readOrderAttribution } from "./order-attribution";
import type { OrderService } from "./order-link";
import styles from "./OrderRequest.module.css";

const COUNTER_ID = 111239502;
const ENDPOINT = process.env.NEXT_PUBLIC_SHARIKU_ORDER_ENDPOINT ?? "";
const CONSENT_VERSION = "2026-11-07";
const services: [OrderService, string][] = [
  ["flowers", "Цветы и букеты"], ["balloons", "Воздушные шары"],
  ["decoration", "Оформление праздника"], ["other", "Хочу посоветоваться"],
];

type RequestPayload = {
  requestId: string; name: string; phone: string; service: OrderService;
  details: string; eventDate?: string; website: string; consent: true;
  consentVersion: string; analyticsConsent: boolean; clientId?: string; yclid?: string;
};

function endpointConfigured() {
  try {
    const url = new URL(ENDPOINT);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}

async function analyticsIdentifiers() {
  if (window.__sharikuAnalyticsAllowed !== true) return { analyticsConsent: false };
  let yclid: string | undefined;
  try {
    const current = new URL(window.location.href).searchParams.get("yclid");
    yclid = current && /^\d{1,100}$/.test(current) ? current
      : readOrderAttribution(window.sessionStorage.getItem(ORDER_ATTRIBUTION_KEY))?.yclid;
  } catch { /* Optional attribution must not prevent an order. */ }
  const clientId = await new Promise<string | undefined>((resolve) => {
    const timer = window.setTimeout(() => resolve(undefined), 1200);
    if (!window.ym) { window.clearTimeout(timer); resolve(undefined); return; }
    window.ym(COUNTER_ID, "getClientID", (value: unknown) => {
      window.clearTimeout(timer);
      resolve(typeof value === "string" && /^\d{1,30}$/.test(value) ? value : undefined);
    });
  });
  // Respect withdrawal even when it happens while waiting for the counter.
  return window.__sharikuAnalyticsAllowed === true
    ? { analyticsConsent: true, clientId, yclid }
    : { analyticsConsent: false };
}

export default function OrderRequest() {
  const [service, setService] = useState<OrderService>("other");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState("");
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);
  const payload = useRef<RequestPayload | null>(null);
  const pending = useRef(false);
  const status = useRef<HTMLDivElement>(null);
  const configured = endpointConfigured();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("service");
    if (services.some(([value]) => value === requested)) setService(requested as OrderService);
    const subject = params.get("subject")?.replace(/[\r\n\t]+/g, " ").trim().slice(0, 200);
    if (subject) setDetails(`Интересует: ${subject}.`);
  }, []);

  useEffect(() => {
    if (!configured) return;
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3000);
    void (async () => {
      try {
        const response = await fetch(`${new URL(ENDPOINT).origin}/health`, {
          method: "GET", credentials: "omit", cache: "no-store", signal: controller.signal,
        });
        const health = await response.json();
        if (active && response.ok && health?.ok === true && health.ready === true) setReady(true);
      } catch { /* Direct contacts remain available when receipt is not confirmed ready. */ }
      finally { window.clearTimeout(timeout); }
    })();
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [configured]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || !ready || pending.current || receipt) return;
    const form = event.currentTarget;
    if (!payload.current && !form.reportValidity()) return;
    pending.current = true;
    setBusy(true); setError("");
    try {
      if (!payload.current) {
        const fields = new FormData(form);
        const phone = String(fields.get("phone") ?? "").trim();
        const text = String(fields.get("details") ?? "").trim();
        if (!/^\d{10,15}$/.test(phone.replace(/\D/g, ""))) {
          setError("Проверьте номер телефона: укажите от 10 до 15 цифр.");
          return;
        }
        if (text.length < 5) { setError("Расскажите немного подробнее, что хотите заказать."); return; }
        const attribution = await analyticsIdentifiers();
        payload.current = {
          requestId: window.crypto.randomUUID(), name: String(fields.get("name") ?? "").trim(),
          phone, service, details: text, eventDate: String(fields.get("eventDate") ?? "") || undefined,
          website: String(fields.get("website") ?? ""), consent: true, consentVersion: CONSENT_VERSION,
          ...attribution,
        };
        setLocked(true);
      }
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 25000);
      let response: Response;
      try {
        const sent = window.__sharikuAnalyticsAllowed === true ? payload.current : {
          ...payload.current, analyticsConsent: false, clientId: undefined, yclid: undefined,
        };
        response = await fetch(ENDPOINT, {
          method: "POST", headers: { "Content-Type": "application/json" },
          credentials: "omit", cache: "no-store", body: JSON.stringify(sent), signal: controller.signal,
        });
      } finally { window.clearTimeout(timeout); }
      const result = await response.json();
      if (response.ok && result?.ok === true && result.delivered === true && result.requestId === payload.current.requestId) {
        setReceipt(result.requestId);
        // Receipt is an enquiry, never a sale. A paid order is confirmed by the manager on the server.
        payload.current = null;
        window.setTimeout(() => status.current?.focus(), 0);
        return;
      }
      if (result?.code === "INVALID_REQUEST" || result?.code === "CONSENT_REQUIRED") {
        payload.current = null; setLocked(false);
        setError("Проверьте телефон, описание и согласие, затем отправьте заявку ещё раз.");
      } else if (response.status === 429) {
        setError("Слишком много попыток. Подождите немного и проверьте отправку ещё раз или позвоните Екатерине.");
      } else {
        setError("Не удалось подтвердить получение заявки. Проверьте отправку ещё раз — мы сохраним её номер, чтобы не отправить повторно. Или позвоните Екатерине.");
      }
    } catch {
      setError("Не удалось подтвердить получение заявки. Проверьте соединение и повторите проверку отправки. Или позвоните Екатерине.");
    } finally { pending.current = false; setBusy(false); }
  }

  return (
    <div className={styles.layout}>
      <section className={styles.formCard} aria-labelledby="order-form-title">
        <h2 id="order-form-title">Расскажите о вашем заказе</h2>
        <p className={styles.intro}>Оставьте номер и пожелания. Екатерина свяжется с вами, чтобы согласовать состав, стоимость и время.</p>
        {!ready && (
          <div className={styles.fallback}>
            <p>Обсудить заказ сейчас можно напрямую с Екатериной.</p>
            <a className="button button-primary" href="tel:+79243370123">Позвонить Екатерине</a>
            <a href="https://wa.me/79243370123">Написать в WhatsApp ↗</a>
          </div>
        )}
        {configured && <div hidden={!ready}>
        {receipt ? (
          <div className={styles.success} ref={status} tabIndex={-1} role="status">
            <span className={styles.check} aria-hidden="true">✓</span>
            <h3>Заявка передана Екатерине</h3>
            <p>Номер заявки: <strong>{receipt}</strong></p>
            <p>Состав, стоимость и время получения согласуем с вами отдельно. Оплата на этой странице не принимается.</p>
            <a href="/works/">Посмотреть наши работы →</a>
          </div>
        ) : (
          <form onSubmit={submit}>
            <fieldset disabled={!ready || busy || locked} className={styles.fields}>
              <div className={styles.row}>
                <label>Ваше имя <span>необязательно</span><input name="name" autoComplete="given-name" maxLength={80} placeholder="Как к вам обращаться" /></label>
                <label>Телефон <input name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={30} placeholder="+7 ___ ___-__-__" /></label>
              </div>
              <div className={styles.row}>
                <label>Что вас интересует<select name="service" value={service} onChange={(event) => setService(event.target.value as OrderService)}>{services.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                <label>Дата события <span>необязательно</span><input type="date" name="eventDate" /></label>
              </div>
              <label>Пожелания<textarea name="details" required minLength={5} maxLength={1000} rows={5} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Повод, цветовая гамма, количество, пожелания к букету или оформлению…" /></label>
              <div className={styles.honeypot} aria-hidden="true"><label>Ваш сайт<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
              <label className={styles.consent}><input type="checkbox" name="consent" required /><span>Даю отдельное <a href="/order-consent/" target="_blank" rel="noopener noreferrer">согласие на обработку данных заявки</a> ИП Байтимировой Екатерине Алексеевне, включая передачу менеджеру через Telegram. <a href="/privacy/" target="_blank" rel="noopener noreferrer">Политика конфиденциальности</a>.</span></label>
            </fieldset>
            {error && <div className={styles.error} role="alert"><p>{error}</p>{payload.current && <p className={styles.requestNumber}>Номер заявки: {payload.current.requestId}</p>}</div>}
            <button className={`button button-primary ${styles.submit}`} type="submit" disabled={!ready || busy}>
              {busy ? "Передаём заявку…" : locked ? "Проверить отправку ещё раз" : "Отправить заявку"}<span aria-hidden="true">→</span>
            </button>
            <p className={styles.note}>Заявка не обязывает к оплате. Согласие на аналитику необязательно для отправки.</p>
            <noscript><p>Для отправки формы включите JavaScript или позвоните Екатерине: <a href="tel:+79243370123">+7 924 337-01-23</a>.</p></noscript>
          </form>
        )}
        </div>}
      </section>
      <aside className={styles.aside} aria-label="Связь со студией">
        <p className="eyebrow">На связи — Екатерина</p>
        <h2>Начнём с вашей идеи</h2>
        <p>Подберём цветы, шары или оформление под ваш повод. Наличие и итоговую стоимость уточним до подтверждения заказа.</p>
        <ol><li>Вы оставляете пожелания</li><li>Обсуждаем детали и расчёт</li><li>Подтверждаем состав и время</li></ol>
        <div className={styles.contacts}><span>Удобнее поговорить?</span><a href="tel:+79243370123">+7 924 337-01-23</a><a className={styles.messenger} href="https://wa.me/79243370123">Написать в WhatsApp ↗</a></div>
        <p className={styles.address}>Уссурийск, Садовая, 3г<br />Пн–Сб 10:00–19:00 · Вс 10:00–18:00</p>
      </aside>
    </div>
  );
}
