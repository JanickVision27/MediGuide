/**
 * Browser origins that are allowed to call the API.
 *
 * Registration/login failed with "Failed to fetch" after the frontend moved to
 * Vercel because the allow-list only contained the old Render/localhost origins,
 * so the browser's CORS preflight was rejected before the JSON response could be
 * read. These defaults cover the deployed frontend and every Vercel preview URL,
 * and `CLIENT_ORIGIN` / `CLIENT_URL` / `CLIENT_ORIGIN_PATTERNS` stay additive so
 * custom domains keep working without a code change.
 */

// Exact origins that always work (our own deployments + local development).
const DEFAULT_ALLOWED_ORIGINS = [
  "https://medi-guide-care.vercel.app",
  "https://mediguide-0a1e.onrender.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

// Vercel gives every branch/preview deployment its own *.vercel.app hostname.
const DEFAULT_ALLOWED_ORIGIN_PATTERNS = ["https://*.vercel.app"];

/** Normalise an origin to `scheme://host[:port]` (lowercase, no trailing slash). */
export function normalizeOrigin(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return trimmed.replace(/\/+$/, "").toLowerCase();
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function patternToRegExp(pattern) {
  const escaped = escapeRegExp(normalizeOrigin(pattern)).replace(/\\\*/g, "[^/]+");
  return new RegExp(`^${escaped}$`);
}

function splitList(value) {
  return String(value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Build the effective allow-list from the environment.
 * `CLIENT_ORIGIN` and `CLIENT_URL` are comma separated exact origins;
 * `CLIENT_ORIGIN_PATTERNS` accepts `*` wildcards such as `https://*.example.com`.
 */
export function describeAllowedOrigins(env = process.env) {
  const exact = new Set();

  for (const origin of [
    ...DEFAULT_ALLOWED_ORIGINS,
    ...splitList(env.CLIENT_ORIGIN),
    ...splitList(env.CLIENT_URL),
  ]) {
    const normalized = normalizeOrigin(origin);
    if (normalized) exact.add(normalized);
  }

  const patterns = [...DEFAULT_ALLOWED_ORIGIN_PATTERNS, ...splitList(env.CLIENT_ORIGIN_PATTERNS)]
    .map((pattern) => patternToRegExp(pattern));

  return {
    exact,
    patterns,
    // Escape hatch for local experiments; never enable this in production.
    allowAny: String(env.CORS_ALLOW_ANY_ORIGIN ?? "").trim().toLowerCase() === "true",
  };
}

/** Requests without an Origin header (health checks, curl, server-to-server) pass. */
export function isOriginAllowed(origin, config = describeAllowedOrigins()) {
  if (!origin) return true;
  if (config.allowAny) return true;

  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;
  if (config.exact.has(normalized)) return true;

  return config.patterns.some((pattern) => pattern.test(normalized));
}

export function listAllowedOrigins(config = describeAllowedOrigins()) {
  return [...config.exact];
}
