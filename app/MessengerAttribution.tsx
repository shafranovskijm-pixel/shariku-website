"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { appendMarketingSource, MARKETING_SOURCE_KEY, marketingSourceHref, rememberMarketingSource } from "./marketing-attribution";

export default function MessengerAttribution() {
  const pathname = usePathname();
  useEffect(() => {
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
      link.href = appendMarketingSource(link.href, sourceHref);
    }
  }, [pathname]);

  return null;
}
