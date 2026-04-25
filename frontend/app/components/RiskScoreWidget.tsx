'use client'
import { useState } from 'react'
import { computeRiskScore, getRiskScore, updateConsent, type RiskScore } from '@/lib/api'
import AiConsentModal from '@/app/components/AiConsentModal'

const LEVEL_STYLES = {
  low: { bar: 'bg-emerald-500', badge: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300', label: 'Low risk' },
  med: { bar: 'bg-amber-500',   badge: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',         label: 'Medium risk' },
  high: { bar: 'bg-red-500',    badge: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300',                 label: 'High risk' },
}

const DIM_LABELS: Record<string, string> = {
  critical_completion: 'Critical tasks',
  timeline_feasibility: 'Timeline',
  document_readiness: 'Documents',
  profile_completeness: 'Profile',
}

interface Props {
  userId: string
  isPaid: boolean
  hasConsent: boolean
  initialScore?: RiskScore | null
  onConsentGranted: () => void
}

export default function RiskScoreWidget({ userId, isPaid, hasConsent, initialScore, onConsentGranted }: Props) {
  const [score, setScore] = useState<RiskScore | null>(initialScore ?? null)
  const [loading, setLoading] = useState(false)
  const [showConsent, setShowConsent] = useState(false)

  const handleCompute = () => {
    if (!hasConsent) { setShowConsent(true); return }
    runCompute()
  }

  const runCompute = async () => {
    setLoading(true)
    try {
      const result = await computeRiskScore(userId)
      setScore(result)
    } catch (err: any) {
      alert(err.message || 'Failed to compute risk score')
    } finally {
      setLoading(false)
    }
  }

  const handleConsent = () => {
    setShowConsent(false)
    onConsentGranted()
    runCompute()
  }

  if (!isPaid) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Relocation Risk Score</h2>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">Paid</span>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">Upgrade to see your personalised risk score across 4 dimensions. <span className="font-medium text-indigo-500 dark:text-indigo-400">Coming soon.</span></p>
      </div>
    )
  }

  const s = score ? LEVEL_STYLES[score.risk_level] : null

  return (
    <>
      {showConsent && (
        <AiConsentModal userId={userId} onConsent={handleConsent} onDecline={() => setShowConsent(false)} />
      )}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Relocation Risk Score</h2>
          <button
            onClick={handleCompute}
            disabled={loading}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading && (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {score ? 'Refresh' : 'Compute score'}
          </button>
        </div>

        {!score && !loading && (
          <p className="text-xs text-gray-400 dark:text-gray-500">Click "Compute score" to analyse your relocation readiness across 4 dimensions.</p>
        )}

        {score && s && (
          <div className="space-y-4">
            {/* Overall score */}
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold text-gray-900 dark:text-white leading-none">{score.score}</span>
              <div className="mb-0.5">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.badge}`}>{s.label}</span>
              </div>
            </div>

            {/* Score bar */}
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all duration-700 ${s.bar}`} style={{ width: `${score.score}%` }} />
            </div>

            {/* Dimension breakdown */}
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(score.dimension_scores).map(([key, val]) => (
                <div key={key} className="bg-gray-50 dark:bg-gray-700 rounded-xl px-3 py-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{DIM_LABELS[key] ?? key}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${val >= 70 ? 'bg-emerald-500' : val >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${val}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 w-6 text-right">{val}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Top risk items */}
            {score.risk_items.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Top risks to address</p>
                {score.risk_items.map(item => (
                  <div key={item.rank} className="flex gap-3 bg-gray-50 dark:bg-gray-700 rounded-xl px-3 py-2.5">
                    <span className="text-xs font-bold text-gray-300 dark:text-gray-500 mt-0.5 flex-shrink-0">#{item.rank}</span>
                    <div>
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">{item.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.detail}</p>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5 font-medium">{item.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-300 dark:text-gray-600 text-right">
              Last computed {new Date(score.computed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </p>
          </div>
        )}
      </div>
    </>
  )
}
