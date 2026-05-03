'use client'
import { useState } from 'react'
import Link from 'next/link'

const THRESHOLD_STANDARD = 46660   // 2025 gross annual salary threshold
const THRESHOLD_YOUNG    = 35468   // under 30 + master's degree
const INCOME_TAX_RATE    = 0.495   // top bracket (applicable on 30% allowance for most expats)

type Step = 'employment' | 'distance' | 'timing' | 'salary' | 'result' | 'ineligible'

interface IneligibleReason {
  title: string
  explanation: string
  tip?: string
}

const STEPS = ['Employment', 'Distance', 'Timing', 'Salary', 'Result']
const STEP_INDEX: Record<Step, number> = {
  employment: 0, distance: 1, timing: 2, salary: 3, result: 4, ineligible: -1,
}

function ProgressBar({ step }: { step: Step }) {
  const idx = STEP_INDEX[step]
  if (idx < 0) return null
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
              i < idx ? 'bg-indigo-600 text-white' :
              i === idx ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900' :
              'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
            }`}>
              {i < idx ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${i === idx ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mb-5 transition-colors ${i < idx ? 'bg-indigo-600' : 'bg-gray-100 dark:bg-gray-700'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function IneligibleCard({ reason, onRestart }: { reason: IneligibleReason; onRestart: () => void }) {
  return (
    <div className="space-y-5">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">❌</span>
          <div>
            <h3 className="font-semibold text-red-800 dark:text-red-300 mb-1">{reason.title}</h3>
            <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed">{reason.explanation}</p>
            {reason.tip && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2 font-medium">{reason.tip}</p>
            )}
          </div>
        </div>
      </div>
      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-5">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          The 30% ruling may not apply, but there are other tax considerations worth discussing with a Dutch tax advisor (belastingadviseur).
        </p>
        <a href="https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/internationaal/werken_in_een_ander_land/u-gaat-in-nederland-werken/30-procent-regeling/30-procent-regeling" target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          Read the official Belastingdienst guidance →
        </a>
      </div>
      <button onClick={onRestart} className="w-full py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
        Start over
      </button>
    </div>
  )
}

export default function RulingCalculator() {
  const [step, setStep] = useState<Step>('employment')
  const [ineligibleReason, setIneligibleReason] = useState<IneligibleReason | null>(null)
  const [timingWarning, setTimingWarning] = useState(false)

  // Form values
  const [hasNLEmployer, setHasNLEmployer] = useState<boolean | null>(null)
  const [livedOutside, setLivedOutside] = useState<boolean | null>(null)
  const [beyond150km, setBeyond150km] = useState<boolean | null>(null)
  const [startDate, setStartDate] = useState('')
  const [salary, setSalary] = useState('')
  const [hasMasters, setHasMasters] = useState<boolean | null>(null)
  const [ageUnder30, setAgeUnder30] = useState<boolean | null>(null)

  const fail = (reason: IneligibleReason) => {
    setIneligibleReason(reason)
    setStep('ineligible')
  }

  const restart = () => {
    setStep('employment')
    setIneligibleReason(null)
    setTimingWarning(false)
    setHasNLEmployer(null)
    setLivedOutside(null)
    setBeyond150km(null)
    setStartDate('')
    setSalary('')
    setHasMasters(null)
    setAgeUnder30(null)
  }

  // Derived result values
  const grossSalary = parseFloat(salary.replace(/,/g, '')) || 0
  const isYoungSpecialist = ageUnder30 === true && hasMasters === true
  const threshold = isYoungSpecialist ? THRESHOLD_YOUNG : THRESHOLD_STANDARD
  const taxFreeAllowance = grossSalary * 0.30
  const estimatedAnnualSaving = taxFreeAllowance * INCOME_TAX_RATE
  const meetsThreshold = grossSalary >= threshold

  // Timing logic
  const getTimingStatus = () => {
    if (!startDate) return 'unknown'
    const start = new Date(startDate)
    const now = new Date()
    const diffDays = Math.round((now.getTime() - start.getTime()) / 86400000)
    if (diffDays < 0) return 'future'        // hasn't started yet
    if (diffDays <= 120) return 'in_window'  // within 4 months
    return 'expired'                          // too late
  }

  const timingStatus = getTimingStatus()

  const ynBtn = (active: boolean | null, val: boolean, set: (v: boolean) => void) =>
    `flex-1 py-3 rounded-xl text-sm font-medium border transition ${
      active === val
        ? 'bg-indigo-600 text-white border-indigo-600'
        : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
    }`

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Nav */}
      <nav className="border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-5 py-4 flex justify-between items-center">
          <Link href="/" className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
            Relocation<span className="text-indigo-600">Hub</span>
          </Link>
          <Link href="/login" className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
            Get started free
          </Link>
        </div>
      </nav>

      <main className="max-w-xl mx-auto px-5 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium px-3 py-1 rounded-full mb-4">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            Free tool — no sign-up required
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            30% Ruling Calculator
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-base leading-relaxed">
            Check your eligibility for the Dutch 30% tax ruling and see how much you could save — in under 2 minutes.
          </p>
        </div>

        <ProgressBar step={step} />

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">

          {/* ── Step 1: Employment ── */}
          {step === 'employment' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Employment check</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">The 30% ruling only applies when working for a Dutch employer (or a foreign employer with a Dutch payroll or permanent establishment).</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Are you employed by a Dutch employer?</label>
                <div className="flex gap-3">
                  <button onClick={() => setHasNLEmployer(true)} className={ynBtn(hasNLEmployer, true, setHasNLEmployer)}>Yes</button>
                  <button onClick={() => setHasNLEmployer(false)} className={ynBtn(hasNLEmployer, false, setHasNLEmployer)}>No</button>
                </div>
              </div>
              <button
                disabled={hasNLEmployer === null}
                onClick={() => {
                  if (!hasNLEmployer) {
                    fail({
                      title: 'No Dutch employer — not eligible',
                      explanation: 'The 30% ruling requires employment with a Dutch employer, or a foreign employer with a registered payroll (loonheffing) or permanent establishment in the Netherlands.',
                      tip: 'If your employer plans to set up Dutch payroll, you may become eligible — check with your HR or a tax advisor.',
                    })
                  } else {
                    setStep('distance')
                  }
                }}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}

          {/* ── Step 2: Distance ── */}
          {step === 'distance' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Distance & residency check</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">You must have lived outside the Netherlands — and more than 150km from the Dutch border — for at least 16 of the 24 months before your first Dutch working day.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Did you live outside the Netherlands for at least 16 of the last 24 months?</label>
                <div className="flex gap-3">
                  <button onClick={() => setLivedOutside(true)} className={ynBtn(livedOutside, true, setLivedOutside)}>Yes</button>
                  <button onClick={() => setLivedOutside(false)} className={ynBtn(livedOutside, false, setLivedOutside)}>No</button>
                </div>
              </div>
              {livedOutside === true && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Was your home address more than 150km from the Dutch border?</label>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">South Africa, UK, US, India — yes. Belgium, Germany, France — check carefully as border towns may fail this test.</p>
                  <div className="flex gap-3">
                    <button onClick={() => setBeyond150km(true)} className={ynBtn(beyond150km, true, setBeyond150km)}>Yes (&gt;150km)</button>
                    <button onClick={() => setBeyond150km(false)} className={ynBtn(beyond150km, false, setBeyond150km)}>No / Unsure</button>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep('employment')} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  ← Back
                </button>
                <button
                  disabled={livedOutside === null || (livedOutside === true && beyond150km === null)}
                  onClick={() => {
                    if (!livedOutside) {
                      fail({
                        title: 'Residency requirement not met',
                        explanation: 'You must have lived outside the Netherlands for at least 16 of the 24 months before starting work in the Netherlands.',
                        tip: 'If you briefly worked or studied in the Netherlands, those months may still count depending on circumstances — consult a tax advisor.',
                      })
                    } else if (!beyond150km) {
                      fail({
                        title: '150km distance requirement not met',
                        explanation: 'Your home address must have been more than 150km from the Dutch border. Living in neighbouring countries like Belgium, Germany, or northern France typically fails this test.',
                        tip: 'Use Google Maps to measure the exact distance from your previous address to the nearest Dutch border crossing.',
                      })
                    } else {
                      setStep('timing')
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Timing ── */}
          {step === 'timing' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Application timing</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Your employer must file the 30% ruling application with the Belastingdienst within <strong>4 months</strong> of your first working day in the Netherlands. If applied within this window, the ruling applies retroactively from day one.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">When did (or will) you start working in the Netherlands?</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => { setStartDate(e.target.value); setTimingWarning(false) }}
                  className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {startDate && timingStatus === 'expired' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300">4-month window has expired</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">You started more than 4 months ago. The ruling cannot apply retroactively — unless your employer already filed on time. Check with your HR department.</p>
                </div>
              )}
              {startDate && timingStatus === 'in_window' && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">⏱ Act now — window is open</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">You're within the 4-month application window. Ask your employer or HR to file the request with Belastingdienst as soon as possible.</p>
                </div>
              )}
              {startDate && timingStatus === 'future' && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">✅ You haven't started yet</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Make sure your employer files the application within 4 months of your first working day.</p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep('distance')} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  ← Back
                </button>
                <button
                  disabled={!startDate}
                  onClick={() => {
                    if (timingStatus === 'expired') {
                      fail({
                        title: 'Application window has closed',
                        explanation: 'The 30% ruling must be applied for within 4 months of your first Dutch working day. This window has passed for your start date.',
                        tip: "Contact your employer's HR or payroll team to confirm whether they filed on time. If they did, the ruling may still be active.",
                      })
                    } else {
                      setStep('salary')
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Salary ── */}
          {step === 'salary' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Salary threshold</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Your taxable wage (after the 30% deduction) must exceed the threshold set by Belastingdienst. Thresholds are indexed annually.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Do you have a master's degree?</label>
                  <div className="flex gap-2">
                    <button onClick={() => setHasMasters(true)} className={ynBtn(hasMasters, true, setHasMasters)}>Yes</button>
                    <button onClick={() => setHasMasters(false)} className={ynBtn(hasMasters, false, setHasMasters)}>No</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Are you under 30?</label>
                  <div className="flex gap-2">
                    <button onClick={() => setAgeUnder30(true)} className={ynBtn(ageUnder30, true, setAgeUnder30)}>Yes</button>
                    <button onClick={() => setAgeUnder30(false)} className={ynBtn(ageUnder30, false, setAgeUnder30)}>No</button>
                  </div>
                </div>
              </div>

              {hasMasters !== null && ageUnder30 !== null && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Applicable threshold: <strong className="text-gray-900 dark:text-white">€{threshold.toLocaleString('nl-NL')}/year gross</strong>
                    {isYoungSpecialist ? ' (young specialist — under 30 + master\'s)' : ' (standard)'}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Annual gross salary (EUR)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                  <input
                    type="number"
                    value={salary}
                    onChange={e => setSalary(e.target.value)}
                    placeholder="e.g. 65000"
                    className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl pl-7 pr-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                {salary && hasMasters !== null && ageUnder30 !== null && (
                  <p className={`text-xs mt-1.5 ${meetsThreshold ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {meetsThreshold
                      ? `✓ Above threshold (€${threshold.toLocaleString('nl-NL')})`
                      : `✗ Below threshold — need at least €${threshold.toLocaleString('nl-NL')}/year`}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('timing')} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  ← Back
                </button>
                <button
                  disabled={!salary || hasMasters === null || ageUnder30 === null}
                  onClick={() => {
                    if (!meetsThreshold) {
                      fail({
                        title: `Salary below the ${isYoungSpecialist ? 'young specialist' : 'standard'} threshold`,
                        explanation: `Your gross salary of €${Number(salary).toLocaleString('nl-NL')} is below the required €${threshold.toLocaleString('nl-NL')}/year threshold for ${new Date().getFullYear()}.`,
                        tip: 'Salary thresholds are indexed annually. If you expect a raise that would take you above the threshold, consult a tax advisor — a late application may still be possible.',
                      })
                    } else {
                      setStep('result')
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-40"
                >
                  Calculate →
                </button>
              </div>
            </div>
          )}

          {/* ── Result ── */}
          {step === 'result' && (
            <div className="space-y-5">
              <div className="text-center pb-2">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">You appear to be eligible</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Based on your answers, you likely qualify for the Dutch 30% ruling.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4">
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wide mb-1">Tax-free allowance</p>
                  <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">€{Math.round(taxFreeAllowance).toLocaleString('nl-NL')}</p>
                  <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">per year (30% of salary)</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wide mb-1">Est. annual saving</p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">€{Math.round(estimatedAnnualSaving).toLocaleString('nl-NL')}</p>
                  <p className="text-xs text-emerald-500 dark:text-emerald-400 mt-0.5">at 49.5% tax rate</p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Key facts for your situation</p>
                <ul className="space-y-1.5">
                  {[
                    `Ruling duration: up to 5 years from your start date`,
                    `From 2027 the ruling reduces to 27% — lock in 30% now`,
                    `Capped at the Balkenende norm (~€246,000 gross/year)`,
                    timingStatus === 'in_window'
                      ? '⚠️ You\'re in the 4-month window — ask your employer to file today'
                      : timingStatus === 'future'
                      ? '✓ Ensure employer files within 4 months of your start date'
                      : '✓ If employer filed on time, ruling is already active',
                  ].map(fact => (
                    <li key={fact} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
                      <span className="text-gray-300 dark:text-gray-500 mt-0.5">•</span>
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <strong>Disclaimer:</strong> This is an indicative check only, not tax advice. Confirm eligibility with a Dutch tax advisor or your employer's payroll team before relying on this result.
                </p>
              </div>

              <div className="pt-1 space-y-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-white text-center">Track your 30% ruling application</p>
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
                >
                  Start your free relocation plan →
                </Link>
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center">RelocationHub tracks your entire move — visa, BSN, DigiD, housing and more.</p>
              </div>

              <button onClick={restart} className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                Start over
              </button>
            </div>
          )}

          {/* ── Ineligible ── */}
          {step === 'ineligible' && ineligibleReason && (
            <IneligibleCard reason={ineligibleReason} onRestart={restart} />
          )}
        </div>

        {/* SEO footer text */}
        <div className="mt-10 text-center space-y-2">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Thresholds shown are for {new Date().getFullYear()}. The Dutch 30% ruling (
            <em>30%-regeling</em>) is administered by the Belastingdienst.{' '}
            <a href="https://www.belastingdienst.nl" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600 dark:hover:text-gray-300">
              belastingdienst.nl
            </a>
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Planning your move?{' '}
            <Link href="/" className="underline hover:text-gray-600 dark:hover:text-gray-300">
              RelocationHub
            </Link>{' '}
            helps expats organise every step of their Dutch relocation.
          </p>
        </div>
      </main>
    </div>
  )
}
