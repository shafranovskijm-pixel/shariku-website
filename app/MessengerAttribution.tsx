"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { appendMarketingSource, MARKETING_SOURCE_KEY, marketingSourceHref, rememberMarketingSource } from "./marketing-attribution";

const originalLinks = new Map<HTMLAnchorElement, { original: string; attributed: string }>();

export function clearMarketingAttribution() {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.removeItem(MARKETING_SOURCE_KEY); } catch { /* Storage can be disabled. */ }
  for (const [link, saved] of originalLinks) {
    if (link.getAttribute("href") === saved.attributed) link.setAttribute("href", saved.original);
  }
  originalLinks.clear();
}

export default function MessengerAttribution({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  useEffect(() => {
    if (!enabled) {
      clearMarketingAttribution();
      return;
    }
    let previous: string | null = null;
    try { previous = window.sessionStorage.getItem(MARKETING_SOURCE_KEY); } catch { /* Storage can be disabled. */ }
    const stored = rememberMarketingSource(window.location.href, previous);
    try {
      if (stored) window.sessionStorage.setItem(MARKETING_SOURCE_KEY, stored);
      else window.sessionStorage.removeItem(MARKETING_SOURCE_KEY);
    } catch { /* Current-page attribution still works without storage. */ }
    const sourceHref = marketingSourceHref(window.location.href, stored);
    for (const link of document.querySelectorAll<HTMLAnchorElement>(
      'a[href^="https://wa.me/"]',
    )) {
      const href = link.getAttribute("href") ?? link.href;
      const saved = originalLinks.get(link);
      const original = saved && href === saved.attributed ? saved.original : href;
      const attributed = appendMarketingSource(original, sourceHref);
      originalLinks.set(link, { original, attributed });
      link.setAttribute("href", attributed);
    }
    // Retain original hrefs across SPA route changes so withdrawal can restore
    // every surviving link without changing its order message.
    for (const link of originalLinks.keys()) {
      if (!link.isConnected) originalLinks.delete(link);
    }
  }, [pathname, enabled]);

  return null;
}
