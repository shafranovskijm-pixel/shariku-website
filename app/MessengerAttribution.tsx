"use client";

import { useEffect } from "react";

import { appendMarketingSource } from "./marketing-attribution";

export default function MessengerAttribution() {
  useEffect(() => {
    for (const link of document.querySelectorAll<HTMLAnchorElement>(
      'a[href^="https://wa.me/"]',
    )) {
      link.href = appendMarketingSource(link.href, window.location.href);
    }
  }, []);

  return null;
}
