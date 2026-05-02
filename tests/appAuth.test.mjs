import assert from "node:assert/strict";
import { createAuthToken, isPinValid, verifyAuthToken } from "../src/lib/appAuth.ts";

process.env.APP_PIN = "2468";
process.env.APP_AUTH_SECRET = "test-secret";

assert.equal(isPinValid("2468"), true);
assert.equal(isPinValid("0000"), false);

const token = await createAuthToken();
assert.equal(await verifyAuthToken(token), true);
assert.equal(await verifyAuthToken(`${token}x`), false);
assert.equal(await verifyAuthToken(undefined), false);

console.log("ok - app auth validates pin and signed unlock token");
