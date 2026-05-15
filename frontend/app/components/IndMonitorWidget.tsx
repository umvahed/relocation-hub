'use client'
import { useState, useEffect } from 'react'
import {
  subscribeIndMonitor,
  unsubscribeIndMonitor,
  getIndMonitorStatus,
  reportNoSlots,
  saveIndAppointment,
  getIndAppointment,
  deleteIndAppointment,
  type IndAppointment,
} from '@/lib/api'

const IND_BOOKING_URL = 'https://oap.ind.nl/oap/en/#/doc'

const DESKS = [
  { code: 'AM', name: 'Amsterdam' },
  { code: 'DH', name: 'Den Haag' },
  { code: 'ZW', name: 'Zwolle' },
  { code: 'DB', name: "'s-Hertogenbosch" },
]

const CITY_TO_DESK: Record<string, string> = {
  amsterdam: 'AM', haarlem: 'AM', alkmaar: 'AM', almere: 'AM',
  zaandam: 'AM', amstelveen: 'AM', hilversum: 'AM', lelystad: 'AM', utrecht: 'AM',
  'den haag': 'DH', 'the hague': 'DH', "'s-gravenhage": 'DH',
  rotterdam: 'DH', delft: 'DH', leiden: 'DH', zoetermeer: 'DH',
  dordrecht: 'DH', gouda: 'DH', schiedam: 'DH',
  zwolle: 'ZW', groningen: 'ZW', enschede: 'ZW', arnhem: 'ZW',
  apeldoorn: 'ZW', deventer: 'ZW', leeuwarden: 'ZW', nijmegen: 'ZW', assen: 'ZW',
  "'s-hertogenbosch": 'DB', 'den bosch': 'DB', eindhoven: 'DB',
  tilburg: 'DB', breda: 'DB', maastricht: 'DB', venlo: 'DB', hertogenbosch: 'DB',
}

function cityToDesk(city: string): { code: string; name: string } {
  const code = CITY_TO_DESK[city.toLowerCase().trim()] ?? 'DH'
  return DESKS.find(d => d.code === code) ?? DESKS[1]
}

const DESK_ADDRESSES: Record<string, string> = {
  AM: 'Entrance F, De Entree 71, 1101 BH Amsterdam',
  DH: 'Rijnstraat 8, 2515 XP Den Haag',
  ZW: 'Dokterspad 1, 8011 PP Zwolle',
  DB: "Pettelaarpark 1, 5216 PP 's-Hertogenbosch",
}

interface Props {
  readonly userId: string
  readonly userEmail: string
  readonly isPaid: boolean
  readonly destinationCity?: string
  readonly moveDate?: string
}

