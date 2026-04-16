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
      <section className="max-w-5xl mx-auto px-5 pt-20 pb-16 text-center">
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
              dot: 'bg-indigo-500',
            },
            {
              title: 'Document Hub',
              desc: 'Upload and organise all your documents in one place. AI checks them before you submit to IND or gemeente.',
              color: 'bg-emerald-50',
              dot: 'bg-emerald-500',
            },
            {
              title: 'Smart Reminders',
              desc: 'Get notified before deadlines. Track IND appointments, BSN registration, DigiD, and health insurance.',
              color: 'bg-amber-50',
              dot: 'bg-amber-500',
            },
          ].map((f) => (
            <div key={f.title} className={`${f.color} rounded-2xl p-6`}>
              <div className={`w-2 h-2 rounded-full ${f.dot} mb-4`}></div>
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
