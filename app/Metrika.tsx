"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const COUNTER_ID = 111239502;
const SCRIPT_ID = "shariku-metrika";

type MetrikaFunction = ((...args: unknown[]) => void) & {
  a?: unknown[][];
  l?: number;
};

declare global {
  interface Window {
    ym?: MetrikaFunction;
    __sharikuMetrikaInitialized?: boolean;
    __sharikuLastPageView?: string;
    __sharikuAnalyticsAllowed?: boolean;
  }
}

function clearMetrikaCookies() {
  const names = document.cookie.split(";")
    .map((cookie) => cookie.trim().split("=")[0])
    .filter((name) => name.startsWith("_ym_"));
  const hostname = window.location.hostname;
  const parts = hostname.split(".");
  const domains = new Set(["", hostname]);
  for (let index = 1; index < parts.length - 1; index++) {
    domains.add(parts.slice(index).join("."));
  }
  const paths = new Set(["/"]);
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  for (let index = 1; index <= pathParts.length; index++) {
    const path = `/${pathParts.slice(0, index).join("/")}`;
    paths.add(path);
    paths.add(`${path}/`);
  }
  for (const name of names) for (const domain of domains) for (const path of paths) {
    document.cookie = `${name}=; Max-Age=0; Path=${path};${domain ? ` Domain=${domain};` : ""} SameSite=Lax`;
  }
}

export function stopMetrika() {
  if (typeof window === "undefined") return;
  window.__sharikuAnalyticsAllowed = false;
  // Clear queued hits as well as an already running counter. Removing a script
  // element alone does not undo a loaded third-party tracker.
  if (window.ym?.a) window.ym.a.length = 0;
  if (window.__sharikuMetrikaInitialized) {
    try { window.ym?.(COUNTER_ID, "destruct"); } catch { /* Continue withdrawal even if the tracker failed. */ }
  }
  document.getElementById(SCRIPT_ID)?.remove();
  delete window.ym;
  delete window.__sharikuMetrikaInitialized;
  delete window.__sharikuLastPageView;
  clearMetrikaCookies();
}

export default function Metrika({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  useEffect(() => {
    if (!enabled) return;
    window.__sharikuAnalyticsAllowed = true;
    if (!window.ym) {
      const ym: MetrikaFunction = (...args: unknown[]) => {
        ym.a = ym.a || [];
        ym.a.push(args);
      };

      ym.l = Date.now();
      window.ym = ym;

      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.async = true;
      script.src = `https://mc.yandex.ru/metrika/tag.js?id=${COUNTER_ID}`;
      document.head.appendChild(script);
    }

    if (!window.__sharikuMetrikaInitialized) {
      window.ym?.(COUNTER_ID, "init", {
        ssr: true,
        defer: true,
        webvisor: false,
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
      if (!window.__sharikuAnalyticsAllowed) return;
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
  }, [pathname, enabled]);

  return null;
}
