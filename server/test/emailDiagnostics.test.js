import assert from "node:assert/strict";
import test from "node:test";

import { safeEmailProviderFailure } from "../src/services/emailService.js";

test("email diagnostics expose only a bounded provider code and status", () => {
  const details = safeEmailProviderFailure({
    name: "validation_error",
    statusCode: 422,
    message: "private recipient reset URL token=password",
  });
  assert.deepEqual(details, { providerCode: "validation_error", providerStatusCode: 422 });
  assert.equal(JSON.stringify(details).includes("private"), false);
  assert.equal(JSON.stringify(details).includes("token"), false);
  assert.equal(JSON.stringify(details).includes("password"), false);
});

test("untrusted provider error strings are replaced with a generic code", () => {
  assert.deepEqual(
    safeEmailProviderFailure({ code: "recipient@example.test?token=secret" }),
    { providerCode: "provider_error" },
  );
  assert.deepEqual(
    safeEmailProviderFailure({ code: "A".repeat(43) }),
    { providerCode: "provider_error" },
  );
});
