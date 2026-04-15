import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-4 py-16">
        
        {/* Header */}
        <nav className="flex justify-between items-center mb-16">
          <div className="text-2xl font-bold text-indigo-700">
            🇳🇱 RelocationHub
          </div>
          <Link href="/login"
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition">
            Get Started
          </Link>
        </nav>

        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Your move to the Netherlands,<br />
            <span className="text-indigo-600">organized in minutes.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            AI-generated relocation checklist, document hub, and step-by-step guidance. 
            From visa application to your first day at work.
          </p>
          <Link href="/login"
            className="bg-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-indigo-700 transition shadow-lg">
            Start your relocation plan →
          </Link>
          <p className="text-sm text-gray-500 mt-3">Free to start • No credit card required</p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {[
            {
              icon: '✅',
              title: 'AI Checklist',
              desc: 'Personalised step-by-step checklist based on your country and situation. Never miss a deadline.'
            },
            {
              icon: '📄',
              title: 'Document Hub',
              desc: 'Upload and organise all your documents in one place. AI checks them before you submit.'
            },
            {
              icon: '🔔',
              title: 'Smart Reminders',
              desc: 'Get notified before deadlines. Track IND appointments, BSN registration, and more.'
            },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center max-w-md mx-auto">
          <div className="text-sm font-semibold text-indigo-600 mb-2">SIMPLE PRICING</div>
          <div className="text-5xl font-bold text-gray-900 mb-1">€3.99<span className="text-2xl text-gray-500">/mo</span></div>
          <p className="text-gray-600 mb-6">Everything you need until you're settled in the Netherlands.</p>
          <ul className="text-left space-y-2 mb-6">
            {[
              'AI-generated relocation checklist',
              'Document upload & organisation',
              'AI document verification',
              'Email reminders & deadline tracking',
              'Links to official NL government resources',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-gray-700">
                <span className="text-green-500">✓</span> {item}
              </li>
            ))}
          </ul>
          <Link href="/login"
            className="block bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition">
            Get started free
          </Link>
        </div>

      </div>
    </main>
  )
}