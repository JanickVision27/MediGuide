import { useEffect, useState } from 'react'

import { useAuth } from '../context/AuthContext.jsx'
import './Profile.css'

function profileFromUser(user) {
  return {
    fullName: user?.fullName || '',
    dob: user?.dob || '',
    phone: user?.phone || '',
    email: user?.email || '',
    address: user?.address || '',
    bloodType: user?.bloodType || '',
    allergies: user?.allergies || [],
    medications: user?.medications || [],
    emergencyName: user?.emergencyName || '',
    relationship: user?.relationship || '',
    emergencyPhone: user?.emergencyPhone || '',
    emergencyAddress: user?.emergencyAddress || '',
  }
}

function getInitials(fullName) {
  return (
    fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((name) => name[0].toUpperCase())
      .join('') || 'U'
  )
}

function formatDate(value) {
  if (!value) return 'Not provided'
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function Profile() {
  const { user, saveProfile } = useAuth()
  const [formData, setFormData] = useState(() => profileFromUser(user))
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const patient = profileFromUser(user)

  useEffect(() => {
    if (!editing) setFormData(profileFromUser(user))
  }, [user, editing])

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((previous) => ({ ...previous, [name]: value }))
    setSaved(false)
    setError('')
  }

  async function handleSave(event) {
    event.preventDefault()
    setSaving(true)
    setSaved(false)
    setError('')

    try {
      await saveProfile({
        ...formData,
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
      })
      setEditing(false)
      setSaved(true)
    } catch (err) {
      setError(err.message || 'Unable to save your profile right now.')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setFormData(profileFromUser(user))
    setEditing(false)
    setError('')
  }

  function renderField(label, name, value, type = 'text') {
    const constraints = {
      fullName: { minLength: 2, maxLength: 80 },
      email: { maxLength: 254 },
      phone: { maxLength: 40 },
      address: { maxLength: 240 },
      emergencyName: { maxLength: 80 },
      relationship: { maxLength: 60 },
      emergencyPhone: { maxLength: 40 },
      emergencyAddress: { maxLength: 240 },
    }

    return (
      <div className="profile-field" key={name}>
        <label htmlFor={name}>{label}</label>
        {editing ? (
          <input
            id={name}
            name={name}
            type={type}
            value={formData[name] ?? ''}
            onChange={handleChange}
            required={name === 'fullName' || name === 'email'}
            disabled={saving}
            {...constraints[name]}
          />
        ) : (
          <span>{name === 'dob' ? formatDate(value) : value || 'Not provided'}</span>
        )}
      </div>
    )
  }

  return (
    <div className="profile-page">
      <header className="profile-header">
        <div className="profile-identity">
          <div className="profile-avatar">{getInitials(patient.fullName)}</div>
          <div>
            <h1>{patient.fullName}</h1>
            <p>{user?.role || 'Patient'}</p>
          </div>
        </div>

        {!editing && (
          <button
            type="button"
            className="edit-profile-btn"
            onClick={() => {
              setFormData(profileFromUser(user))
              setEditing(true)
              setSaved(false)
              setError('')
            }}
          >
            ✎ Edit Profile
          </button>
        )}
      </header>

      {saved && (
        <div className="profile-success" role="status">
          Profile updated successfully.
        </div>
      )}
      {error && (
        <div className="profile-error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="profile-cards">
          <section className="profile-card">
            <h2><span className="section-icon">♟</span>Personal Details</h2>
            {renderField('Full Name', 'fullName', patient.fullName)}
            {renderField('Date of Birth', 'dob', patient.dob, 'date')}
            {renderField('Phone', 'phone', patient.phone, 'tel')}
            {renderField('Email', 'email', patient.email, 'email')}
            {renderField('Address', 'address', patient.address)}
          </section>

          <section className="profile-card">
            <h2><span className="section-icon">✚</span>Medical Information</h2>
            <div className="profile-field">
              <label>Blood Type</label>
              <span>{patient.bloodType || 'Not provided'}</span>
            </div>
            <div className="profile-field">
              <label>Allergies</label>
              {patient.allergies.length > 0 ? (
                <div className="allergy-list">
                  {patient.allergies.map((allergy) => (
                    <span className="allergy-tag" key={allergy}>{allergy} ⚠</span>
                  ))}
                </div>
              ) : (
                <span>Not provided</span>
              )}
            </div>
            <div className="profile-field medication-field">
              <label>Current Medications</label>
              {patient.medications.length > 0 ? (
                <ul className="medication-list">
                  {patient.medications.map((medicine) => <li key={medicine}>{medicine}</li>)}
                </ul>
              ) : (
                <span>Not provided</span>
              )}
            </div>
            <p className="medical-note">
              Educational demo only. Do not enter real medical information; this is not medical advice.
            </p>
          </section>
        </div>

        <section className="profile-card emergency-card">
          <h2><span className="section-icon">☎</span>Emergency Contact</h2>
          <div className="emergency-grid">
            {renderField('Full Name', 'emergencyName', patient.emergencyName)}
            {renderField('Relationship', 'relationship', patient.relationship)}
            {renderField('Phone', 'emergencyPhone', patient.emergencyPhone, 'tel')}
            {renderField('Address', 'emergencyAddress', patient.emergencyAddress)}
          </div>
        </section>

        {editing && (
          <div className="profile-actions">
            <button type="button" className="cancel-btn" onClick={handleCancel} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </form>

      <p className="profile-disclaimer">
        MediGuide is an educational demo. Use synthetic information only.
      </p>
    </div>
  )
}
