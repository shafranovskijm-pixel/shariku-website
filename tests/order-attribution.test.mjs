import assert from "node:assert/strict";
import test from "node:test";
import { rememberOrderAttribution, readOrderAttribution } from "../app/order-attribution.ts";

const now = 1_000_000;
test("preserves a permitted numeric click identifier across untagged pages without copying other URL data", () => {
  const stored = rememberOrderAttribution("https://shariku.ru/?yclid=123456789&utm_campaign=search&email=private@example.test", null, now);
  assert.deepEqual(readOrderAttribution(stored, now), { yclid: "123456789" });
  assert.doesNotMatch(stored, /email|private|utm_campaign/);
  assert.equal(rememberOrderAttribution("https://shariku.ru/order/", stored, now + 1000), stored);
});

test("does not carry an earlier click into a new tagged campaign or extend its thirty-minute lifetime", () => {
  const stored = rememberOrderAttribution("https://shariku.ru/?yclid=123456789", null, now);
  assert.equal(rememberOrderAttribution("https://shariku.ru/?utm_source=telegram", stored, now + 1000), null);
  assert.equal(readOrderAttribution(stored, now + 1_800_000), null);
  assert.equal(rememberOrderAttribution("https://shariku.ru/order/", stored, now + 1_800_000), null);
});

test("rejects malformed, future, nonnumeric and overlong attribution records", () => {
  for (const stored of ["broken", JSON.stringify({ yclid: "bad", expiresAt: now + 10 }), JSON.stringify({ yclid: "1", expiresAt: now + 1_800_001 })]) {
    assert.equal(readOrderAttribution(stored, now), null);
  }
  assert.equal(rememberOrderAttribution("https://shariku.ru/?yclid=not-a-number", null, now), null);
  assert.equal(rememberOrderAttribution(`https://shariku.ru/?yclid=${"1".repeat(101)}`, null, now), null);
});
