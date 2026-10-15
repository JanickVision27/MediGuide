import { Link } from 'react-router-dom'

import { LockIcon } from '../components/icons.jsx'

/**
 * Login page - PLACEHOLDER wired to the Home hero's "Login" button.
 * There is no auth backend yet, so this is a non-functional stub.
 *
 * Route: /login  (registered in src/App.jsx)
 */
export default function Login() {
  return (
    <div className="mx-auto max-w-md">
      <div className="card p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <LockIcon className="h-6 w-6" />
        </span>

        <h1 className="mt-5 text-center text-2xl font-bold tracking-tight text-slate-900">
          Login
        </h1>
        <p className="mt-2 text-center text-sm leading-relaxed text-slate-500">
          Authentication Page - Under Construction
        </p>
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-center text-xs leading-relaxed text-slate-500">
          No auth backend is connected yet. This is an educational demo using synthetic data only.
        </p>

        <Link to="/" className="btn-secondary mt-6 w-full">
          Back to Home
        </Link>
      </div>
    </div>
  )
}
