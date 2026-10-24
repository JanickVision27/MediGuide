import { Link } from 'react-router-dom'

import { LogoMark, MenuIcon } from '../icons.jsx'

/**
 * MobileHeader - sticky top bar shown only below the `lg` breakpoint.
 * Its only job is to expose the hamburger that opens the sidebar drawer.
 */
export default function MobileHeader({ onMenuClick }) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-sm lg:hidden">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        aria-controls="sidebar"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-brand-700"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      <Link to="/" className="flex items-center gap-2.5" aria-label="MediGuide home">
        <LogoMark className="h-8 w-8" />
        <span className="text-base font-bold tracking-tight text-slate-900">
          Medi<span className="text-brand-600">Guide</span>
        </span>
      </Link>
    </header>
  )
}
