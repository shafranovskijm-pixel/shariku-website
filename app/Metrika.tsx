"use client";

import { useEffect } from "react";

const COUNTER_ID = 111239502;

type MetrikaFunction = ((...args: unknown[]) => void) & {
  a?: unknown[][];
  l?: number;
};

declare global {
  interface Window {
    ym?: MetrikaFunction;
    __sharikuMetrikaInitialized?: boolean;
  }
}

export default function Metrika() {
  useEffect(() => {
    if (!window.ym) {
      const ym: MetrikaFunction = (...args: unknown[]) => {
        ym.a = ym.a || [];
        ym.a.push(args);
      };

      ym.l = Date.now();
      window.ym = ym;

      const script = document.createElement("script");
      script.async = true;
      script.src = `https://mc.yandex.ru/metrika/tag.js?id=${COUNTER_ID}`;
      document.head.appendChild(script);
    }

    if (!window.__sharikuMetrikaInitialized) {
      window.ym?.(COUNTER_ID, "init", {
        ssr: true,
        webvisor: true,
        clickmap: true,
        accurateTrackBounce: true,
        trackLinks: true,
      });
      window.__sharikuMetrikaInitialized = true;
    }

    if (window.location.pathname.startsWith("/works")) {
      window.ym?.(COUNTER_ID, "reachGoal", "works_view");
    }

    const trackContactClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (!link) return;

      const href = link.href;
      let goal: string | undefined;

      if (href.includes("wa.me/")) goal = "whatsapp_click";
      else if (href.includes("t.me/")) goal = "telegram_click";
      else if (href.startsWith("tel:")) goal = "phone_click";

      if (goal) window.ym?.(COUNTER_ID, "reachGoal", goal);
    };

    document.addEventListener("click", trackContactClick);
    return () => document.removeEventListener("click", trackContactClick);
  }, []);

  return null;
}
