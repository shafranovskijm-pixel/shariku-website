"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ORDER_ATTRIBUTION_KEY, rememberOrderAttribution } from "./order-attribution";

export function clearOrderAttribution() {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.removeItem(ORDER_ATTRIBUTION_KEY); } catch { /* Storage may be disabled. */ }
}

export default function OrderAttribution({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  useEffect(() => {
    if (!enabled) { clearOrderAttribution(); return; }
    try {
      const value = rememberOrderAttribution(window.location.href, window.sessionStorage.getItem(ORDER_ATTRIBUTION_KEY));
      if (value) window.sessionStorage.setItem(ORDER_ATTRIBUTION_KEY, value);
      else window.sessionStorage.removeItem(ORDER_ATTRIBUTION_KEY);
    } catch { /* Current-page attribution remains available without storage. */ }
  }, [enabled, pathname]);
  return null;
}
