export const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

async function request(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(
      payload.message || payload.error || 'Something went wrong. Please try again.',
    )
    error.status = response.status
    throw error
  }
  return payload
}

export const getApiStatus = () => request('/health')

export const searchHospitals = ({ city = '', name = '', refresh = false } = {}) => {
  const query = new URLSearchParams()
  if (city) query.set('city', city)
  if (name) query.set('name', name)
  if (refresh) query.set('refresh', '1')
  const queryString = query.toString()
  return request(`/hospitals/search${queryString ? `?${queryString}` : ''}`)
}

export const getDoctors = (params = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value)
  })
  const queryString = query.toString()
  return request(`/doctors${queryString ? `?${queryString}` : ''}`)
}

export const registerUser = (data) =>
  request('/auth/register', { method: 'POST', body: JSON.stringify(data) })
export const loginUser = (data) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify(data) })
export const requestPasswordReset = (email) =>
  request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) })
export const completePasswordReset = (data) =>
  request('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) })
export const getCurrentUser = () => request('/auth/me')
export const logoutUser = () => request('/auth/logout', { method: 'POST' })
export const updateUserProfile = (data) =>
  request('/auth/profile', { method: 'PATCH', body: JSON.stringify(data) })

export const uploadProfilePhoto = (file) => {
  const body = new FormData()
  body.append('photo', file)
  return request('/auth/profile/photo', { method: 'POST', body })
}

export const deleteProfilePhoto = () =>
  request('/auth/profile/photo', { method: 'DELETE' })

export async function getProfilePhoto({ signal } = {}) {
  const response = await fetch(`${API_BASE}/auth/profile/photo`, {
    credentials: 'include',
    cache: 'no-store',
    signal,
  })
  if (response.status === 404) return null
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.message || 'Unable to load the profile photo.')
  }
  return response.blob()
}

// Appointment endpoints use the authenticated HttpOnly session cookie.
// The server derives userId and patient identity from the session; never send them.
export const getAppointments = () => request('/appointments')
export const createAppointment = (data) =>
  request('/appointments', { method: 'POST', body: JSON.stringify(data) })
export const cancelAppointment = (id) =>
  request(`/appointments/${encodeURIComponent(id)}/cancel`, { method: 'PATCH' })
export const getAppointmentReminders = () => request('/appointments/reminders')
export const updateAppointmentReminders = (id, preferences) =>
  request(`/appointments/${encodeURIComponent(id)}/reminders`, {
    method: 'PATCH',
    body: JSON.stringify(preferences),
  })
export const updateAppointmentChecklist = (id, checklist) =>
  request(`/appointments/${encodeURIComponent(id)}/checklist`, {
    method: 'PATCH',
    body: JSON.stringify(checklist),
  })
export const markNotificationRead = (id) =>
  request(`/appointments/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' })
export const markAllNotificationsRead = () =>
  request('/appointments/notifications/read-all', { method: 'PATCH' })
