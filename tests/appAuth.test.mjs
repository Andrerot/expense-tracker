import assert from "node:assert/strict";
import {
  clearPinRateLimit,
  createAuthToken,
  isPinRateLimited,
  isPinValid,
  recordFailedPinAttempt,
  verifyAuthToken,
} from "../src/lib/appAuth.ts";

process.env.APP_PIN = "2468";
process.env.APP_AUTH_SECRET = "test-secret";

assert.equal(isPinValid("2468"), true);
assert.equal(isPinValid("0000"), false);

const token = await createAuthToken();
assert.equal(await verifyAuthToken(token), true);
assert.equal(await verifyAuthToken(`${token}x`), false);
assert.equal(await verifyAuthToken(undefined), false);

const rateLimitKey = "test-rate-limit-key";
const now = Date.parse("2026-05-01T10:00:00.000Z");
clearPinRateLimit(rateLimitKey);
assert.equal(isPinRateLimited(rateLimitKey, now), false);

for (let index = 0; index < 5; index += 1) {
  recordFailedPinAttempt(rateLimitKey, now + index);
}

assert.equal(isPinRateLimited(rateLimitKey, now + 5), true);
assert.equal(isPinRateLimited(rateLimitKey, now + 10 * 60 * 1000 + 1), false);
clearPinRateLimit(rateLimitKey);

console.log("ok - app auth validates pin, signed unlock token and rate limit");
