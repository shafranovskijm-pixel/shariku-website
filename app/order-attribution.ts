export const ORDER_ATTRIBUTION_KEY = "shariku.order-attribution.v1";
const ATTRIBUTION_TTL = 30 * 60 * 1000;

// This record is separate from the human-readable WhatsApp source labels.
// Callers must obtain analytics consent before reading or writing it.
export function rememberOrderAttribution(href: string, stored: string | null, now = Date.now()) {
  const url = new URL(href);
  const yclid = url.searchParams.get("yclid");
  if (yclid && /^\d{1,100}$/.test(yclid)) {
    return JSON.stringify({ yclid, expiresAt: now + ATTRIBUTION_TTL });
  }
  // An explicitly different campaign must not inherit an old Yandex click.
  if (url.searchParams.has("utm_source")) return null;
  return readOrderAttribution(stored, now)
    ? stored
    : null;
}

export function readOrderAttribution(stored: string | null, now = Date.now()): { yclid: string } | null {
  try {
    const value = JSON.parse(stored ?? "null");
    if (typeof value?.yclid === "string" && /^\d{1,100}$/.test(value.yclid)
      && Number.isFinite(value.expiresAt) && value.expiresAt > now
      && value.expiresAt <= now + ATTRIBUTION_TTL) return { yclid: value.yclid };
  } catch { /* Invalid or expired attribution is ignored. */ }
  return null;
}
