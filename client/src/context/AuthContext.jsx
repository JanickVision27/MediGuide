import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import {
  getCurrentUser,
  loginUser as apiLogin,
  logoutUser as apiLogout,
  registerUser as apiRegister,
  updateUserProfile,
} from '../api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const result = await getCurrentUser()
      setUser(result.user)
      return result.user
    } catch {
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = useCallback(async (credentials) => {
    const result = await apiLogin(credentials)
    setUser(result.user)
    return result.user
  }, [])

  const register = useCallback(async (details) => {
    const result = await apiRegister(details)
    setUser(result.user)
    return result.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } finally {
      setUser(null)
    }
  }, [])

  const saveProfile = useCallback(async (details) => {
    const result = await updateUserProfile(details)
    setUser(result.user)
    return result.user
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshUser, saveProfile }),
    [user, loading, login, register, logout, refreshUser, saveProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
