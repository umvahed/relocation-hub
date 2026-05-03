'use client'
import { useState, useEffect } from 'react'
import { subscribeIndMonitor, unsubscribeIndMonitor, getIndMonitorStatus, type IndMonitorStatus } from '@/lib/api'

interface Props {
  userId: string
  userEmail: string
}

export default function IndMonitorWidget({ userId, userEmail }: Props) {
  const [status, setStatus] = useState<IndMonitorStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getIndMonitorStatus(userId)
      .then(setStatus)
      .catch(() => setError('Could not load monitor status'))
      .finally(() => setLoading(false))
  }, [userId])

  const handleToggle = async () => {
    if (!status) return
    setToggling(true)
    setError('')
    try {
      if (status.subscribed) {
        await unsubscribeIndMonitor(userId)
        setStatus(s => s ? { ...s, subscribed: false } : s)
      } else {
        await subscribeIndMonitor(userId, userEmail)
        setStatus(s => s ? { ...s, subscribed: true } : s)
      }
    } catch (e: any) {
      setError(e.message || 'Failed to update subscription')
    } finally {
      setToggling(false)
    }
  }

  const latest = status?.latest_check
  const slotsAvailable = latest?.slots_available
  const checkedAt = latest?.checked_at
    ? new Date(latest.checked_at).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : null

  const statusConfig = slotsAvailable === true
    ? { dot: 'bg-emerald-500', badge: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', label: 'Slots available', icon: '✅' }
    : slotsAvailable === false
    ? { dot: 'bg-red-400', badge: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800', label: 'No slots available', icon: '🔴' }
    : { dot: 'bg-gray-300 dark:bg-gray-600', badge: 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700', label: 'Not yet checked', icon: '⏳' }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base">🇳🇱</span>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">IND Appointment Monitor</h3>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Get an email when IND appointment slots open up</p>
        </div>
        {!loading && (
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50 ${
              status?.subscribed
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {toggling ? (
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : status?.subscribed ? (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-9.33-5" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 11v3.159c0 .538-.214 1.055-.595 1.436L7 17h5m-3 0v1a3 3 0 006 0v-1m-6 0h6" />
                </svg>
                Unsubscribe
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Alert me
              </>
            )}
          </button>
        )}
      </div>

      {/* Status */}
      {loading ? (
        <div className="h-14 flex items-center justify-center">
          <svg className="w-5 h-5 animate-spin text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <div className="space-y-3">
          <div className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm font-medium ${statusConfig.badge}`}>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusConfig.dot} ${slotsAvailable ? 'animate-pulse' : ''}`} />
            {statusConfig.label}
            {checkedAt && (
              <span className="ml-auto text-xs font-normal opacity-60 whitespace-nowrap">
                Checked {checkedAt}
              </span>
            )}
          </div>

          {status?.subscribed && (
            <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl px-3.5 py-2">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Email alerts active — you'll be notified at <strong>{userEmail}</strong></span>
            </div>
          )}

          {!checkedAt && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              The monitor runs every 4 hours and will alert subscribers when slots become available.
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
