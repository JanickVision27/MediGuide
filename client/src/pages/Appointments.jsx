import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  cancelAppointment as cancelAppointmentApi,
  createAppointment,
  getAppointments,
  getDoctors,
} from '../api.js'
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
  const appointmentRequest = useRef(0)
  const doctorRequest = useRef(0)

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
        date: form.date,
        time: form.time,
        reason: form.reason.trim(),
      })
      if (!result.appointment) {
        throw new Error('The server did not return the new appointment.')
      }

      setAppointments((current) => [...current, result.appointment])
      setActiveTab('Upcoming')
      setShowForm(false)
      setDoctorSearch('')
      setForm({ doctorId: '', date: '', time: '', reason: '' })
      setMessage('Appointment saved successfully.')
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
        <h1>Appointments</h1>
        <button
          className="book-appointment-btn"
          onClick={() => {
            setShowForm((visible) => !visible)
            setMessage('')
            setError('')
          }}
          disabled={doctorsLoading || doctors.length === 0}
          type="button"
        >
          <span>▦</span>
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
          <h2>Book New Appointment</h2>
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

            return (
              <article className="appointment-row" key={id || `${doctorName}-${appointment.date}-${appointment.time}`}>
                <div className="doctor-avatar">{initials}</div>
                <div className="doctor-details">
                  <h3>{doctorName}</h3>
                  <p>{appointment.specialty}</p>
                  <div className="appointment-datetime">
                    <span>▦ {formatDate(appointment.date)}</span>
                    <span className="datetime-divider">|</span>
                    <span>◷ {formatTime(appointment.time)}</span>
                  </div>
                  {appointment.reason && (
                    <p className="appointment-reason">Reason: {appointment.reason}</p>
                  )}
                </div>

                <div className="appointment-row-actions">
                  <span className={`appointment-status ${status.toLowerCase()}`}>
                    <span className="status-dot">●</span>
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
        Demo provider directory only. These are sample records, not verified real-world clinicians.
        Doctor availability and time slots are not verified.
      </p>
    </div>
  )
}
