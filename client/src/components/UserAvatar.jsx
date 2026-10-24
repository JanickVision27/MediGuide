import { useEffect, useState } from 'react'

import {
  getCachedProfilePhoto,
  getProfilePhotoKey,
  loadProfilePhoto,
} from '../utils/profilePhotoCache.js'

function getInitials(fullName = '') {
  return fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'U'
}

export default function UserAvatar({ user, photoVersion = 0, className = '' }) {
  const photoKey = getProfilePhotoKey(user)
  const [photoResult, setPhotoResult] = useState(() => ({
    key: photoKey,
    url: getCachedProfilePhoto(photoKey) || '',
  }))
  const initials = getInitials(user?.fullName)
  const name = user?.fullName || 'User'
  const cachedUrl = getCachedProfilePhoto(photoKey)
  // Never show a previous user's/photo's URL while a new key is loading.
  const photoUrl = photoResult.key === photoKey ? photoResult.url : cachedUrl || ''

  useEffect(() => {
    let active = true
    const cached = getCachedProfilePhoto(photoKey)
    setPhotoResult({ key: photoKey, url: cached || '' })

    if (!photoKey || cached !== null) {
      return () => {
        active = false
      }
    }

    // The request is shared rather than aborted on unmount: another avatar may
    // still need it, and the completed response remains available on remount.
    loadProfilePhoto(photoKey)
      .then((url) => {
        if (active) setPhotoResult({ key: photoKey, url })
      })
      .catch(() => {
        if (active) setPhotoResult({ key: photoKey, url: '' })
      })

    return () => {
      active = false
    }
  }, [photoKey, photoVersion])

  function handleImageError() {
    setPhotoResult({ key: photoKey, url: '' })
  }

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-brand-200 bg-brand-50 font-bold text-brand-700 ${className}`}
      role="img"
      aria-label={`${name}'s profile picture`}
    >
      <span aria-hidden="true">{initials}</span>
      {photoUrl && (
        <img
          className="absolute inset-0 h-full w-full rounded-full object-cover"
          src={photoUrl}
          alt=""
          onError={handleImageError}
        />
      )}
    </div>
  )
}
