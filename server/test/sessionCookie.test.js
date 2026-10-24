import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { getCookieOptions, SESSION_COOKIE } from "../src/utils/session.js";

const ENV_KEYS = ["NODE_ENV", "SESSION_COOKIE_SAME_SITE"];
const original = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

function restoreEnv() {
  for (const key of ENV_KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
}

afterEach(restoreEnv);

test("the session cookie is HttpOnly and scoped to the whole site", () => {
  delete process.env.SESSION_COOKIE_SAME_SITE;
  process.env.NODE_ENV = "production";

  const options = getCookieOptions();

  assert.equal(SESSION_COOKIE, "mediguide_session");
  assert.equal(options.httpOnly, true);
  assert.equal(options.path, "/");
});

test("same-origin deployments (Vercel /api proxy) keep SameSite=Lax", () => {
  delete process.env.SESSION_COOKIE_SAME_SITE;
  process.env.NODE_ENV = "production";

  assert.equal(getCookieOptions().sameSite, "lax");
});

test("cross-site deployments can opt into SameSite=None with Secure", () => {
  process.env.NODE_ENV = "production";
  process.env.SESSION_COOKIE_SAME_SITE = "none";

  const options = getCookieOptions();

  assert.equal(options.sameSite, "none");
  // Browsers reject SameSite=None cookies that are not Secure.
  assert.equal(options.secure, true);
});

test("SameSite=None forces Secure even outside production", () => {
  process.env.NODE_ENV = "development";
  process.env.SESSION_COOKIE_SAME_SITE = "cross-site";

  const options = getCookieOptions();

  assert.equal(options.sameSite, "none");
  assert.equal(options.secure, true);
});

test("local development without HTTPS stays insecure and Lax", () => {
  process.env.NODE_ENV = "development";
  delete process.env.SESSION_COOKIE_SAME_SITE;

  const options = getCookieOptions();

  assert.equal(options.sameSite, "lax");
  assert.equal(options.secure, false);
});
