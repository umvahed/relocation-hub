import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-white">

      {/* Nav */}
      <nav className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-5 py-4 flex justify-between items-center">
          <div className="text-lg font-semibold tracking-tight text-gray-900">
            Relocation<span className="text-indigo-600">Hub</span>
          </div>
          <Link
            href="/login"
            className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-b from-indigo-50/60 to-white max-w-5xl mx-auto px-5 pt-20 pb-16 text-center rounded-3xl mt-4">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-sm font-medium px-3 py-1 rounded-full mb-6">
          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
          Built for expats moving to the Netherlands
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 leading-tight tracking-tight mb-5">
          {"Your move to the Netherlands, "}
          <br className="hidden sm:block" />
          <span className="text-indigo-600">organised in minutes.</span>
        </h1>
        <p className="text-lg text-gray-500 mb-8 max-w-xl mx-auto leading-relaxed">
          AI-generated checklist, document hub, and step-by-step guidance — from MVV visa to your first day at work.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="w-full sm:w-auto bg-indigo-600 text-white px-7 py-3.5 rounded-xl text-base font-semibold hover:bg-indigo-700 transition shadow-sm">
            Start your relocation plan →
          </Link>
        </div>
        <p className="text-sm text-gray-400 mt-4">Free to start · No credit card required</p>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-5 pb-20">
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            {
              title: 'AI Checklist',
              desc: 'Personalised, correctly-sequenced checklist based on your country, visa type, and situation. MVV to BSN — nothing missed.',
              color: 'bg-indigo-50',
              iconColor: 'text-indigo-500',
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              ),
            },
            {
              title: 'Document Hub',
              desc: 'Upload and organise all your documents in one place. AI checks them before you submit to IND or gemeente.',
              color: 'bg-emerald-50',
              iconColor: 'text-emerald-500',
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              ),
            },
            {
              title: 'Smart Reminders',
              desc: 'Get notified before deadlines. Track IND appointments, BSN registration, DigiD, and health insurance.',
              color: 'bg-amber-50',
              iconColor: 'text-amber-500',
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              ),
            },
          ].map((f) => (
            <div key={f.title} className={`${f.color} rounded-2xl p-6 border border-black/5`}>
              <div className={`${f.iconColor} mb-4`}>{f.icon}</div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 py-16 px-5">
        <div className="max-w-sm mx-auto bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
          <div className="text-xs font-semibold tracking-widest text-indigo-600 uppercase mb-4">Pricing</div>
          <div className="flex items-end gap-1 mb-1">
            <span className="text-5xl font-bold text-gray-900">€3.99</span>
            <span className="text-gray-400 mb-1.5">/month</span>
          </div>
          <p className="text-sm text-gray-500 mb-6">Everything you need until you're settled.</p>
          <ul className="space-y-3 mb-7">
            {[
              'AI-generated relocation checklist',
              'Document upload & organisation',
              'AI document verification',
              'Email reminders & deadline tracking',
              'Official NL government resource links',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/login"
            className="block text-center bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
            Get started free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 px-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 text-sm text-gray-400">
          <span>Relocation<span className="text-indigo-600">Hub</span></span>
          <span>Built for expats moving to the Netherlands</span>
        </div>
      </footer>

    </main>
  )
}
