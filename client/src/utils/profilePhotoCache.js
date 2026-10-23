import { getProfilePhoto } from '../api.js'

// Object URLs are kept in memory only. They are never persisted or sent to the
// server, and one cached photo can be shared by every avatar on the page.
let cachedPhoto = null
let pendingPhoto = null
let activeKey = ''
let generation = 0

export function getProfilePhotoKey(user) {
  return user?.id && user?.profilePhotoUpdatedAt
    ? `${user.id}:${user.profilePhotoUpdatedAt}`
    : ''
}

export function getCachedProfilePhoto(key) {
  return key && cachedPhoto?.key === key ? cachedPhoto.url : null
}

function revokeCachedPhoto() {
  if (cachedPhoto?.url) URL.revokeObjectURL(cachedPhoto.url)
  cachedPhoto = null
}

export function clearProfilePhotoCache() {
  generation += 1
  activeKey = ''
  pendingPhoto = null
  revokeCachedPhoto()
}

export function primeProfilePhotoCache(key, blob) {
  clearProfilePhotoCache()
  if (!key || !blob) return ''

  let url
  try {
    url = URL.createObjectURL(blob)
  } catch {
    return ''
  }
  cachedPhoto = { key, url }
  activeKey = key
  return url
}

export function loadProfilePhoto(key) {
  if (!key) return Promise.resolve('')
  activeKey = key
  if (cachedPhoto?.key === key) return Promise.resolve(cachedPhoto.url)
  if (pendingPhoto?.key === key) return pendingPhoto.promise

  const requestGeneration = generation
  const promise = getProfilePhoto()
    .then((blob) => {
      // A logout, photo replacement, or newer request must not let an older
      // response put a stale photo back into the shared cache.
      if (requestGeneration !== generation || activeKey !== key) return ''

      if (!blob) {
        revokeCachedPhoto()
        cachedPhoto = { key, url: '' }
        return ''
      }

      const url = URL.createObjectURL(blob)
      if (requestGeneration !== generation || activeKey !== key) {
        URL.revokeObjectURL(url)
        return ''
      }

      revokeCachedPhoto()
      cachedPhoto = { key, url }
      return url
    })
    .finally(() => {
      if (pendingPhoto?.promise === promise) pendingPhoto = null
    })

  pendingPhoto = { key, promise }
  return promise
}
