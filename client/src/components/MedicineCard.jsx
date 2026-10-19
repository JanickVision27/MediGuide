import { useState } from 'react'

import MedicineIcon from './MedicineIcon.jsx'
import MedicineChat from './MedicineChat.jsx'
import { ChatIcon } from './icons.jsx'

/**
 * MedicineCard - standard result card for a medicine found in our database.
 */
export default function MedicineCard({ medicine, onViewDetails }) {
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <>
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

        <div className="mt-auto flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onViewDetails(medicine)}
            className="btn-secondary w-full"
          >
            View Details
          </button>
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            aria-haspopup="dialog"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <ChatIcon className="h-4 w-4" />
            Ask MediGuide AI
          </button>
        </div>
      </article>

      {chatOpen && (
        <MedicineChat
          medicineName={medicine.name}
          medicineData={medicine}
          onClose={() => setChatOpen(false)}
        />
      )}
    </>
  )
}
