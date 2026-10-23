import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  cancelAppointment as cancelAppointmentApi,
  createAppointment,
  getAppointments,
  getDoctors,
  searchHospitals,
} from '../api.js'
import { CalendarIcon, HospitalIcon } from '../components/icons.jsx'
import './Appointments.css'

function getToday() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(time) {
  const [hours, minutes] = time.split(':')
  const date = new Date()
  date.setHours(Number(hours), Number(minutes), 0, 0)
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function getAppointmentId(appointment) {
  return appointment._id || appointment.id
}

function getDoctorId(doctor) {
  return String(
    doctor.id || doctor._id || `${doctor.name}|${doctor.specialty}|${doctor.location || ''}`,
  )
}

function requestError(error, fallback) {
  if (error.status === 401) return 'Your session has expired. Please log in again.'
  return error.message || fallback
}

function safeHospitalSourceUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return ''
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : ''
  } catch {
    return ''
  }
}

function hospitalMapUrl(hospital) {
  const coordinates = hospital?.location?.coordinates
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return ''
  const longitude = Number(coordinates[0])
  const latitude = Number(coordinates[1])
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

// Keep only the location snapshot needed by an appointment. This also prevents
// photo metadata and other live-provider fields from being posted to booking.
function normalizeHospital(hospital, fallbackCity) {
  if (!hospital || typeof hospital !== 'object') return null

  const id = typeof (hospital.id || hospital.osmId) === 'string'
    ? (hospital.id || hospital.osmId).trim()
    : ''
  const name = typeof hospital.name === 'string' ? hospital.name.trim() : ''
  const address = typeof hospital.address === 'string' ? hospital.address.trim() : ''
  const city = typeof hospital.city === 'string'
    ? hospital.city.trim()
    : fallbackCity.trim()
  const state = typeof hospital.state === 'string' ? hospital.state.trim() : ''
  const sourceUrl = safeHospitalSourceUrl(hospital.sourceUrl)
  const coordinates = hospital.location?.coordinates

  if (
    !id || id.length > 200 ||
    name.length < 2 || name.length > 200 ||
    address.length > 1000 || city.length > 120 || state.length > 120 ||
    !['OpenStreetMap', 'Google Places'].includes(hospital.source) ||
    !sourceUrl ||
    !Array.isArray(coordinates) || coordinates.length !== 2
  ) {
    return null
  }

  const longitude = Number(coordinates[0])
  const latitude = Number(coordinates[1])
  if (
    !Number.isFinite(longitude) || Math.abs(longitude) > 180 ||
    !Number.isFinite(latitude) || Math.abs(latitude) > 90
  ) {
    return null
  }

  return {
    id,
    name,
    address,
    city: city || fallbackCity.trim(),
    state,
    source: hospital.source,
    sourceUrl,
    location: { type: 'Point', coordinates: [longitude, latitude] },
  }
}

export default function Appointments() {
  const [appointments, setAppointments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [doctorsLoading, setDoctorsLoading] = useState(true)
  const [doctorError, setDoctorError] = useState('')
  const [doctorSearch, setDoctorSearch] = useState('')
  const [activeTab, setActiveTab] = useState('Upcoming')
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cancellingId, setCancellingId] = useState(null)
  const [form, setForm] = useState({ doctorId: '', date: '', time: '', reason: '' })
  const [hospitalCity, setHospitalCity] = useState('')
  const [hospitalName, setHospitalName] = useState('')
  const [hospitalResults, setHospitalResults] = useState([])
  const [selectedHospital, setSelectedHospital] = useState(null)
  const [hospitalLoading, setHospitalLoading] = useState(false)
  const [hospitalError, setHospitalError] = useState('')
  const [hospitalNotice, setHospitalNotice] = useState('')
  const [hospitalSearched, setHospitalSearched] = useState(false)
  const [hospitalSource, setHospitalSource] = useState('')
  const [hospitalCached, setHospitalCached] = useState(false)
  const [hospitalResultsVisible, setHospitalResultsVisible] = useState(true)
  const appointmentRequest = useRef(0)
  const doctorRequest = useRef(0)
  const hospitalRequest = useRef(0)

  const today = getToday()

  const loadAppointments = useCallback(async () => {
    const currentRequest = ++appointmentRequest.current
    setLoading(true)
    setError('')
    try {
      const result = await getAppointments()
      if (currentRequest !== appointmentRequest.current) return
      const records = Array.isArray(result) ? result : result.appointments || []
      setAppointments(Array.isArray(records) ? records : [])
      setError('')
    } catch (err) {
      if (currentRequest === appointmentRequest.current) {
        setError(requestError(err, 'Unable to load appointments. Please try again.'))
      }
    } finally {
      if (currentRequest === appointmentRequest.current) setLoading(false)
    }
  }, [])

  const loadDoctors = useCallback(async () => {
    const currentRequest = ++doctorRequest.current
    setDoctorsLoading(true)
    setDoctorError('')
    try {
      const result = await getDoctors()
      if (currentRequest !== doctorRequest.current) return
      const records = Array.isArray(result) ? result : result.doctors || []
      setDoctors(Array.isArray(records) ? records : [])
      setDoctorError('')
    } catch (err) {
      if (currentRequest === doctorRequest.current) {
        setDoctorError(requestError(err, 'Unable to load the demo provider directory.'))
      }
    } finally {
      if (currentRequest === doctorRequest.current) setDoctorsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAppointments()
    loadDoctors()
    return () => {
      appointmentRequest.current += 1
      doctorRequest.current += 1
      hospitalRequest.current += 1
    }
  }, [loadAppointments, loadDoctors])

  const visibleAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => {
          const isPastDate = appointment.date < today
          if (activeTab === 'Upcoming') {
            return appointment.status === 'Upcoming' && !isPastDate
          }
          return (
            appointment.status === 'Completed' ||
            appointment.status === 'Cancelled' ||
            isPastDate
          )
        })
        .sort((a, b) => {
          const first = `${a.date} ${a.time}`
          const second = `${b.date} ${b.time}`
          return activeTab === 'Upcoming'
            ? first.localeCompare(second)
            : second.localeCompare(first)
        }),
    [appointments, activeTab, today],
  )

  const filteredDoctors = useMemo(() => {
    const query = doctorSearch.trim().toLocaleLowerCase()
    if (!query) return doctors
    return doctors.filter((doctor) =>
      `${doctor.name} ${doctor.specialty} ${doctor.location || ''}`
        .toLocaleLowerCase()
        .includes(query),
    )
  }, [doctors, doctorSearch])

  function resetBookingForm() {
    hospitalRequest.current += 1
    setForm({ doctorId: '', date: '', time: '', reason: '' })
    setDoctorSearch('')
    setHospitalCity('')
    setHospitalName('')
    setHospitalResults([])
    setSelectedHospital(null)
    setHospitalLoading(false)
    setHospitalError('')
    setHospitalNotice('')
    setHospitalSearched(false)
    setHospitalSource('')
    setHospitalCached(false)
    setHospitalResultsVisible(true)
  }

  function toggleBookingForm() {
    if (showForm) resetBookingForm()
    setShowForm((visible) => !visible)
    setMessage('')
    setError('')
  }

  function updateHospitalCriteria(field, value) {
    // Results for previous criteria must never remain selectable under a newly
    // typed city/name, including while an older request is still resolving.
    hospitalRequest.current += 1
    if (field === 'city') setHospitalCity(value)
    else setHospitalName(value)
    setHospitalLoading(false)
    setHospitalResults([])
    setSelectedHospital(null)
    setHospitalError('')
    setHospitalNotice('')
    setHospitalSearched(false)
    setHospitalSource('')
    setHospitalCached(false)
    setHospitalResultsVisible(true)
  }

  async function runHospitalSearch() {
    const cityValue = hospitalCity.trim()
    const nameValue = hospitalName.trim()
    if (!cityValue) {
      setHospitalError('Enter an Indian city to search for a hospital.')
      return
    }

    const currentRequest = ++hospitalRequest.current
    setHospitalLoading(true)
    setHospitalError('')
    setHospitalNotice('')
    setHospitalSearched(true)
    setHospitalResults([])
    setSelectedHospital(null)
    setHospitalSource('')
    setHospitalCached(false)
    setHospitalResultsVisible(true)

    try {
      const result = await searchHospitals({ city: cityValue, name: nameValue })
      if (currentRequest !== hospitalRequest.current) return
      const records = Array.isArray(result.results)
        ? result.results
        : result.hospitals || []
      const normalized = Array.isArray(records)
        ? records.map((hospital) => normalizeHospital(hospital, cityValue)).filter(Boolean)
        : []
      setHospitalResults(normalized)
      setHospitalSource(result.source || 'OpenStreetMap')
      setHospitalCached(Boolean(result.cached))
      setHospitalNotice(result.notice || '')
    } catch (err) {
      if (currentRequest === hospitalRequest.current) {
        setHospitalResults([])
        setHospitalError(requestError(err, 'Unable to search hospitals. Please try again.'))
      }
    } finally {
      if (currentRequest === hospitalRequest.current) setHospitalLoading(false)
    }
  }

  function handleHospitalSearchKey(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (!hospitalLoading && !submitting) runHospitalSearch()
    }
  }

  async function handleBook(event) {
    event.preventDefault()
    setMessage('')
    setError('')

    if (form.date < today) {
      setError('Please select today or a future date.')
      return
    }

    const selectedDoctor = doctors.find(
      (doctor) => getDoctorId(doctor) === form.doctorId,
    )
    if (!selectedDoctor) {
      setError('Please select a doctor from the current directory.')
      return
    }

    if (!selectedHospital) {
      setError('Search for and select a hospital location before booking.')
      return
    }

    const conflict = appointments.some(
      (appointment) =>
        appointment.status === 'Upcoming' &&
        appointment.doctor === selectedDoctor.name &&
        appointment.date === form.date &&
        appointment.time === form.time,
    )
    if (conflict) {
      setError('You already booked this doctor at that time.')
      return
    }

    setSubmitting(true)
    try {
      const result = await createAppointment({
        doctor: selectedDoctor.name,
        specialty: selectedDoctor.specialty,
        hospital: selectedHospital,
        date: form.date,
        time: form.time,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
        reason: form.reason.trim(),
      })
      if (!result.appointment) {
        throw new Error('The server did not return the new appointment.')
      }

      setAppointments((current) => [...current, result.appointment])
      setActiveTab('Upcoming')
      setShowForm(false)
      resetBookingForm()
      setMessage('Appointment and hospital location saved successfully.')
    } catch (err) {
      setError(requestError(err, 'Unable to book appointment. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel(appointment) {
    const id = getAppointmentId(appointment)
    if (!id || !window.confirm('Cancel this appointment?')) return

    setMessage('')
    setError('')
    setCancellingId(id)
    try {
      const result = await cancelAppointmentApi(id)
      setAppointments((current) =>
        current.map((item) =>
          getAppointmentId(item) === id
            ? result.appointment || { ...item, status: 'Cancelled' }
            : item,
        ),
      )
      setMessage('Appointment cancelled successfully.')
    } catch (err) {
      setError(requestError(err, 'Unable to cancel appointment. Please try again.'))
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="appointments-page">
      <header className="appointments-header">
        <div className="appointments-heading-copy">
          <h1>Appointments</h1>
          <p>Manage your upcoming visits and keep track of past appointments.</p>
        </div>
        <button
          className="book-appointment-btn"
          onClick={toggleBookingForm}
          disabled={doctorsLoading || doctors.length === 0 || submitting}
          type="button"
        >
          <span className="appointment-button-icon" aria-hidden="true">+</span>
          {showForm ? 'Close Form' : 'Book New Appointment'}
        </button>
      </header>

      {message && <p className="appointment-message" role="status">{message}</p>}
      {error && (
        <div className="appointment-error" role="alert">
          <span>{error}</span>
          {!loading && !showForm && appointments.length === 0 && (
            <button type="button" onClick={loadAppointments}>
              Try again
            </button>
          )}
        </div>
      )}

      {doctorError && (
        <div className="appointment-error" role="alert">
          <span>{doctorError}</span>
          {!doctorsLoading && (
            <button type="button" onClick={loadDoctors}>Try again</button>
          )}
        </div>
      )}

      {showForm && (
        <section className="booking-form-card">
          <h2>Book a New Appointment</h2>
          <form onSubmit={handleBook}>
            <label htmlFor="doctor-search">Search providers by name, specialty, or location</label>
            <input
              id="doctor-search"
              type="search"
              value={doctorSearch}
              onChange={(event) => {
                setDoctorSearch(event.target.value)
                setForm((current) => ({ ...current, doctorId: '' }))
              }}
              placeholder="e.g. cardiologist or Pune"
              disabled={doctorsLoading || submitting}
            />

            <label htmlFor="doctor">Select Doctor</label>
            <select
              id="doctor"
              value={form.doctorId}
              onChange={(event) => setForm({ ...form, doctorId: event.target.value })}
              required
              disabled={doctorsLoading || doctors.length === 0 || submitting}
            >
              <option value="">
                {filteredDoctors.length ? 'Select a demo provider' : 'No matching providers'}
              </option>
              {filteredDoctors.map((doctor) => (
                <option key={getDoctorId(doctor)} value={getDoctorId(doctor)}>
                  {doctor.name} — {doctor.specialty}
                  {doctor.location ? ` (${doctor.location})` : ''}
                </option>
              ))}
            </select>

            <label htmlFor="date">Appointment Date</label>
            <input
              id="date"
              type="date"
              min={today}
              value={form.date}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
              required
              disabled={submitting}
            />

            <label htmlFor="time">Appointment Time</label>
            <input
              id="time"
              type="time"
              value={form.time}
              onChange={(event) => setForm({ ...form, time: event.target.value })}
              required
              disabled={submitting}
            />

            <section className="hospital-booking-section" aria-labelledby="hospital-booking-title">
              <div className="hospital-section-heading">
                <div>
                  <h3 id="hospital-booking-title">Hospital location</h3>
                  <p>Search the live directory, then select the hospital for this appointment.</p>
                </div>
                {selectedHospital && <span className="hospital-selected-badge">Selected</span>}
              </div>

              <div className="hospital-search-controls">
                <div className="hospital-search-field">
                  <label htmlFor="appointment-hospital-city">City in India</label>
                  <input
                    id="appointment-hospital-city"
                    type="text"
                    value={hospitalCity}
                    onChange={(event) => updateHospitalCriteria('city', event.target.value)}
                    onKeyDown={handleHospitalSearchKey}
                    placeholder="e.g. Hyderabad"
                    maxLength={100}
                    disabled={submitting}
                  />
                </div>
                <div className="hospital-search-field">
                  <label htmlFor="appointment-hospital-name">Hospital name (optional)</label>
                  <input
                    id="appointment-hospital-name"
                    type="text"
                    value={hospitalName}
                    onChange={(event) => updateHospitalCriteria('name', event.target.value)}
                    onKeyDown={handleHospitalSearchKey}
                    placeholder="e.g. Apollo"
                    maxLength={100}
                    disabled={submitting}
                  />
                </div>
                <button
                  type="button"
                  className="book-appointment-btn hospital-search-btn"
                  onClick={runHospitalSearch}
                  disabled={hospitalLoading || submitting}
                >
                  {hospitalLoading ? 'Searching…' : 'Search hospitals'}
                </button>
              </div>

              {hospitalLoading && (
                <p className="hospital-search-status" role="status">
                  Finding mapped hospitals near {hospitalCity.trim()}…
                </p>
              )}
              {hospitalError && (
                <div className="hospital-search-error" role="alert">
                  <span>{hospitalError}</span>
                  {!hospitalLoading && (
                    <button type="button" onClick={runHospitalSearch}>Try again</button>
                  )}
                </div>
              )}

              {selectedHospital && (
                <div className="selected-hospital-card">
                  <div>
                    <span className="selected-hospital-label">Selected hospital</span>
                    <h4>{selectedHospital.name}</h4>
                    <p>{selectedHospital.address || 'Address not available in map data'}</p>
                    {(selectedHospital.city || selectedHospital.state) && (
                      <p>{[selectedHospital.city, selectedHospital.state].filter(Boolean).join(', ')}</p>
                    )}
                    <small>Hospital data: {selectedHospital.source}</small>
                  </div>
                  <div className="selected-hospital-actions">
                    <a href={hospitalMapUrl(selectedHospital)} target="_blank" rel="noreferrer">
                      View location ↗
                    </a>
                    {hospitalResults.length > 1 && !hospitalResultsVisible && (
                      <button type="button" onClick={() => setHospitalResultsVisible(true)}>
                        Change hospital
                      </button>
                    )}
                  </div>
                </div>
              )}

              {hospitalResultsVisible && hospitalResults.length > 0 && (
                <>
                  <div className="hospital-results-meta">
                    <span>{hospitalResults.length} selectable hospitals</span>
                    <small>
                      {hospitalSource}{hospitalCached ? ' · Cached' : ' · Live'}
                    </small>
                  </div>
                  <ul className="hospital-results" aria-label="Hospital search results">
                    {hospitalResults.map((hospital) => {
                      const selected = selectedHospital?.id === hospital.id
                      return (
                        <li className={`hospital-result${selected ? ' selected' : ''}`} key={hospital.id}>
                          <h4>{hospital.name}</h4>
                          <p>{hospital.address || 'Address not available in map data'}</p>
                          {(hospital.city || hospital.state) && (
                            <p>{[hospital.city, hospital.state].filter(Boolean).join(', ')}</p>
                          )}
                          <div className="hospital-result-footer">
                            <a
                              href={hospitalMapUrl(hospital)}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`View ${hospital.name} on a map`}
                            >
                              View map ↗
                            </a>
                            <button
                              type="button"
                              className="hospital-select-btn"
                              disabled={selected || submitting}
                              onClick={() => {
                                setSelectedHospital(hospital)
                                setHospitalResultsVisible(false)
                                setHospitalError('')
                                setError('')
                              }}
                            >
                              {selected ? 'Selected' : 'Select hospital'}
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}

              {!hospitalLoading && !hospitalError && hospitalSearched && hospitalResults.length === 0 && (
                <p className="hospital-search-status">
                  No selectable mapped hospitals found. Try another city or remove the name filter.
                </p>
              )}
              {hospitalNotice && <p className="hospital-search-notice">{hospitalNotice}</p>}
              <p className="hospital-search-notice">
                Selecting a hospital saves its displayed location; it does not confirm doctor
                affiliation, availability, or a real-world booking.
              </p>
            </section>

            <label htmlFor="reason">Reason for visit (optional)</label>
            <input
              id="reason"
              type="text"
              maxLength={500}
              value={form.reason}
              onChange={(event) => setForm({ ...form, reason: event.target.value })}
              placeholder="Brief reason for the appointment"
              disabled={submitting}
            />

            <button
              type="submit"
              className="book-appointment-btn"
              disabled={submitting || doctorsLoading || doctors.length === 0}
            >
              {submitting ? 'Saving…' : 'Confirm Booking'}
            </button>
          </form>
        </section>
      )}

      <div className="appointment-tabs" role="group" aria-label="Appointment filter">
        <button
          className={activeTab === 'Upcoming' ? 'active' : ''}
          aria-pressed={activeTab === 'Upcoming'}
          onClick={() => setActiveTab('Upcoming')}
          type="button"
        >
          Upcoming
        </button>
        <button
          className={activeTab === 'Past' ? 'active' : ''}
          aria-pressed={activeTab === 'Past'}
          onClick={() => setActiveTab('Past')}
          type="button"
        >
          Past
        </button>
      </div>

      <section className="appointment-list" aria-live="polite" aria-busy={loading}>
        {loading ? (
          <div className="appointments-empty" role="status">
            <p>Loading your appointments…</p>
          </div>
        ) : visibleAppointments.length > 0 ? (
          visibleAppointments.map((appointment) => {
            const id = getAppointmentId(appointment)
            const doctorName = appointment.doctor || 'Doctor'
            const initials = doctorName
              .replace(/^Dr\.\s*/i, '')
              .split(' ')
              .filter(Boolean)
              .map((word) => word[0])
              .join('')
              .slice(0, 2)
              .toUpperCase() || 'D'
            const status = appointment.status || 'Upcoming'
            const canCancel = status === 'Upcoming' && appointment.date >= today
            const hospital = appointment.hospital
            const mapUrl = hospitalMapUrl(hospital)

            return (
              <article className="appointment-row" key={id || `${doctorName}-${appointment.date}-${appointment.time}`}>
                <div className="doctor-avatar">{initials}</div>
                <div className="doctor-details">
                  <h3>{doctorName}</h3>
                  <p>{appointment.specialty}</p>
                  <div className="appointment-datetime">
                    <span className="appointment-date"><CalendarIcon />{formatDate(appointment.date)}</span>
                    <span className="appointment-time">{formatTime(appointment.time)}</span>
                  </div>
                  {hospital?.name && (
                    <div className="appointment-hospital">
                      <p className="appointment-hospital-name"><HospitalIcon />{hospital.name}</p>
                      <p>{hospital.address || 'Address not available in map data'}</p>
                      {(hospital.city || hospital.state) && (
                        <p>{[hospital.city, hospital.state].filter(Boolean).join(', ')}</p>
                      )}
                      <div className="appointment-hospital-meta">
                        {mapUrl && (
                          <a href={mapUrl} target="_blank" rel="noreferrer">
                            View hospital location ↗
                          </a>
                        )}
                        <small>Hospital data: {hospital.source}</small>
                      </div>
                    </div>
                  )}
                  {appointment.reason && (
                    <p className="appointment-reason">Reason: {appointment.reason}</p>
                  )}
                </div>

                <div className="appointment-row-actions">
                  <span className={`appointment-status ${status.toLowerCase()}`}>
                    <span className="status-dot" aria-hidden="true" />
                    {status}
                  </span>
                  {canCancel && (
                    <button
                      className="cancel-appointment-btn"
                      onClick={() => handleCancel(appointment)}
                      disabled={cancellingId === id}
                      type="button"
                    >
                      {cancellingId === id ? 'Cancelling…' : 'Cancel'}
                    </button>
                  )}
                </div>
              </article>
            )
          })
        ) : (
          <div className="appointments-empty">
            <h3>No {activeTab.toLowerCase()} appointments</h3>
            <p>
              {activeTab === 'Upcoming'
                ? 'Book a new appointment to see it here.'
                : 'Your past or cancelled appointments will appear here.'}
            </p>
          </div>
        )}
      </section>

      <p className="appointments-disclaimer">
        Demo providers are synthetic and are not verified as affiliated with selected hospitals.
        Hospital listings come from map providers; availability and appointments are not confirmed
        with the hospital.
      </p>
    </div>
  )
}
