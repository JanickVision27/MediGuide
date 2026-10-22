import { useCallback, useEffect, useRef, useState } from 'react'

import { searchHospitals } from '../api.js'
import { HospitalIcon } from '../components/icons.jsx'

export default function Hospitals() {
  const [filters, setFilters] = useState({ city: 'Hyderabad', name: '' })
  const [hospitals, setHospitals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const requestId = useRef(0)

  const loadHospitals = useCallback(async (city, name) => {
    const currentRequest = ++requestId.current
    setLoading(true)
    setError('')

    try {
      const result = await searchHospitals({ city: city.trim(), name: name.trim() })
      if (currentRequest === requestId.current) setHospitals(result.hospitals || [])
    } catch (err) {
      if (currentRequest === requestId.current) {
        setHospitals([])
        setError(err.message || 'Unable to search the hospital directory.')
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHospitals('Hyderabad', '')
    return () => {
      requestId.current += 1
    }
  }, [loadHospitals])

  function update(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    loadHospitals(filters.city, filters.name)
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Hospital Directory</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
          Explore the synthetic provider directory used by this educational demo.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="card grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="hospital-city" className="mb-1.5 block text-sm font-semibold text-slate-700">
            City
          </label>
          <input
            id="hospital-city"
            name="city"
            type="search"
            maxLength={80}
            value={filters.city}
            onChange={update}
            placeholder="e.g. Hyderabad"
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div>
          <label htmlFor="hospital-name" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Hospital name (optional)
          </label>
          <input
            id="hospital-name"
            name="name"
            type="search"
            maxLength={80}
            value={filters.name}
            onChange={update}
            placeholder="Search by name"
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary py-2.5">
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
        Demo listings only. Names and locations are synthetic; this directory does not verify providers,
        contact details, availability, or quality of care.
      </p>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {!loading && !error && hospitals.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="font-semibold text-slate-800">No demo hospitals found</h2>
          <p className="mt-1 text-sm text-slate-500">Try another city or leave the name filter blank.</p>
        </div>
      )}

      <section aria-label="Hospital results" className="grid gap-4 md:grid-cols-2">
        {hospitals.map((hospital) => (
          <article key={hospital.id} className="card p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <HospitalIcon className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900">{hospital.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{hospital.area}, {hospital.city}</p>
              </div>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-700">{hospital.type}</p>
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Demo services">
              {hospital.services.map((service) => (
                <li key={service} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {service}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </div>
  )
}
