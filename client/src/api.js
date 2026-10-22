export const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
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
export const getCurrentUser = () => request('/auth/me')
export const logoutUser = () => request('/auth/logout', { method: 'POST' })
export const updateUserProfile = (data) =>
  request('/auth/profile', { method: 'PATCH', body: JSON.stringify(data) })

// Appointment endpoints use the authenticated HttpOnly session cookie.
// The server derives userId and patient identity from the session; never send them.
export const getAppointments = () => request('/appointments')
export const createAppointment = (data) =>
  request('/appointments', { method: 'POST', body: JSON.stringify(data) })
export const cancelAppointment = (id) =>
  request(`/appointments/${encodeURIComponent(id)}/cancel`, { method: 'PATCH' })
