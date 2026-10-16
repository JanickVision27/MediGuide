import { useId, useState } from 'react'

import { API_BASE, oneMgSearchUrl } from '../utils/medicine.js'

/**
 * FallbackMedicineCard - shown for a medicine the AI found in the prescription
 * but that is not in our database. Dashed amber styling signals limited info.
 */
export default function FallbackMedicineCard({ name }) {
  const [expanded, setExpanded] = useState(false)
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const panelId = useId()

  const askAi = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `What is ${name} used for and what are its common side effects?`,
        }),
      })
      if (!res.ok) {
        throw new Error('The AI assistant is unavailable right now.')
      }
      const data = await res.json()
      setAnswer(data.answer || 'No answer was returned. Please try again.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleAi = () => {
    const next = !expanded
    setExpanded(next)
    if (next && !answer && !loading) {
      askAi()
    }
  }

  return (
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
          <h3 className="break-words text-base font-bold text-slate-900">{name}</h3>
          <p className="mt-1 text-sm text-amber-800">
            Detailed data not available in our sample demo.
          </p>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2 sm:flex-row">
        <a
          href={oneMgSearchUrl(name)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary flex-1 border-amber-300 bg-white hover:bg-amber-100"
        >
          Search on 1mg
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        <button
          type="button"
          onClick={toggleAi}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="btn-primary flex-1"
        >
          Ask MediGuide AI
        </button>
      </div>

      {expanded && (
        <div
          id={panelId}
          role="region"
          aria-label={`MediGuide AI answer about ${name}`}
          className="rounded-xl border border-amber-200 bg-white p-4 text-sm text-slate-700"
        >
          {loading && <p className="animate-pulse text-slate-500">Asking MediGuide AI…</p>}
          {!loading && error && (
            <div className="space-y-2">
              <p className="text-rose-700">{error}</p>
              <button type="button" onClick={askAi} className="text-xs font-semibold text-brand-700 underline">
                Try again
              </button>
            </div>
          )}
          {!loading && !error && answer && (
            <p className="whitespace-pre-wrap leading-relaxed">{answer}</p>
          )}
          {!loading && answer && (
            <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-400">
              AI-generated general information. Confirm with a doctor or pharmacist.
            </p>
          )}
        </div>
      )}
    </article>
  )
}
