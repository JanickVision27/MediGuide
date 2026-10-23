import { Link, Outlet } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext.jsx'
import { LogoMark } from '../icons.jsx'

export default function PublicLayout() {
  const { user } = useAuth()

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5 rounded-lg" aria-label="MediGuide home">
            <LogoMark className="h-9 w-9" />
            <span className="text-lg font-extrabold tracking-tight text-slate-900">
              Medi<span className="text-brand-600">Guide</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3" aria-label="Account navigation">
            {user ? (
              <Link to="/profile" className="btn-primary px-4 py-2">
                Open workspace
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-secondary px-4 py-2">
                  Sign in
                </Link>
                <Link to="/register" className="btn-primary hidden px-4 py-2 sm:inline-flex">
                  Create account
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="main-content" className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="mx-auto w-full max-w-6xl">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-4 text-center text-xs text-slate-500">
        MediGuide is an educational demo. Synthetic data only; not a clinical system.
      </footer>
    </div>
  )
}
