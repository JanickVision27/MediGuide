/**
 * MedicineIcon - an inline SVG capsule in MediGuide's medical blue and teal.
 *
 * Pure SVG: no external images are fetched or scraped. Size it with
 * `className` (defaults to h-12 w-12).
 */
export default function MedicineIcon({ className = 'h-12 w-12' }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="48" height="48" rx="14" className="fill-brand-50" />
      <g transform="rotate(-45 24 24)">
        {/* Left half - teal */}
        <path d="M11 18h13v12H11a6 6 0 0 1 0-12z" className="fill-teal-500" />
        {/* Right half - medical blue */}
        <path d="M24 18h13a6 6 0 0 1 0 12H24z" className="fill-brand-600" />
        {/* Gloss highlight */}
        <rect x="14" y="20.25" width="14" height="2.5" rx="1.25" className="fill-white/60" />
      </g>
    </svg>
  )
}
