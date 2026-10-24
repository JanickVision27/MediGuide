import { useEffect, useState } from 'react'

import { getProfilePhoto } from '../api.js'

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
  const [photoUrl, setPhotoUrl] = useState('')
  const initials = getInitials(user?.fullName)
  const name = user?.fullName || 'User'

  useEffect(() => {
    const controller = new AbortController()
    let objectUrl = ''
    setPhotoUrl('')

    if (!user?.id || !user.profilePhotoUpdatedAt) {
      return () => controller.abort()
    }

    getProfilePhoto({ signal: controller.signal })
      .then((blob) => {
        if (!blob || controller.signal.aborted) return
        objectUrl = URL.createObjectURL(blob)
        setPhotoUrl(objectUrl)
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setPhotoUrl('')
      })

    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [user?.id, user?.profilePhotoUpdatedAt, photoVersion])

  function handleImageError() {
    if (photoUrl) URL.revokeObjectURL(photoUrl)
    setPhotoUrl('')
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
