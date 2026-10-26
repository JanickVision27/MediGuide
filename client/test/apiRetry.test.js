import assert from 'node:assert/strict'
import test from 'node:test'

import {
  fetchWithRetry,
  isWakeUpResponse,
  RETRY_DELAYS_MS,
} from '../src/utils/apiRetry.js'

const jsonResponse = (status = 200) =>
  new Response(JSON.stringify({ ok: status < 400 }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const htmlResponse = (status = 200) =>
  new Response('<html>Application loading</html>', {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })

const noWait = async () => {}

test('returns a normal API response without retrying', async () => {
  let calls = 0
  let waitingCalls = 0
  const response = await fetchWithRetry('/api/auth/login', {}, {
    fetchImpl: async () => {
      calls += 1
      return jsonResponse()
    },
    sleep: noWait,
    onWaiting: () => {
      waitingCalls += 1
    },
  })

  assert.equal(response.status, 200)
  assert.equal(calls, 1)
  assert.equal(waitingCalls, 0)
})

test('keeps the original request alive through a cold-start 502', async () => {
  const responses = [htmlResponse(502), htmlResponse(503), jsonResponse(200)]
  const delays = []
  const waiting = []

  const response = await fetchWithRetry('/api/auth/login', {}, {
    fetchImpl: async () => responses.shift(),
    sleep: async (delay) => delays.push(delay),
    onWaiting: (detail) => waiting.push(detail),
  })

  assert.equal(response.status, 200)
  assert.deepEqual(delays, [1000, 2000])
  assert.deepEqual(
    waiting.map(({ attempt, nextAttempt }) => [attempt, nextAttempt]),
    [[1, 2], [2, 3]],
  )
})

test('recognizes and retries Render HTML boot pages', async () => {
  assert.equal(isWakeUpResponse(htmlResponse()), true)

  const responses = [htmlResponse(), jsonResponse()]
  let calls = 0
  const response = await fetchWithRetry('/api/health', {}, {
    fetchImpl: async () => {
      calls += 1
      return responses.shift()
    },
    sleep: noWait,
  })

  assert.equal(response.status, 200)
  assert.equal(calls, 2)
})

test('retries a dropped network connection and then succeeds', async () => {
  let calls = 0
  let waitingCalls = 0
  const response = await fetchWithRetry('/api/auth/login', {}, {
    fetchImpl: async () => {
      calls += 1
      if (calls === 1) throw new TypeError('fetch failed')
      return jsonResponse()
    },
    sleep: noWait,
    onWaiting: () => {
      waitingCalls += 1
    },
  })

  assert.equal(response.status, 200)
  assert.equal(calls, 2)
  assert.equal(waitingCalls, 1)
})

test('does not retry real API errors, including JSON 502/503 responses', async () => {
  for (const status of [400, 401, 404, 429, 502, 503, 504]) {
    let calls = 0
    const response = await fetchWithRetry('/api/auth/login', {}, {
      fetchImpl: async () => {
        calls += 1
        return jsonResponse(status)
      },
      sleep: noWait,
    })

    assert.equal(response.status, status)
    assert.equal(calls, 1)
  }
})

test('returns the final gateway response after the retry budget is exhausted', async () => {
  let calls = 0
  const delays = []
  const response = await fetchWithRetry('/api/auth/login', {}, {
    fetchImpl: async () => {
      calls += 1
      return htmlResponse(503)
    },
    retryDelays: [5, 10],
    sleep: async (delay) => delays.push(delay),
  })

  assert.equal(response.status, 503)
  assert.equal(calls, 3)
  assert.deepEqual(delays, [5, 10])
})

test('never retries caller cancellation', async () => {
  const abortError = new DOMException('Cancelled', 'AbortError')
  let calls = 0

  await assert.rejects(
    fetchWithRetry('/api/auth/login', {}, {
      fetchImpl: async () => {
        calls += 1
        throw abortError
      },
      sleep: noWait,
    }),
    (error) => error === abortError,
  )
  assert.equal(calls, 1)
})

test('default backoff covers slow cold starts for about two minutes', () => {
  const totalDelay = RETRY_DELAYS_MS.reduce((sum, delay) => sum + delay, 0)
  assert.equal(totalDelay, 119000)
  assert.ok(Object.isFrozen(RETRY_DELAYS_MS))
})