const Spinner = ({ size }: { readonly size: string }) => (
  <svg className={`${size} animate-spin`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)

function isExceptionPeriod(): boolean {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  return (month === 11 && day >= 24) || month === 12 || (month === 1 && day <= 7)
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function getAppointmentContext(moveDate: string): string {
  const move = new Date(moveDate)
  const windowStart = new Date(move)
  windowStart.setDate(windowStart.getDate() + 7)
  const windowEnd = new Date(move)
  windowEnd.setDate(windowEnd.getDate() + 60)
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  const moveStr = move.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return `For your ${moveStr} arrival, aim to book in ${fmt(windowStart)} – ${fmt(windowEnd)}`
}

function AppointmentView({
  appointment, onDelete, toggling,
}: { appointment: IndAppointment; onDelete: () => void; toggling: boolean }) {
  const days = daysUntil(appointment.appointment_date)
  const address = DESK_ADDRESSES[appointment.desk_code] ?? ''
  const isPast = days < 0

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            {isPast ? 'Biometrics appointment completed' : 'Biometrics appointment booked'}
          </p>
        </div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{appointment.desk_name}</p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
          {formatDate(appointment.appointment_date)}
          {!isPast && (
            <span className="ml-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              · in {days} day{days !== 1 ? 's' : ''}
            </span>
          )}
          {isPast && <span className="ml-1.5 text-gray-400"> · done</span>}
        </p>
        {address && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">📍 {address}</p>}
      </div>

      {!isPast && (
        <div className="rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 px-3.5 py-3">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">What to bring</p>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 pl-1">
            <li>· Valid passport or travel document</li>
            <li>· V-number (on your IND permit letter)</li>
            <li>· Appointment confirmation email from IND</li>
            <li>· Arrive 10 minutes early</li>
          </ul>
        </div>
      )}

      <button
        onClick={onDelete}
        disabled={toggling}
        className="w-full text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition disabled:opacity-50 py-1"
      >
        {toggling ? <span className="flex justify-center"><Spinner size="w-3 h-3" /></span> : 'Remove appointment'}
      </button>
    </div>
  )
}

interface BookingFormProps {
  bookingDesk: string
  setBookingDesk: (v: string) => void
  bookingDate: string
  setBookingDate: (v: string) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}

function BookingForm({ bookingDesk, setBookingDesk, bookingDate, setBookingDate, onSave, onCancel, saving }: BookingFormProps) {
  return (
    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3.5 py-3 space-y-2.5">
      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Save your appointment details</p>
      <div className="flex gap-2">
        <select
          value={bookingDesk}
          onChange={e => setBookingDesk(e.target.value)}
          className="flex-1 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1.5"
        >
          {DESKS.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
        </select>
        <input
          type="date"
          value={bookingDate}
          onChange={e => setBookingDate(e.target.value)}
          className="flex-1 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1.5"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={saving || !bookingDate}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition disabled:opacity-50"
        >
          {saving ? <Spinner size="w-3 h-3" /> : 'Save appointment'}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function IndMonitorWidget({ userId, userEmail, isPaid, destinationCity, moveDate }: Props) {
  const [subscribed, setSubscribed] = useState<boolean | null>(null)
  const [slotsAvailable, setSlotsAvailable] = useState(true)
  const [appointment, setAppointment] = useState<IndAppointment | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState('')
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [bookingDesk, setBookingDesk] = useState('AM')
  const [bookingDate, setBookingDate] = useState('')
  const [savingBooking, setSavingBooking] = useState(false)

  const inExceptionPeriod = isExceptionPeriod()

  useEffect(() => {
    Promise.all([
      getIndMonitorStatus(userId),
      getIndAppointment(userId),
    ]).then(([status, appt]) => {
      setSubscribed(status.subscribed)
      setSlotsAvailable(status.subscription?.user_slots_available ?? true)
      setAppointment(appt)
    }).catch(() => setError('Could not load status')).finally(() => setLoading(false))
  }, [userId])

  const handleSubscribe = async () => {
    setToggling(true)
    setError('')
    try {
      await subscribeIndMonitor(userId, userEmail)
      setSubscribed(true)
      setSlotsAvailable(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to subscribe')
    } finally {
      setToggling(false)
    }
  }

  const handleUnsubscribe = async () => {
    setToggling(true)
    setError('')
    try {
      await unsubscribeIndMonitor(userId)
      setSubscribed(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to unsubscribe')
    } finally {
      setToggling(false)
    }
  }

  const handleReportNoSlots = async () => {
    setToggling(true)
    setError('')
    try {
      await reportNoSlots(userId)
      setSlotsAvailable(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to report')
    } finally {
      setToggling(false)
    }
  }

  const handleSaveBooking = async () => {
    if (!bookingDate) { setError('Please select a date'); return }
    setSavingBooking(true)
    setError('')
    try {
      const desk = DESKS.find(d => d.code === bookingDesk)!
      await saveIndAppointment({ user_id: userId, desk_code: bookingDesk, desk_name: desk.name, appointment_date: bookingDate })
      const appt = await getIndAppointment(userId)
      setAppointment(appt)
      setSubscribed(false)
      setShowBookingForm(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save appointment')
    } finally {
      setSavingBooking(false)
    }
  }

  const handleDeleteAppointment = async () => {
    setToggling(true)
    setError('')
    try {
      await deleteIndAppointment(userId)
      setAppointment(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to remove appointment')
    } finally {
      setToggling(false)
    }
  }

  // Determine slot status for display (default optimistic when not subscribed)
  const showSlotsAvailable = inExceptionPeriod ? false : slotsAvailable

  if (!isPaid) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">🇳🇱</span>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">IND Appointment Monitor</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">Biometrics (TKV) · residence permit</p>
          </div>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl px-4 py-3 text-center">
          <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-1">Premium feature</p>
          <p className="text-xs text-indigo-500 dark:text-indigo-400">Get slot alerts, track your appointment, and receive 7-day + 1-day reminders. Upgrade to unlock.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">🇳🇱</span>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">IND Appointment Monitor</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500">Biometrics (TKV) · residence permit</p>
        </div>
      </div>

      {loading || appointment === undefined ? (
        <div className="h-10 flex items-center justify-center">
          <Spinner size="w-4 h-4 text-gray-300 dark:text-gray-600" />
        </div>
      ) : appointment ? (
        /* ── State: appointment saved ── */
        <AppointmentView appointment={appointment} onDelete={handleDeleteAppointment} toggling={toggling} />
      ) : (
        <div className="space-y-3">

          {/* ── Move date context — above status ── */}
          {moveDate && (
            <div className="flex items-start gap-2 rounded-xl px-3.5 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
              <svg className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700 dark:text-blue-300">{getAppointmentContext(moveDate)}</p>
            </div>
          )}

          {/* ── Availability status ── */}
          {inExceptionPeriod ? (
            <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <span className="text-base flex-shrink-0">🎄</span>
              <div>
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Holiday period — reduced IND availability</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  IND has limited availability late November through early January. Monday reminders resume in the new year.
                </p>
              </div>
            </div>
          ) : showSlotsAvailable ? (
            <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-1.5 animate-pulse" />
              <div>
                <p className="text-xs font-semibold text-green-800 dark:text-green-300">Slots available within 2 weeks</p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                  {destinationCity
                    ? <>Nearest desk: <strong>{cityToDesk(destinationCity).name}</strong>. Slots fill within minutes.</>
                    : <>Check all four desks — Amsterdam, Den Haag, Zwolle, &apos;s-Hertogenbosch. Slots fill within minutes.</>
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">
              <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0 mt-1.5" />
              <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">You checked — no slots right now</p>
              </div>
            </div>
          )}

          {/* ── Primary CTA: always visible ── */}
          <a
            href={IND_BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl border transition group ${
              showSlotsAvailable && !inExceptionPeriod
                ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
                : 'border-indigo-100 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
            }`}
          >
            <span className={`text-sm font-medium ${showSlotsAvailable && !inExceptionPeriod ? 'text-green-700 dark:text-green-300' : 'text-indigo-700 dark:text-indigo-300'}`}>
              {showSlotsAvailable && !inExceptionPeriod ? 'Check available slots now' : 'Check slots on IND website'}
            </span>
            <svg
              className={`w-4 h-4 group-hover:translate-x-0.5 transition-transform ${showSlotsAvailable && !inExceptionPeriod ? 'text-green-400' : 'text-indigo-400'}`}
              fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>

          {/* ── Booking form (when expanded) ── */}
          {showBookingForm && (
            <BookingForm
              bookingDesk={bookingDesk} setBookingDesk={setBookingDesk}
              bookingDate={bookingDate} setBookingDate={setBookingDate}
              onSave={handleSaveBooking} onCancel={() => setShowBookingForm(false)}
              saving={savingBooking}
            />
          )}

          {/* ── Secondary actions — depends on subscription state ── */}
          {!subscribed ? (
            <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500 pt-1">
                Subscribe for a Monday email each week to remind you to check back.
              </p>
              <button
                onClick={handleSubscribe}
                disabled={toggling}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-50 bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {toggling ? <Spinner size="w-3 h-3" /> : 'Remind me'}
              </button>
              {!showBookingForm && (
                <button
                  onClick={() => setShowBookingForm(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition text-xs font-semibold text-emerald-700 dark:text-emerald-400"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  I&apos;ve booked my appointment
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-gray-700">
              {!showBookingForm && (
                <button
                  onClick={() => setShowBookingForm(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition text-xs font-semibold text-emerald-700 dark:text-emerald-400"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  I&apos;ve booked my appointment
                </button>
              )}
              {showSlotsAvailable && !inExceptionPeriod && (
                <button
                  onClick={handleReportNoSlots}
                  disabled={toggling}
                  className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50 text-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {toggling
                    ? <Spinner size="w-3 h-3" />
                    : 'I checked — no slots available'
                  }
                </button>
              )}
              <button onClick={handleUnsubscribe} disabled={toggling} className="w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition py-0.5 disabled:opacity-50">
                Unsubscribe from reminders
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">{error}</p>
      )}
    </div>
  )
}
