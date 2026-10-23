# MediGuide

MediGuide is a full-stack healthcare assistance demo with authenticated patient profiles,
per-user appointments, medicine lookup, map-based hospital search, and educational AI chat.

> **Educational demo only:** MediGuide is not a clinical system and does not provide medical
> advice, diagnosis, or treatment. Use synthetic information only. Never enter real patient
> records, protected health information (PHI), or other sensitive personal information. In an
> emergency, contact local emergency services.

## Tech stack

- **Frontend:** React 19, React Router 7, Vite 7, Tailwind CSS 3
- **Backend:** Node.js, Express 5, MongoDB/Mongoose
- **Authentication:** bcrypt password hashing and JWT sessions in HttpOnly cookies
- **Validation:** Zod on authentication, profile, and appointment request bodies

## Features

- Registration, login, logout, and session restoration
- Public-only auth pages and protected workspace routes
- Persistent, account-specific profile editing
- Per-user appointment booking/cancellation with active-provider verification and a validated
  snapshot of the hospital selected from the live directory
- Authenticated care dashboard with account-specific appointments, persisted visit checklist,
  in-app reminder notifications, and appointment reminder preferences
- Optional Resend appointment-saved notifications, including the selected hospital
- Synthetic doctor directory with specialty/location filtering
- Live Indian hospital search using OpenStreetMap, 24-hour MongoDB caching, stale-cache fallback,
  and optional Google Places listings/photos
- Existing medicine search, prescription extraction, and AI chat features

## Getting started

### 1. Configure the server

Copy `.env.example` to `.env` in the repository root and set at least:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/mediguide
JWT_SECRET=replace-with-a-random-secret-at-least-32-characters-long
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
```

Generate a suitable local secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

`JWT_SECRET` is required in production. In development, an ephemeral secret is generated when
one is absent, but all sessions become invalid when the server restarts. `GROQ_API_KEY` is only
needed for the optional AI features.

Hospital search works without a Google key through Nominatim/Overpass (OpenStreetMap). Set
`GOOGLE_PLACES_API_KEY` to prefer Google Places listings and photos. Live provider access requires
internet connectivity; fresh OpenStreetMap results are cached in MongoDB for 24 hours, and stale
records are clearly labelled if used during an outage. For a public deployment, set
`HOSPITAL_DIRECTORY_USER_AGENT` to a value identifying the project and a contact, in line with
Nominatim's usage policy.

#### Optional appointment email notifications

Add your own Resend key to the **root `.env`**, not the frontend environment:

```dotenv
RESEND_API_KEY=re_your_actual_key
MAIL_FROM=onboarding@resend.dev
```

Restart the API after changing `.env`. For Resend's test sender, follow its recipient restrictions.
To notify other recipients, verify a domain in Resend and change `MAIL_FROM` to an address on that
domain (for example, `MediGuide <appointments@your-domain.com>`). Test by booking an appointment
with an allowed account email, then check the inbox/spam folder and API logs.

Without `RESEND_API_KEY`, email notifications are skipped. Delivery runs in the background: an
email failure is logged but does not block or roll back a saved appointment. A successful booking
response therefore does not guarantee email delivery. Never commit the real key or share it in chat.

#### Appointment reminders

New bookings persist reminder jobs with their appointment in MongoDB. By default, reminders are
scheduled 24 hours and 2 hours before the appointment; trigger times already in the past are skipped.
The client stores the IANA timezone used when booking, and reminder timestamps are stored as UTC
dates. Users can disable reminders or select 24-hour, 2-hour, 1-hour, or 30-minute timings from the
authenticated dashboard. The API polls persistent records after startup, so due in-app notifications
are recovered after a restart. In-app notifications remain available without email configuration.

The existing Resend variables above are reused. Appointment reminder email also needs `APP_URL` set
to the trusted frontend origin (for example `http://localhost:5173` locally). `MAIL_FROM` should be
verified in Resend for unrestricted recipient delivery. Provider acceptance is recorded separately
from scheduling; an accepted API request does not guarantee inbox delivery. Reminder emails use a
stable Resend idempotency key. If the worker stops after a send begins but before its outcome is
persisted, the email state is recorded as unknown and is not resent to avoid duplicates.

