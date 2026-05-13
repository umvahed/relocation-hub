import Link from 'next/link'

const SUPPORT_EMAIL = 'support@valryn.com'
const LAST_UPDATED = '13 May 2026'

export default function RefundsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <nav className="border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur z-10">
        <div className="max-w-3xl mx-auto px-5 py-4 flex justify-between items-center">
          <Link href="/" className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
            VALRYN
          </Link>
          <Link href="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">← Back</Link>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-5 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Refund Policy</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-gray-700 dark:text-gray-300">

          <section>
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl px-4 py-4 mb-6">
              <p className="text-indigo-800 dark:text-indigo-200 font-medium">Short version: if Valryn doesn&rsquo;t work for you in the first 14 days, email us and we&rsquo;ll refund you — no questions asked.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">1. Our voluntary 14-day guarantee</h2>
            <p>Although the right of withdrawal under EU consumer law is waived at the point of purchase for immediately-delivered digital services (see our <Link href="/terms" className="text-indigo-600 dark:text-indigo-400 hover:underline">Terms of Service</Link>), we voluntarily offer a <strong>14-day money-back guarantee</strong>.</p>
            <p className="mt-2">If you purchased Valryn Pro (€19.99 one-time) and are not satisfied for any reason, email us within 14 days of your purchase date and we will process a full refund. No justification required.</p>
            <p className="mt-2">How to request: email <a href={`mailto:${SUPPORT_EMAIL}?subject=Refund request`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{SUPPORT_EMAIL}</a> with the subject line <strong>&ldquo;Refund request&rdquo;</strong> and include the email address you used to sign up. We will process your refund within 5 business days via the original payment method.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">2. After 14 days</h2>
            <p>After the 14-day window, refunds are granted at our discretion in the following circumstances:</p>
            <ul className="mt-2 space-y-2 list-disc list-inside text-gray-600 dark:text-gray-300">
              <li><strong>Technical failure:</strong> if a core paid feature (AI validation, risk score) was persistently unavailable for more than 72 consecutive hours due to a fault on our side, we will offer a pro-rated credit or full refund.</li>
              <li><strong>Duplicate charge:</strong> if you were charged twice for the same purchase, we will immediately refund the duplicate.</li>
              <li><strong>Unauthorised charge:</strong> if you did not authorise the payment, contact us immediately and we will investigate and refund as appropriate.</li>
            </ul>
            <p className="mt-3">We do not issue refunds after 14 days for reasons such as: not having used the service, finding the relocation process easier than expected, or changing your mind about moving to the Netherlands.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">3. Free features</h2>
            <p>The 30% ruling calculator, personalised checklist, IND monitor, reminders, and iCal export are available on the free tier. There is nothing to refund for features you have not paid for.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">4. Chargebacks</h2>
            <p>If you initiate a chargeback with your bank before contacting us, we will lose the ability to issue a direct refund (Stripe holds funds during chargeback disputes). Please contact us first — we will resolve legitimate refund requests quickly and without the need for a dispute.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">5. Contact</h2>
            <p>For refund requests or billing questions: <a href={`mailto:${SUPPORT_EMAIL}?subject=Refund request`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{SUPPORT_EMAIL}</a></p>
            <p className="mt-1 text-gray-500 dark:text-gray-400">We aim to respond within 1 business day.</p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800 flex gap-6 text-sm text-gray-400 dark:text-gray-500">
          <Link href="/privacy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Terms of Service</Link>
          <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Home</Link>
        </div>
      </article>
    </div>
  )
}
