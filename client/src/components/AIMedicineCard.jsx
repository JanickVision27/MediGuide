import MedicineIcon from './MedicineIcon.jsx'

/**
 * AIMedicineCard - shows live AI-generated information for a medicine that is
 * not in our database. Indigo border distinguishes it from DB results (green)
 * and not-found fallbacks (amber).
 *
 * All text is rendered as React children, so model output is escaped.
 */
function InfoList({ items, emptyText, className }) {
  if (!items?.length) {
    return <p className="text-sm italic text-slate-500">{emptyText}</p>
  }
  return (
    <ul className={`list-disc space-y-1 pl-5 text-sm leading-relaxed ${className}`}>
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  )
}

export default function AIMedicineCard({ data, medicineName }) {
  const displayName = data.name || medicineName
  const buyUrl = `https://www.1mg.com/search/all?name=${encodeURIComponent(medicineName)}`

  return (
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
          {data.genericName && (
            <p className="mt-0.5 text-sm text-slate-600">Generic name: {data.genericName}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
            {data.therapeuticClass && (
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-indigo-800 ring-1 ring-indigo-200">
                {data.therapeuticClass}
              </span>
            )}
            <span
              className={`rounded-full px-3 py-1 ring-1 ${
                data.isOTC
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-rose-50 text-rose-700 ring-rose-200'
              }`}
            >
              {data.isOTC ? 'OTC (over the counter)' : 'Prescription (Rx)'}
            </span>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl bg-white p-4 ring-1 ring-indigo-100">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-indigo-700">Uses</h4>
          <InfoList items={data.uses} emptyText="Not available." className="text-slate-700" />
        </section>

        <section className="rounded-xl bg-white p-4 ring-1 ring-indigo-100">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-indigo-700">Precautions</h4>
          <InfoList items={data.precautions} emptyText="Not available." className="text-slate-700" />
        </section>

        <section className="rounded-xl bg-white p-4 ring-1 ring-orange-200 md:col-span-2">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-orange-700">Side Effects</h4>
          <InfoList items={data.sideEffects} emptyText="Not available." className="text-orange-800" />
        </section>
      </div>

      <div role="note" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
        ⚠️ This information is AI-generated. Always consult a licensed healthcare professional.
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <a
          href={buyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          Buy on 1mg
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </article>
  )
}
