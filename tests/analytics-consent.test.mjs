import assert from "node:assert/strict";
import test from "node:test";
import {
  ANALYTICS_CONSENT_MAX_AGE,
  createAnalyticsConsent,
  readAnalyticsConsent,
} from "../app/analytics-consent.ts";

const now = Date.parse("2026-11-02T09:00:00Z");

test("requires an explicit boolean decision from the current policy version", () => {
  assert.equal(readAnalyticsConsent(null, now), null);
  assert.equal(readAnalyticsConsent("broken json", now), null);
  const record = createAnalyticsConsent(true, now);
  assert.equal(readAnalyticsConsent(JSON.stringify(record), now)?.analytics, true);
  assert.equal(readAnalyticsConsent(JSON.stringify({ ...record, analytics: "true" }), now), null);
  assert.equal(readAnalyticsConsent(JSON.stringify({ ...record, version: "old" }), now), null);
});

test("remembers refusal with the same 180-day lifetime as acceptance", () => {
  for (const allowed of [true, false]) {
    const record = createAnalyticsConsent(allowed, now);
    assert.equal(Date.parse(record.expiresAt) - Date.parse(record.decidedAt), ANALYTICS_CONSENT_MAX_AGE);
    assert.equal(readAnalyticsConsent(JSON.stringify(record), now + ANALYTICS_CONSENT_MAX_AGE - 1)?.analytics, allowed);
    assert.equal(readAnalyticsConsent(JSON.stringify(record), now + ANALYTICS_CONSENT_MAX_AGE), null);
  }
});

test("does not accept future, invalid or indefinitely extended consent records", () => {
  const record = createAnalyticsConsent(true, now);
  assert.equal(readAnalyticsConsent(JSON.stringify(record), now - 1), null);
  assert.equal(readAnalyticsConsent(JSON.stringify({ ...record, decidedAt: "not a date" }), now), null);
  assert.equal(readAnalyticsConsent(JSON.stringify({ ...record, expiresAt: "9999-01-01T00:00:00Z" }), now), null);
});
