'use client'
import { useState, useEffect } from 'react'
import { subscribeIndMonitor, unsubscribeIndMonitor, getIndMonitorStatus } from '@/lib/api'

const IND_BOOKING_URL = 'https://oap.ind.nl/oap/en/#/doc'

interface Props {
  userId: string
  userEmail: string
}

export default function IndMonitorWidget({ userId, userEmail }: Props) {
  const [subscribed, setSubscribed] = useState<boolean | null>(null)
  const [lastReminder, setLastReminder] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getIndMonitorStatus(userId)
      .then(s => {
        setSubscribed(s.subscribed)
        setLastReminder(s.subscription?.last_notified_at ?? null)
      })
      .catch(() => setError('Could not load status'))
      .finally(() => setLoading(false))
  }, [userId])

  const handleToggle = async () => {
    setToggling(true)
    setError('')
    try {
      if (subscribed) {
        await unsubscribeIndMonitor(userId)
        setSubscribed(false)
      } else {
        await subscribeIndMonitor(userId, userEmail)
        setSubscribed(true)
      }
    } catch (e: any) {
      setError(e.message || 'Failed to update subscription')
    } finally {
      setToggling(false)
    }
  }

  const reminderAgo = lastReminder
    ? new Date(lastReminder).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base">🇳🇱</span>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">IND Appointment Alerts</h3>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Get reminders to check for IND appointment slots
          </p>
        </div>
        {!loading && (
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50 ${
              subscribed
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {toggling ? (
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : subscribed ? 'Unsubscribe' : 'Remind me'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="h-10 flex items-center justify-center">
          <svg className="w-4 h-4 animate-spin text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Check now button — always visible */}
          <a
            href={IND_BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl border border-indigo-100 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition group"
          >
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Check slots now</span>
            <svg className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>

          {/* Subscription status */}
          {subscribed ? (
            <div className="flex items-start gap-2 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl px-3.5 py-2.5">
              <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Reminders active — we&apos;ll email <strong>{userEmail}</strong> every 8 hours to check.
                {reminderAgo && <span className="text-indigo-400 dark:text-indigo-500"> Last sent {reminderAgo}.</span>}
              </span>
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Subscribe to receive an email reminder every 8 hours with a direct link and tips on when slots tend to appear.
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">{error}</p>
      )}
    </div>
  )
}
