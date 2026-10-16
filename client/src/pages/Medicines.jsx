import { useCallback, useEffect, useState } from 'react'

import MedicineCard from '../components/MedicineCard.jsx'
import FallbackMedicineCard from '../components/FallbackMedicineCard.jsx'
import MedicineModal from '../components/MedicineModal.jsx'
import { API_BASE } from '../utils/medicine.js'

const MODES = {
  search: 'Search Medicines',
  prescription: 'Paste Prescription',
}

const SEARCH_DEBOUNCE_MS = 300

async function readError(res, fallback) {
  try {
    const data = await res.json()
    return data.error || fallback
  } catch {
    return fallback
  }
}

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function StatusNotice({ tone = 'info', children }) {
  const tones = {
    info: 'border-slate-200 bg-white text-slate-600',
    error: 'border-rose-200 bg-rose-50 text-rose-800',
    warning: 'border-amber-300 bg-amber-50 text-amber-900',
  }
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>
      {children}
    </div>
  )
}

/**
 * Medicines page - two modes:
 *  - Search: debounced lookup of our medicine database.
 *  - Paste Prescription: AI extracts names, then splits them into
 *    found (full cards) and notFound (fallback cards).
 */
export default function Medicines() {
  const [mode, setMode] = useState('search')
  const [selectedMedicine, setSelectedMedicine] = useState(null)
  const closeModal = useCallback(() => setSelectedMedicine(null), [])

  // Search state
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS)
  const [results, setResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')

  // Prescription state
  const [prescription, setPrescription] = useState('')
  const [extraction, setExtraction] = useState(null)
  const [extractLoading, setExtractLoading] = useState(false)
  const [extractError, setExtractError] = useState('')

  // Search request, cancelled when the query changes
  useEffect(() => {
    if (mode !== 'search') return undefined

    const controller = new AbortController()
    const run = async () => {
      setSearchLoading(true)
      setSearchError('')
      try {
        const params = new URLSearchParams()
        if (debouncedQuery) params.set('search', debouncedQuery)
        const res = await fetch(`${API_BASE}/medicines?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!res.ok) {
          throw new Error(await readError(res, 'Could not load medicines.'))
        }
        setResults(await res.json())
      } catch (err) {
        if (err.name === 'AbortError') return
        setResults([])
        setSearchError(err.message || 'Could not load medicines.')
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false)
      }
    }
    run()

    return () => controller.abort()
  }, [debouncedQuery, mode])

  const handleFindMedicines = async (event) => {
    event.preventDefault()
    const text = prescription.trim()
    if (!text || extractLoading) return

    setExtractLoading(true)
    setExtractError('')
    setExtraction(null)
    try {
      const res = await fetch(`${API_BASE}/medicines/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) {
        throw new Error(await readError(res, 'Could not read the prescription.'))
      }
      const data = await res.json()
      setExtraction({
        found: Array.isArray(data.found) ? data.found : [],
        notFound: Array.isArray(data.notFound) ? data.notFound : [],
        dbAvailable: data.dbAvailable !== false,
      })
    } catch (err) {
      setExtractError(err.message || 'Could not read the prescription.')
    } finally {
      setExtractLoading(false)
    }
  }

  const renderSearch = () => (
    <section aria-label="Medicine search" className="space-y-6">
      <div>
        <label htmlFor="medicine-search" className="mb-2 block text-sm font-semibold text-slate-700">
          Search by name or composition
        </label>
        <div className="relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" focusable="false">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M20 20l-4.2-4.2" />
          </svg>
          <input
            id="medicine-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Dolo 650, paracetamol, pantoprazole"
            autoComplete="off"
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
      </div>

      {searchError && <StatusNotice tone="error">{searchError}</StatusNotice>}

      {!searchError && (
        <p className="text-xs font-medium text-slate-500" aria-live="polite">
          {searchLoading
            ? 'Searching…'
            : `${results.length} ${results.length === 1 ? 'medicine' : 'medicines'}${
                debouncedQuery ? ` matching "${debouncedQuery}"` : ' (showing the first 50 alphabetically)'
              }`}
        </p>
      )}

      {!searchLoading && !searchError && results.length === 0 && (
        <StatusNotice>No medicines matched. Try a shorter name, or use Paste Prescription for a full list.</StatusNotice>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {results.map((medicine) => (
          <MedicineCard key={medicine._id} medicine={medicine} onViewDetails={setSelectedMedicine} />
        ))}
      </div>
    </section>
  )

  const renderPrescription = () => {
    const found = extraction?.found ?? []
    const notFound = extraction?.notFound ?? []
    const hasResults = extraction && (found.length > 0 || notFound.length > 0)

    return (
      <section aria-label="Prescription lookup" className="space-y-6">
        <form onSubmit={handleFindMedicines} className="space-y-3">
          <label htmlFor="prescription-text" className="block text-sm font-semibold text-slate-700">
            Paste prescription text
          </label>
          <textarea
            id="prescription-text"
            rows={6}
            value={prescription}
            onChange={(e) => setPrescription(e.target.value)}
            placeholder='e.g. "Take Tab Dolo 650 twice daily and Pan 40 before breakfast"'
            maxLength={5000}
            className="w-full resize-y rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">{prescription.length}/5000 characters · Do not paste personal identifiers.</p>
            <button type="submit" disabled={!prescription.trim() || extractLoading} className="btn-primary">
              {extractLoading ? 'Finding medicines…' : 'Find Medicines'}
            </button>
          </div>
        </form>

        {extractError && <StatusNotice tone="error">{extractError}</StatusNotice>}

        {extraction && !extraction.dbAvailable && (
          <StatusNotice tone="warning">
            The medicine database is offline right now, so details are unavailable. The names below were
            read from your text.
          </StatusNotice>
        )}

        {extraction && !hasResults && (
          <StatusNotice>No medicine names were detected. Try pasting the line that lists the medicine names.</StatusNotice>
        )}

        {found.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              In our database ({found.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {found.map((medicine) => (
                <MedicineCard key={medicine._id} medicine={medicine} onViewDetails={setSelectedMedicine} />
              ))}
            </div>
          </div>
        )}

        {notFound.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Not in our sample data ({notFound.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {notFound.map((name) => (
                <FallbackMedicineCard key={name} name={name} />
              ))}
            </div>
          </div>
        )}
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Smart Medicine Lookup</h1>
        <p className="mt-1 text-sm text-slate-500">
          Search our sample medicine database, or paste a prescription and let MediGuide find the medicines in it.
        </p>
      </header>

      <div role="group" aria-label="Lookup mode" className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {Object.entries(MODES).map(([key, label]) => {
          const active = mode === key
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => setMode(key)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                active ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {mode === 'search' ? renderSearch() : renderPrescription()}

      {selectedMedicine && (
        <MedicineModal medicine={selectedMedicine} onClose={closeModal} />
      )}
    </div>
  )
}
