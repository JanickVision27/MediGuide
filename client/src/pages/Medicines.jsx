import { useCallback, useEffect, useRef, useState } from 'react'

import MedicineCard from '../components/MedicineCard.jsx'
import FallbackMedicineCard from '../components/FallbackMedicineCard.jsx'
import MedicineModal from '../components/MedicineModal.jsx'
import AIMedicineCard from '../components/AIMedicineCard.jsx'
import { API_BASE } from '../utils/medicine.js'

const MODES = {
  search: 'Browse Medicines',
  prescription: 'Paste Prescription',
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const MEDICINE_CATEGORIES = [
  { value: 'fever', label: 'Fever' },
  { value: 'pain', label: 'Pain relief' },
  { value: 'headache', label: 'Headache & migraine' },
  { value: 'cold_cough', label: 'Cold & cough' },
  { value: 'allergy', label: 'Allergy' },
  { value: 'respiratory', label: 'Respiratory' },
  { value: 'vitamins', label: 'Vitamins & nutrition' },
]

const SEARCH_DEBOUNCE_MS = 300
// AI lookup is only sent on explicit submit; repeated submits within this window collapse into one.
const AI_SUBMIT_DEBOUNCE_MS = 500
const AI_IDLE = { status: 'idle', term: '', data: null, error: '' }

const IMAGE_MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const PDF_MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

async function readError(res, fallback) {
  try {
    const data = await res.json()
    return data.error || fallback
  } catch {
    return fallback
  }
}

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function StatusNotice({ tone = 'info', children }) {
  const tones = {
    info: 'border-slate-200 bg-white text-slate-600',
    error: 'border-rose-200 bg-rose-50 text-rose-800',
    warning: 'border-amber-300 bg-amber-50 text-amber-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  }
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>
      {children}
    </div>
  )
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function ProgressBar({ value, label }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-medium text-slate-600">
        <span>{label}</span>
        <span aria-live="polite">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-brand-600 transition-all duration-200 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Tesseract is loaded lazily so the big worker + language chunks don't inflate
 * the initial bundle. Each call returns the same promise so concurrent callers
 * share the one import.
 */
let tesseractPromise = null
function loadTesseract() {
  if (!tesseractPromise) {
    tesseractPromise = import('tesseract.js')
  }
  return tesseractPromise
}

/**
 * Medicines page - two modes:
 *  - Search: debounced lookup of our medicine database.
 *  - Prescription: upload an image (OCR in browser via Tesseract.js), upload a
 *    PDF (server-side text extraction), or paste text, then have MediGuide AI
 *    find the medicines mentioned.
 */
export default function Medicines() {
  const [mode, setMode] = useState('search')
  const [selectedMedicine, setSelectedMedicine] = useState(null)
  const closeModal = useCallback(() => setSelectedMedicine(null), [])

  // Search state
  const [query, setQuery] = useState('')
  const [selectedLetter, setSelectedLetter] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS)
  const [results, setResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(true)
  const [searchError, setSearchError] = useState('')

  // Prescription state - shared across paste + upload paths
  const [prescription, setPrescription] = useState('')
  const [extraction, setExtraction] = useState(null)
  const [extractLoading, setExtractLoading] = useState(false)
  const [extractError, setExtractError] = useState('')

  // Image upload state
  const [imageFile, setImageFile] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrStatus, setOcrStatus] = useState('') // '' | 'loading' | 'done' | 'error'
  const [ocrError, setOcrError] = useState('')
  const imageInputRef = useRef(null)
  const ocrWorkerRef = useRef(null)
  const imageDropRef = useRef(null)
  const [imageDragActive, setImageDragActive] = useState(false)

  // PDF upload state
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfUploading, setPdfUploading] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const pdfInputRef = useRef(null)

  // AI lookup state (used when the database search returns nothing)
  const [aiState, setAiState] = useState(AI_IDLE)
  const aiAbortRef = useRef(null)
  const aiTimerRef = useRef(null)

  // Search request, cancelled when the query changes
  useEffect(() => {
    if (mode !== 'search') return undefined

    const controller = new AbortController()
    const run = async () => {
      setSearchLoading(true)
      setSearchError('')
      try {
        const params = new URLSearchParams()
        if (debouncedQuery) params.set('search', debouncedQuery)
        if (selectedLetter) params.set('letter', selectedLetter)
        if (selectedCategory) params.set('category', selectedCategory)
        const res = await fetch(`${API_BASE}/medicines?${params.toString()}`, {
          credentials: 'include',
          signal: controller.signal,
        })
        if (!res.ok) {
          throw new Error(await readError(res, 'Could not load medicines.'))
        }
        const data = await res.json()
        setResults(Array.isArray(data) ? data : [])
      } catch (err) {
        if (err.name === 'AbortError') return
        setResults([])
        setSearchError(err.message || 'Could not load medicines.')
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false)
      }
    }
    run()

    return () => controller.abort()
  }, [debouncedQuery, selectedLetter, selectedCategory, mode])

  // Any change to the query/filters invalidates a pending or shown AI result.
  useEffect(() => {
    clearTimeout(aiTimerRef.current)
    aiAbortRef.current?.abort()
    setAiState(AI_IDLE)
  }, [query, selectedLetter, selectedCategory])

  // Revoke the object URL when the image changes/unmounts to free memory.
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Tear down any OCR worker on unmount.
  useEffect(() => {
    return () => {
      clearTimeout(aiTimerRef.current)
      aiAbortRef.current?.abort()
      if (ocrWorkerRef.current) {
        ocrWorkerRef.current.terminate().catch(() => {})
        ocrWorkerRef.current = null
      }
    }
  }, [])

  // ---- Image upload + OCR --------------------------------------------------

  const clearImageFile = useCallback(() => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    setImageFile(null)
    setImagePreviewUrl('')
    setOcrProgress(0)
    setOcrStatus('')
    setOcrError('')
    if (imageInputRef.current) imageInputRef.current.value = ''
    if (ocrWorkerRef.current) {
      ocrWorkerRef.current.terminate().catch(() => {})
      ocrWorkerRef.current = null
    }
  }, [imagePreviewUrl])

  const handleImageFile = useCallback(
    async (file) => {
      if (!file) return
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setOcrError('Unsupported file type. Please upload a JPG, PNG, or WebP image.')
        return
      }
      if (file.size > IMAGE_MAX_BYTES) {
        setOcrError(`Image is too large. Maximum size is ${formatBytes(IMAGE_MAX_BYTES)}.`)
        return
      }

      // Replace any previously selected image cleanly.
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
      setOcrError('')
      setExtractError('')
      setExtraction(null)
      setPdfFile(null)
      setPdfError('')

      const previewUrl = URL.createObjectURL(file)
      setImageFile(file)
      setImagePreviewUrl(previewUrl)
      setOcrStatus('loading')
      setOcrProgress(0)
      setPrescription('') // OCR will fill this in

      try {
        const { createWorker } = await loadTesseract()
        // Terminate previous worker if one somehow survived.
        if (ocrWorkerRef.current) {
          await ocrWorkerRef.current.terminate().catch(() => {})
        }
        const worker = await createWorker('eng', 1, {
          logger: (m) => {
            if (m && typeof m.progress === 'number') {
              // worker reports progress 0..1 for each phase; scale to 0..100
              setOcrProgress(Math.min(99, Math.round(m.progress * 100)))
              setOcrStatus('loading')
            }
          },
        })
        ocrWorkerRef.current = worker
        const { data } = await worker.recognize(file)
        setOcrProgress(100)
        const text = (data.text || '').trim()
        setPrescription(text)
        setOcrStatus('done')
        await worker.terminate().catch(() => {})
        if (ocrWorkerRef.current === worker) ocrWorkerRef.current = null
      } catch (err) {
        console.error('Tesseract OCR error:', err)
        setOcrError(err.message || 'Could not read text from the image. Please try another file.')
        setOcrStatus('error')
      }
    },
    [imagePreviewUrl]
  )

  const onImageInputChange = (e) => {
    const file = e.target.files && e.target.files[0]
    handleImageFile(file)
  }

  const onImageDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setImageDragActive(false)
    const file = e.dataTransfer?.files && e.dataTransfer.files[0]
    if (file) handleImageFile(file)
  }

  const onImageDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setImageDragActive(true)
  }
  const onImageDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setImageDragActive(false)
  }

  // ---- PDF upload ----------------------------------------------------------

  const clearPdfFile = useCallback(() => {
    setPdfFile(null)
    setPdfError('')
    setPdfUploading(false)
    if (pdfInputRef.current) pdfInputRef.current.value = ''
  }, [])

  const handlePdfFile = useCallback(
    async (file) => {
      if (!file) return
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      if (!isPdf) {
        setPdfError('Only PDF files are supported.')
        return
      }
      if (file.size > PDF_MAX_BYTES) {
        setPdfError(`PDF is too large. Maximum size is ${formatBytes(PDF_MAX_BYTES)}.`)
        return
      }
      setPdfError('')
      setExtractError('')
      setExtraction(null)
      setOcrError('')
      clearImageFile()
      setPdfFile(file)
      setPrescription('') // Server extracts text; we don't populate the textarea.
    },
    [clearImageFile]
  )

  const onPdfInputChange = (e) => {
    const file = e.target.files && e.target.files[0]
    handlePdfFile(file)
  }

  // ---- Submit (text from paste/OCR OR PDF) --------------------------------

  const runAiLookup = async (term) => {
    aiAbortRef.current?.abort()
    const controller = new AbortController()
    aiAbortRef.current = controller
    setAiState({ status: 'loading', term, data: null, error: '' })

    try {
      const res = await fetch(`${API_BASE}/medicines/ai-lookup`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicineName: term }),
        signal: controller.signal,
      })
      if (res.status === 404) {
        setAiState({ status: 'notFound', term, data: null, error: '' })
        return
      }
      if (!res.ok) {
        throw new Error(await readError(res, 'AI lookup is unavailable right now. Please try again.'))
      }
      const data = await res.json()
      setAiState({ status: 'found', term, data, error: '' })
    } catch (err) {
      if (err.name === 'AbortError') return
      setAiState({
        status: 'error',
        term,
        data: null,
        error: err.message || 'AI lookup is unavailable right now. Please try again.',
      })
    }
  }

  // Explicit user action only (button or Enter). Debounced so rapid repeats send one request.
  const requestAiLookup = () => {
    const term = query.trim()
    if (!term) return
    clearTimeout(aiTimerRef.current)
    setAiState({ status: 'loading', term, data: null, error: '' })
    aiTimerRef.current = setTimeout(() => runAiLookup(term), AI_SUBMIT_DEBOUNCE_MS)
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    if (showAiPrompt) requestAiLookup()
  }

  const handleFindMedicines = async (event) => {
    event.preventDefault()
    if (extractLoading) return

    // PDF path: POST the file to /extract-file (multipart). The server extracts
    // text, runs Groq and DB matching, and returns the same shape as /extract.
    if (pdfFile) {
      setPdfUploading(true)
      setExtractLoading(true)
      setExtractError('')
      setExtraction(null)
      try {
        const form = new FormData()
        form.append('file', pdfFile)
        const res = await fetch(`${API_BASE}/medicines/extract-file`, {
          method: 'POST',
          credentials: 'include',
          body: form,
        })
        if (!res.ok) {
          throw new Error(await readError(res, 'Could not read the PDF.'))
        }
        const data = await res.json()
        setExtraction({
          found: Array.isArray(data.found) ? data.found : [],
          notFound: Array.isArray(data.notFound) ? data.notFound : [],
          dbAvailable: data.dbAvailable !== false,
        })
      } catch (err) {
        setExtractError(err.message || 'Could not read the PDF.')
      } finally {
        setPdfUploading(false)
        setExtractLoading(false)
      }
      return
    }

    // Text path: OCR output (editable) or pasted text goes to /extract.
    const text = prescription.trim()
    if (!text) return

    setExtractLoading(true)
    setExtractError('')
    setExtraction(null)
    try {
      const res = await fetch(`${API_BASE}/medicines/extract`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) {
        throw new Error(await readError(res, 'Could not read the prescription.'))
      }
      const data = await res.json()
      setExtraction({
        found: Array.isArray(data.found) ? data.found : [],
        notFound: Array.isArray(data.notFound) ? data.notFound : [],
        dbAvailable: data.dbAvailable !== false,
      })
    } catch (err) {
      setExtractError(err.message || 'Could not read the prescription.')
    } finally {
      setExtractLoading(false)
    }
  }

  const trimmedQuery = query.trim()
  const hasActiveFilters = Boolean(trimmedQuery || selectedLetter || selectedCategory)
  const selectedCategoryLabel = MEDICINE_CATEGORIES.find(
    (category) => category.value === selectedCategory,
  )?.label
  const resultContext = [
    debouncedQuery ? `matching "${debouncedQuery}"` : '',
    selectedLetter ? `starting with ${selectedLetter}` : '',
    selectedCategoryLabel ? `in ${selectedCategoryLabel}` : '',
  ].filter(Boolean).join(' · ')
  const showAiPrompt =
    mode === 'search' &&
    trimmedQuery !== '' &&
    !selectedLetter &&
    !selectedCategory &&
    debouncedQuery === trimmedQuery &&
    !searchLoading &&
    !searchError &&
    results.length === 0

  const clearMedicineFilters = () => {
    setQuery('')
    setSelectedLetter('')
    setSelectedCategory('')
  }

  const canSubmitText = !!prescription.trim() && !extractLoading && ocrStatus !== 'loading'
  const canSubmitPdf = !!pdfFile && !extractLoading && !pdfUploading
  const canSubmit = canSubmitText || canSubmitPdf

  const renderSearch = () => (
    <form onSubmit={handleSearchSubmit} aria-label="Medicine search" className="space-y-6">
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div>
          <label htmlFor="medicine-search" className="mb-2 block text-sm font-semibold text-slate-700">
            Search by medicine name or composition
          </label>
          <div className="relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" focusable="false">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M20 20l-4.2-4.2" />
            </svg>
            <input
              id="medicine-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Dolo 650, paracetamol, pantoprazole"
              autoComplete="off"
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Filter by listed use or class
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearMedicineFilters}
                className="text-xs font-semibold text-brand-700 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
          <div role="group" aria-label="Medicine use or class" className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={!selectedCategory}
              onClick={() => setSelectedCategory('')}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                !selectedCategory
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50'
              }`}
            >
              All uses
            </button>
            {MEDICINE_CATEGORIES.map((category) => {
              const active = selectedCategory === category.value
              return (
                <button
                  key={category.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedCategory(category.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50'
                  }`}
                >
                  {category.label}
                </button>
              )
            })}
          </div>
        </div>

        <fieldset className="min-w-0">
          <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            Browse by first letter
          </legend>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              aria-pressed={!selectedLetter}
              onClick={() => setSelectedLetter('')}
              className={`h-8 rounded-lg border px-3 text-xs font-bold transition-colors ${
                !selectedLetter
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50'
              }`}
            >
              All
            </button>
            {ALPHABET.map((letter) => {
              const active = selectedLetter === letter
              return (
                <button
                  key={letter}
                  type="button"
                  aria-pressed={active}
                  aria-label={`Show medicines starting with ${letter}`}
                  onClick={() => setSelectedLetter(letter)}
                  className={`h-8 w-8 rounded-lg border text-xs font-bold transition-colors ${
                    active
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50'
                  }`}
                >
                  {letter}
                </button>
              )
            })}
          </div>
        </fieldset>

        <p className="text-xs leading-5 text-slate-500">
          Filters match the uses/classes recorded in our sample data; they are not treatment recommendations.
        </p>
      </div>

      {searchError && <StatusNotice tone="error">{searchError}</StatusNotice>}

      {!searchError && (
        <p className="text-xs font-medium text-slate-500" aria-live="polite">
          {searchLoading
            ? 'Searching…'
            : `${results.length} ${results.length === 1 ? 'medicine' : 'medicines'}${
                resultContext ? ` ${resultContext}` : ' across all medicines'
              }${results.length === 50 ? ' · first 50 matches' : ''}`}
        </p>
      )}

      {!searchLoading && !searchError && results.length === 0 && !showAiPrompt && (
        <div className="space-y-3">
          <StatusNotice>
            {hasActiveFilters
              ? 'No medicines match these filters. Try another letter/category or a shorter search.'
              : 'No medicines are currently available in the sample database.'}
          </StatusNotice>
          {hasActiveFilters && (
            <button type="button" onClick={clearMedicineFilters} className="btn-secondary">
              Clear filters
            </button>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {results.map((medicine) => (
          <MedicineCard key={medicine._id} medicine={medicine} onViewDetails={setSelectedMedicine} />
        ))}
      </div>

      {showAiPrompt && aiState.status === 'idle' && (
        <div className="rounded-2xl border-2 border-dashed border-indigo-300 bg-white p-6 text-center">
          <p className="text-sm font-semibold text-slate-800">
            No match for &quot;{trimmedQuery}&quot; in our sample database.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Press Enter or use the button to ask MediGuide AI for general information about this medicine.
          </p>
          <button type="button" onClick={requestAiLookup} className="btn-primary mt-4">
            Look up with MediGuide AI
          </button>
        </div>
      )}

      {aiState.status === 'loading' && (
        <StatusNotice>Looking up &quot;{aiState.term}&quot; with MediGuide AI…</StatusNotice>
      )}

      {aiState.status === 'found' && (
        <AIMedicineCard data={aiState.data} medicineName={aiState.term} />
      )}

      {aiState.status === 'notFound' && (
        <div className="space-y-2">
          <StatusNotice>
            MediGuide AI couldn&apos;t find reliable information about &quot;{aiState.term}&quot;. Try searching on 1mg instead.
          </StatusNotice>
          <FallbackMedicineCard name={aiState.term} />
        </div>
      )}

      {aiState.status === 'error' && (
        <div className="space-y-3">
          <StatusNotice tone="error">{aiState.error}</StatusNotice>
          <button type="button" onClick={requestAiLookup} className="btn-secondary">
            Try again
          </button>
        </div>
      )}
    </form>
  )

  const renderPrescription = () => {
    const found = extraction?.found ?? []
    const notFound = extraction?.notFound ?? []
    const hasResults = extraction && (found.length > 0 || notFound.length > 0)

    return (
      <section aria-label="Prescription lookup" className="space-y-6">
        {/* Upload dropzone (top of the prescription section) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Upload a prescription</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Upload an image of your prescription (JPG/PNG/WebP up to 5&nbsp;MB) for automatic OCR, or a PDF
                (up to 10&nbsp;MB). Or paste the text below as a fallback.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {/* Image dropzone */}
            <div
              ref={imageDropRef}
              onDrop={onImageDrop}
              onDragOver={onImageDragOver}
              onDragLeave={onImageDragLeave}
              onClick={() => imageInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  imageInputRef.current?.click()
                }
              }}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
                imageDragActive
                  ? 'border-brand-500 bg-brand-50'
                  : imageFile
                  ? 'border-brand-300 bg-brand-50/40'
                  : 'border-slate-300 bg-slate-50 hover:border-brand-400 hover:bg-brand-50/40'
              }`}
            >
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={onImageInputChange}
                className="hidden"
              />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-brand-600" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <circle cx="9" cy="10" r="2" />
                <path d="M21 16l-5-5-9 9" />
              </svg>
              <p className="mt-2 text-sm font-semibold text-slate-700">Upload Image</p>
              <p className="mt-0.5 text-xs text-slate-500">JPG, PNG or WebP · max 5 MB</p>
              {!imageFile && (
                <p className="mt-2 text-xs text-slate-400">Click or drag &amp; drop</p>
              )}
            </div>

            {/* PDF picker */}
            <button
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
                pdfFile
                  ? 'border-brand-300 bg-brand-50/40'
                  : 'border-slate-300 bg-slate-50 hover:border-brand-400 hover:bg-brand-50/40'
              }`}
            >
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={onPdfInputChange}
                className="hidden"
              />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-brand-600" aria-hidden="true">
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                <path d="M14 3v5h5" />
                <path d="M9 13h6" />
                <path d="M9 17h4" />
              </svg>
              <p className="mt-2 text-sm font-semibold text-slate-700">Upload PDF</p>
              <p className="mt-0.5 text-xs text-slate-500">PDF · max 10 MB</p>
            </button>
          </div>

          {/* Selected image preview + OCR progress */}
          {imageFile && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{imageFile.name}</p>
                  <p className="text-xs text-slate-500">{formatBytes(imageFile.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={clearImageFile}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  Remove
                </button>
              </div>
              <div className="mt-3 flex flex-col gap-4 sm:flex-row">
                <img
                  src={imagePreviewUrl}
                  alt="Prescription preview"
                  className="h-40 w-full rounded-lg border border-slate-200 bg-white object-contain sm:w-48"
                />
                <div className="min-w-0 flex-1">
                  {ocrStatus === 'loading' && (
                    <div className="space-y-2">
                      <ProgressBar value={ocrProgress} label="Reading text from image…" />
                      <p className="text-xs text-slate-500">
                        OCR runs in your browser — your image is not sent anywhere unless you click Find Medicines.
                      </p>
                    </div>
                  )}
                  {ocrStatus === 'done' && (
                    <StatusNotice tone="success">Text extracted! Review and edit it below, then click Find Medicines.</StatusNotice>
                  )}
                  {ocrStatus === 'error' && ocrError && (
                    <StatusNotice tone="error">{ocrError}</StatusNotice>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Selected PDF info */}
          {pdfFile && (
            <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                    <path d="M14 3v5h5" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{pdfFile.name}</p>
                  <p className="text-xs text-slate-500">{formatBytes(pdfFile.size)} · PDF</p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearPdfFile}
                className="rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
              >
                Remove
              </button>
            </div>
          )}

          {pdfError && <div className="mt-3"><StatusNotice tone="error">{pdfError}</StatusNotice></div>}
          {ocrError && !imageFile && <div className="mt-3"><StatusNotice tone="error">{ocrError}</StatusNotice></div>}
        </div>

        {/* Textarea / paste fallback + submit */}
        <form onSubmit={handleFindMedicines} className="space-y-3">
          <label htmlFor="prescription-text" className="block text-sm font-semibold text-slate-700">
            {pdfFile ? 'PDF text will be extracted on the server' : 'Prescription text (editable)'}
          </label>
          <textarea
            id="prescription-text"
            rows={6}
            value={prescription}
            onChange={(e) => {
              setPrescription(e.target.value)
              // If the user starts typing/pasting, drop any PDF selection so the
              // submission unambiguously uses the text path.
              if (pdfFile) clearPdfFile()
            }}
            disabled={!!pdfFile}
            placeholder={
              pdfFile
                ? 'PDF upload selected — click "Find Medicines" to extract text on the server.'
                : imageFile && ocrStatus === 'loading'
                ? 'Running OCR in your browser…'
                : 'e.g. "Take Tab Dolo 650 twice daily and Pan 40 before breakfast". You can also upload an image above.'
            }
            maxLength={5000}
            className="w-full resize-y rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-slate-100 disabled:text-slate-500"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              {pdfFile
                ? 'PDF will be processed on the server (max 10 MB).'
                : `${prescription.length}/5000 characters · Do not paste personal identifiers.`}
            </p>
            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-primary"
            >
              {extractLoading || pdfUploading
                ? pdfFile
                  ? 'Extracting from PDF…'
                  : 'Finding medicines…'
                : 'Find Medicines'}
            </button>
          </div>
        </form>

        {extractError && <StatusNotice tone="error">{extractError}</StatusNotice>}

        {extraction && !extraction.dbAvailable && (
          <StatusNotice tone="warning">
            The medicine database is offline right now, so details are unavailable. The names below were
            read from your prescription.
          </StatusNotice>
        )}

        {extraction && !hasResults && (
          <StatusNotice>No medicine names were detected. Try a clearer photo, a non-scanned PDF, or paste the medicine list directly.</StatusNotice>
        )}

        {found.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              In our database ({found.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {found.map((medicine) => (
                <MedicineCard key={medicine._id} medicine={medicine} onViewDetails={setSelectedMedicine} />
              ))}
            </div>
          </div>
        )}

        {notFound.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Not in our sample data ({notFound.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {notFound.map((name) => (
                <FallbackMedicineCard key={name} name={name} />
              ))}
            </div>
          </div>
        )}
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Medicine &amp; Prescription</h1>
        <p className="mt-1 text-sm text-slate-500">
          Browse the sample database by name, first letter, or listed use—or upload/paste a prescription to find its medicines.
        </p>
      </header>

      <div role="group" aria-label="Lookup mode" className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {Object.entries(MODES).map(([key, label]) => {
          const active = mode === key
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => setMode(key)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                active ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {mode === 'search' ? renderSearch() : renderPrescription()}

      {selectedMedicine && (
        <MedicineModal medicine={selectedMedicine} onClose={closeModal} />
      )}
    </div>
  )
}
