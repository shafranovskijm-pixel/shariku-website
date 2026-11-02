export const ANALYTICS_CONSENT_KEY = "shariku.analytics-consent.v1";
export const ANALYTICS_CONSENT_VERSION = "2026-11-02";
export const ANALYTICS_CONSENT_MAX_AGE = 180 * 24 * 60 * 60 * 1000;

export type AnalyticsConsentRecord = {
  version: string;
  analytics: boolean;
  decidedAt: string;
  expiresAt: string;
};

export function createAnalyticsConsent(
  analytics: boolean,
  now = Date.now(),
): AnalyticsConsentRecord {
  return {
    version: ANALYTICS_CONSENT_VERSION,
    analytics,
    decidedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ANALYTICS_CONSENT_MAX_AGE).toISOString(),
  };
}

// A previous policy version, expired choice or malformed value never enables
// tracking. The same expiry rules apply to an acceptance and a refusal.
export function readAnalyticsConsent(
  stored: string | null,
  now = Date.now(),
): AnalyticsConsentRecord | null {
  try {
    const record = JSON.parse(stored ?? "null");
    if (
      record?.version !== ANALYTICS_CONSENT_VERSION ||
      typeof record.analytics !== "boolean" ||
      typeof record.decidedAt !== "string" ||
      typeof record.expiresAt !== "string"
    ) return null;

    const decidedAt = Date.parse(record.decidedAt);
    const expiresAt = Date.parse(record.expiresAt);
    if (
      !Number.isFinite(decidedAt) ||
      !Number.isFinite(expiresAt) ||
      decidedAt > now ||
      expiresAt <= now ||
      expiresAt - decidedAt !== ANALYTICS_CONSENT_MAX_AGE
    ) return null;

    return {
      version: record.version,
      analytics: record.analytics,
      decidedAt: record.decidedAt,
      expiresAt: record.expiresAt,
    };
  } catch {
    return null;
  }
}
