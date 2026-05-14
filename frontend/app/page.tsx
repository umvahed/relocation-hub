import Link from 'next/link'
import NavAuthButton from '@/app/components/NavAuthButton'

const SUPPORT_EMAIL = 'support@valryn.nl'

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">

      {/* Nav */}
      <nav className="border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto px-5 py-4 flex justify-between items-center">
          <div className="text-lg font-bold tracking-widest text-gray-900 dark:text-white">
            VALRYN
          </div>
          <div className="flex items-center gap-4">
            <Link href="/tools/30-ruling" className="hidden sm:block text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-600 transition">
              30% Ruling Calculator
            </Link>
            <a href="#features" className="hidden sm:block text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">
              Features
            </a>
            <a href="#pricing" className="hidden sm:block text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">
              Pricing
            </a>
            <NavAuthButton />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-b from-indigo-50/70 dark:from-indigo-950/30 to-white dark:to-gray-900 max-w-5xl mx-auto px-5 pt-16 pb-16 text-center rounded-3xl mt-4">
        <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm font-medium px-3 py-1 rounded-full mb-5">
          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
          Built for people moving to the Netherlands
        </div>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-white leading-tight tracking-tight mb-5">
          Stop Googling IND requirements
          <br className="hidden sm:block" />
          <span className="text-indigo-600">at 2am.</span>
        </h1>
        <p className="text-base sm:text-xl text-gray-500 dark:text-gray-400 mb-3 max-w-2xl mx-auto leading-relaxed">
          Valryn gives you a personalised checklist, AI document validation, IND appointment alerts, and deadline tracking — all in one place, so nothing falls through the cracks.
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-10 max-w-xl mx-auto">
          MVV visa · BSN registration · IND residence permit · DigiD · health insurance · 30% ruling — every step, in order, tracked.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch justify-center gap-3 max-w-xl mx-auto mb-8">
          <div className="flex-1 flex flex-col gap-1">
            <Link href="/login" className="w-full bg-indigo-600 text-white px-6 py-3.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-sm text-center">
              Start your relocation plan →
            </Link>
            <p className="text-xs text-center text-gray-400 dark:text-gray-500">One-time · €19.99 · no subscription</p>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <Link href="/tools/30-ruling" className="w-full bg-emerald-600 text-white px-6 py-3.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition shadow-sm text-center">
              Check 30% ruling eligibility →
            </Link>
            <p className="text-xs text-center text-gray-400 dark:text-gray-500">Free · no sign-up needed</p>
          </div>
        </div>

        {/* Trust bar */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-gray-400 dark:text-gray-500">
          {['50+ relocation tasks covered', 'AI document checks', 'IND appointment monitoring', 'GDPR compliant', 'Secure document storage', 'Cancel any time'].map(t => (
            <span key={t} className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* Pain point section */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">What relocating to the Netherlands actually involves</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-sm leading-relaxed">
            There are four distinct phases — each with its own deadlines, documents, and government offices. Miss one step and the rest stalls.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              phase: 'Phase 1', label: 'Before you leave',
              color: 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-100 dark:border-indigo-900',
              headingColor: 'text-indigo-700 dark:text-indigo-400',
              steps: [
                'Job offer from an IND-registered sponsor employer',
                'Apply for MVV entry visa (non-EU/EEA nationals)',
                'Collect MVV from Dutch consulate in your country',
                'Arrange shipping & moving logistics',
                'Check 30% ruling eligibility with employer',
              ],
            },
            {
              phase: 'Phase 2', label: 'First weeks',
              color: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-100 dark:border-emerald-900',
              headingColor: 'text-emerald-700 dark:text-emerald-400',
              steps: [
                'Register at your municipality (Gemeente) — get your BSN',
                'Open a Dutch bank account (ING, ABN AMRO, Bunq)',
                'Find short-term rental while flat-hunting',
                'Attend IND biometrics appointment for residence permit',
              ],
            },
            {
              phase: 'Phase 3', label: 'First months',
              color: 'bg-amber-50 dark:bg-amber-950/50 border-amber-100 dark:border-amber-900',
              headingColor: 'text-amber-700 dark:text-amber-400',
              steps: [
                'Apply for DigiD — your digital ID for all Dutch gov portals',
                'Get Dutch health insurance (legally required within 4 months)',
                'Exchange your driving licence at the RDW',
                'Register with a GP (huisarts)',
                'Confirm 30% ruling on your payslip',
              ],
            },
            {
              phase: 'Phase 4', label: 'Getting settled',
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
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500 flex-shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 mb-1">Valryn tracks every step above — personalised to your situation.</p>
            <p className="text-sm text-indigo-700 dark:text-indigo-400">EU citizen, highly skilled migrant, or ICT transfer — the right tasks, in the right order, for you.</p>
          </div>
          <Link href="/login" className="flex-shrink-0 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition whitespace-nowrap">
            Start your plan →
          </Link>
        </div>
      </section>

      {/* Feature grid */}
      <section id="features" className="max-w-5xl mx-auto px-5 py-16 border-t border-gray-100 dark:border-gray-800">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">Everything your move needs</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
            From the moment you accept an offer to the day you feel settled.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-5 mb-5">
          {[
            {
              title: 'Personalised Checklist',
              desc: 'Your visa type, country, pets, partner, school-age children, and shipping method all shape a correctly-sequenced plan. MVV → BSN → DigiD — nothing missed.',
              color: 'bg-indigo-50 dark:bg-indigo-950/50',
              iconColor: 'text-indigo-500',
              icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
            },
            {
              title: 'AI Document Validation',
              desc: 'Upload your passport, employment contract, or IND letter and get it checked against current IND requirements. Pass, warn, or fail — with exact actions to take.',
              color: 'bg-emerald-50 dark:bg-emerald-950/50',
              iconColor: 'text-emerald-500',
              icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
            },
            {
              title: 'Relocation Risk Score',
              desc: 'A 0–100 score across critical tasks, timeline feasibility, document readiness, and profile completeness. Know your biggest blockers before they become crises.',
              color: 'bg-rose-50 dark:bg-rose-950/50',
              iconColor: 'text-rose-500',
              icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
            },
          ].map((f) => (
            <div key={f.title} className={`${f.color} rounded-2xl p-6 border border-black/5 dark:border-white/5`}>
              <div className={`${f.iconColor} mb-4`}>{f.icon}</div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-3 gap-5 mb-5">
          {[
            {
              title: 'IND Appointment Monitor',
              desc: 'IND slots are notoriously scarce. Valryn monitors the booking portal and emails you the moment a slot becomes available — so you book before anyone else.',
              color: 'bg-amber-50 dark:bg-amber-950/50',
              iconColor: 'text-amber-500',
              badge: 'Unique feature',
              icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
            },
            {
              title: 'Partner Support',
              desc: 'Moving with a partner? Add partner tasks to your shared checklist, send them their own reminders, and track both of your progress in one dashboard.',
              color: 'bg-violet-50 dark:bg-violet-950/50',
              iconColor: 'text-violet-500',
              icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
            },
            {
              title: 'Relocation Allowance Tracker',
              desc: 'Log every relocation expense against your employer allowance. Track your running balance, get PDF statements, and automatically notify your HR contact on each spend.',
              color: 'bg-teal-50 dark:bg-teal-950/50',
              iconColor: 'text-teal-500',
              icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
            },
          ].map((f) => (
            <div key={f.title} className={`${f.color} rounded-2xl p-6 border border-black/5 dark:border-white/5 relative`}>
              {'badge' in f && f.badge && (
                <span className="absolute top-4 right-4 text-xs font-semibold bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full">{f.badge}</span>
              )}
              <div className={`${f.iconColor} mb-4`}>{f.icon}</div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-3 gap-5">
          {[
            {
              title: 'HR Contact & Document Pack',
              desc: 'Add your HR or relocation contact. They get task completion alerts and a weekly digest. Generate a merged PDF document pack to send them — one click.',
              color: 'bg-purple-50 dark:bg-purple-950/50',
              iconColor: 'text-purple-500',
              icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
            },
            {
              title: 'Reminders, iCal & Due Dates',
              desc: 'Set due dates on any task and get email reminders before deadlines hit. Subscribe to your task calendar in Google Calendar or Apple Calendar.',
              color: 'bg-blue-50 dark:bg-blue-950/50',
              iconColor: 'text-blue-500',
              icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
            },
            {
              title: 'Shareable Progress Link',
              desc: 'Share a read-only progress summary with your HR contact or relocation agent — overall completion, per-category breakdown, risk score, and document count. No login needed.',
              color: 'bg-sky-50 dark:bg-sky-950/50',
              iconColor: 'text-sky-500',
              icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>,
            },
          ].map((f) => (
            <div key={f.title} className={`${f.color} rounded-2xl p-6 border border-black/5 dark:border-white/5`}>
              <div className={`${f.iconColor} mb-4`}>{f.icon}</div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 dark:bg-gray-800/40 py-16 px-5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Up and running in minutes</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">No manual setup. No generic guides. A plan built around you.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { step: '1', title: 'Tell us about your move', desc: 'Origin country, visa type, move date, partner, pets, shipping preferences, and HR contact — takes about 2 minutes.' },
              { step: '2', title: 'Get your personalised plan', desc: 'A sequenced checklist covering every stage — EU citizen, highly skilled migrant, or ICT transfer. Automatically updated as your profile changes.' },
              { step: '3', title: 'Track, validate and monitor', desc: 'Tick off tasks, upload and validate documents, watch your risk score improve, and get alerted the moment an IND slot opens.' },
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center text-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-base font-bold flex-shrink-0">{s.step}</div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{s.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 px-5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Simple, honest pricing</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pay once. Use it for as long as your relocation takes. No subscription anxiety.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5 items-start">
            {/* Individual */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="text-xs font-semibold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase mb-4">Individual</div>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-5xl font-bold text-gray-900 dark:text-white">€19.99</span>
                <span className="text-gray-400 dark:text-gray-500 mb-1.5">one-time</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Full access for your entire relocation — no recurring charges, ever.</p>
              <ul className="space-y-3 mb-7">
                {[
                  'Personalised relocation checklist',
                  'Partner support — joint tasks & notifications',
                  'Document upload, organiser & document pack',
                  'AI document validation (IND requirements)',
                  'Relocation risk score across 4 dimensions',
                  'IND appointment slot monitor',
                  'Email reminders & deadline tracking',
                  'iCal feed for Google / Apple Calendar',
                  'HR contact notifications & weekly digest',
                  'Relocation allowance tracker with PDF export',
                  'Shareable progress link for HR',
                  'Checklist regeneration as your situation changes',
                  'Custom tasks per category',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-200">
                    <span className="text-emerald-500 font-bold mt-0.5 flex-shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="block text-center bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                Get started
              </Link>
            </div>

            {/* Teams — coming soon */}
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
              <a href={`mailto:${SUPPORT_EMAIL}?subject=HR portal waitlist`} className="block text-center bg-purple-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-purple-700 transition">
                Join the waitlist
              </a>
              <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-3">We&rsquo;ll reach out when the HR portal launches.</p>
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
      <footer className="border-t border-gray-100 dark:border-gray-800 py-10 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-8 mb-8">
            <div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Relocation<span className="text-indigo-600">Hub</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs leading-relaxed">
                Helping professionals navigate the Dutch relocation process — from IND paperwork to feeling at home.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-12 gap-y-3 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Product</p>
                <Link href="/login" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Sign in</Link>
                <Link href="/tools/30-ruling" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">30% Ruling Calculator</Link>
                <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Features</a>
                <a href="#pricing" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Pricing</a>
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Legal</p>
                <Link href="/privacy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Privacy Policy</Link>
                <Link href="/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Terms of Service</Link>
                <Link href="/refunds" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Refund Policy</Link>
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Support</p>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">{SUPPORT_EMAIL}</a>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
            <span>© {new Date().getFullYear()} Valryn. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Privacy</Link>
              <Link href="/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Terms</Link>
              <Link href="/refunds" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Refunds</Link>
            </div>
          </div>
        </div>
      </footer>

    </main>
  )
}
