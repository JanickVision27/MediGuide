import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { LogoMark, ShieldCheckIcon, UserIcon } from '../components/icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { PROFILE_PHOTO_ACCEPT, validateProfilePhoto } from '../utils/profilePhoto.js'

export default function Register() {
  const navigate = useNavigate()
  const { register, saveProfilePhoto } = useAuth()
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState(null)
  const [photoError, setPhotoError] = useState('')

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Your passwords do not match.')
      return
    }
    if (form.password.length < 8) {
      setError('Choose a password with at least 8 characters.')
      return
    }

    setIsSubmitting(true)
    try {
      await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      let profilePhotoWarning = ''
      if (profilePhoto) {
        try {
          await saveProfilePhoto(profilePhoto)
        } catch {
          profilePhotoWarning =
            'Your account was created, but the photo could not be saved. You can add it from your Profile.'
        }
      }
      navigate('/profile', {
        replace: true,
        state: profilePhotoWarning ? { profilePhotoWarning } : undefined,
      })
    } catch (err) {
      setError(err.message || 'Unable to create your account right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function selectProfilePhoto(event) {
    const file = event.target.files?.[0] || null
    const validationError = validateProfilePhoto(file)
    setPhotoError(validationError)
    setProfilePhoto(validationError ? null : file)
    if (validationError) event.target.value = ''
  }

  return (
    <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card">
      <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-500 p-10 text-white lg:flex">
          <div aria-hidden="true" className="absolute -bottom-16 -left-12 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <Link to="/" className="relative inline-flex w-fit items-center gap-3 rounded-xl">
            <LogoMark className="h-11 w-11" />
            <span className="text-xl font-extrabold tracking-tight">MediGuide</span>
          </Link>
          <div className="relative py-12">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-100">
              Get started
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight">
              Make room for a more organized care journey.
            </h1>
            <p className="mt-5 leading-relaxed text-brand-50/90">
              Create an account to explore appointments, medicine information and healthcare guidance in one place.
            </p>
          </div>
          <div className="relative flex items-start gap-3 rounded-2xl border border-white/20 bg-white/10 p-4">
            <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-xs leading-relaxed text-brand-50">
              Your password is hashed before storage. This demo should only be used with synthetic information.
            </p>
          </div>
        </aside>

        <section className="p-6 sm:p-10 lg:p-12">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-brand-700 lg:hidden">
            <LogoMark className="h-8 w-8" /> MediGuide
          </Link>
          <div className="mx-auto max-w-md">
            <span className="mt-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 lg:mt-0">
              <UserIcon className="h-6 w-6" />
            </span>
            <p className="mt-6 text-sm font-bold uppercase tracking-widest text-brand-600">
              Create your account
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
              Join MediGuide
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              Start with your name, email address and a strong password.
            </p>

            {error && (
              <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              <div>
                <label htmlFor="fullName" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Full name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={80}
                  value={form.fullName}
                  onChange={update}
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
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
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                    Password
                  </label>
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
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={72}
                  value={form.password}
                  onChange={update}
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Use 8–72 characters. Avoid reusing a password from another site.
                </p>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  maxLength={72}
                  value={form.confirmPassword}
                  onChange={update}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div>
                <label htmlFor="registration-photo" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Profile photo <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <input
                  id="registration-photo"
                  type="file"
                  accept={PROFILE_PHOTO_ACCEPT}
                  onChange={selectProfilePhoto}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-semibold file:text-brand-700"
                  aria-describedby="registration-photo-help"
                />
                <p id="registration-photo-help" className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  JPG, PNG, or WebP. Maximum size 2 MB.
                </p>
                {photoError && <p className="mt-1 text-sm text-rose-700" role="alert">{photoError}</p>}
              </div>
              <button type="submit" disabled={isSubmitting} className="btn-primary mt-2 w-full py-3">
                {isSubmitting ? 'Creating account…' : 'Create account'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-brand-700 hover:text-brand-800">
                Sign in
              </Link>
            </p>
            <p className="mt-7 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
              Educational demo only. Do not use real medical information or sensitive personal details.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
