const MAX_LABEL_LENGTH = 64;

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
