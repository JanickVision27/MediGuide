// The browser always talks to the API through its own origin (relative "/api"):
// Vite proxies it in development and `client/vercel.json` proxies it in production.
// Same-origin requests mean no CORS preflight, no third-party cookie, and no
// mixed-content failures. VITE_API_URL is only an escape hatch for deployments
// that expose the API at a different, explicitly configured URL.
const REMOTE_API_BASE = 'https://mediguide-0a1e.onrender.com/api'

function resolveApiBase() {
  const configured = (import.meta.env.VITE_API_URL || '').trim()
  if (!configured) return '/api'

  const normalized = configured.replace(/\/+$/, '')

  // Guard against the classic "works locally, fails when deployed" mistakes:
  // an http:// URL on an https:// page is blocked as mixed content, and a
  // localhost URL points at the visitor's own machine.
  if (import.meta.env.PROD) {
    if (normalized.startsWith('http://')) {
      console.error(
        `VITE_API_URL starts with http:// (${normalized}) but the site is served over https. ` +
          'Browsers block that as mixed content, so the relative /api proxy is used instead.',
      )
      return '/api'
    }
    if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(normalized)) {
      console.error(
        `VITE_API_URL points at localhost (${normalized}), which the browser cannot reach ` +
          'in production. Use the deployed API URL or leave VITE_API_URL unset.',
      )
      return '/api'
    }
  }

  // Accept both ".../api" and a bare origin such as "https://api.example.com".
  if (/^https?:\/\//i.test(normalized) && !/\/api$/i.test(normalized)) {
    return `${normalized}/api`
  }
  return normalized
}

export const API_BASE = resolveApiBase()
export const REMOTE_API_URL = REMOTE_API_BASE

const NETWORK_ERROR_MESSAGE =
  'We could not reach the MediGuide server. It may be waking up after a period of inactivity - please wait a few seconds and try again.'

// Render's free tier stops idle services; the first request then waits for a cold
// start or fails outright. Retrying once turns that into a short delay instead of
// a scary "Failed to fetch" message.
const RETRYABLE_STATUSES = new Set([502, 503, 504])
const RETRY_DELAY_MS = 2500
const MAX_ATTEMPTS = 2

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetry(url, init, { retries = MAX_ATTEMPTS } = {}) {
  let lastError

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, init)

      if (RETRYABLE_STATUSES.has(response.status) && attempt < retries) {
        await sleep(RETRY_DELAY_MS)
        continue
      }
      return response
    } catch (error) {
      lastError = error
      // Aborts (unmounted components, cancelled photo loads) are not retried.
      if (error?.name === 'AbortError' || attempt === retries) throw error
      await sleep(RETRY_DELAY_MS)
    }
  }

  throw lastError
}

async function request(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  let response

  try {
    response = await fetchWithRetry(`${API_BASE}${path}`, {
      credentials: 'include',
      ...options,
      headers: {
        ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    // fetch() only rejects like this when no HTTP response arrived at all
    // (offline, DNS/TLS failure, CORS blocking, mixed content, sleeping server).
    if (import.meta.env.DEV) console.error(`API request to ${API_BASE}${path} failed`, error)
    const networkError = new Error(NETWORK_ERROR_MESSAGE)
    networkError.cause = error
    networkError.isNetworkError = true
    throw networkError
  }

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(
      payload.message ||
        payload.error ||
        (response.status === 404
          ? 'The MediGuide API was not found. Check that the backend is deployed and reachable.'
          : 'Something went wrong. Please try again.'),
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
  let response
  try {
    response = await fetch(`${API_BASE}/auth/profile/photo`, {
      credentials: 'include',
      cache: 'no-store',
      signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    const networkError = new Error(NETWORK_ERROR_MESSAGE)
    networkError.cause = error
    networkError.isNetworkError = true
    throw networkError
  }
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
