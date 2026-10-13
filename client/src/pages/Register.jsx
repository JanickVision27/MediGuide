import { Link } from 'react-router-dom'

import { UserIcon } from '../components/icons.jsx'

/**
 * Register page - PLACEHOLDER wired to the Home hero's "Register" button.
 * There is no auth backend yet, so this is a non-functional stub.
 *
 * Route: /register  (registered in src/App.jsx)
 */
export default function Register() {
  return (
    <div className="mx-auto max-w-md">
      <div className="card p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <UserIcon className="h-6 w-6" />
        </span>

        <h1 className="mt-5 text-center text-2xl font-bold tracking-tight text-slate-900">
          Register
        </h1>
        <p className="mt-2 text-center text-sm leading-relaxed text-slate-500">
          Registration Page - Under Construction
        </p>
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-center text-xs leading-relaxed text-slate-500">
          No auth backend is connected yet. Please never enter real personal or health information
          into this demo.
        </p>

        <Link to="/" className="btn-secondary mt-6 w-full">
          Back to Home
        </Link>
      </div>
    </div>
  )
}
