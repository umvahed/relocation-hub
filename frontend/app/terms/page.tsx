import Link from 'next/link'

const SUPPORT_EMAIL = 'support@valryn.com'
const LAST_UPDATED = '13 May 2026'

export default function TermsPage() {
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-gray-700 dark:text-gray-300">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">1. About these terms</h2>
            <p>These Terms of Service (&ldquo;Terms&rdquo;) govern your use of Valryn, operated by <strong>Bitquanta</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;), registered at <strong>Pieter Calandlaan 765, 1069SC Amsterdam, the Netherlands</strong> (KVK 97672920). By creating an account or using the service, you agree to these Terms. If you do not agree, do not use Valryn.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">2. The service</h2>
            <p>Valryn is a relocation management tool that helps individuals and couples organise their move to the Netherlands. It provides:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-gray-600 dark:text-gray-300">
              <li>A personalised, AI-generated relocation checklist.</li>
              <li>Document upload, storage, and AI-assisted validation.</li>
              <li>A relocation risk score based on your profile and task completion.</li>
              <li>IND appointment slot monitoring and email alerts.</li>
              <li>Deadline reminders, iCal export, and HR contact notifications.</li>
              <li>A relocation allowance tracker.</li>
              <li>A 30% ruling eligibility calculator (available free, without an account).</li>
            </ul>
            <p className="mt-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-amber-800 dark:text-amber-200">
              <strong>Important:</strong> Valryn provides information and organisational tools. It does not provide legal advice. Nothing on the platform constitutes legal, immigration, financial, or tax advice. Always consult a qualified professional for your specific situation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">3. Account</h2>
            <p>You must be at least 18 years old to create an account. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You must provide accurate information during sign-up and keep it current.</p>
            <p className="mt-2">We reserve the right to suspend or terminate accounts that violate these Terms, are used for abusive purposes, or that we reasonably suspect are fraudulent.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">4. Payment and access tiers</h2>
            <p>Certain features (AI document validation, risk score, profile enrichment from documents) are available only to users on the <strong>paid tier</strong>. Access to the paid tier is unlocked by a <strong>one-time payment of €19.99</strong>, processed securely by Stripe.</p>
            <p className="mt-2">The one-time payment grants you access to all paid features for the lifetime of your account — there are no recurring charges. If we introduce subscription pricing in the future, existing one-time payers will not be affected.</p>
            <p className="mt-2">Free features (personalised checklist, IND monitor, reminders, iCal, 30% ruling calculator) are available without payment.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">5. Right of withdrawal (EU consumers)</h2>
            <p>Under the EU Consumer Rights Directive, you ordinarily have a 14-day right of withdrawal from digital service purchases. However, by clicking &ldquo;Upgrade&rdquo; and completing payment, <strong>you explicitly request immediate access to the paid features and acknowledge that you lose your right of withdrawal</strong> once the service has been performed (i.e., once you can access paid features).</p>
            <p className="mt-2">This waiver is standard practice for immediately-delivered digital services and is fully permitted under Article 16(m) of Directive 2011/83/EU. If you have any questions before purchasing, contact us first at <a href={`mailto:${SUPPORT_EMAIL}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{SUPPORT_EMAIL}</a>.</p>
            <p className="mt-2">For our voluntary refund policy, see our <Link href="/refunds" className="text-indigo-600 dark:text-indigo-400 hover:underline">Refund Policy</Link>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">6. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-gray-600 dark:text-gray-300">
              <li>Use the service for any unlawful purpose.</li>
              <li>Attempt to reverse engineer, scrape, or extract data from the service at scale.</li>
              <li>Upload documents that do not belong to you or that you are not authorised to share.</li>
              <li>Share your account credentials with others.</li>
              <li>Use the service in a way that could damage, overload, or impair our infrastructure.</li>
              <li>Misrepresent your identity or provide false information to obtain AI validation results.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">7. AI features and accuracy</h2>
            <p>AI-generated content (checklists, document validation results, risk scores) is produced by large language models and may contain errors. You should always verify AI outputs against official sources (IND website, your employer, a licensed immigration lawyer) before relying on them for important decisions.</p>
            <p className="mt-2">We make no warranty that AI validation results are complete, accurate, or current. IND requirements change; our AI is updated periodically but may not reflect the very latest rules.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">8. IND appointment monitor</h2>
            <p>The IND appointment monitor checks the IND Online Appointment Portal on a best-effort basis. We cannot guarantee that every available slot will be detected or that email notifications will arrive before a slot is filled. The monitor is a convenience tool — always check the IND portal directly for critical bookings.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">9. Intellectual property</h2>
            <p>All content on Valryn (design, code, copy, AI prompts, checklist templates) is owned by Bitquanta or its licensors. You may not copy, reproduce, or create derivative works without our written permission.</p>
            <p className="mt-2">You retain ownership of documents you upload. By uploading, you grant us a limited licence to process them for the purpose of providing the service (validation, date extraction).</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">10. Limitation of liability</h2>
            <p>To the maximum extent permitted by applicable law:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-gray-600 dark:text-gray-300">
              <li>We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.</li>
              <li>Our total liability to you for any claim arising from the service shall not exceed the amount you paid us in the 12 months preceding the claim.</li>
              <li>We are not liable for delays or failures caused by events outside our reasonable control (force majeure).</li>
              <li>We are not responsible for decisions made based on AI-generated content or for changes in IND requirements that invalidate previous advice.</li>
            </ul>
            <p className="mt-2">Nothing in these Terms excludes liability for death or personal injury caused by our negligence, fraud, or any other liability that cannot be excluded by law.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">11. Service availability</h2>
            <p>We aim for high availability but do not guarantee uninterrupted access. We may take the service down for maintenance. We will try to give advance notice of planned downtime where possible.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">12. Account deletion</h2>
            <p>You can delete your account at any time from the dashboard settings. Deletion is permanent and irreversible — all your data (tasks, documents, profile, validation results) will be deleted within 30 days. Payment records are retained for 7 years as required by Dutch tax law.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">13. Changes to these terms</h2>
            <p>We may update these Terms as the service evolves. Material changes will be communicated via email at least 14 days before they take effect. Continued use after the effective date constitutes acceptance of the new Terms. If you disagree with a change, you may delete your account before it takes effect.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">14. Governing law</h2>
            <p>These Terms are governed by Dutch law. Disputes will be submitted to the competent court in <strong>Amsterdam</strong>, the Netherlands, unless EU consumer protection law requires otherwise.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">15. Contact</h2>
            <p>Questions about these Terms: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{SUPPORT_EMAIL}</a></p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800 flex gap-6 text-sm text-gray-400 dark:text-gray-500">
          <Link href="/privacy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Privacy Policy</Link>
          <Link href="/refunds" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Refund Policy</Link>
          <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Home</Link>
        </div>
      </article>
    </div>
  )
}
