import { useEffect, useMemo, useState } from 'react'

import {
  cancelAppointment as apiCancelAppointment,
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
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(time) {
  const [hours, minutes] = time.split(':')
  const date = new Date()
  date.setHours(Number(hours), Number(minutes), 0, 0)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function appointmentId(appointment) {
  return appointment._id || appointment.id
}

export default function Appointments() {
  const [appointments, setAppointments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [activeTab, setActiveTab] = useState('Upcoming')
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cancellingId, setCancellingId] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [form, setForm] = useState({ doctor: '', date: '', time: '' })

  const today = getToday()

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    Promise.all([getAppointments(), getDoctors()])
      .then(([appointmentResult, doctorResult]) => {
        if (!active) return
        const appointmentList = Array.isArray(appointmentResult)
          ? appointmentResult
          : appointmentResult.appointments || []
        const doctorList = doctorResult.doctors || []
        setAppointments(appointmentList)
        setDoctors(doctorList)
        setForm((current) => ({
          ...current,
          doctor: current.doctor || doctorList[0]?.name || '',
        }))
      })
      .catch((err) => {
        if (active) setError(err.message || 'Unable to load appointments.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [reloadKey])

  const visibleAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => {
          if (activeTab === 'Upcoming') {
            return appointment.status === 'Upcoming' && appointment.date >= today
          }
          return (
            appointment.status === 'Completed' ||
            appointment.status === 'Cancelled' ||
            appointment.date < today
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

  async function handleBook(event) {
    event.preventDefault()
    setMessage('')
    setError('')

    if (form.date < today) {
      setError('Please select today or a future date.')
      return
    }

    const selectedDoctor = doctors.find((doctor) => doctor.name === form.doctor)
    if (!selectedDoctor) {
      setError('Please select a doctor.')
      return
    }

    setSubmitting(true)
    try {
      const result = await createAppointment({
        doctor: selectedDoctor.name,
        specialty: selectedDoctor.specialty,
        date: form.date,
        time: form.time,
      })
      setAppointments((current) => [...current, result.appointment])
      setActiveTab('Upcoming')
      setShowForm(false)
      setForm({ doctor: doctors[0]?.name || '', date: '', time: '' })
      setMessage('Appointment booked successfully!')
    } catch (err) {
      setError(err.message || 'Unable to book the appointment.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel(id) {
    if (!window.confirm('Cancel this appointment?')) return

    setCancellingId(id)
    setMessage('')
    setError('')
    try {
      const result = await apiCancelAppointment(id)
      setAppointments((current) =>
        current.map((appointment) =>
          appointmentId(appointment) === id
            ? result.appointment || { ...appointment, status: 'Cancelled' }
            : appointment,
        ),
      )
      setMessage('Appointment cancelled successfully.')
    } catch (err) {
      setError(err.message || 'Unable to cancel the appointment.')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="appointments-page">
      <header className="appointments-header">
        <h1>Appointments</h1>
        <button
          type="button"
          className="book-appointment-btn"
          disabled={loading || doctors.length === 0}
          onClick={() => {
            setShowForm((value) => !value)
            setMessage('')
            setError('')
          }}
        >
          <span>▦</span>
          {showForm ? 'Close Form' : 'Book New Appointment'}
        </button>
      </header>

      {message && <p className="appointment-message" role="status">{message}</p>}
      {error && (
        <div className="appointment-error" role="alert">
          <span>{error}</span>
          {!loading && appointments.length === 0 && doctors.length === 0 && (
            <button type="button" onClick={() => setReloadKey((value) => value + 1)}>
              Try again
            </button>
          )}
        </div>
      )}

      {showForm && (
        <section className="booking-form-card">
          <h2>Book New Appointment</h2>
          <form onSubmit={handleBook}>
            <label htmlFor="doctor">Select Doctor</label>
            <select
              id="doctor"
              value={form.doctor}
              onChange={(event) => setForm({ ...form, doctor: event.target.value })}
              required
              disabled={submitting}
            >
              {doctors.map((doctor) => (
                <option key={doctor.id || doctor.name} value={doctor.name}>
                  {doctor.name} — {doctor.specialty}
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

            <button type="submit" className="book-appointment-btn" disabled={submitting}>
              {submitting ? 'Booking…' : 'Confirm Booking'}
            </button>
          </form>
        </section>
      )}

      <div className="appointment-tabs" role="group" aria-label="Appointment filter">
        <button
          type="button"
          aria-pressed={activeTab === 'Upcoming'}
          className={activeTab === 'Upcoming' ? 'active' : ''}
          onClick={() => setActiveTab('Upcoming')}
        >
          Upcoming
        </button>
        <button
          type="button"
          aria-pressed={activeTab === 'Past'}
          className={activeTab === 'Past' ? 'active' : ''}
          onClick={() => setActiveTab('Past')}
        >
          Past
        </button>
      </div>

      <section className="appointment-list" aria-busy={loading}>
        {loading ? (
          <div className="appointments-empty" role="status">
            <h3>Loading appointments…</h3>
          </div>
        ) : visibleAppointments.length > 0 ? (
          visibleAppointments.map((appointment) => {
            const id = appointmentId(appointment)
            const initials = appointment.doctor
              .replace('Dr. ', '')
              .split(' ')
              .map((word) => word[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()
            const canCancel = appointment.status === 'Upcoming' && appointment.date >= today

            return (
              <article className="appointment-row" key={id}>
                <div className="doctor-avatar">{initials}</div>
                <div className="doctor-details">
                  <h3>{appointment.doctor}</h3>
                  <p>{appointment.specialty}</p>
                  <div className="appointment-datetime">
                    <span>▦ {formatDate(appointment.date)}</span>
                    <span className="datetime-divider">|</span>
                    <span>◷ {formatTime(appointment.time)}</span>
                  </div>
                </div>
                <div className="appointment-row-actions">
                  <span className={`appointment-status ${appointment.status.toLowerCase()}`}>
                    <span className="status-dot">●</span>
                    {appointment.status}
                  </span>
                  {canCancel && (
                    <button
                      type="button"
                      className="cancel-appointment-btn"
                      disabled={cancellingId === id}
                      onClick={() => handleCancel(id)}
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
        Educational demo only. Doctors are synthetic and availability is not verified.
      </p>
    </div>
  )
}