MongoDB schema changes are applied by Mongoose on startup. Appointment reminder schedules and the
visit checklist are embedded in existing appointment records; the first reminder creates the
`inappnotifications` collection and its unique reminder index. Existing upcoming appointments are
initialized by the scheduler using `Asia/Kolkata` when their timezone is absent. There is no
rescheduling endpoint in the current API; cancellation is integrated, and pending jobs are also
cancelled if a record transitions to `Completed` or `Cancelled`.

#### Password reset email

Password reset requires `RESEND_API_KEY` and a trusted `APP_URL` in the root `.env`. Set `APP_URL`
to the public origin of the frontend (for local development, `http://localhost:5173`; in production,
use your HTTPS MediGuide origin). `MAIL_FROM` may be reused from the email setup above; for production,
verify its domain with Resend. Restart the API after changing these settings. Reset links expire after
30 minutes and can only be used once. When email delivery is not configured, the request endpoint
still returns its generic response but does not create or send a reset link.

### 2. Start the API

```bash
cd server
npm ci
npm run dev
```

The API validates its configuration, connects to MongoDB, and upserts the synthetic demo doctors
before listening on `http://localhost:5000`. Seeding is idempotent, so restarts do not create
duplicates. Startup stops with a clear error if MongoDB or the production auth configuration is
invalid. The health check is `GET http://localhost:5000/api/health`.

### 3. Start the frontend

In another terminal:

```bash
cd client
npm ci
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`). Vite proxies relative `/api` requests to
the backend, so browser code never needs to call a backend localhost URL directly.

### Production build

```bash
cd client
npm run build
npm run preview
```

## Main routes

| Frontend route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Landing page |
| `/login`, `/register` | Signed-out only | Account access |
| `/profile` | Authenticated | Persistent user profile |
| `/appointments` | Authenticated | Per-user appointments with hospital selection |
| `/hospitals` | Authenticated | Live map-based hospital directory |
| `/medicines` | Authenticated | Medicine and prescription lookup |
| `/prescriptions` | Authenticated | Prescription workspace placeholder |
| `/chat` | Authenticated | Educational AI assistant |

### Authentication and appointment API

| Endpoint | Description |
| --- | --- |
| `POST /api/auth/register` | Create an account and session |
| `POST /api/auth/login` | Sign in |
| `POST /api/auth/logout` | Clear the session cookie |
| `GET /api/auth/me` | Restore the current user |
| `PATCH /api/auth/profile` | Update allowed profile fields |
| `GET /api/appointments` | List only the session user's appointments |
| `POST /api/appointments` | Book with a validated hospital snapshot for the session user |
| `PATCH /api/appointments/:id/cancel` | Cancel an owned upcoming appointment |
| `GET /api/hospitals/search` | Search/cache OpenStreetMap or Google hospital listings |
| `GET /api/hospitals/photo` | Proxy an approved Google Places photo reference |
| `GET /api/doctors` | List/filter active synthetic doctors |

## Project structure

```text
client/src/
├── api.js                       # Credentialed API client
├── context/AuthContext.jsx       # Session and user state
├── components/auth/             # Protected/public-only route guards
├── components/layout/           # Public and authenticated app shells
└── pages/                       # Landing, auth, and workspace pages

server/src/
├── controllers/                 # Auth, appointments, directory, medicines
├── middleware/requireAuth.js     # Verifies cookie session and loads the user
├── models/                      # User, Doctor, Hospital, and Appointment schemas
├── routes/                      # Express API routes
├── services/                    # AI, lookup, and Resend email services
├── utils/session.js              # JWT and secure-cookie helpers
└── validators/                  # Zod request validation
```

## Security notes

- Passwords are hashed with bcrypt and are never returned by the API.
- Session cookies are `HttpOnly` and `SameSite=Lax`; they are `Secure` in production.
- Authentication requests are rate-limited, and login failures use a generic message.
- Appointment reads and writes are scoped by the verified server-side session.
- Hospital search/photo endpoints are rate-limited; Google keys remain on the server.
- Resend keys and patient recipient addresses are used only by the server; notification content
  is HTML-escaped and recipients come from the authenticated account, not the booking request.
- Set a strong `JWT_SECRET`, configure `CLIENT_ORIGIN`, and use HTTPS in production.
- This remains an educational demo, not a production healthcare or PHI-storage solution.

## License

See [LICENSE](./LICENSE).
