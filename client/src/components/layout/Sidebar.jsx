import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext.jsx'
import {
  CalendarIcon,
  CloseIcon,
  LogoMark,
  PillIcon,
  ShieldCheckIcon,
  UserIcon,
} from '../icons.jsx'

const NAV_ITEMS = [
  { to: '/profile', label: 'Profile', Icon: UserIcon },
  { to: '/medicines', label: 'Medicine & Prescription', Icon: PillIcon },
  { to: '/appointments', label: 'Appointments', Icon: CalendarIcon },
]

export default function Sidebar({ open = false, onClose }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  async function handleLogout() {
    setSigningOut(true)
    try {
      await logout()
    } catch {
      // AuthContext still clears local state if the network request fails.
    } finally {
      onClose?.()
      navigate('/', { replace: true })
      setSigningOut(false)
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        id="sidebar"
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-5">
          <Link to="/" className="flex flex-1 items-center gap-3 rounded-lg" aria-label="MediGuide home">
            <LogoMark className="h-10 w-10 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate text-lg font-extrabold leading-tight tracking-tight text-slate-900">
                Medi<span className="text-brand-600">Guide</span>
              </span>
              <span className="block truncate text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Healthcare Assistant
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="scrollbar-slim flex-1 overflow-y-auto px-3 py-5">
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Workspace
          </p>
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ to, label, Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        aria-hidden="true"
                        className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-600 transition-opacity duration-150 ${
                          isActive ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                      <Icon
                        className={`h-5 w-5 shrink-0 transition-colors duration-150 ${
                          isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                      />
                      <span className="truncate">{label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-slate-200 px-4 py-4">
          <div className="mb-3 rounded-xl border border-slate-200 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-slate-800">{user?.fullName}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">{user?.email}</p>
            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              className="mt-2 text-xs font-bold text-brand-700 hover:text-brand-900 disabled:opacity-60"
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
          <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5">
            <ShieldCheckIcon className="mt-px h-4 w-4 shrink-0 text-brand-600" />
            <p className="text-[11px] leading-relaxed text-slate-500">
              <span className="font-semibold text-slate-700">Educational demo.</span>{' '}
              Synthetic data only &mdash; not a real clinical system.
            </p>
          </div>
          <p className="mt-2.5 px-1 text-[11px] font-medium text-slate-400">v0.1.0</p>
        </div>
      </aside>
    </>
  )
}
