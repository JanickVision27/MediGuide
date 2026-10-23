export const PROFILE_PHOTO_MAX_BYTES = 2 * 1024 * 1024
export const PROFILE_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp'

export function validateProfilePhoto(file) {
  if (!file) return ''
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return 'Choose a JPG, PNG, or WebP image.'
  }
  if (file.size === 0) return 'The selected image is empty.'
  if (file.size > PROFILE_PHOTO_MAX_BYTES) return 'Profile photos must be 2 MB or smaller.'
  return ''
}
