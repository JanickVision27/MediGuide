import assert from "node:assert/strict";
import test from "node:test";

import {
  getMissingPasswordResetEmailConfiguration,
  getPasswordResetAppUrl,
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

test("email links reuse configured frontend origins and still require a verified sender", () => {
  const keys = ["RESEND_API_KEY", "MAIL_FROM", "APP_URL", "CLIENT_ORIGIN", "CLIENT_URL"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  try {
    process.env.RESEND_API_KEY = "re_test_only";
    process.env.APP_URL = "https://app.example.test";
    delete process.env.CLIENT_ORIGIN;
    delete process.env.CLIENT_URL;
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
    assert.deepEqual(getMissingPasswordResetEmailConfiguration(), ["APP_URL"]);

    process.env.CLIENT_ORIGIN = "http://localhost:5173,http://127.0.0.1:5173";
    assert.equal(getPasswordResetAppUrl(), "http://localhost:5173");
    assert.equal(isPasswordResetEmailConfigured(), true);
    assert.equal(isAppointmentReminderEmailConfigured(), true);

    delete process.env.CLIENT_ORIGIN;
    process.env.CLIENT_URL = "https://client.example.test/";
    assert.equal(getPasswordResetAppUrl(), "https://client.example.test");

    process.env.APP_URL = "https://app.example.test";
    assert.equal(getPasswordResetAppUrl(), "https://app.example.test");

    process.env.APP_URL = "not-a-valid-url";
    assert.equal(getPasswordResetAppUrl(), null);
    assert.equal(isPasswordResetEmailConfigured(), false);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
