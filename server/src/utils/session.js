import crypto from "node:crypto";

import jwt from "jsonwebtoken";

export const SESSION_COOKIE = "mediguide_session";

const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;
const SESSION_DURATION_MS = SESSION_DURATION_SECONDS * 1000;
const TOKEN_OPTIONS = {
  algorithm: "HS256",
  audience: "mediguide-web",
  issuer: "mediguide-api",
};

let developmentSecret;

function getSessionSecret() {
  const configuredSecret = process.env.JWT_SECRET?.trim();

  if (configuredSecret) {
    if (configuredSecret.length < 32) {
      throw new Error("JWT_SECRET must contain at least 32 characters.");
    }
    return configuredSecret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production.");
  }

  // An ephemeral development secret keeps local setup convenient without
  // committing a predictable credential. Set JWT_SECRET to persist sessions.
  if (!developmentSecret) {
    developmentSecret = crypto.randomBytes(48).toString("hex");
    console.warn(
      "JWT_SECRET is not set; using an ephemeral development secret. " +
        "Sessions will be invalid after the server restarts."
    );
  }

  return developmentSecret;
}

export function validateSessionConfiguration() {
  getSessionSecret();
}

export function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
}

export function createSession(res, userId) {
  const token = jwt.sign({ sub: userId.toString() }, getSessionSecret(), {
    ...TOKEN_OPTIONS,
    expiresIn: SESSION_DURATION_SECONDS,
  });

  res.cookie(SESSION_COOKIE, token, {
    ...getCookieOptions(),
    maxAge: SESSION_DURATION_MS,
  });
}

export function verifySession(token) {
  return jwt.verify(token, getSessionSecret(), {
    algorithms: [TOKEN_OPTIONS.algorithm],
    audience: TOKEN_OPTIONS.audience,
    issuer: TOKEN_OPTIONS.issuer,
  });
}

export function clearSession(res) {
  res.clearCookie(SESSION_COOKIE, getCookieOptions());
}
