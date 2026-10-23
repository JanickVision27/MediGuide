import { Navigate } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext.jsx'

export default function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center" role="status">
        <p className="text-sm font-medium text-slate-500">Checking your session…</p>
      </div>
    )
  }

  return user ? <Navigate to="/profile" replace /> : children
}
