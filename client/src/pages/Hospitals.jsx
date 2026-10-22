import { useEffect, useRef, useState } from 'react'

import { searchHospitals } from '../api.js'

function safeHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return ''
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : ''
  } catch {
    return ''
  }
}

function safeImageSource(value) {
  if (typeof value !== 'string') return ''
  if (value.startsWith('/api/hospitals/photo?name=')) return value
  const url = safeHttpUrl(value)
  return url.startsWith('https://') ? url : ''
}

function hospitalMapUrl(hospital) {
  const coordinates = hospital.location?.coordinates
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return ''
  const [longitude, latitude] = coordinates.map(Number)
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    Math.abs(longitude) > 180 ||
    Math.abs(latitude) > 90
  ) {
    return ''
  }
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`
}

function HospitalImage({ hospital }) {
  const [failed, setFailed] = useState(false)
  const imageUrl = safeImageSource(hospital.imageUrl)

  if (imageUrl && !failed) {
    return (
      <img
        className="h-44 w-full object-cover"
        src={imageUrl}
        alt={`Photo of ${hospital.name}`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <div
      className="flex h-44 flex-col items-center justify-center gap-2 bg-gradient-to-br from-emerald-50 to-sky-100 text-emerald-800"
      role="img"
      aria-label={`No verified photo available for ${hospital.name}`}
    >
      <span className="text-5xl" aria-hidden="true">🏥</span>
      <span className="rounded-md bg-white/80 px-2 py-1 text-xs font-medium">
        Hospital photo unavailable
      </span>
    </div>
  )
}

export default function Hospitals() {
  const [cityInput, setCityInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [city, setCity] = useState('')
  const [hospitals, setHospitals] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [searched, setSearched] = useState(false)
  const [resultCount, setResultCount] = useState(0)
  const [source, setSource] = useState('OpenStreetMap')
  const [cached, setCached] = useState(false)
  const requestId = useRef(0)

  useEffect(
    () => () => {
      requestId.current += 1
    },
    [],
  )

  async function runSearch(
    cityValue = cityInput.trim(),
    nameValue = nameInput.trim(),
    refresh = false,
  ) {
    if (!cityValue) {
      setError('Please enter a city in India, for example Pune or Hyderabad.')
      return
    }

    const currentRequest = ++requestId.current
    setLoading(true)
    setError('')
    setNotice('')
    setSearched(true)
    setCity(cityValue)
    setHospitals([])
    setResultCount(0)

    try {
      const result = await searchHospitals({ city: cityValue, name: nameValue, refresh })
      if (currentRequest !== requestId.current) return

      const records = Array.isArray(result.results)
        ? result.results
        : result.hospitals || []
      const normalizedRecords = Array.isArray(records) ? records : []
      setHospitals(normalizedRecords)
      setCity(result.city || cityValue)
      setResultCount(Number.isFinite(result.count) ? result.count : normalizedRecords.length)
      setSource(result.source || 'OpenStreetMap')
      setCached(Boolean(result.cached))
      setNotice(result.notice || '')
    } catch (err) {
      if (currentRequest !== requestId.current) return
      setHospitals([])
      setResultCount(0)
      setError(err.message || 'Hospital search failed.')
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    runSearch()
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          Open hospital directory
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Find hospitals across India
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Search hospitals by Indian city and optionally filter by name. Photos use Google Places
          when configured, or hospital-specific OpenStreetMap/Wikipedia/Commons matches when available.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto]"
      >
        <div>
          <label htmlFor="hospital-city" className="mb-1 block text-sm font-medium text-slate-700">
            City in India
          </label>
          <input
            id="hospital-city"
            value={cityInput}
            onChange={(event) => setCityInput(event.target.value)}
            placeholder="e.g. Pune, Hyderabad"
            maxLength={100}
            required
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <div>
          <label htmlFor="hospital-name" className="mb-1 block text-sm font-medium text-slate-700">
            Hospital name (optional)
          </label>
          <input
            id="hospital-name"
            value={nameInput}
            onChange={(event) => setNameInput(event.target.value)}
            placeholder="e.g. Apollo"
            maxLength={100}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Searching…' : 'Search hospitals'}
          </button>
        </div>
      </form>

      {error && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Hospital search unavailable</p>
          <p className="mt-1">{error}</p>
          <button type="button" onClick={() => runSearch()} className="mt-3 font-semibold underline">
            Try again
          </button>
        </div>
      )}
      {loading && (
        <p role="status" className="text-sm text-slate-500">
          Searching mapped hospitals near {cityInput}…
        </p>
      )}

      {!loading && !error && searched && hospitals.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h2 className="font-semibold text-slate-900">No mapped hospitals found</h2>
          <p className="mt-2 text-sm text-slate-600">
            Try another Indian city or remove the hospital-name filter. Missing results do not mean
            a hospital does not exist.
          </p>
        </div>
      )}

      {hospitals.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{resultCount}</span> results near {city}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-slate-500">
                Source: {source}{cached ? ' · Cached records' : ' · Live query'}
              </span>
              <button
                type="button"
                disabled={loading}
                onClick={() => runSearch(city, nameInput.trim(), true)}
                className="text-sm font-semibold text-emerald-700 underline disabled:opacity-50"
              >
                Refresh hospital data
              </button>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {hospitals.map((hospital) => {
              const mapUrl = hospitalMapUrl(hospital)
              const sourceUrl = safeHttpUrl(hospital.sourceUrl)
              const key = hospital.osmId || hospital.id
              return (
                <article
                  key={key}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <HospitalImage key={`${key}-${hospital.imageUrl || 'no-photo'}`} hospital={hospital} />
                  <div className="space-y-3 p-5">
                    <div>
                      <h2 className="text-lg font-bold leading-snug text-slate-900">{hospital.name}</h2>
                      <p className="mt-1 text-xs font-medium text-emerald-700">
                        {hospital.state || hospital.city || city}
                      </p>
                    </div>
                    <p className="text-sm leading-6 text-slate-600">
                      {hospital.address || 'Address not available in map data'}
                    </p>
                    <div className="flex flex-wrap gap-3 pt-1">
                      {mapUrl && (
                        <a
                          href={mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-semibold text-emerald-700 hover:underline"
                        >
                          View on map ↗
                        </a>
                      )}
                      {sourceUrl && (
                        <a
                          href={sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-semibold text-slate-600 hover:underline"
                        >
                          {hospital.source === 'Google Places' ? 'Google Maps ↗' : 'OSM record ↗'}
                        </a>
                      )}
                      {hospital.photoAttributions?.map((attribution, index) => {
                        const attributionUrl = safeHttpUrl(attribution.uri)
                        const label = `Photo: ${attribution.name || 'Contributor'}`
                        return attributionUrl ? (
                          <a
                            key={`${attribution.name}-${index}`}
                            href={attributionUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-slate-500 hover:underline"
                          >
                            {label}
                          </a>
                        ) : (
                          <span key={`${attribution.name}-${index}`} className="text-xs text-slate-500">
                            {label}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          {notice && <p className="text-xs leading-5 text-slate-500">{notice}</p>}
          <p className="text-xs leading-5 text-slate-500">
            {source === 'OpenStreetMap'
              ? 'Map and listing data © OpenStreetMap contributors. '
              : 'Hospital listings and photos are provided by Google Places. '}
            Photos are shown only when a hospital-specific source match is available. Some hospitals
            have no publicly indexed photo, so their cards show a photo-unavailable placeholder.
            Use “Refresh hospital data” to refresh listings.
          </p>
        </>
      )}

      <div className="rounded-xl bg-slate-100 p-4 text-sm text-slate-600">
        This directory does not provide verified doctor rosters or live appointment slots. Doctor
        bookings use the separate synthetic demo provider directory.
      </div>
    </div>
  )
}
