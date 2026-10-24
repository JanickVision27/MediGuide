import { useEffect, useState } from 'react'

import { formatMedicineName } from '../utils/formatName.js'

// Only images that actually exist are included by Vite, so missing named images
// fall back immediately instead of generating a 404 for every medicine card.
const imageModules = import.meta.glob('../assets/medicines/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
})

const MEDICINE_IMAGE_URLS = Object.fromEntries(
  Object.entries(imageModules).map(([path, url]) => {
    const fileName = path.split('/').pop()
    const key = fileName.slice(0, fileName.lastIndexOf('.'))
    return [key, url]
  }),
)

const DEFAULT_IMAGE = MEDICINE_IMAGE_URLS['default-medicine']

export function medicineImageSlug(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function MedicineImage({ medicine, className = 'h-12 w-12' }) {
  const name = medicine?.name || 'Medicine'
  const displayName = formatMedicineName(name)
  const namedImage = MEDICINE_IMAGE_URLS[medicineImageSlug(name)]
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    setLoadFailed(false)
  }, [namedImage, name])

  const usingDefault = loadFailed || !namedImage
  const source = usingDefault ? DEFAULT_IMAGE : namedImage
  const initial = displayName.trim().charAt(0).toUpperCase() || 'M'

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-2xl bg-brand-50 ring-1 ring-brand-100 ${className}`}
    >
      <img
        src={source}
        alt={usingDefault ? `Generic medicine illustration for ${displayName}` : `${displayName} medicine`}
        title={usingDefault ? 'Generic illustration' : displayName}
        loading="lazy"
        decoding="async"
        draggable="false"
        onError={() => {
          if (!usingDefault) setLoadFailed(true)
        }}
        className="h-full w-full object-cover"
      />
      {usingDefault && (
        <span
          aria-hidden="true"
          className="absolute bottom-1 right-1 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-extrabold text-brand-700 shadow-sm"
        >
          {initial}
        </span>
      )}
    </div>
  )
}
