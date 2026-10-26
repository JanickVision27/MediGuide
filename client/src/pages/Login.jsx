import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { LockIcon, LogoMark } from '../components/icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isWaitingForServer, setIsWaitingForServer] = useState(false)

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsWaitingForServer(false)
    setIsSubmitting(true)

    try {
      await login(
        { email: form.email.trim(), password: form.password },
        { onWaiting: () => setIsWaitingForServer(true) },
      )
      const destination = location.state?.from
      const isInternalDestination =
        typeof destination === 'string' &&
        destination.startsWith('/') &&
        !destination.startsWith('//')
      navigate(isInternalDestination ? destination : '/profile', { replace: true })
    } catch (err) {
      setError(err.message || 'Unable to sign in right now.')
    } finally {
      setIsWaitingForServer(false)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-500 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden="true" className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <Link to="/" className="relative inline-flex w-fit items-center gap-3 rounded-xl">
          <LogoMark className="h-11 w-11" />
          <span className="text-xl font-extrabold tracking-tight">MediGuide</span>
        </Link>
        <div className="relative py-12">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-100">
            YOUR HEALTHCARE, SIMPLIFIED
          </span>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight">
            Better care starts with a clearer path.
          </h1>
          <p className="mt-5 max-w-sm leading-relaxed text-brand-50/90">
            Manage your healthcare journey with greater clarity, confidence, and convenience.
          </p>
        </div>
        <p className="relative text-xs leading-relaxed text-brand-100/80">
          MediGuide is an educational demo designed to help you organize your healthcare journey. Please do not enter real medical or sensitive personal information.
        </p>
      </aside>

      <section className="p-6 sm:p-10 lg:p-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-brand-700 lg:hidden">
          <LogoMark className="h-8 w-8" /> MediGuide
        </Link>
        <div className="mx-auto max-w-md">
          <span className="mt-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 lg:mt-0">
            <LockIcon className="h-6 w-6" />
          </span>
          <p className="mt-6 text-sm font-bold uppercase tracking-widest text-brand-600">
            Welcome back
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Sign in to MediGuide
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Use the email and password associated with your account.
          </p>

          {error && (
            <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          )}

          {isWaitingForServer && !error && (
            <div
              role="status"
              aria-live="polite"
              className="mt-5 flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900"
            >
              <span
                aria-hidden="true"
                className="mt-1.5 h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-brand-600"
              />
              <div>
                <p className="font-semibold">Signing you in automatically…</p>
                <p className="mt-1 leading-relaxed text-brand-800">
                  The server was idle and is restarting. Keep this page open; there is no need to press Sign in again.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-5" aria-busy={isSubmitting}>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={form.email}
                onChange={update}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <Link to="/forgot-password" className="ml-auto text-xs font-semibold text-brand-700 hover:text-brand-800">
                  Forgot password?
                </Link>
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="text-xs font-semibold text-brand-700 hover:text-brand-800"
                >
                  {showPassword ? 'Hide' : 'Show'} password
                </button>
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                maxLength={72}
                value={form.password}
                onChange={update}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
              {isWaitingForServer
                ? 'Waiting for server…'
                : isSubmitting
                  ? 'Signing in…'
                  : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            New to MediGuide?{' '}
            <Link to="/register" className="font-bold text-brand-700 hover:text-brand-800">
              Create an account
            </Link>
          </p>
          <p className="mt-8 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
            For your safety, use a unique password. MediGuide is an educational demo and is not a clinical system.
          </p>
        </div>
      </section>
    </div>
  )
}
