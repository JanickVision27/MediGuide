import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

import UserAvatar from '../components/UserAvatar.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { PROFILE_PHOTO_ACCEPT, validateProfilePhoto } from '../utils/profilePhoto.js'
import './Profile.css'

function profileFromUser(user) {
  return {
    fullName: user?.fullName || '',
    dob: user?.dob || '',
    phone: user?.phone || '',
    city: user?.city || '',
    state: user?.state || '',
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

function formatDate(value) {
  if (!value) return 'Not provided'
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function Profile() {
  const location = useLocation()
  const {
    user,
    saveProfile,
    saveProfilePhoto,
    removeProfilePhoto,
    profilePhotoVersion,
  } = useAuth()
  const [formData, setFormData] = useState(() => profileFromUser(user))
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [photoError, setPhotoError] = useState(location.state?.profilePhotoWarning || '')
  const [photoMessage, setPhotoMessage] = useState('')
  const [photoSaving, setPhotoSaving] = useState(false)
  const photoInput = useRef(null)

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

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const validationError = validateProfilePhoto(file)
    setPhotoError(validationError)
    setPhotoMessage('')
    if (validationError) return

    setPhotoSaving(true)
    try {
      await saveProfilePhoto(file)
      setPhotoMessage('Profile photo updated.')
    } catch (err) {
      setPhotoError(err.message || 'Unable to save the profile photo.')
    } finally {
      setPhotoSaving(false)
    }
  }

  async function handlePhotoRemove() {
    setPhotoSaving(true)
    setPhotoError('')
    setPhotoMessage('')
    try {
      await removeProfilePhoto()
      setPhotoMessage('Profile photo removed.')
    } catch (err) {
      setPhotoError(err.message || 'Unable to remove the profile photo.')
    } finally {
      setPhotoSaving(false)
    }
  }

  function renderField(label, name, value, type = 'text') {
    const constraints = {
      fullName: { minLength: 2, maxLength: 80 },
      email: { maxLength: 254 },
      phone: {
        maxLength: 20,
        pattern: '[+()0-9\\s.-]{7,20}',
        title: 'Use 7–20 characters: digits, spaces, and + ( ) . - only',
      },
      city: { maxLength: 80 },
      state: { maxLength: 80 },
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
          <div className="profile-avatar-control">
            <UserAvatar
              user={user}
              photoVersion={profilePhotoVersion}
              className="profile-avatar"
            />
            <div className="profile-photo-actions">
              <button
                type="button"
                className="profile-photo-btn"
                onClick={() => photoInput.current?.click()}
                disabled={photoSaving}
              >
                {photoSaving ? 'Saving photo…' : user?.profilePhotoUpdatedAt ? 'Change photo' : 'Add photo'}
              </button>
              {user?.profilePhotoUpdatedAt && (
                <button
                  type="button"
                  className="profile-photo-remove"
                  onClick={handlePhotoRemove}
                  disabled={photoSaving}
                >
                  Remove
                </button>
              )}
              <input
                ref={photoInput}
                className="profile-photo-input"
                type="file"
                accept={PROFILE_PHOTO_ACCEPT}
                aria-label="Choose a profile photo"
                onChange={handlePhotoChange}
                disabled={photoSaving}
              />
            </div>
          </div>
          <div>
            <h1>{patient.fullName}</h1>
            <p className="patient-role">{user?.role || 'patient'}</p>
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

      {photoError && <div className="profile-error" role="alert">{photoError}</div>}
      {photoMessage && <div className="profile-success" role="status">{photoMessage}</div>}

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
            {renderField('City', 'city', patient.city)}
            {renderField('State', 'state', patient.state)}
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
