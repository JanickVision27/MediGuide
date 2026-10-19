import rateLimit from "express-rate-limit";

const WINDOW_MS = 60 * 1000;
const MAX_AI_REQUESTS_PER_WINDOW = 10;

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
