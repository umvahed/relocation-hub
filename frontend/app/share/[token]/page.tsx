export const dynamic = 'force-dynamic'
import { getShareData } from '@/lib/api'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import PrintButton from './PrintButton'

const SECTION_ORDER = ['critical', 'visa', 'employment', 'transport', 'shipping', 'admin', 'housing', 'banking', 'healthcare', 'pets']

const SECTION_LABELS: Record<string, string> = {
  critical:   'Critical',
  visa:       'Visa & Immigration',
  employment: 'Employment',
  transport:  'Transport',
  shipping:   'Shipping & Logistics',
  admin:      'Dutch Administration',
  housing:    'Housing',
  banking:    'Banking & Finance',
  healthcare: 'Healthcare',
  pets:       'Pet Relocation',
}

const PRE_DEPARTURE = new Set(['critical', 'visa', 'employment', 'transport', 'shipping'])
const POST_ARRIVAL  = new Set(['admin', 'housing', 'banking', 'healthcare', 'pets'])

const RISK_STYLES: Record<string, { badge: string; bar: string; label: string }> = {
  low:  { badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500', label: 'Low risk' },
  med:  { badge: 'bg-amber-100 text-amber-700',     bar: 'bg-amber-500',   label: 'Medium risk' },
  high: { badge: 'bg-red-100 text-red-700',          bar: 'bg-red-500',     label: 'High risk' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function ProgressBar({ value, max, color = 'bg-indigo-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 tabular-nums w-12 text-right">{value}/{max}</span>
    </div>
  )
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  let data: any
  try {
    data = await getShareData(token)
  } catch {
    notFound()
  }

  const { full_name, origin_country, destination_city, move_date, tasks, risk, docs_count } = data
  const pct = tasks.total > 0 ? Math.round((tasks.completed / tasks.total) * 100) : 0
  const riskStyle = risk ? RISK_STYLES[risk.risk_level] : null
  const generatedDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  const preCats  = SECTION_ORDER.filter(c => PRE_DEPARTURE.has(c) && tasks.by_category[c])
  const postCats = SECTION_ORDER.filter(c => POST_ARRIVAL.has(c)  && tasks.by_category[c])

  return (
    <main className="min-h-screen bg-gray-50 print:bg-white">

      {/* Nav — hidden on print */}
      <nav className="print:hidden border-b border-gray-100 bg-white px-5 py-4 flex justify-between items-center">
        <Link href="/" className="text-base font-semibold tracking-tight text-gray-900">
          Relocation<span className="text-indigo-600">Hub</span>
        </Link>
        <div className="flex items-center gap-3">
          <PrintButton />
          <Link href="/login" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition">
            Start your own plan →
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-5 py-8 print:py-4 print:px-0">

        {/* Header */}
        <div className="mb-6 print:mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-1">Relocation Progress</p>
          <h1 className="text-2xl font-bold text-gray-900 print:text-xl">{full_name}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
            {origin_country && <span>{origin_country} → Netherlands{destination_city ? ` (${destination_city})` : ''}</span>}
            {move_date && <span className="before:content-['·'] before:mr-3">Move date: {formatDate(move_date)}</span>}
            <span className="before:content-['·'] before:mr-3 print:hidden">Generated {generatedDate}</span>
          </div>
        </div>

        {/* Overall progress */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 print:border-gray-300 print:rounded-none print:mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-900">Overall Progress</h2>
            <span className={`text-sm font-bold ${pct === 100 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{pct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden mb-1">
            <div
              className={`h-3 rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-indigo-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">{tasks.completed} of {tasks.total} tasks completed</p>
        </div>

        {/* Category grid */}
        <div className="grid sm:grid-cols-2 gap-4 mb-5 print:mb-4">

          {/* Before you leave */}
          {preCats.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 print:border-gray-300 print:rounded-none">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-3">Before you leave</p>
              <div className="space-y-3">
                {preCats.map(cat => {
                  const c = tasks.by_category[cat]
                  const done = c.completed === c.total
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                          {done && <span className="text-emerald-500">✓</span>}
                          {SECTION_LABELS[cat] ?? cat}
                        </span>
                        <span className="text-xs text-gray-400">{c.completed}/{c.total}</span>
                      </div>
                      <ProgressBar value={c.completed} max={c.total} color={done ? 'bg-emerald-500' : 'bg-indigo-500'} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* After you arrive */}
          {postCats.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 print:border-gray-300 print:rounded-none">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-3">After you arrive</p>
              <div className="space-y-3">
                {postCats.map(cat => {
                  const c = tasks.by_category[cat]
                  const done = c.completed === c.total
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                          {done && <span className="text-emerald-500">✓</span>}
                          {SECTION_LABELS[cat] ?? cat}
                        </span>
                        <span className="text-xs text-gray-400">{c.completed}/{c.total}</span>
                      </div>
                      <ProgressBar value={c.completed} max={c.total} color={done ? 'bg-emerald-500' : 'bg-emerald-500'} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Risk score + docs */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8 print:mb-4">
          {risk && riskStyle && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 print:border-gray-300 print:rounded-none">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Relocation Risk Score</p>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-bold text-gray-900">{risk.score}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mb-0.5 ${riskStyle.badge}`}>{riskStyle.label}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className={`h-2 rounded-full ${riskStyle.bar}`} style={{ width: `${risk.score}%` }} />
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 p-5 print:border-gray-300 print:rounded-none flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{docs_count}</p>
              <p className="text-xs text-gray-500">document{docs_count !== 1 ? 's' : ''} uploaded</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 pt-5 print:pt-3 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            Shared via <span className="font-bold tracking-widest text-gray-700">VALRYN</span>
          </span>
          <Link href="/" className="print:hidden text-xs text-indigo-600 hover:text-indigo-700 transition font-medium">
            valryn.com →
          </Link>
          <span className="hidden print:block text-xs text-gray-400">valryn.com</span>
        </div>

      </div>
    </main>
  )
}
