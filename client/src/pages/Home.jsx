import { Link } from 'react-router-dom'

import {
  ArrowRightIcon,
  AlertTriangleIcon,
  UserIcon,
  PillIcon,
  CalendarIcon,
  ChatIcon,
  ActivityIcon,
  LockIcon,
} from '../components/icons.jsx'

/** Feature cards double as shortcuts into each teammate's area. */
const FEATURES = [
  {
    to: '/profile',
    label: 'Profile',
    Icon: UserIcon,
    title: 'Patient Profile',
    description: 'Demographics, contact details, allergies and medical history in one place.',
  },
  {
    to: '/prescriptions',
    label: 'Prescriptions',
    Icon: PillIcon,
    title: 'Prescriptions',
    description: 'Browse medication lists, dosage instructions and refill history.',
  },
  {
    to: '/appointments',
    label: 'Appointments',
    Icon: CalendarIcon,
    title: 'Appointments',
    description: 'Schedule, reschedule and track upcoming visits on a clear timeline.',
  },
  {
    to: '/chat',
    label: 'ChatUI',
    Icon: ChatIcon,
    title: 'Chat Assistant',
    description: 'A guided conversational interface for general health information.',
  },
]

export default function Home() {
  return (
    <div className="space-y-8">
      {/* ============================ HERO ============================ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-brand-700 to-brand-500 px-6 py-14 shadow-card sm:px-10 sm:py-16">
        {/* Decorative glow + ECG line */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-300/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />
        <ActivityIcon
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-6 right-4 h-40 w-40 text-white/10 sm:right-10"
        />

        <div className="relative max-w-3xl">
          <span className="badge bg-white/15 text-brand-50 ring-1 ring-inset ring-white/25">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
            Educational Demo &middot; Synthetic Data
          </span>

          <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl">
            All of your care,
            <br className="hidden sm:block" /> in one{' '}
            <span className="text-brand-200">calm place.</span>
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-relaxed text-brand-50/90 sm:text-lg">
            <strong className="font-semibold text-white">MediGuide</strong> is a healthcare
            assistance platform that brings patient profiles, prescriptions, appointments and
            clinical chat together into a single, easy-to-navigate workspace &mdash; built for
            clarity, privacy and peace of mind.
          </p>

          {/* Auth actions */}
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/login" className="btn-on-dark sm:min-w-[9rem]">
              <LockIcon className="h-4 w-4" />
              Login
            </Link>
            <Link to="/register" className="btn-outline-light sm:min-w-[9rem]">
              Register
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          <p className="mt-5 text-sm text-brand-100/80">
            Just exploring? Use the sidebar to jump straight into any section.
          </p>
        </div>
      </section>

      {/* ===================== DISCLAIMER (SAFETY) ===================== */}
      <section
        role="note"
        aria-label="Educational demo disclaimer"
        className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 sm:p-6"
      >
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-800">
            <AlertTriangleIcon className="h-6 w-6" />
          </span>

          <div className="min-w-0 space-y-2">
            <h2 className="text-base font-extrabold uppercase tracking-wide text-amber-900 sm:text-lg">
              Educational Demo Disclaimer
            </h2>
            <p className="text-sm leading-relaxed text-amber-900 sm:text-[15px]">
              <strong className="font-bold">
                MediGuide is an educational demonstration project and is NOT a real clinical
                system.
              </strong>{' '}
              It does not provide medical advice, diagnosis or treatment, and must{' '}
              <strong className="font-bold">never</strong> be used to make clinical decisions.
            </p>
            <p className="text-sm leading-relaxed text-amber-800 sm:text-[15px]">
              All patient records, prescriptions, appointments and chat messages shown in this
              application are <strong className="font-bold">entirely synthetic and fictitious</strong>.
              No real protected health information (PHI) is collected, stored or transmitted. Any
              resemblance to real persons is purely coincidental.
            </p>
            <p className="text-sm font-semibold leading-relaxed text-amber-900 sm:text-[15px]">
              If you are experiencing a medical emergency, stop using this app and contact your
              local emergency services immediately.
            </p>
          </div>
        </div>
      </section>

      {/* ========================= FEATURES ========================= */}
      <section aria-labelledby="explore-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2
              id="explore-heading"
              className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
            >
              Explore the platform
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Each section below is under active development by the team.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ to, label, Icon, title, description }) => (
            <Link
              key={to}
              to={to}
              className="card group flex items-start gap-4 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors duration-200 group-hover:bg-brand-600 group-hover:text-white">
                <Icon className="h-5 w-5" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-base font-semibold text-slate-900">{title}</span>
                  <ArrowRightIcon className="h-4 w-4 shrink-0 text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-brand-600" />
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-slate-500">
                  {description}
                </span>
                <span className="mt-2.5 inline-block rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-500">
                  {to}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
