import cors from "cors";

import { describeAllowedOrigins, isOriginAllowed } from "../utils/corsOrigins.js";

export const allowedOrigins = describeAllowedOrigins();

/**
 * CORS for the browser frontend. Credentials are enabled because the session
 * lives in an HttpOnly cookie, which also means the allowed origin is echoed back
 * explicitly instead of using `*`.
 *
 * In the recommended deployment the browser calls "/api" on its own origin and
 * Vercel proxies it (client/vercel.json), so CORS is not even involved. This
 * middleware keeps direct cross-origin calls (custom domains, other clients)
 * working correctly.
 */
export const corsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (isOriginAllowed(origin, allowedOrigins)) {
      return callback(null, true);
    }

    return callback(new Error("Origin not allowed by CORS"));
  },
};

export const corsMiddleware = cors(corsOptions);

export default corsMiddleware;
