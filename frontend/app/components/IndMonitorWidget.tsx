'use client'
import { useState, useEffect } from 'react'
import { subscribeIndMonitor, unsubscribeIndMonitor, getIndMonitorStatus, reportIndSlot } from '@/lib/api'

const IND_BOOKING_URL = 'https://oap.ind.nl/oap/en/#/doc'

interface Props {
  readonly userId: string
  readonly userEmail: string
}

const Spinner = ({ size }: { readonly size: string }) => (
  <svg className={`${size} animate-spin`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)

function formatCheckedAgo(checkedAt: string): string {
  const diff = Math.floor((Date.now() - new Date(checkedAt).getTime()) / 60000)
  if (diff < 1) return 'just now'
  if (diff < 60) return `${diff}m ago`
  return `${Math.floor(diff / 60)}h ago`
}

export default function IndMonitorWidget({ userId, userEmail }: Props) {
  const [subscribed, setSubscribed] = useState<boolean | null>(null)
  const [lastReminder, setLastReminder] = useState<string | null>(null)
  const [latestCheck, setLatestCheck] = useState<{
    slots_available: boolean
    status_text: string
    checked_at: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [reported, setReported] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getIndMonitorStatus(userId)
      .then(s => {
        setSubscribed(s.subscribed)
        setLastReminder(s.subscription?.last_notified_at ?? null)
        setLatestCheck(s.latest_check ?? null)
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

  const handleReport = async () => {
    setReporting(true)
    setError('')
    try {
      await reportIndSlot(userId)
      setReported(true)
    } catch (e: any) {
      setError(e.message || 'Failed to send alert')
    } finally {
      setReporting(false)
    }
  }

  // --- derived display values (no nested ternaries in JSX) ---

  const reminderAgo = lastReminder
    ? new Date(lastReminder).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null

  const checkedAgo = latestCheck?.checked_at ? formatCheckedAgo(latestCheck.checked_at) : null

  const slotsAvailable = latestCheck?.slots_available ?? false
  const isCommunityReport = slotsAvailable && !!latestCheck?.status_text?.startsWith('Community report:')

  let statusWrapperClass = 'bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700'
  let dotClass = 'bg-gray-300 dark:bg-gray-600'
  let labelClass = 'text-gray-500 dark:text-gray-400'
  let labelText = 'No slots right now'
  let checkedAgoLabel = 'Last checked'

  if (isCommunityReport) {
    statusWrapperClass = 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
    dotClass = 'bg-amber-400'
    labelClass = 'text-amber-700 dark:text-amber-400'
    labelText = 'Reported by a user — check now!'
    checkedAgoLabel = 'Reported'
  } else if (slotsAvailable) {
    statusWrapperClass = 'bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800'
    dotClass = 'bg-green-500'
    labelClass = 'text-green-700 dark:text-green-400'
    labelText = 'Slots detected — book now!'
  }

  const toggleBtnClass = subscribed
    ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
    : 'bg-indigo-600 text-white hover:bg-indigo-700'
  const toggleLabel = subscribed ? 'Unsubscribe' : 'Notify me'

  const bookBtnClass = slotsAvailable
    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
    : 'border-indigo-100 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
  const bookBtnTextClass = slotsAvailable ? 'text-green-700 dark:text-green-300' : 'text-indigo-700 dark:text-indigo-300'
  const bookBtnLabel = slotsAvailable ? 'Book appointment now' : 'Check slots yourself'
  const bookBtnIconClass = slotsAvailable ? 'text-green-400' : 'text-indigo-400'

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
            Auto-monitors all IND desks every 4 hours
          </p>
        </div>
        {!loading && (
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50 ${toggleBtnClass}`}
          >
            {toggling ? <Spinner size="w-3 h-3" /> : toggleLabel}
          </button>
        )}
      </div>

      {loading ? (
        <div className="h-10 flex items-center justify-center">
          <Spinner size="w-4 h-4 text-gray-300 dark:text-gray-600" />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Slot availability status */}
          {latestCheck ? (
            <div className={`flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 ${statusWrapperClass}`}>
              <span className={`flex-shrink-0 w-2 h-2 rounded-full ${dotClass}`} style={{ marginTop: '5px' }} />
              <div className="min-w-0">
                <p className={`text-xs font-semibold ${labelClass}`}>{labelText}</p>
                {isCommunityReport && (
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                    A fellow subscriber spotted slots and alerted everyone.
                  </p>
                )}
                {slotsAvailable && !isCommunityReport && (
                  <p className="text-xs text-green-600 dark:text-green-500 mt-0.5 truncate">
                    {latestCheck.status_text.replace('SLOTS AVAILABLE: ', '')}
                  </p>
                )}
                {checkedAgo && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {checkedAgoLabel} {checkedAgo}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">
              <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
              <p className="text-xs text-gray-400 dark:text-gray-500">Waiting for first check…</p>
            </div>
          )}

          {/* Book now / check button */}
          <a
            href={IND_BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl border transition group ${bookBtnClass}`}
          >
            <span className={`text-sm font-medium ${bookBtnTextClass}`}>{bookBtnLabel}</span>
            <svg className={`w-4 h-4 group-hover:translate-x-0.5 transition-transform ${bookBtnIconClass}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>

          {/* Community report button — subscribers only */}
          {subscribed && (
            <button
              onClick={handleReport}
              disabled={reporting || reported}
              className="flex items-center justify-center gap-2 w-full px-3.5 py-2 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition disabled:opacity-60 text-xs font-medium text-amber-700 dark:text-amber-400"
            >
              {reporting && <Spinner size="w-3 h-3" />}
              {!reporting && reported && (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  All subscribers alerted!
                </>
              )}
              {!reporting && !reported && (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  I found a slot — alert everyone!
                </>
              )}
            </button>
          )}

          {/* Subscription status */}
          {subscribed ? (
            <div className="flex items-start gap-2 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl px-3.5 py-2.5">
              <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Alerts active — you&apos;ll get an email the moment slots appear, plus a reminder every 4 hours.
                {reminderAgo && <span className="text-indigo-400 dark:text-indigo-500"> Last sent {reminderAgo}.</span>}
              </span>
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Subscribe for instant email alerts when slots appear — plus a community alert if any subscriber spots one first.
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
