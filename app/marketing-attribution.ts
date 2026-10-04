const MAX_LABEL_LENGTH = 64;
export const MARKETING_SOURCE_KEY = "shariku.marketing-source.v1";
const SOURCE_TTL_MS = 30 * 60 * 1000;

// Retain only the human-readable campaign labels. Never store the click ID or
// arbitrary URL parameters in the WhatsApp attribution record.
export function rememberMarketingSource(
  landingHref: string,
  stored: string | null,
  now = Date.now(),
) {
  const landing = new URL(landingHref);
  const labels = new URLSearchParams();
  const source = landing.searchParams.has("yclid")
    ? "yandex"
    : cleanLabel(landing.searchParams.get("utm_source"));

  if (source) {
    labels.set("utm_source", source);
    for (const key of ["utm_campaign", "utm_content"]) {
      const value = cleanLabel(landing.searchParams.get(key));
      if (value) labels.set(key, value);
    }
    return JSON.stringify({ labels: labels.toString(), expiresAt: now + SOURCE_TTL_MS });
  }

  try {
    const previous = JSON.parse(stored ?? "null");
    if (typeof previous?.labels === "string" && previous.labels.length <= 2048 &&
        Number.isFinite(previous.expiresAt) && previous.expiresAt > now &&
        previous.expiresAt <= now + SOURCE_TTL_MS) {
      const previousLabels = new URLSearchParams(previous.labels);
      for (const key of ["utm_source", "utm_campaign", "utm_content"]) {
        const value = cleanLabel(previousLabels.get(key));
        if (value) labels.set(key, value);
      }
      if (labels.has("utm_source")) {
        return JSON.stringify({ labels: labels.toString(), expiresAt: now + SOURCE_TTL_MS });
      }
    }
  } catch { /* Expired or malformed storage must not affect the order link. */ }
  return null;
}

export function marketingSourceHref(landingHref: string, stored: string | null) {
  const landing = new URL(landingHref);
  try {
    const source = JSON.parse(stored ?? "null");
    if (typeof source?.labels === "string") {
      landing.search = source.labels;
    }
  } catch { /* Use the current URL when storage is unavailable. */ }
  return landing.href;
}

function cleanLabel(value: string | null) {
  return value
    ?.replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_LABEL_LENGTH);
}

export function appendMarketingSource(
  contactHref: string,
  landingHref: string,
) {
  let contact: URL;
  let landing: URL;

  try {
    contact = new URL(contactHref);
    landing = new URL(landingHref);
  } catch {
    return contactHref;
  }

  if (contact.hostname !== "wa.me") return contactHref;

  const currentMessage = contact.searchParams.get("text") ?? "";
  if (currentMessage.includes("Источник обращения:")) return contactHref;

  const rawSource = cleanLabel(landing.searchParams.get("utm_source"));
  const source =
    landing.searchParams.has("yclid") || rawSource?.toLowerCase() === "yandex"
      ? "Яндекс.Директ"
      : rawSource;
  const campaign = cleanLabel(landing.searchParams.get("utm_campaign"));
  const content = cleanLabel(landing.searchParams.get("utm_content"));

  const details = [
    source,
    campaign ? `кампания ${campaign}` : undefined,
    content ? `объявление ${content}` : undefined,
  ].filter(Boolean);

  if (details.length === 0) return contactHref;

  const sourceNote = `Источник обращения: ${details.join(" · ")}.`;
  contact.searchParams.set(
    "text",
    currentMessage ? `${currentMessage}\n${sourceNote}` : sourceNote,
  );
  return contact.toString();
}
