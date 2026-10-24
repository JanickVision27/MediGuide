# Deploying MediGuide (Vercel frontend + Render API)

This is the deployment that previously failed with **"Failed to fetch"** on the Register page.
Follow it top to bottom; every step below is already reflected in the code.

Live URLs for this project:

| Part | URL |
| --- | --- |
| Frontend (Vercel) | `https://medi-guide-care.vercel.app` |
| API (Render) | `https://mediguide-0a1e.onrender.com` |

## How the request flows (important)

```
Browser  ->  https://medi-guide-care.vercel.app/api/auth/register   (same origin)
                        |
                        |  rewrite defined in client/vercel.json
                        v
             https://mediguide-0a1e.onrender.com/api/auth/register
```

The browser only ever talks to **its own origin**. Because of that there is no CORS
preflight, no third-party cookie, and no mixed-content risk. `client/src/api.js` therefore
defaults to the relative base `/api` in production; `VITE_API_URL` is only an optional
override for deployments that expose the API on a different hostname.

## 1. Render (API)

1. Service type: **Web Service**, repository `ravi63052/MediGuideCare`.
2. **Root Directory:** `server`
3. **Build Command:** `npm ci` (or `npm install`)
4. **Start Command:** `npm start`
5. **Health Check Path:** `/api/health`
6. Environment variables (Render dashboard → Environment):

   | Key | Required | Example / notes |
   | --- | --- | --- |
   | `NODE_ENV` | yes | `production` |
   | `MONGODB_URI` | yes | `mongodb+srv://...` (Atlas). Must have no spaces. |
   | `JWT_SECRET` | yes | 32+ random chars. Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
   | `CLIENT_ORIGIN` | recommended | `https://medi-guide-care.vercel.app` (comma-separate extra origins). `https://*.vercel.app` preview URLs already work by default. |
   | `APP_URL` | recommended | `https://medi-guide-care.vercel.app` — used in reset/reminder email links |
   | `TRUST_PROXY` | optional | defaults to `1`, correct for Render |
   | `SESSION_COOKIE_SAME_SITE` | optional | leave unset for the recommended same-origin setup. Set to `none` only if the browser calls the API on a *different* hostname. |
   | `RESEND_API_KEY`, `MAIL_FROM`, `GROQ_API`, `GOOGLE_PLACES_API_KEY` | optional | only for email/AI/hospital features |

7. Deploy, then confirm: `curl https://mediguide-0a1e.onrender.com/api/health`
   → `{"status":"ok","service":"MediGuide API","database":"connected"}`

The API prints its effective CORS allow-list on boot:

```
CORS allow-list: https://medi-guide-care.vercel.app, https://mediguide-0a1e.onrender.com, http://localhost:5173, ... + wildcard patterns
```

Note: on Render's free plan the service sleeps after inactivity. The first request can take
~50 seconds; the client shows a "server is waking up" message and retries automatically.

## 2. Vercel (frontend)

1. Framework preset: **Vite**.
2. **Root Directory:** `client` ← must be `client`, not the repository root.
3. Build Command `npm run build`, Output Directory `dist` (auto-detected).
4. `client/vercel.json` is committed and provides:
   - `/api/:path*` → `https://mediguide-0a1e.onrender.com/api/:path*` (the same-origin proxy)
   - a catch-all rewrite to `/index.html` so `/register`, `/profile`, `/appointments`, etc.
     survive a refresh/deep link instead of returning Vercel's 404 page
   - long-lived caching for hashed assets plus basic security headers
5. Environment variables: **leave `VITE_API_URL` unset.** Vite inlines env vars at build
   time, so any change requires a fresh deployment (no "Redeploy without cache" needed, but a
   plain redeploy is required).

   If you must point at a different API, set `VITE_API_URL=https://your-api.example.com/api`
   (HTTPS, include `/api`). Build-time guards reject `http://` and `localhost` values in
   production builds because browsers block them.
6. After deploying, verify:
   - `https://medi-guide-care.vercel.app/register` loads directly (not a Vercel 404)
   - `https://medi-guide-care.vercel.app/api/health` returns the API JSON, proving the proxy
   - registering an account logs you in and `/profile` stays loaded after a refresh

## 3. Troubleshooting "Failed to fetch"

`fetch` only throws that error when **no HTTP response is readable**. Work down this list:

| Symptom | Cause | Fix |
| --- | --- | --- |
| Console: *blocked by CORS policy / No 'Access-Control-Allow-Origin'* | Browser called the Render API cross-origin and the origin was missing from the allow-list | Use the `/api` proxy (default now), or add the origin to `CLIENT_ORIGIN` on Render |
| Console: *blocked by CORS policy* and the request URL starts with `http://` | Mixed content | Use `https://`; the build now falls back to `/api` |
| Request URL is `http://localhost:5000/...` | `VITE_API_URL` baked into a stale build | Unset `VITE_API_URL` on Vercel and redeploy |
| Vercel 404 page instead of the app | Missing SPA rewrite | `client/vercel.json` (committed) |
| Vercel 404 for `/api/health` | Proxy rewrite missing / wrong API host | `client/vercel.json` |
| First request after idling fails or hangs ~50 s | Render free-tier cold start | Retry automatically (already implemented) or upgrade the plan |
| `429 Too many sign-in attempts` | Rate limiter keyed on the proxy IP | `app.set("trust proxy", 1)` (committed) plus a 20-attempt budget for failed attempts only |
| Registers, then immediately bounces to `/login` | Session cookie dropped as a third-party/`SameSite=Lax` cookie | Use the `/api` proxy, or set `SESSION_COOKIE_SAME_SITE=none` on Render |

Useful checks:

```bash
# API alive? (also proves Mongo connectivity)
curl -s https://mediguide-0a1e.onrender.com/api/health

# Proxy alive? (should return the same JSON)
curl -s https://medi-guide-care.vercel.app/api/health

# Preflight for a direct cross-origin call (should echo Access-Control-Allow-Origin)
curl -i -X OPTIONS https://mediguide-0a1e.onrender.com/api/auth/register \
  -H "Origin: https://medi-guide-care.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

## Notes and limits

- **Uploads:** Vercel proxies requests, and serverless request bodies are capped around 4.5 MB.
  Profile photos (2 MB) are fine; prescription PDFs above that size must be sent directly to
  the API or reduced in size.
- **`node_modules` is not committed** any more. Always commit `package-lock.json` and let the
  platform run `npm ci`/`npm install`; committing dependencies copied the Windows-only
  `@napi-rs/canvas` binary into a Linux deploy and bloated the repository.
- **Custom domains:** add the new origin to `CLIENT_ORIGIN` on Render (CORS) **and** set
  `APP_URL` so e-mailed links point at the right place.
- **Rate limiting:** the API trusts one proxy hop by default (`TRUST_PROXY=1`), which is correct
  for Render. Because the browser reaches the API through the Vercel rewrite, there can be more
  than one hop; `TRUST_PROXY` accepts any hop count or a list (`TRUST_PROXY=2`,
  `TRUST_PROXY=loopback,linklocal,uniquelocal`). Only *failed* sign-in attempts count towards the
  20-per-15-minutes budget, so normal registrations never use it up.
- **Confirm `vercel.json` is active:** after the first deploy, `/api/health` on the Vercel domain
  must return the API JSON. If it returns Vercel's 404 page, the project's Root Directory is not
  `client`, and the file is not being read.
