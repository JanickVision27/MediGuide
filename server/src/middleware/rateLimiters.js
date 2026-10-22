import rateLimit from "express-rate-limit";

const WINDOW_MS = 60 * 1000;
const MAX_AI_REQUESTS_PER_WINDOW = 10;

/** Limit repeated credential attempts while allowing normal shared-IP usage. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many sign-in attempts. Please wait 15 minutes and try again.",
  },
});

/** AI lookups call a paid API, so cap each client at 10 requests per minute. */
export const aiLookupRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: MAX_AI_REQUESTS_PER_WINDOW,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many AI lookups. Please wait a minute and try again.",
  },
});

/** Per-medicine chat is also a paid AI call - same 10/minute budget per IP. */
export const medicineChatRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: MAX_AI_REQUESTS_PER_WINDOW,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many AI chat requests. Please wait a minute and try again.",
  },
});

/**
 * Prescription file uploads (PDF/image) also trigger an AI extraction call, so
 * cap them at 5 per minute per IP to protect the paid Groq quota.
 */
export const extractFileRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many prescription uploads. Please wait a minute and try again.",
  },
});
