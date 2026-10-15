# MediGuide

MediGuide is a healthcare assistance platform that brings patient profiles, prescriptions,
appointments and clinical chat into a single, easy-to-navigate workspace.

> ### ⚠️ Educational Demo Disclaimer
>
> MediGuide is an **educational demonstration project** and is **NOT a real clinical system**.
> It provides no medical advice, diagnosis or treatment, and must **never** be used to make
> clinical decisions. All patient records, prescriptions, appointments and chat messages are
> **entirely synthetic and fictitious** — no real protected health information (PHI) is
> collected, stored or transmitted. In a medical emergency, contact local emergency services.

---

## Tech Stack

| Layer      | Technology                                    |
| ---------- | --------------------------------------------- |
| Framework  | React 19                                      |
| Build tool | Vite 7                                        |
| Styling    | Tailwind CSS 3                                |
| Routing    | React Router DOM 7                            |

---

## Getting Started

The frontend lives in the **`client/`** directory (the repo root is kept free for a future
`server/` backend).

```bash
cd client
npm install
npm run dev
```

Then open the printed URL (default: http://localhost:5173).

### Other scripts

```bash
npm run build     # production build to client/dist
npm run preview   # serve the production build locally
```

---

## Project Structure

```
client/
├── index.html
├── package.json
├── vite.config.js          # dev server: host 0.0.0.0, allowedHosts, /api proxy (commented)
├── tailwind.config.js      # brand palette + fonts + shadows
├── postcss.config.js
└── src/
    ├── main.jsx            # React entry point
    ├── App.jsx             # Router: all routes nested under <Layout />
    ├── index.css           # Tailwind layers + reusable .btn / .card / .badge classes
    ├── components/
    │   ├── icons.jsx       # shared inline SVG icon set (no icon library needed)
    │   └── layout/
    │       ├── Layout.jsx       # app shell: sidebar + <Outlet /> + footer
    │       ├── Sidebar.jsx      # persistent navigation (fixed on desktop, drawer on mobile)
    │       └── MobileHeader.jsx # sticky top bar with hamburger (< lg breakpoint)
    └── pages/
        ├── Home.jsx             # hero + disclaimer + feature cards
        ├── Profile.jsx          # placeholder  → /profile
        ├── Prescriptions.jsx    # placeholder  → /prescriptions
        ├── Appointments.jsx     # placeholder  → /appointments
        ├── ChatUI.jsx           # placeholder  → /chat
        ├── Login.jsx            # placeholder  → /login
        └── Register.jsx         # placeholder  → /register
```

---

## Routing

| Path            | Component         | Status        |
| --------------- | ----------------- | ------------- |
| `/`             | `Home.jsx`        | ✅ Built      |
| `/profile`      | `Profile.jsx`     | 🚧 Placeholder |
| `/prescriptions`| `Prescriptions.jsx` | 🚧 Placeholder |
| `/appointments` | `Appointments.jsx`| 🚧 Placeholder |
| `/chat`         | `ChatUI.jsx`      | 🚧 Placeholder |
| `/login`        | `Login.jsx`       | 🚧 Placeholder |
| `/register`     | `Register.jsx`    | 🚧 Placeholder |
| `*`             | redirects to `/`  | —             |

Every route is nested inside `<Layout />`, so the sidebar is **always visible**. If you need a
full-bleed page with no sidebar, register it as a *sibling* of the Layout route in `App.jsx`.

---

## Contributing — building your feature

The placeholder pages are yours to replace. Each already renders inside `<Layout />`, so the
sidebar, mobile header and footer are handled for you — just build the page content.

**To add a new page:**

1. Create `client/src/pages/YourPage.jsx`.
2. Register the route in `client/src/App.jsx` inside the `<Layout />` route.
3. Add a nav entry to the `NAV_ITEMS` array at the top of `client/src/components/layout/Sidebar.jsx`.
4. If you need an icon, add it to `client/src/components/icons.jsx` rather than inlining SVG.

**Styling conventions:**

- Use the `brand` colour palette (`bg-brand-600`, `text-brand-700`, …) defined in
  `tailwind.config.js` so the whole app stays visually consistent.
- Reuse the component classes in `src/index.css`: `.btn-primary`, `.btn-secondary`,
  `.btn-on-dark`, `.btn-outline-light`, `.card`, `.badge`.
- Keep the soothing blue / white / grey medical theme.

**Safety rule:** never hard-code or commit real patient data. All demo data must be synthetic.

---

## Notes for maintainers

- **`npm audit` reports 7 vulnerabilities** — all are transitive **dev-only** dependencies of
  Tailwind CSS v3 (`braces`, `chokidar`, `micromatch`, `fast-glob`,
  `postcss-selector-parser`). They are build-time only and are **not shipped** in the production
  bundle. The only automated fix npm offers is upgrading to Tailwind v4, which is a breaking
  change and was deliberately not taken. Re-evaluate on the next dependency refresh.
- When a backend is added, uncomment the `server.proxy` block in `vite.config.js` and call it
  with **relative URLs** (`/api/...`) — browser code must never target `localhost` directly.

---

## License

See [LICENSE](./LICENSE).
