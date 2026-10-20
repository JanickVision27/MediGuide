import { useState } from 'react'

import MedicineIcon from './MedicineIcon.jsx'
import MedicineChat from './MedicineChat.jsx'
import {
  AlertOctagonIcon,
  AlertTriangleIcon,
  ChatIcon,
  CheckCircleIcon,
  InfoCircleIcon,
} from './icons.jsx'
import { oneMgSearchUrl } from '../utils/medicine.js'
import { formatMedicineName, formatClassName } from '../utils/formatName.js'

const FALLBACK_DISCLAIMER =
  'AI-generated information. Consult a licensed healthcare professional before taking any medication.'

const TONES = {
  green: {
    card: 'ring-emerald-100',
    heading: 'text-emerald-700',
    icon: 'text-emerald-600',
    body: 'text-slate-700',
  },
  orange: {
    card: 'ring-orange-200',
    heading: 'text-orange-700',
    icon: 'text-orange-600',
    body: 'text-orange-900',
  },
  red: {
    card: 'ring-rose-200',
    heading: 'text-rose-700',
    icon: 'text-rose-600',
    body: 'text-rose-900',
  },
  blue: {
    card: 'ring-brand-100',
    heading: 'text-brand-700',
    icon: 'text-brand-600',
    body: 'text-slate-700',
  },
}

function asList(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item) : []
}

/** One labelled plain-text section. Nothing here is parsed as markdown. */
function InfoSection({ title, items, tone = 'blue', Icon }) {
  const styles = TONES[tone] || TONES.blue
  return (
    <section className={`rounded-xl bg-white p-4 ring-1 ${styles.card}`}>
      <h4 className={`mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${styles.heading}`}>
        {Icon && <Icon className={`h-4 w-4 shrink-0 ${styles.icon}`} />}
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="text-sm italic text-slate-500">Not available.</p>
      ) : (
        <ul className="space-y-1.5 text-sm leading-relaxed">
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className={`flex gap-2 ${styles.body}`}>
              <span aria-hidden="true" className={`mt-0.5 shrink-0 ${styles.icon}`}>
                •
              </span>
              <span className="break-words">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * AIMedicineCard - shows live AI-generated information for a medicine that is
 * not in our database. Indigo border distinguishes it from DB results (green)
 * and not-found fallbacks (amber).
 *
 * Every value is rendered as a React text child, so model output is escaped
 * and never interpreted as markdown.
 */
export default function AIMedicineCard({ data, medicineName }) {
  const [chatOpen, setChatOpen] = useState(false)

  const info = data || {}
  const name = info.name || medicineName
  const uses = asList(info.uses)
  const dosageForms = asList(info.dosageForms)
  const sideEffects = asList(info.commonSideEffects)
  const warnings = asList(info.warnings)
  const interactions = asList(info.interactions)
  const buyUrl = oneMgSearchUrl(medicineName)
  const displayName = formatMedicineName(name)
  const displayGenericName = info.genericName ? formatMedicineName(info.genericName) : null
  const displayCategory = info.category ? formatClassName(info.category) : null

  return (
    <>
      <article className="flex flex-col gap-5 rounded-2xl border-2 border-indigo-300 bg-indigo-50/60 p-6 shadow-sm">
        <header className="flex items-start gap-4">
          <MedicineIcon className="h-14 w-14 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="break-words text-xl font-extrabold tracking-tight text-slate-900">{displayName}</h3>
              <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                AI-generated
              </span>
            </div>
            {displayGenericName && (
              <p className="mt-0.5 text-sm text-slate-600">Generic name: {displayGenericName}</p>
            )}
            {(displayCategory || dosageForms.length > 0) && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
                {displayCategory && (
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-indigo-800 ring-1 ring-indigo-200">
                    <span className="sr-only">Category: </span>
                    {displayCategory}
                  </span>
                )}
                {dosageForms.map((form) => (
                  <span
                    key={form}
                    className="rounded-full bg-white px-3 py-1 text-indigo-700 ring-1 ring-indigo-200"
                  >
                    <span className="sr-only">Dosage form: </span>
                    {form}
                  </span>
                ))}
              </div>
            )}
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <InfoSection title="Uses" items={uses} tone="green" Icon={CheckCircleIcon} />
          <InfoSection
            title="Common Side Effects"
            items={sideEffects}
            tone="orange"
            Icon={AlertTriangleIcon}
          />
          <InfoSection title="Warnings" items={warnings} tone="red" Icon={AlertOctagonIcon} />
          <InfoSection title="Interactions" items={interactions} tone="blue" Icon={InfoCircleIcon} />
        </div>

        <div
          role="note"
          className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
        >
          <AlertTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <span>{info.disclaimer || FALLBACK_DISCLAIMER}</span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <a
            href={buyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-300 bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition-colors duration-150 hover:border-indigo-400 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Buy on 1mg
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            aria-haspopup="dialog"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <ChatIcon className="h-4 w-4" />
            Ask MediGuide AI
          </button>
        </div>
      </article>

      {chatOpen && (
        <MedicineChat
          medicineName={medicineName}
          medicineData={info}
          onClose={() => setChatOpen(false)}
        />
      )}
    </>
  )
}
