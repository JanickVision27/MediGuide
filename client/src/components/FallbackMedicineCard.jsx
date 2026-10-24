import { useState } from 'react'

import MedicineChat from './MedicineChat.jsx'
import { ChatIcon } from './icons.jsx'
import { oneMgSearchUrl } from '../utils/medicine.js'
import { formatMedicineName } from '../utils/formatName.js'

/**
 * FallbackMedicineCard - shown for a medicine the AI found in the prescription
 * but that is not in our database. Dashed amber styling signals limited info.
 *
 * "Ask MediGuide AI" opens the same per-medicine chat panel used by the other
 * cards. The transcript is React state only and is cleared when the panel
 * closes.
 */
export default function FallbackMedicineCard({ name, onAiLookup, aiLookupLoading = false }) {
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <>
      <article className="flex h-full flex-col gap-3 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" focusable="false">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7.5v5M12 15.75h.01" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-base font-bold text-slate-900">{formatMedicineName(name)}</h3>
            <p className="mt-1 text-sm text-amber-800">
              Detailed data not available in our sample demo.
            </p>
          </div>
        </div>

        <div className={`mt-auto flex flex-col gap-2 ${onAiLookup ? '' : 'sm:flex-row'}`}>
          {onAiLookup ? (
            <button
              type="button"
              onClick={onAiLookup}
              disabled={aiLookupLoading}
              className="btn-secondary flex-1 border-amber-300 bg-white hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {aiLookupLoading ? 'Looking up with Groq…' : 'Get AI medicine info'}
            </button>
          ) : (
            <a
              href={oneMgSearchUrl(name)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex-1 border-amber-300 bg-white hover:bg-amber-100"
            >
              Search on 1mg
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            aria-haspopup="dialog"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <ChatIcon className="h-4 w-4" />
            Ask MediGuide AI
          </button>
        </div>
      </article>

      {chatOpen && (
        <MedicineChat
          medicineName={name}
          medicineData={{ name }}
          onClose={() => setChatOpen(false)}
        />
      )}
    </>
  )
}
