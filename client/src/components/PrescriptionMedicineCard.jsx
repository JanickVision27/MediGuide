import { useEffect, useRef, useState } from 'react'

import AIMedicineCard from './AIMedicineCard.jsx'
import FallbackMedicineCard from './FallbackMedicineCard.jsx'
import { API_BASE } from '../utils/medicine.js'

const IDLE_LOOKUP = { status: 'idle', data: null, error: '' }

async function responseError(response) {
  try {
    const data = await response.json()
    return data.error || 'AI lookup is unavailable right now. Please try again.'
  } catch {
    return 'AI lookup is unavailable right now. Please try again.'
  }
}

/**
 * A prescription-extracted medicine that was not found in MongoDB. The user
 * explicitly requests Groq details, avoiding an uncontrolled batch of requests
 * when a prescription contains several unmatched or uncertain names.
 */
export default function PrescriptionMedicineCard({ name }) {
  const [lookup, setLookup] = useState(IDLE_LOOKUP)
  const abortRef = useRef(null)

  useEffect(() => {
    setLookup(IDLE_LOOKUP)
    return () => abortRef.current?.abort()
  }, [name])

  async function lookupWithGroq() {
    if (lookup.status === 'loading') return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLookup({ status: 'loading', data: null, error: '' })

    try {
      const response = await fetch(`${API_BASE}/medicines/ai-lookup`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicineName: name }),
        signal: controller.signal,
      })

      if (abortRef.current !== controller) return
      if (response.status === 404) {
        setLookup({ status: 'notFound', data: null, error: '' })
        return
      }
      if (!response.ok) throw new Error(await responseError(response))

      const data = await response.json()
      if (abortRef.current !== controller) return
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('MediGuide AI returned an unexpected response. Please try again.')
      }
      setLookup({ status: 'found', data, error: '' })
    } catch (error) {
      if (error.name === 'AbortError' || abortRef.current !== controller) return
      setLookup({
        status: 'error',
        data: null,
        error: error.message || 'AI lookup is unavailable right now. Please try again.',
      })
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }

  if (lookup.status === 'found') {
    return (
      <div className="sm:col-span-2 xl:col-span-3">
        <AIMedicineCard data={lookup.data} medicineName={name} />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <FallbackMedicineCard
        name={name}
        onAiLookup={lookup.status === 'notFound' ? undefined : lookupWithGroq}
        aiLookupLoading={lookup.status === 'loading'}
      />

      {lookup.status === 'loading' && (
        <p role="status" className="text-xs font-medium text-slate-500">
          Looking up {name} with Groq…
        </p>
      )}
      {lookup.status === 'notFound' && (
        <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          Groq could not find reliable information for this extracted name. Check the prescription text or try 1mg.
        </p>
      )}
      {lookup.status === 'error' && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          {lookup.error} Use “Get AI medicine info” to try again.
        </p>
      )}
    </div>
  )
}
