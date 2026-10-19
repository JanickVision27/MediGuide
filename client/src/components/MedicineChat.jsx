import { useCallback, useEffect, useRef, useState } from 'react'

import { ChatIcon, CloseIcon } from './icons.jsx'
import { API_BASE } from '../utils/medicine.js'
import { formatMedicineName, formatClassName } from '../utils/formatName.js'

/** Hard cap for one chat session: 5 questions + 5 answers. */
const MAX_MESSAGES = 10
const MAX_QUESTION_LENGTH = 500

const SUGGESTIONS = [
  'What is this medicine used for?',
  'What are the common side effects?',
  'Any precautions I should know?',
]

const CHAT_DISCLAIMER = '⚠️ This is AI-generated. Consult a healthcare professional.'

async function readError(res, fallback) {
  try {
    const data = await res.json()
    return data.error || fallback
  } catch {
    return fallback
  }
}

/**
 * MedicineChat - slide-over panel with a stateless AI conversation about one
 * medicine. The transcript lives in React state only and is discarded when the
 * panel closes; nothing is stored in MongoDB.
 *
 * Answers arrive as plain text (the server strips markdown), so they are
 * rendered as text children - no markdown renderer anywhere.
 */
export default function MedicineChat({ medicineName, medicineData, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [failed, setFailed] = useState(null)

  const abortRef = useRef(null)
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const nextIdRef = useRef(0)
  const pendingIdRef = useRef(null)
  const pendingQuestionRef = useRef('')
  const requestingRef = useRef(false)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const newId = () => {
    nextIdRef.current += 1
    return nextIdRef.current
  }

  const requestAnswer = useCallback(
    async (question, priorMessages) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      requestingRef.current = true

      setPending(true)
      setError('')

      try {
        const res = await fetch(`${API_BASE}/medicines/ask`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            medicineName,
            question,
            history: priorMessages
              .slice(-MAX_MESSAGES)
              .map(({ role, content }) => ({ role, content })),
          }),
          signal: controller.signal,
        })

        if (!res.ok) {
          throw new Error(
            await readError(res, 'MediGuide AI is unavailable right now. Please try again.')
          )
        }

        const data = await res.json()
        const answer = typeof data.answer === 'string' ? data.answer.trim() : ''
        if (!answer) {
          throw new Error('MediGuide AI did not return an answer. Please try again.')
        }

        setMessages((prev) => [
          ...prev,
          { id: newId(), role: 'assistant', content: answer },
        ])
        setFailed(null)
      } catch (err) {
        if (err.name === 'AbortError') return
        setError(err.message || 'MediGuide AI is unavailable right now. Please try again.')
        setFailed({ question, priorMessages })
      } finally {
        requestingRef.current = false
        if (!controller.signal.aborted) setPending(false)
        if (abortRef.current === controller) abortRef.current = null
      }
    },
    [medicineName]
  )

  const submit = (raw) => {
    const question = String(raw ?? input).trim()
    if (!question || pending || requestingRef.current) return
    // Reserve room for the reply so the transcript never exceeds MAX_MESSAGES.
    if (messages.length + 2 > MAX_MESSAGES) return

    const priorMessages = messages
    const id = newId()
    pendingIdRef.current = id
    pendingQuestionRef.current = question

    setMessages([...priorMessages, { id, role: 'user', content: question }])
    setInput('')
    setFailed(null)
    void requestAnswer(question, priorMessages)
  }

  const cancel = () => {
    if (!pending) return
    abortRef.current?.abort()
    abortRef.current = null
    requestingRef.current = false
    setPending(false)
    setError('')
    setFailed(null)

    const cancelledId = pendingIdRef.current
    if (cancelledId !== null) {
      setMessages((prev) => prev.filter((message) => message.id !== cancelledId))
    }
    setInput(pendingQuestionRef.current)
    pendingIdRef.current = null
    pendingQuestionRef.current = ''
    inputRef.current?.focus()
  }

  const retry = () => {
    if (!failed || pending || requestingRef.current) return
    void requestAnswer(failed.question, failed.priorMessages)
  }

  const close = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setMessages([])
    setInput('')
    setError('')
    setFailed(null)
    setPending(false)
    onCloseRef.current()
  }, [])

  // Lock page scroll, focus the composer and close on Escape while open.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    inputRef.current?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      abortRef.current?.abort()
    }
  }, [close])

  // Keep the newest message in view.
  useEffect(() => {
    const node = listRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages, pending, error])

  const handleComposerKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey) return
    if (event.nativeEvent?.isComposing) return
    event.preventDefault()
    submit()
  }

  const limitReached = messages.length >= MAX_MESSAGES
  const cannotAskNew = messages.length + 2 > MAX_MESSAGES
  const composerDisabled = pending || cannotAskNew
  const subtitle = (() => {
    if (medicineData?.genericName) return formatMedicineName(medicineData.genericName)
    if (medicineData?.category) return formatClassName(medicineData.category)
    return 'General educational information'
  })()
  const displayMedicineName = formatMedicineName(medicineName)

  return (
    <div className="fixed inset-0 z-[80]">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={close}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="medicine-chat-title"
        aria-describedby="medicine-chat-disclaimer"
        className="absolute inset-y-0 right-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
      >
        {/* Header */}
        <header className="flex items-start gap-3 border-b border-slate-200 px-4 py-4">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700"
          >
            <ChatIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="medicine-chat-title"
              className="break-words text-base font-extrabold tracking-tight text-slate-900"
            >
              Ask about {displayMedicineName}
            </h2>
            <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close AI chat"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </header>

        {/* Transcript */}
        <div
          ref={listRef}
          className="scrollbar-slim flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4"
          aria-live="polite"
        >
          {messages.length === 0 && (
            <div className="space-y-4 pt-2">
              <div className="rounded-2xl border border-indigo-100 bg-white p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Hi, I can help with general information.</p>
                <p className="mt-1">
                  Ask about uses, side effects, precautions, or interactions for {displayMedicineName}.
                  I cannot diagnose, prescribe, or advise on dosages.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Suggested questions
                </p>
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => submit(suggestion)}
                    className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-800"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) =>
            message.role === 'user' ? (
              <div key={message.id} className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-brand-600 px-3.5 py-2.5 text-sm leading-relaxed text-white shadow-sm">
                  {message.content}
                </p>
              </div>
            ) : (
              <div key={message.id} className="flex justify-start">
                <p className="max-w-[90%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-700 shadow-sm ring-1 ring-slate-200">
                  {message.content}
                </p>
              </div>
            )
          )}

          {pending && (
            <div className="flex justify-start">
              <p className="animate-pulse rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
                MediGuide AI is thinking…
              </p>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-slate-200 bg-white px-4 py-3">
          {error && (
            <div
              role="alert"
              className="mb-3 flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
            >
              <span>{error}</span>
              {failed && (
                <button
                  type="button"
                  onClick={retry}
                  className="self-start font-semibold text-rose-900 underline underline-offset-2 hover:text-rose-950"
                >
                  Try again
                </button>
              )}
            </div>
          )}

          {limitReached && (
            <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              You have reached the {MAX_MESSAGES}-message limit for this chat. Close the panel to
              start a new conversation.
            </p>
          )}

          <label htmlFor="medicine-chat-input" className="sr-only">
            Ask a question about {displayMedicineName}
          </label>
          <textarea
            id="medicine-chat-input"
            ref={inputRef}
            rows={2}
            value={input}
            maxLength={MAX_QUESTION_LENGTH}
            disabled={composerDisabled}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder={
              cannotAskNew
                ? 'Message limit reached'
                : `Ask about ${displayMedicineName}…`
            }
            className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-slate-50 disabled:text-slate-400"
          />

          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-[11px] text-slate-400">
              {input.length}/{MAX_QUESTION_LENGTH} · Enter to send, Shift+Enter for a new line
            </p>
            {pending ? (
              <button
                type="button"
                onClick={cancel}
                className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={() => submit()}
                disabled={composerDisabled || !input.trim()}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChatIcon className="h-4 w-4" />
                Send
              </button>
            )}
          </div>

          <p
            id="medicine-chat-disclaimer"
            className="mt-3 border-t border-slate-100 pt-2 text-[11px] leading-relaxed text-slate-500"
          >
            {CHAT_DISCLAIMER} Educational information only - not medical advice.
          </p>
        </div>
      </aside>
    </div>
  )
}
