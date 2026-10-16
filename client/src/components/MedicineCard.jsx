import MedicineIcon from './MedicineIcon.jsx'

/**
 * MedicineCard - standard result card for a medicine found in our database.
 */
export default function MedicineCard({ medicine, onViewDetails }) {
  return (
    <article className="card flex h-full flex-col gap-4 p-5 transition-shadow duration-150 hover:shadow-md">
      <div className="flex items-start gap-4">
        <MedicineIcon className="h-12 w-12 shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-slate-900" title={medicine.name}>
            {medicine.name}
          </h3>
          <p className="mt-0.5 truncate text-sm text-slate-500">
            {medicine.therapeuticClass || 'Class not listed'}
          </p>
        </div>
      </div>

      {medicine.isDiscontinued && (
        <span className="badge self-start bg-rose-50 text-[10px] text-rose-700 ring-1 ring-rose-200">
          Discontinued
        </span>
      )}

      <button
        type="button"
        onClick={() => onViewDetails(medicine)}
        className="btn-secondary mt-auto w-full"
      >
        View Details
      </button>
    </article>
  )
}
