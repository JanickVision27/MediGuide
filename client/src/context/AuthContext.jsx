import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import {
  getCurrentUser,
  loginUser as apiLogin,
  logoutUser as apiLogout,
  registerUser as apiRegister,
  deleteProfilePhoto as apiDeleteProfilePhoto,
  uploadProfilePhoto as apiUploadProfilePhoto,
  updateUserProfile,
} from '../api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profilePhotoVersion, setProfilePhotoVersion] = useState(0)

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

  const saveProfilePhoto = useCallback(async (file) => {
    const result = await apiUploadProfilePhoto(file)
    setUser(result.user)
    setProfilePhotoVersion((version) => version + 1)
    return result.user
  }, [])

  const removeProfilePhoto = useCallback(async () => {
    const result = await apiDeleteProfilePhoto()
    setUser(result.user)
    setProfilePhotoVersion((version) => version + 1)
    return result.user
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refreshUser,
      saveProfile,
      saveProfilePhoto,
      removeProfilePhoto,
      profilePhotoVersion,
    }),
    [user, loading, login, register, logout, refreshUser, saveProfile, saveProfilePhoto, removeProfilePhoto, profilePhotoVersion],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
