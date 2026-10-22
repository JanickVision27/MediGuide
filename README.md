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
- Per-user appointment booking and cancellation with active-provider verification
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
| `/appointments` | Authenticated | Per-user appointments |
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
| `POST /api/appointments` | Book an appointment for the session user |
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
├── utils/session.js              # JWT and secure-cookie helpers
└── validators/                  # Zod request validation
```

## Security notes

- Passwords are hashed with bcrypt and are never returned by the API.
- Session cookies are `HttpOnly` and `SameSite=Lax`; they are `Secure` in production.
- Authentication requests are rate-limited, and login failures use a generic message.
- Appointment reads and writes are scoped by the verified server-side session.
- Hospital search/photo endpoints are rate-limited; Google keys remain on the server.
- Set a strong `JWT_SECRET`, configure `CLIENT_ORIGIN`, and use HTTPS in production.
- This remains an educational demo, not a production healthcare or PHI-storage solution.

## License

See [LICENSE](./LICENSE).
