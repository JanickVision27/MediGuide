/**
 * Appointments page - PLACEHOLDER.
 *
 * Teammate handoff: this file is yours. Replace the div below with your feature.
 * It already renders inside <Layout />, so the sidebar, header and footer are
 * handled for you - just build the page content.
 *
 * Route: /appointments  (registered in src/App.jsx)
 */

import React, { useState } from "react";
import "./Appointments.css";

const STORAGE_KEY = "mediguide_appointments";

const doctors = [
  { name: "Dr. Rahul Mehta", specialty: "Cardiologist" },
  { name: "Dr. Anjali Sharma", specialty: "Dermatologist" },
  { name: "Dr. Vivek Kapoor", specialty: "Orthopedic Surgeon" },
  { name: "Dr. Neha Patel", specialty: "Endocrinologist" }
];

const demoAppointments = [
  {
    id: "demo-1",
    doctor: "Dr. Rahul Mehta",
    specialty: "Cardiologist",
    date: "2026-10-20",
    time: "10:30",
    status: "Upcoming"
  },
  {
    id: "demo-2",
    doctor: "Dr. Anjali Sharma",
    specialty: "Dermatologist",
    date: "2026-10-23",
    time: "14:00",
    status: "Upcoming"
  },
  {
    id: "demo-3",
    doctor: "Dr. Vivek Kapoor",
    specialty: "Orthopedic Surgeon",
    date: "2026-10-25",
    time: "11:00",
    status: "Upcoming"
  },
  {
    id: "demo-4",
    doctor: "Dr. Neha Patel",
    specialty: "Endocrinologist",
    date: "2026-10-28",
    time: "16:30",
    status: "Upcoming"
  },
  {
    id: "demo-5",
    doctor: "Dr. Anjali Sharma",
    specialty: "Dermatologist",
    date: "2026-09-15",
    time: "14:00",
    status: "Completed"
  }
];

function loadAppointments() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (error) {
    console.error("Unable to load appointments", error);
  }

  return demoAppointments;
}

function getToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(date) {
  return new Date(date + "T00:00:00").toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric"
    }
  );
}

function formatTime(time) {
  const [hours, minutes] = time.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

export default function Appointments() {
  const [appointments, setAppointments] = useState(loadAppointments);
  const [activeTab, setActiveTab] = useState("Upcoming");
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    doctor: doctors[0].name,
    date: "",
    time: ""
  });

  const today = getToday();

  const visibleAppointments = appointments.filter((appointment) => {
    if (activeTab === "Upcoming") {
      return (
        appointment.status === "Upcoming" &&
        appointment.date >= today
      );
    }

    return (
      appointment.status === "Completed" ||
      appointment.status === "Cancelled" ||
      appointment.date < today
    );
  }).sort((a, b) => {
    const first = `${a.date} ${a.time}`;
    const second = `${b.date} ${b.time}`;

    return activeTab === "Upcoming"
      ? first.localeCompare(second)
      : second.localeCompare(first);
  });

  function updateAppointments(updated) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setAppointments(updated);
      return true;
    } catch (error) {
      console.error("Unable to save appointments", error);
      setMessage("Unable to save. Check your browser storage.");
      return false;
    }
  }

  function handleBook(event) {
    event.preventDefault();

    if (form.date < today) {
      setMessage("Please select today or a future date.");
      return;
    }

    const selectedDoctor = doctors.find(
      (doctor) => doctor.name === form.doctor
    );

    if (!selectedDoctor) {
      setMessage("Please select a doctor.");
      return;
    }

    const conflict = appointments.some((appointment) =>
      appointment.status === "Upcoming" &&
      appointment.doctor === form.doctor &&
      appointment.date === form.date &&
      appointment.time === form.time
    );

    if (conflict) {
      setMessage("You already booked this doctor at that time.");
      return;
    }

    const newAppointment = {
      id: `${Date.now()}`,
      doctor: selectedDoctor.name,
      specialty: selectedDoctor.specialty,
      date: form.date,
      time: form.time,
      status: "Upcoming"
    };

    if (updateAppointments([...appointments, newAppointment])) {
      setActiveTab("Upcoming");
      setShowForm(false);
      setForm({
        doctor: doctors[0].name,
        date: "",
        time: ""
      });
      setMessage("Appointment booked successfully!");
    }
  }

  function cancelAppointment(id) {
    if (!window.confirm("Cancel this appointment?")) return;

    const updated = appointments.map((appointment) =>
      appointment.id === id
        ? { ...appointment, status: "Cancelled" }
        : appointment
    );

    if (updateAppointments(updated)) {
      setMessage("Appointment cancelled successfully.");
    }
  }

  return (
    <div className="appointments-page">
      <header className="appointments-header">
        <h1>Appointments</h1>

        <button
          className="book-appointment-btn"
          onClick={() => {
            setShowForm(!showForm);
            setMessage("");
          }}
        >
          <span>▦</span>
          {showForm ? "Close Form" : "Book New Appointment"}
        </button>
      </header>

      {message && (
        <p className="appointment-message" role="status">
          {message}
        </p>
      )}

      {showForm && (
        <section className="booking-form-card">
          <h2>Book New Appointment</h2>

          <form onSubmit={handleBook}>
            <label htmlFor="doctor">Select Doctor</label>
            <select
              id="doctor"
              value={form.doctor}
              onChange={(event) =>
                setForm({ ...form, doctor: event.target.value })
              }
              required
            >
              {doctors.map((doctor) => (
                <option key={doctor.name} value={doctor.name}>
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
              onChange={(event) =>
                setForm({ ...form, date: event.target.value })
              }
              required
            />

            <label htmlFor="time">Appointment Time</label>
            <input
              id="time"
              type="time"
              value={form.time}
              onChange={(event) =>
                setForm({ ...form, time: event.target.value })
              }
              required
            />

            <button type="submit" className="book-appointment-btn">
              Confirm Booking
            </button>
          </form>
        </section>
      )}

      <div className="appointment-tabs">
        <button
          className={activeTab === "Upcoming" ? "active" : ""}
          onClick={() => setActiveTab("Upcoming")}
        >
          Upcoming
        </button>

        <button
          className={activeTab === "Past" ? "active" : ""}
          onClick={() => setActiveTab("Past")}
        >
          Past
        </button>
      </div>

      <section className="appointment-list">
        {visibleAppointments.length > 0 ? (
          visibleAppointments.map((appointment) => {
            const initials = appointment.doctor
              .replace("Dr. ", "")
              .split(" ")
              .map((word) => word[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            const canCancel =
              appointment.status === "Upcoming" &&
              appointment.date >= today;

            return (
              <article className="appointment-row" key={appointment.id}>
                <div className="doctor-avatar">
                  {initials}
                </div>

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
                  <span
                    className={`appointment-status ${appointment.status.toLowerCase()}`}
                  >
                    <span className="status-dot">●</span>
                    {appointment.status}
                  </span>

                  {canCancel && (
                    <button
                      className="cancel-appointment-btn"
                      onClick={() => cancelAppointment(appointment.id)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </article>
            );
          })
        ) : (
          <div className="appointments-empty">
            <h3>No {activeTab.toLowerCase()} appointments</h3>
            <p>
              {activeTab === "Upcoming"
                ? "Book a new appointment to see it here."
                : "Your past or cancelled appointments will appear here."}
            </p>
          </div>
        )}
      </section>

      <p className="appointments-disclaimer">
        Educational demo only. Doctor availability is not verified.
      </p>
    </div>
  );
}

