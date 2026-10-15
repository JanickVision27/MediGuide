/**
 * Profile page - PLACEHOLDER.
 *
 * Teammate handoff: this file is yours. Replace the div below with your feature.
 * It already renders inside <Layout />, so the sidebar, header and footer are
 * handled for you - just build the page content.
 *
 * Route: /profile  (registered in src/App.jsx)
 */
import React, { useState } from "react";
import "./Profile.css";

// Temporary mock data for the MediGuide demo.
// Replace this with API data after your backend is ready.
const mockPatient = {
  fullName: "Venkata Vikrant",
  role: "Patient",
  dob: "1988-05-14",
  phone: "+91 9112314567",
  email: "vikrant@example.com",
  address: "123 Maple Street, cape town, TX 78701, South Africa",
  bloodType: "O+",
  allergies: ["Penicillin", "Peanuts"],
  medications: [
    "Lisinopril 10mg - Once daily",
    "Levothyroxine 75mcg - Once daily",
    "Vitamin D3 2000 IU - Once daily"
  ],
  emergencyName: "Michael Jenkins",
  relationship: "Spouse",
  emergencyPhone: "+91 9879096543",
  emergencyAddress: "123 Maple Street, Hyderabad, TX 78701, India"
};

function getInitials(fullName) {
  return fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0].toUpperCase())
    .join("");
}

export default function Profile() {
  const [patient, setPatient] = useState(mockPatient);
  const [formData, setFormData] = useState(mockPatient);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));

    setSaved(false);
  }

  function handleSave(event) {
    event.preventDefault();
    setPatient({ ...formData });
    setEditing(false);
    setSaved(true);
  }

  function handleCancel() {
    setFormData({ ...patient });
    setEditing(false);
  }

  function formatDate(value) {
    if (!value) return "Not provided";

    return new Date(value + "T00:00:00").toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric"
      }
    );
  }

  function renderField(label, name, value, type = "text") {
    return (
      <div className="profile-field" key={name}>
        <label htmlFor={name}>{label}</label>

        {editing ? (
          <input
            id={name}
            name={name}
            type={type}
            value={formData[name] ?? ""}
            onChange={handleChange}
            required={name === "fullName"}
          />
        ) : (
          <span>
            {name === "dob"
              ? formatDate(value)
              : value || "Not provided"}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="profile-page">
      <header className="profile-header">
        <div className="profile-identity">
          <div className="profile-avatar">
            {getInitials(patient.fullName)}
          </div>

          <div>
            <h1>{patient.fullName}</h1>
            <p>{patient.role}</p>
          </div>
        </div>

        {!editing && (
          <button
            type="button"
            className="edit-profile-btn"
            onClick={() => {
              setFormData({ ...patient });
              setEditing(true);
              setSaved(false);
            }}
          >
            ✎ Edit Profile
          </button>
        )}
      </header>

      {saved && (
        <div className="profile-success">
          Profile updated successfully.
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="profile-cards">
          <section className="profile-card">
            <h2>
              <span className="section-icon">♟</span>
              Personal Details
            </h2>

            {renderField(
              "Full Name",
              "fullName",
              patient.fullName
            )}

            {renderField(
              "Date of Birth",
              "dob",
              patient.dob,
              "date"
            )}

            {renderField(
              "Phone",
              "phone",
              patient.phone,
              "tel"
            )}

            {renderField(
              "Email",
              "email",
              patient.email,
              "email"
            )}

            {renderField(
              "Address",
              "address",
              patient.address
            )}
          </section>

          <section className="profile-card">
            <h2>
              <span className="section-icon">✚</span>
              Medical Information
            </h2>

            <div className="profile-field">
              <label>Blood Type</label>
              <span>{patient.bloodType}</span>
            </div>

            <div className="profile-field">
              <label>Allergies</label>

              <div className="allergy-list">
                {patient.allergies.map((allergy) => (
                  <span className="allergy-tag" key={allergy}>
                    {allergy} ⚠
                  </span>
                ))}
              </div>
            </div>

            <div className="profile-field medication-field">
              <label>Current Medications</label>

              <ul className="medication-list">
                {patient.medications.map((medicine) => (
                  <li key={medicine}>{medicine}</li>
                ))}
              </ul>
            </div>

            <p className="medical-note">
              Educational demo only. Medication information
              is synthetic and is not medical advice.
            </p>
          </section>
        </div>

        <section className="profile-card emergency-card">
          <h2>
            <span className="section-icon">☎</span>
            Emergency Contact
          </h2>

          <div className="emergency-grid">
            {renderField(
              "Full Name",
              "emergencyName",
              patient.emergencyName
            )}

            {renderField(
              "Relationship",
              "relationship",
              patient.relationship
            )}

            {renderField(
              "Phone",
              "emergencyPhone",
              patient.emergencyPhone,
              "tel"
            )}

            {renderField(
              "Address",
              "emergencyAddress",
              patient.emergencyAddress
            )}
          </div>
        </section>

        {editing && (
          <div className="profile-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={handleCancel}
            >
              Cancel
            </button>

            <button type="submit" className="save-btn">
              Save Changes
            </button>
          </div>
        )}
      </form>

      <p className="profile-disclaimer">
        MediGuide is an educational demo. Synthetic data only.
      </p>
    </div>
  );
}
