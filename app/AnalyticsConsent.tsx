"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Metrika, { stopMetrika } from "./Metrika";
import MessengerAttribution, { clearMarketingAttribution } from "./MessengerAttribution";
import {
  ANALYTICS_CONSENT_KEY,
  createAnalyticsConsent,
  readAnalyticsConsent,
  type AnalyticsConsentRecord,
} from "./analytics-consent";
import styles from "./AnalyticsConsent.module.css";

function storedChoice() {
  try {
    return readAnalyticsConsent(window.localStorage.getItem(ANALYTICS_CONSENT_KEY));
  } catch {
    return null;
  }
}

function stopAnalytics() {
  // Stop synchronously, before React renders the changed choice or a reload.
  stopMetrika();
  clearMarketingAttribution();
}

export default function AnalyticsConsent() {
  const [choice, setChoice] = useState<AnalyticsConsentRecord | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const enabled = choice?.analytics === true;
  const enabledRef = useRef(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  const applyChoice = useCallback((next: AnalyticsConsentRecord | null) => {
    const wasEnabled = enabledRef.current;
    enabledRef.current = next?.analytics === true;
    if (!enabledRef.current) stopAnalytics();
    setChoice(next);
    setOpen(next === null);
    // A loaded third-party script cannot be completely unloaded from a page.
    // Recreate the document with the saved refusal after destructing it.
    if (wasEnabled && !enabledRef.current) window.location.reload();
  }, []);

  useEffect(() => {
    applyChoice(storedChoice());
    setReady(true);

    const showSettings = () => {
      returnFocus.current = document.activeElement instanceof HTMLElement
        ? document.activeElement : null;
      setOpen(true);
    };
    const syncStorage = (event: StorageEvent) => {
      if (event.key === ANALYTICS_CONSENT_KEY || event.key === null) {
        applyChoice(storedChoice());
      }
    };
    window.addEventListener("shariku:privacy-settings", showSettings);
    window.addEventListener("storage", syncStorage);
    return () => {
      window.removeEventListener("shariku:privacy-settings", showSettings);
      window.removeEventListener("storage", syncStorage);
    };
  }, [applyChoice]);

  useEffect(() => {
    if (!choice) return;
    let timer: number;
    const recheck = () => {
      window.clearTimeout(timer);
      const remaining = Date.parse(choice.expiresAt) - Date.now();
      if (remaining <= 0) applyChoice(null);
      else timer = window.setTimeout(recheck, Math.min(remaining, 2_147_483_647));
    };
    recheck();
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, [choice, applyChoice]);

  useEffect(() => {
    if (open && returnFocus.current) heading.current?.focus();
    if (!open || !choice) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        returnFocus.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, choice]);

  function choose(analytics: boolean) {
    const next = createAnalyticsConsent(analytics);
    try {
      window.localStorage.setItem(ANALYTICS_CONSENT_KEY, JSON.stringify(next));
    } catch {
      // The choice remains valid in this document when browser storage is off.
    }
    applyChoice(next);
    returnFocus.current?.focus();
  }

  return (
    <>
      <Metrika enabled={enabled} />
      <MessengerAttribution enabled={enabled} />
      {ready && open && (
        <section className={styles.panel} aria-labelledby="analytics-consent-title">
          <div className={styles.heading}>
            <h2 id="analytics-consent-title" ref={heading} tabIndex={-1}>Настройки аналитики</h2>
            {choice && (
              <button className={styles.close} type="button" aria-label="Закрыть настройки"
                onClick={() => { setOpen(false); returnFocus.current?.focus(); }}>×</button>
            )}
          </div>
          <p>С вашего согласия используем Яндекс Метрику для статистики посещений, оценки рекламы и нажатий на кнопки связи. Сервис использует cookie и получает технические данные о посещении. Запись действий в Вебвизоре отключена.</p>
          <p>Нажимая «Разрешить аналитику», вы даёте <a href="/analytics-consent/">отдельное согласие на обработку данных для аналитики</a>. Выбор действует 180 дней. Изменить его можно внизу любой страницы.</p>
          {choice && <p className={styles.status}>Сейчас аналитика {enabled ? "включена" : "выключена"}.</p>}
          <div className={styles.actions}>
            <button className={styles.action} type="button" onClick={() => choose(true)}>Разрешить аналитику</button>
            <button className={styles.action} type="button" onClick={() => choose(false)}>{enabled ? "Отключить аналитику" : "Отказаться"}</button>
          </div>
        </section>
      )}
    </>
  );
}
