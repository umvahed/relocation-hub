import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">

      {/* Nav */}
      <nav className="border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto px-5 py-4 flex justify-between items-center">
          <div className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
            Relocation<span className="text-indigo-600">Hub</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/tools/30-ruling" className="hidden sm:block text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-600 transition">
              30% Ruling Calculator
            </Link>
            <a href="#how-it-works" className="hidden sm:block text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">
              The process
            </a>
            <Link href="/login" className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-b from-indigo-50/60 dark:from-indigo-950/30 to-white dark:to-gray-900 max-w-5xl mx-auto px-5 pt-16 pb-16 text-center rounded-3xl mt-4">
        <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm font-medium px-3 py-1 rounded-full mb-4">
          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
          For people moving to the Netherlands
        </div>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-white leading-tight tracking-tight mb-4">
          Your Dutch relocation,
          <br className="hidden sm:block" />
          <span className="text-indigo-600">planned and tracked.</span>
        </h1>
        <p className="text-sm sm:text-lg text-gray-500 dark:text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed">
          A personalised checklist, document organiser, IND appointment alerts, and a 30% ruling calculator — everything you need, in one place.
        </p>

        {/* Three CTAs */}
        <div className="flex flex-col sm:flex-row items-stretch justify-center gap-3 max-w-xl mx-auto">
          <div className="flex-1 flex flex-col gap-1">
            <Link href="/login" className="w-full bg-indigo-600 text-white px-6 py-3.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-sm text-center">
              Start your relocation plan →
            </Link>
            <p className="text-xs text-center text-gray-400 dark:text-gray-500">Paid · one-time €19.99</p>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <Link href="/tools/30-ruling" className="w-full bg-emerald-600 text-white px-6 py-3.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition shadow-sm text-center">
              Check 30% ruling eligibility →
            </Link>
            <p className="text-xs text-center text-gray-400 dark:text-gray-500">Free · no sign-up needed</p>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <a href="#how-it-works" className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 px-6 py-3.5 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition text-center">
              How the process works ↓
            </a>
            <p className="text-xs text-center text-gray-400 dark:text-gray-500">Free guide · no sign-up</p>
          </div>
        </div>
      </section>

      {/* The relocation process — free educational section */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-5 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">What relocating to the Netherlands actually involves</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-sm leading-relaxed">
            This is all publicly available information — we just built the tools to track every step of it for you.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              phase: 'Phase 1',
              label: 'Before you leave',
              color: 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-100 dark:border-indigo-900',
              headingColor: 'text-indigo-700 dark:text-indigo-400',
              steps: [
                'Get a job offer with an IND-registered sponsor employer',
                'Apply for MVV entry visa (non-EU/EEA nationals)',
                'Collect MVV from Dutch consulate in your country',
                'Arrange moving & shipping logistics',
                'Check 30% ruling eligibility with your employer',
              ],
            },
            {
              phase: 'Phase 2',
              label: 'First weeks',
              color: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-100 dark:border-emerald-900',
              headingColor: 'text-emerald-700 dark:text-emerald-400',
              steps: [
                'Register at your municipality (Gemeente) — get your BSN',
                'Open a Dutch bank account (ING, ABN AMRO, Bunq)',
                'Find short-term rental while searching for a permanent home',
                'Collect your IND residence permit (biometrics appointment)',
              ],
            },
            {
              phase: 'Phase 3',
              label: 'First months',
              color: 'bg-amber-50 dark:bg-amber-950/50 border-amber-100 dark:border-amber-900',
              headingColor: 'text-amber-700 dark:text-amber-400',
              steps: [
                'Apply for DigiD — your digital ID for all Dutch gov portals',
                'Get Dutch health insurance (legally required within 4 months)',
                'Exchange your driving licence at the RDW',
                'Register with a GP (huisarts)',
                'Confirm 30% ruling is applied on your payslip',
              ],
            },
            {
              phase: 'Phase 4',
              label: 'Getting settled',
              color: 'bg-purple-50 dark:bg-purple-950/50 border-purple-100 dark:border-purple-900',
              headingColor: 'text-purple-700 dark:text-purple-400',
              steps: [
                'Sign a long-term rental or purchase agreement',
                'Set up Dutch pension and employee benefits',
                'Enrol children in school (if applicable)',
                'File first Dutch tax return (aangifte) in March–April',
              ],
            },
          ].map((phase) => (
            <div key={phase.phase} className={`${phase.color} border rounded-2xl p-5`}>
              <p className={`text-xs font-semibold uppercase tracking-widest mb-0.5 ${phase.headingColor}`}>{phase.phase}</p>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">{phase.label}</h3>
              <ul className="space-y-2">
                {phase.steps.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    <span className="mt-1 w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500 flex-shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 mb-1">RelocationHub tracks every step above for you.</p>
            <p className="text-sm text-indigo-700 dark:text-indigo-400">Personalised checklist, deadline reminders, document organiser, IND alerts — all in one place.</p>
          </div>
          <Link href="/login" className="flex-shrink-0 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition whitespace-nowrap">
            Start your plan →
          </Link>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-5xl mx-auto px-5 py-16 border-t border-gray-100 dark:border-gray-800">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">Everything your move needs</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
            From the moment you accept an offer to the day you feel settled — RelocationHub covers every step.
          </p>
        </div>

        {/* Top row — 3 cols */}
        <div className="grid sm:grid-cols-3 gap-5 mb-5">
          {[
            {
              title: 'Smart Checklist',
              desc: 'Personalised, correctly-sequenced plan based on your country, visa type, pets, and employment. MVV → BSN → DigiD — nothing missed.',
              color: 'bg-indigo-50 dark:bg-indigo-950/50',
              iconColor: 'text-indigo-500',
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              ),
            },
            {
              title: 'Document Validation',
              desc: 'Upload your documents and get them checked against IND 2025 requirements before you show up. Pass, warn, or fail — with exact actions to take.',
              color: 'bg-emerald-50 dark:bg-emerald-950/50',
              iconColor: 'text-emerald-500',
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ),
            },
            {
              title: 'Relocation Risk Score',
              desc: 'A 0–100 score across critical tasks, timeline, documents, and profile completeness. Know what\'s blocking your move before it becomes a crisis.',
              color: 'bg-rose-50 dark:bg-rose-950/50',
              iconColor: 'text-rose-500',
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              ),
            },
          ].map((f) => (
            <div key={f.title} className={`${f.color} rounded-2xl p-6 border border-black/5 dark:border-white/5`}>
              <div className={`${f.iconColor} mb-4`}>{f.icon}</div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Bottom row — 3 cols */}
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            {
              title: 'IND Appointment Monitor',
              desc: 'IND slots are notoriously hard to get. RelocationHub checks the booking portal every 4 hours and emails you the moment a slot opens.',
              color: 'bg-amber-50 dark:bg-amber-950/50',
              iconColor: 'text-amber-500',
              badge: 'Unique feature',
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              ),
            },
            {
              title: 'HR Contact Notifications',
              desc: 'Add your relocation contact or HR manager. They get automatic task completion alerts and a weekly progress digest — no chasing needed.',
              color: 'bg-purple-50 dark:bg-purple-950/50',
              iconColor: 'text-purple-500',
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              ),
            },
            {
              title: 'Smart Reminders & iCal',
              desc: 'Set due dates on any task and get email reminders before deadlines hit. Subscribe to your task calendar in Google Calendar or Apple Calendar.',
              color: 'bg-blue-50 dark:bg-blue-950/50',
              iconColor: 'text-blue-500',
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ),
            },
          ].map((f) => (
            <div key={f.title} className={`${f.color} rounded-2xl p-6 border border-black/5 dark:border-white/5 relative`}>
              {'badge' in f && f.badge && (
                <span className="absolute top-4 right-4 text-xs font-semibold bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full">
                  {f.badge}
                </span>
              )}
              <div className={`${f.iconColor} mb-4`}>{f.icon}</div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How the app works */}
      <section className="bg-gray-50 dark:bg-gray-800/40 py-16 px-5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Up and running in minutes</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">No manual setup. No generic guides. A plan built around you.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                step: '1',
                title: 'Tell us about your move',
                desc: 'Origin country, visa type, move date, partner, pets, shipping, and HR contact — 2 minutes.',
              },
              {
                step: '2',
                title: 'Get your personalised plan',
                desc: 'A sequenced, personalised checklist covering every stage of your Dutch relocation — nothing missed.',
              },
              {
                step: '3',
                title: 'Track, validate and monitor',
                desc: 'Tick off tasks, validate documents, watch your risk score drop, and get alerted when IND slots open.',
              },
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center text-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-base font-bold flex-shrink-0">
                  {s.step}
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{s.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      {/*
        Pricing model: one-time payment per individual user.
        Rationale: relocation is a bounded process (6-18 months), not ongoing like SaaS.
        Monthly billing creates anxiety about when to cancel; one-time removes that friction.

        B2B / HR portal (Phase 5): per-seat monthly billing for company accounts.
        HR admins manage multiple relocatees. Separate product tier stored in profiles.tier
        and a future companies + company_users table. Do NOT merge with individual pricing.
      */}
      <section className="py-16 px-5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Simple, honest pricing</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pay once. Use it for as long as your relocation takes.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 items-start">
            {/* Individual plan */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="text-xs font-semibold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase mb-4">Individual</div>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-5xl font-bold text-gray-900 dark:text-white">€19.99</span>
                <span className="text-gray-400 dark:text-gray-500 mb-1.5">one-time</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Full access for your entire relocation — no recurring charges.</p>
              <ul className="space-y-3 mb-7">
                {[
                  'Personalised relocation checklist',
                  'Partner support — joint tasks & notifications',
                  'Document upload, organiser & document pack',
                  'Document validation (IND 2025 rules)',
                  'Relocation risk score — 4 dimensions',
                  'IND appointment slot monitor',
                  'Email reminders & deadline tracking',
                  'iCal feed for Google / Apple Calendar',
                  'HR contact notifications & weekly digest',
                  'Allowance tracker with PDF export',
                  'Profile editing & checklist regeneration',
                  'Custom tasks per category',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-200">
                    <span className="text-emerald-500 font-bold mt-0.5 flex-shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="block text-center bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                Get started
              </Link>
            </div>

            {/* B2B / Teams — coming soon */}
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-semibold tracking-widest text-purple-600 dark:text-purple-400 uppercase">Teams & HR</span>
                <span className="text-xs font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">Coming soon</span>
              </div>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-3xl font-bold text-gray-400 dark:text-gray-500">Per seat</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">For companies managing multiple relocatees at once.</p>
              <ul className="space-y-3 mb-7">
                {[
                  'HR admin dashboard — all relocatees in one view',
                  'Progress tracking per employee',
                  'Bulk onboarding from CSV',
                  'Override due dates & tasks per employee',
                  'Document visibility for HR (read-only)',
                  'Consolidated weekly digest',
                  'Everything in the Individual plan',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-500 dark:text-gray-400">
                    <span className="text-purple-400 font-bold mt-0.5 flex-shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="mailto:support@relocationhub.app?subject=HR portal waitlist"
                className="block text-center bg-purple-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-purple-700 transition">
                Join the waitlist
              </a>
              <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-3">We'll reach out when the HR portal launches.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 30% Ruling tool banner */}
      <section className="max-w-5xl mx-auto px-5 pb-16">
        <div className="bg-gradient-to-r from-emerald-50 to-indigo-50 dark:from-emerald-950/30 dark:to-indigo-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">Free tool — no sign-up needed</p>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">30% Ruling eligibility calculator</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Check if you qualify for the Dutch tax ruling and see how much you could save — in under 2 minutes.</p>
          </div>
          <Link href="/tools/30-ruling" className="flex-shrink-0 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition whitespace-nowrap">
            Check eligibility →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-gray-800 py-8 px-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-400 dark:text-gray-500">
          <span className="font-semibold text-gray-700 dark:text-gray-300">Relocation<span className="text-indigo-600">Hub</span></span>
          <div className="flex items-center gap-6">
            <Link href="/tools/30-ruling" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">30% Ruling Calculator</Link>
            <a href="#how-it-works" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">The process</a>
            <Link href="/login" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Sign in</Link>
            <a href="mailto:support@relocationhub.app" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">support@relocationhub.app</a>
          </div>
        </div>
      </footer>

    </main>
  )
}
