// Render's free tier can answer with a proxy error or its HTML boot page while
// an idle service starts. Keep the original request alive long enough for that
// cold start instead of making the visitor submit the form again.
export const RETRYABLE_STATUSES = new Set([502, 503, 504])

// Roughly two minutes of backoff, excluding the time spent on each request.
// The short initial delays make a normal cold start feel responsive; the longer
// final delays cover a slow start without hammering the API.
export const RETRY_DELAYS_MS = Object.freeze([
  1000,
  2000,
  3000,
  5000,
  8000,
  10000,
  15000,
  15000,
  20000,
  20000,
  20000,
])

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * A response the API could never have produced: a proxy/edge error status, or an
 * HTML page (Render's boot screen) where this client always expects JSON.
 */
export function isWakeUpResponse(response) {
  const contentType = response.headers.get('content-type') || ''

  // Our API uses 502/503 for real JSON errors too (for example, an unavailable
  // AI provider). Those are final answers, not evidence of a Render cold start.
  if (contentType.includes('application/json')) return false
  if (RETRYABLE_STATUSES.has(response.status)) return true
  if (!response.ok) return false
  return contentType.includes('text/html')
}

/**
 * Retry only cold-start/network failures. Real API responses such as 400, 401,
 * 404 and 429 are returned immediately so validation and rate-limit errors are
 * never hidden or retried.
 */
export async function fetchWithRetry(
  url,
  init,
  {
    fetchImpl = fetch,
    sleep = defaultSleep,
    retryDelays = RETRY_DELAYS_MS,
    onWaiting,
  } = {},
) {
  const maxAttempts = retryDelays.length + 1
  let lastError

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const canRetry = attempt < maxAttempts

    try {
      const response = await fetchImpl(url, init)

      if (isWakeUpResponse(response) && canRetry) {
        const delay = retryDelays[attempt - 1]
        onWaiting?.({ attempt, nextAttempt: attempt + 1, delay })
        await sleep(delay)
        continue
      }

      return response
    } catch (error) {
      lastError = error
      // Caller cancellations must remain cancellation, not become retries.
      if (error?.name === 'AbortError' || !canRetry) throw error

      const delay = retryDelays[attempt - 1]
      onWaiting?.({ attempt, nextAttempt: attempt + 1, delay })
      await sleep(delay)
    }
  }

  // The loop either returns a response or throws the final request error.
  throw lastError
}
