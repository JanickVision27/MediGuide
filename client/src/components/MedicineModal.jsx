import { useEffect, useRef } from 'react'

import MedicineImage from './MedicineImage.jsx'
import { DEMO_DISCLAIMER, oneMgSearchUrl } from '../utils/medicine.js'
import { formatMedicineName, formatClassName } from '../utils/formatName.js'

function Section({ title, tone = 'slate', children }) {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-800',
    warning: 'border-amber-300 bg-amber-50 text-amber-900',
    info: 'border-teal-300 bg-teal-50 text-teal-900',
  }
  return (
    <section className={`rounded-xl border p-4 ${tones[tone]}`}>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider opacity-80">{title}</h3>
      {children}
    </section>
  )
}

function ListOrEmpty({ items }) {
  if (!items?.length) {
    return <p className="text-sm italic opacity-70">Not listed in the sample data.</p>
  }
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  )
}

/**
 * MedicineModal - full details for one medicine.
 * Closes on Escape, backdrop click, or the close button; locks page scroll.
 */
export default function MedicineModal({ medicine, onClose }) {
  const closeButtonRef = useRef(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const classes = [
    ['Therapeutic Class', medicine.therapeuticClass ? formatClassName(medicine.therapeuticClass) : ''],
    ['Action Class', medicine.actionClass ? formatClassName(medicine.actionClass) : ''],
    ['Chemical Class', medicine.chemicalClass ? formatClassName(medicine.chemicalClass) : ''],
  ]

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="medicine-modal-title"
        className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl"
      >
        {/* Header */}
        <header className="flex items-start gap-4 border-b border-slate-200 px-6 py-5">
          <MedicineImage medicine={medicine} className="h-20 w-20" />
          <div className="min-w-0 flex-1">
            <h2 id="medicine-modal-title" className="break-words text-xl font-extrabold tracking-tight text-slate-900">
              {formatMedicineName(medicine.name)}
            </h2>
            {medicine.composition1 && (
              <p className="mt-0.5 text-sm text-slate-600">{medicine.composition1}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
              {medicine.manufacturer && <span>by {medicine.manufacturer}</span>}
              {medicine.price && <span>· Price: ₹{medicine.price}</span>}
              {medicine.isDiscontinued && (
                <span className="badge bg-rose-50 text-[10px] text-rose-700 ring-1 ring-rose-200">
                  Discontinued
                </span>
              )}
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5" aria-hidden="true" focusable="false">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        {/* Body */}
        <div className="scrollbar-slim flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {/* Prominent disclaimer */}
          <div role="note" className="rounded-xl border-2 border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            {DEMO_DISCLAIMER}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {classes.map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                <p className="mt-1 text-sm font-medium text-slate-800">{value || 'Not listed'}</p>
              </div>
            ))}
          </div>

          <Section title="Uses">
            <ListOrEmpty items={medicine.uses} />
          </Section>

          <Section title="⚠️ Side Effects" tone="warning">
            <ListOrEmpty items={medicine.sideEffects} />
          </Section>

          <Section title="Substitutes" tone="info">
            <ListOrEmpty items={medicine.substitutes?.map((s) => formatMedicineName(s))} />
          </Section>

          <Section title="Habit Forming">
            <p className="text-sm font-medium">
              {medicine.habitForming || 'Not specified in the sample data.'}
            </p>
          </Section>
        </div>

        {/* Footer */}
        <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <a
            href={oneMgSearchUrl(medicine.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Find on 1mg
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <button type="button" onClick={onClose} className="btn-primary">
            Close
          </button>
        </footer>
      </div>
    </div>
  )
}
