"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const COUNTER_ID = 111239502;

type MetrikaFunction = ((...args: unknown[]) => void) & {
  a?: unknown[][];
  l?: number;
};

declare global {
  interface Window {
    ym?: MetrikaFunction;
    __sharikuMetrikaInitialized?: boolean;
    __sharikuLastPageView?: string;
  }
}

export default function Metrika() {
  const pathname = usePathname();
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
        defer: true,
        webvisor: true,
        clickmap: true,
        accurateTrackBounce: true,
        trackLinks: true,
      });
      window.__sharikuMetrikaInitialized = true;
    }

    const pageUrl = window.location.href;
    if (window.__sharikuLastPageView !== pageUrl) {
      window.ym?.(COUNTER_ID, "hit", pageUrl, {
        title: document.title,
        referer: window.__sharikuLastPageView ?? document.referrer,
      });
      window.__sharikuLastPageView = pageUrl;
      if (pathname === "/works" || pathname === "/works/") {
        window.ym?.(COUNTER_ID, "reachGoal", "works_view");
      }
    }

    const trackContactClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (!link) return;

      const href = link.href;
      const goals = new Set<string>();
      const explicitGoal = link.dataset.ymGoal;
      if (explicitGoal) goals.add(explicitGoal);

      if (href.includes("wa.me/")) goals.add("whatsapp_click");
      else if (href.includes("t.me/")) goals.add("telegram_click");
      else if (href.startsWith("tel:")) goals.add("phone_click");

      for (const goal of goals) {
        window.ym?.(COUNTER_ID, "reachGoal", goal);
      }
    };

    document.addEventListener("click", trackContactClick);
    return () => document.removeEventListener("click", trackContactClick);
  }, [pathname]);

  return null;
}
