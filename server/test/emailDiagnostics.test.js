import assert from "node:assert/strict";
import test from "node:test";

import {
  getMissingPasswordResetEmailConfiguration,
  isAppointmentReminderEmailConfigured,
  isPasswordResetEmailConfigured,
  safeEmailProviderFailure,
} from "../src/services/emailService.js";

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

test("password reset and reminder delivery require APP_URL and a verified sender", () => {
  const keys = ["RESEND_API_KEY", "MAIL_FROM", "APP_URL"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  try {
    process.env.RESEND_API_KEY = "re_test_only";
    process.env.APP_URL = "http://localhost:5173";
    delete process.env.MAIL_FROM;

    assert.equal(isPasswordResetEmailConfigured(), false);
    assert.equal(isAppointmentReminderEmailConfigured(), false);
    assert.deepEqual(getMissingPasswordResetEmailConfiguration(), ["MAIL_FROM"]);

    process.env.MAIL_FROM = "MediGuide <sender@example.test>";
    assert.equal(isPasswordResetEmailConfigured(), true);
    assert.equal(isAppointmentReminderEmailConfigured(), true);

    delete process.env.APP_URL;
    assert.equal(isPasswordResetEmailConfigured(), false);
    assert.equal(isAppointmentReminderEmailConfigured(), false);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
