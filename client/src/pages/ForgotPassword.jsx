import { useState } from 'react'
import { Link } from 'react-router-dom'

import { LockIcon, LogoMark } from '../components/icons.jsx'
import { requestPasswordReset } from '../api.js'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await requestPasswordReset(email.trim())
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Unable to submit your request right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-500 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="inline-flex w-fit items-center gap-3"><LogoMark className="h-11 w-11" /><span className="text-xl font-extrabold">MediGuide</span></Link>
        <div><span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-100">ACCOUNT SUPPORT</span><h1 className="mt-4 text-4xl font-extrabold leading-tight">A secure path back to your account.</h1><p className="mt-5 max-w-sm leading-relaxed text-brand-50/90">Request a password reset using the email associated with your account.</p></div>
        <p className="text-xs leading-relaxed text-brand-100/80">MediGuide is an educational demo. Please use synthetic information only.</p>
      </aside>
      <section className="p-6 sm:p-10 lg:p-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-brand-700 lg:hidden"><LogoMark className="h-8 w-8" /> MediGuide</Link>
        <div className="mx-auto max-w-md">
          <span className="mt-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 lg:mt-0"><LockIcon className="h-6 w-6" /></span>
          <p className="mt-6 text-sm font-bold uppercase tracking-widest text-brand-600">Account recovery</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Forgot password?</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">Enter your account email and we’ll provide next steps if an account matches.</p>
          {error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
          {submitted ? (
            <div role="status" className="mt-7 rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm leading-relaxed text-blue-900">
              If an account exists for that email and email delivery is available, reset instructions may be sent. Check your inbox and spam folder.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <div><label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</label><input id="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100" /></div>
              <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">{isSubmitting ? 'Submitting…' : 'Send reset instructions'}</button>
            </form>
          )}
          <p className="mt-6 text-center text-sm"><Link to="/login" className="font-bold text-brand-700 hover:text-brand-800">Back to sign in</Link></p>
        </div>
      </section>
    </div>
  )
}
