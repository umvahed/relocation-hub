import Link from 'next/link'

const SUPPORT_EMAIL = 'support@relocationhub.app'
const LAST_UPDATED = '13 May 2026'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <nav className="border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur z-10">
        <div className="max-w-3xl mx-auto px-5 py-4 flex justify-between items-center">
          <Link href="/" className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
            Relocation<span className="text-indigo-600">Hub</span>
          </Link>
          <Link href="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">← Back</Link>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-5 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed text-gray-700 dark:text-gray-300">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">1. Who we are</h2>
            <p>RelocationHub (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is operated by <strong>Bitquanta</strong>, registered at <strong>Pieter Calandlaan 765, 1069SC Amsterdam, the Netherlands</strong>, KVK number <strong>97672920</strong>.</p>
            <p className="mt-2">We are the data controller for personal data processed through RelocationHub. Questions or requests about your data can be sent to <a href={`mailto:${SUPPORT_EMAIL}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{SUPPORT_EMAIL}</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">2. What data we collect and why</h2>
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <p className="font-medium text-gray-900 dark:text-white mb-2">Account &amp; profile data</p>
                <p>Email address, full name, origin country, move date, employment type, visa information, household details (partner, children, pets), employer name, HR contact details.</p>
                <p className="mt-1 text-gray-500 dark:text-gray-400"><strong>Legal basis:</strong> Performance of contract (providing the service you signed up for).</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <p className="font-medium text-gray-900 dark:text-white mb-2">Uploaded documents</p>
                <p>You may upload documents such as passports, employment contracts, and IND letters. These files are stored securely in Supabase Storage (EU region) and are only accessible to you. When you request AI validation or date extraction, the document is sent to Anthropic&rsquo;s API for analysis and then immediately discarded from memory — the document bytes are <strong>never written to disk</strong> on our servers and <strong>never used to train AI models</strong>.</p>
                <p className="mt-1 text-gray-500 dark:text-gray-400"><strong>Legal basis:</strong> Performance of contract; explicit consent (for AI validation — you must opt in).</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <p className="font-medium text-gray-900 dark:text-white mb-2">AI validation results</p>
                <p>The outcome of document validation (pass / warn / fail, issues list) is stored in our database. The original document content is not stored in validation results — only the structured analysis.</p>
                <p className="mt-1 text-gray-500 dark:text-gray-400"><strong>Legal basis:</strong> Performance of contract; legitimate interest (providing the validation service).</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <p className="font-medium text-gray-900 dark:text-white mb-2">Payment data</p>
                <p>We use Stripe to process payments. We do not store your card number, CVV, or full payment details. Stripe provides us with a payment record and your email. Stripe&rsquo;s privacy policy governs their processing: <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">stripe.com/privacy</a>.</p>
                <p className="mt-1 text-gray-500 dark:text-gray-400"><strong>Legal basis:</strong> Performance of contract.</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <p className="font-medium text-gray-900 dark:text-white mb-2">Usage data</p>
                <p>We track how many times you use AI features (document validation, risk score, checklist generation) to enforce daily rate limits. We do not use analytics trackers or third-party advertising pixels.</p>
                <p className="mt-1 text-gray-500 dark:text-gray-400"><strong>Legal basis:</strong> Legitimate interest (preventing API abuse).</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">3. Cookies</h2>
            <p>We use only <strong>strictly necessary cookies</strong> set by Supabase Auth to maintain your login session. These cookies are essential for the service to function and do not require consent under the ePrivacy Directive. We do not use advertising cookies, tracking pixels, or third-party analytics cookies.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">4. Who we share your data with</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 pr-4 font-medium text-gray-900 dark:text-white">Processor</th>
                    <th className="py-2 pr-4 font-medium text-gray-900 dark:text-white">Purpose</th>
                    <th className="py-2 font-medium text-gray-900 dark:text-white">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {[
                    ['Supabase', 'Database, authentication, file storage', 'EU (AWS eu-west-1)'],
                    ['Anthropic', 'AI document analysis (transient — data not retained)', 'USA (SCCs apply)'],
                    ['Stripe', 'Payment processing', 'USA / EU (SCCs apply)'],
                    ['Resend', 'Transactional email (reminders, notifications)', 'USA (SCCs apply)'],
                    ['Railway', 'Backend API hosting', 'USA (SCCs apply)'],
                    ['Vercel', 'Frontend hosting', 'Global CDN'],
                  ].map(([p, purpose, loc]) => (
                    <tr key={p}>
                      <td className="py-2.5 pr-4 font-medium text-gray-700 dark:text-gray-200">{p}</td>
                      <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-300">{purpose}</td>
                      <td className="py-2.5 text-gray-500 dark:text-gray-400">{loc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-gray-500 dark:text-gray-400">We do not sell your personal data. We do not share it with third parties for marketing purposes. Transfers to the USA are covered by Standard Contractual Clauses (SCCs) where required.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">5. How long we keep your data</h2>
            <ul className="space-y-2 list-disc list-inside text-gray-600 dark:text-gray-300">
              <li>Account and profile data: retained while your account is active and for 30 days after deletion (to allow recovery).</li>
              <li>Uploaded documents: retained while your account is active; deleted immediately when you delete a document or your account.</li>
              <li>Validation results: retained while your account is active; deleted when your account is deleted.</li>
              <li>Payment records: retained for 7 years as required by Dutch tax law (<em>Belastingdienst</em>).</li>
              <li>AI consent records: retained as long as your account exists to demonstrate compliance.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">6. Your GDPR rights</h2>
            <p className="mb-3">As a data subject under GDPR, you have the following rights:</p>
            <ul className="space-y-2 list-disc list-inside text-gray-600 dark:text-gray-300">
              <li><strong>Access:</strong> request a copy of the personal data we hold about you.</li>
              <li><strong>Rectification:</strong> correct inaccurate data — most profile fields can be updated directly in the app.</li>
              <li><strong>Erasure:</strong> delete your account and all associated data from within the app settings at any time.</li>
              <li><strong>Data portability:</strong> request your data in a machine-readable format.</li>
              <li><strong>Restriction:</strong> request we restrict processing while a dispute is resolved.</li>
              <li><strong>Objection:</strong> object to processing based on legitimate interest.</li>
              <li><strong>Withdraw consent:</strong> withdraw AI validation consent at any time from the app settings — this does not affect previous processing.</li>
            </ul>
            <p className="mt-3">To exercise any right, email <a href={`mailto:${SUPPORT_EMAIL}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{SUPPORT_EMAIL}</a>. We will respond within 30 days. You also have the right to lodge a complaint with the Dutch Data Protection Authority (<em>Autoriteit Persoonsgegevens</em>) at <a href="https://autoriteitpersoonsgegevens.nl" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">autoriteitpersoonsgegevens.nl</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">7. Security</h2>
            <p>We take reasonable technical and organisational measures to protect your data, including:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-gray-600 dark:text-gray-300">
              <li>All data in transit encrypted via TLS.</li>
              <li>Supabase Row Level Security (RLS) — your data is only accessible to your own account.</li>
              <li>Document bytes processed in server memory only; never written to disk.</li>
              <li>Stripe handles all card data — we never see or store raw payment details.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">8. Changes to this policy</h2>
            <p>We may update this policy as the service evolves. Material changes will be communicated via email or an in-app notice. The &ldquo;last updated&rdquo; date at the top of this page always reflects the current version.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">9. Contact</h2>
            <p>For privacy questions, data requests, or complaints: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{SUPPORT_EMAIL}</a></p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800 flex gap-6 text-sm text-gray-400 dark:text-gray-500">
          <Link href="/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Terms of Service</Link>
          <Link href="/refunds" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Refund Policy</Link>
          <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Home</Link>
        </div>
      </article>
    </div>
  )
}
