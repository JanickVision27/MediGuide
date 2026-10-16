import rateLimit from "express-rate-limit";

/** AI lookups call a paid API, so cap each client at 10 requests per minute. */
export const aiLookupRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many AI lookups. Please wait a minute and try again.",
  },
});
