import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import Sidebar from './Sidebar.jsx'
import MobileHeader from './MobileHeader.jsx'

/**
 * Layout - the app shell.
 *
 * Desktop (lg+): a fixed 16rem (w-64) sidebar on the left, main content offset
 *                by the same width via `lg:pl-64`.
 * Mobile:        the sidebar becomes an off-canvas drawer, opened from the
 *                sticky top bar.
 *
 * The matched child route is rendered by <Outlet />.
 */
export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()

  // Close the mobile drawer whenever navigation happens.
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />

      <div className="flex min-h-screen flex-col lg:pl-64">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        <main
          id="main-content"
          className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8"
        >
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>

        <footer className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-10">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              &copy; {new Date().getFullYear()} MediGuide &mdash; educational demo project.
            </p>
            <p className="font-medium text-slate-600">
              Not a medical device. Synthetic data only.
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
