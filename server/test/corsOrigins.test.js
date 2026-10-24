import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import express from "express";

import { corsMiddleware } from "../src/middleware/cors.js";
import {
  describeAllowedOrigins,
  isOriginAllowed,
  normalizeOrigin,
} from "../src/utils/corsOrigins.js";

const VERCEL_ORIGIN = "https://medi-guide-care.vercel.app";
const PREVIEW_ORIGIN = "https://mediguidecare-git-feature-ravi63052.vercel.app";

test("normalizeOrigin lowercases and drops paths and trailing slashes", () => {
  assert.equal(normalizeOrigin("HTTPS://Example.com/"), "https://example.com");
  assert.equal(normalizeOrigin("https://Example.com/some/path"), "https://example.com");
  assert.equal(normalizeOrigin("  http://localhost:5173  "), "http://localhost:5173");
  assert.equal(normalizeOrigin(""), "");
});

test("the deployed Vercel frontend is allowed by default", () => {
  assert.equal(isOriginAllowed(VERCEL_ORIGIN, describeAllowedOrigins({})), true);
});

test("Vercel preview deployments are allowed by the wildcard pattern", () => {
  assert.equal(isOriginAllowed(PREVIEW_ORIGIN, describeAllowedOrigins({})), true);
});

test("localhost development origins stay allowed", () => {
  const config = describeAllowedOrigins({});
  assert.equal(isOriginAllowed("http://localhost:5173", config), true);
  assert.equal(isOriginAllowed("http://127.0.0.1:5173", config), true);
});

test("requests without an Origin header (health checks, curl) are allowed", () => {
  assert.equal(isOriginAllowed(undefined, describeAllowedOrigins({})), true);
  assert.equal(isOriginAllowed("", describeAllowedOrigins({})), true);
});

test("unknown origins are rejected", () => {
  const config = describeAllowedOrigins({});
  assert.equal(isOriginAllowed("https://evil.example.com", config), false);
  // Not "anything that merely contains vercel.app".
  assert.equal(isOriginAllowed("https://vercel.app.evil.example.com", config), false);
});

test("CLIENT_ORIGIN adds origins without removing the defaults", () => {
  const config = describeAllowedOrigins({
    CLIENT_ORIGIN: "https://mediguide.example.com/, https://www.mediguide.example.com",
  });

  assert.equal(isOriginAllowed("https://mediguide.example.com", config), true);
  assert.equal(isOriginAllowed("https://www.mediguide.example.com", config), true);
  assert.equal(isOriginAllowed(VERCEL_ORIGIN, config), true);
});

test("CORS_ALLOW_ANY_ORIGIN is an explicit opt-in", () => {
  assert.equal(isOriginAllowed("https://evil.example.com", describeAllowedOrigins({})), false);
  assert.equal(
    isOriginAllowed("https://evil.example.com", describeAllowedOrigins({ CORS_ALLOW_ANY_ORIGIN: "true" })),
    true
  );
});

// A minimal app that mounts the same middleware order used by src/app.js, so the
// CORS behaviour can be tested without connecting to MongoDB or loading pdf-parse.
function createTestApp() {
  const app = express();
  app.use(corsMiddleware);
  app.use(express.json({ limit: "10kb" }));
  app.get("/api/health", (_req, res) => res.status(200).json({ status: "ok" }));
  app.post("/api/auth/register", (_req, res) => res.status(201).json({ ok: true }));
  app.use((error, _req, res, _next) => {
    if (error?.message === "Origin not allowed by CORS") {
      return res.status(403).json({ message: "This origin is not allowed." });
    }
    return res.status(500).json({ message: "Something went wrong on the server." });
  });
  return app;
}

let server;
let baseUrl;

before(async () => {
  server = createTestApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test("preflight from the deployed Vercel origin returns CORS headers", async () => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "OPTIONS",
    headers: {
      Origin: VERCEL_ORIGIN,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), VERCEL_ORIGIN);
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
  assert.match(
    response.headers.get("access-control-allow-methods") || "",
    /POST/
  );
});

test("preflight from an unknown origin is refused", async () => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://evil.example.com",
      "Access-Control-Request-Method": "POST",
    },
  });

  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.notEqual(response.status, 204);
});

test("the health endpoint remains reachable without an Origin header", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.status, "ok");
});
