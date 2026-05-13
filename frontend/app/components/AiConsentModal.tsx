'use client'
import { useState } from 'react'
import { updateConsent } from '@/lib/api'

interface Props {
  userId: string
  onConsent: () => void
  onDecline: () => void
}

export default function AiConsentModal({ userId, onConsent, onDecline }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleConsent() {
    setLoading(true)
    try {
      await updateConsent(userId, true)
      onConsent()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">AI document processing consent</h2>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          To validate your documents, Valryn will send them to an AI service (Anthropic). Before we do, please read how your data is handled:
        </p>

        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 mb-4">
          <li className="flex gap-2">
            <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
            Document bytes are processed in memory only — never written to disk or logged.
          </li>
          <li className="flex gap-2">
            <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
            Only the validation result (pass/warn/fail + issues) is stored — not your document content.
          </li>
          <li className="flex gap-2">
            <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
            Anthropic does not train on API data (covered by their Data Processing Agreement).
          </li>
          <li className="flex gap-2">
            <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
            You can withdraw this consent at any time from Settings.
          </li>
        </ul>

        <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
          Legal basis: Article 6(1)(b) GDPR — processing necessary for the performance of a contract.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onDecline}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConsent}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            I consent
          </button>
        </div>
      </div>
    </div>
  )
}
