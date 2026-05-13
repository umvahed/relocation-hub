'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { onboardUser, generateChecklist, getChecklist, updateProfile } from '@/lib/api'
import { useRouter } from 'next/navigation'

const LOADING_SAYINGS = [
  'Counting tulip fields for accuracy... 🌷',
  'Bribing the housing committee... 🏠',
  'Teaching your spreadsheet to ride a bike... 🚲',
  'Filing the paperwork for your paperwork... 📋',
  'Googling if stroopwafels count as a meal... 🍪',
  'Convincing the IND you\'re not a robot... 🤖',
  'Calculating the exact volume of cheese ahead... 🧀',
  'Warning: Dutch directness may cause mild shock... ⚡',
  'Booking your first rain-soaked bike commute... ☔',
  '23 million bikes for 17 million people — you\'ll fit right in... 🚲',
  'Scheduling your first "gezellig" moment... 🍺',
  'Translating "alsjeblieft" for the 47th time... 🇳🇱',
]

const COUNTRIES = [
  'South Africa', 'United Kingdom', 'United States', 'Germany',
  'France', 'India', 'Australia', 'Canada', 'Spain', 'Italy',
  'Brazil', 'Nigeria', 'Kenya', 'Ghana', 'Zimbabwe', 'Other'
]

type BtnClass = (active: boolean) => string
const btn: BtnClass = (active) =>
  `flex-1 py-3 rounded-xl font-semibold border transition text-sm ${
    active
      ? 'bg-indigo-600 text-white border-indigo-600'
      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
  }`

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [sayingIndex, setSayingIndex] = useState(0)
  const [user, setUser] = useState<any>(null)
  const [form, setForm] = useState({
    full_name: '',
    origin_country: '',
    move_date: '',
    employment_type: 'employed',
    has_pets: false,
    shipping_type: 'luggage_only',
    has_relocation_allowance: false,
    contact_name: '',
    contact_email: '',
    destination_city: '',
    has_children: false,
    number_of_children: 1,
    children_school_stage: '',
    container_ship_date: '',
    has_partner: false,
    partner_full_name: '',
    partner_email: '',
    partner_origin_country: '',
    additional_context: '',
    // Step 4 — permit & situation
    employer_arranges_permit: '',           // 'employer' | 'self' | 'eu_citizen' | 'unsure'
    employer_is_sponsor: null as boolean | null,
    already_in_netherlands: null as boolean | null,
    has_driving_licence: null as boolean | null,
    driving_licence_country: '',
    expects_30_ruling: null as boolean | null,
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!loading) return
    const id = setInterval(() => setSayingIndex(i => (i + 1) % LOADING_SAYINGS.length), 2400)
    return () => clearInterval(id)
  }, [loading])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      const existing = await getChecklist(data.user.id).catch(() => null)
      if (existing?.tasks?.length > 0) { router.push('/dashboard'); return }
      setUser(data.user)
      setForm(f => ({ ...f, full_name: data.user.user_metadata?.full_name || '' }))
    })
  }, [])

  const handleSubmit = async () => {
    if (!user) return
    setLoading(true)
    try {
      await onboardUser({
        user_id: user.id,
        email: user.email!,
        full_name: form.full_name,
        origin_country: form.origin_country,
        move_date: form.move_date || undefined,
        contact_name: form.contact_name || undefined,
        contact_email: form.contact_email || undefined,
      })

      await updateProfile(user.id, {
        employment_type: form.employment_type,
        has_pets: form.has_pets,
        shipping_type: form.shipping_type,
        has_relocation_allowance: form.has_relocation_allowance,
        destination_city: form.destination_city || undefined,
        has_children: form.has_children,
        number_of_children: form.has_children ? form.number_of_children : undefined,
        children_school_stage: form.has_children && form.children_school_stage ? form.children_school_stage : undefined,
        container_ship_date: form.container_ship_date || undefined,
        has_partner: form.has_partner,
        partner_full_name: form.has_partner ? form.partner_full_name || undefined : undefined,
        partner_email: form.has_partner ? form.partner_email || undefined : undefined,
        partner_origin_country: form.has_partner ? form.partner_origin_country || undefined : undefined,
        employer_arranges_permit: form.employer_arranges_permit || undefined,
        employer_is_sponsor: form.employer_is_sponsor !== null ? form.employer_is_sponsor : undefined,
        already_in_netherlands: form.already_in_netherlands !== null ? form.already_in_netherlands : undefined,
        has_driving_licence: form.has_driving_licence !== null ? form.has_driving_licence : undefined,
        driving_licence_country: form.has_driving_licence && form.driving_licence_country ? form.driving_licence_country : undefined,
        expects_30_ruling: form.expects_30_ruling !== null ? form.expects_30_ruling : undefined,
      })

      const checklistResult = await generateChecklist({
        user_id: user.id,
        origin_country: form.origin_country,
        employment_type: form.employment_type,
        move_date: form.move_date,
        has_pets: form.has_pets,
        shipping_type: form.shipping_type,
        has_relocation_allowance: form.has_relocation_allowance,
        container_ship_date: form.container_ship_date || undefined,
        has_partner: form.has_partner,
        partner_origin_country: form.has_partner ? form.partner_origin_country || undefined : undefined,
        has_children: form.has_children,
        number_of_children: form.has_children ? form.number_of_children : undefined,
        additional_context: form.additional_context.trim() || undefined,
        employer_arranges_permit: form.employer_arranges_permit || undefined,
        employer_is_sponsor: form.employer_is_sponsor !== null ? form.employer_is_sponsor : undefined,
        already_in_netherlands: form.already_in_netherlands !== null ? form.already_in_netherlands : undefined,
        has_driving_licence: form.has_driving_licence !== null ? form.has_driving_licence : undefined,
        driving_licence_country: form.has_driving_licence ? form.driving_licence_country || undefined : undefined,
        children_school_stage: form.has_children ? form.children_school_stage || undefined : undefined,
        expects_30_ruling: form.expects_30_ruling !== null ? form.expects_30_ruling : undefined,
      })

      if (checklistResult.detail) {
        alert('Error: ' + JSON.stringify(checklistResult.detail))
        return
      }

      router.push('/dashboard')
    } catch (e) {
      console.error('Error:', e)
      alert('Something went wrong: ' + e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-50 dark:from-gray-900 to-indigo-100 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-6 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Building your relocation plan...</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">We are generating your personalised checklist.</p>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 mb-5">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">⚠️ Please don&apos;t close this tab</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">This takes about 2 minutes — your plan will be lost if you leave now.</p>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 italic min-h-[16px]">{LOADING_SAYINGS[sayingIndex]}</p>
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-5">
            Generated before?{' '}
            <a href="/dashboard" className="text-indigo-400 underline">Go to dashboard →</a>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 dark:from-gray-900 to-indigo-100 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg w-full max-w-lg p-8">

        {/* Progress — 6 steps */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4, 5, 6].map(s => (
            <div key={s} className={`h-2 flex-1 rounded-full ${s <= step ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
          ))}
        </div>

        {/* Step 1 — Name */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome! What&apos;s your name?</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Let&apos;s personalise your relocation plan.</p>
            <input
              type="text"
              placeholder="Your full name"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
            />
            <button
              onClick={() => setStep(2)}
              disabled={!form.full_name}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
              Continue →
            </button>
          </div>
        )}

        {/* Step 2 — Origin, employment, destination */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Where are you moving from?</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">We&apos;ll tailor your checklist to your specific situation.</p>
            <select
              value={form.origin_country}
              onChange={e => setForm(f => ({ ...f, origin_country: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4">
              <option value="">Select your country</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={form.employment_type}
              onChange={e => setForm(f => ({ ...f, employment_type: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4">
              <option value="employed">Moving for employment (salaried)</option>
              <option value="self_employed">Self-employed / Freelance</option>
              <option value="student">Student</option>
              <option value="family">Family reunification</option>
            </select>
            <select
              value={form.destination_city}
              onChange={e => setForm(f => ({ ...f, destination_city: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4">
              <option value="">Which city are you moving to? (optional)</option>
              <option value="amsterdam">Amsterdam</option>
              <option value="rotterdam">Rotterdam</option>
              <option value="den-haag">Den Haag</option>
              <option value="utrecht">Utrecht</option>
              <option value="eindhoven">Eindhoven</option>
              <option value="other">Other</option>
            </select>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!form.origin_country}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Logistics */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Tell us about your move</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">This helps us include the right tasks in your plan.</p>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">How are you moving your belongings?</label>
            <select
              value={form.shipping_type}
              onChange={e => setForm(f => ({ ...f, shipping_type: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3">
              <option value="luggage_only">Luggage / air freight only</option>
              <option value="container">Full container (FCL/LCL)</option>
              <option value="both">Both — luggage now, container later</option>
            </select>
            {(form.shipping_type === 'container' || form.shipping_type === 'both') && (
              <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs font-medium text-amber-800 mb-2">Containers take 2–14 weeks to arrive. When are you planning to ship?</p>
                <input
                  type="date"
                  value={form.container_ship_date}
                  onChange={e => setForm(f => ({ ...f, container_ship_date: e.target.value }))}
                  className="w-full border border-amber-200 bg-white rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <p className="text-xs text-amber-600 mt-1">Don&apos;t know yet? Leave blank — you can set it later.</p>
              </div>
            )}

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 mt-4">Does your employer provide a relocation or housing allowance?</label>
            <div className="flex gap-3 mb-5">
              <button onClick={() => setForm(f => ({ ...f, has_relocation_allowance: true }))} className={btn(form.has_relocation_allowance)}>Yes</button>
              <button onClick={() => setForm(f => ({ ...f, has_relocation_allowance: false }))} className={btn(!form.has_relocation_allowance)}>No</button>
            </div>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Are you bringing pets?</label>
            <div className="flex gap-3 mb-5">
              <button onClick={() => setForm(f => ({ ...f, has_pets: true }))} className={btn(form.has_pets)}>Yes</button>
              <button onClick={() => setForm(f => ({ ...f, has_pets: false }))} className={btn(!form.has_pets)}>No</button>
            </div>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Are you bringing children?</label>
            <div className="flex gap-3 mb-3">
              <button onClick={() => setForm(f => ({ ...f, has_children: true }))} className={btn(form.has_children)}>Yes</button>
              <button onClick={() => setForm(f => ({ ...f, has_children: false }))} className={btn(!form.has_children)}>No</button>
            </div>
            {form.has_children && (
              <div className="mb-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">How many children?</label>
                  <select
                    value={form.number_of_children}
                    onChange={e => setForm(f => ({ ...f, number_of_children: Number(e.target.value) }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">What age stage are your children?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { val: 'preschool', label: 'Pre-school (under 4)' },
                      { val: 'primary', label: 'Primary school (4–12)' },
                      { val: 'secondary', label: 'Secondary (12–18)' },
                      { val: 'both', label: 'Primary & secondary' },
                    ].map(({ val, label }) => (
                      <button key={val}
                        onClick={() => setForm(f => ({ ...f, children_school_stage: val }))}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition text-left ${
                          form.children_school_stage === val
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setForm(f => ({ ...f, children_school_stage: 'not_sure' }))}
                    className={`mt-2 w-full py-2 rounded-xl text-xs font-semibold border transition ${
                      form.children_school_stage === 'not_sure'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}>
                    Not sure / skip
                  </button>
                </div>
              </div>
            )}

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 mt-2">Is your partner relocating with you?</label>
            <div className="flex gap-3 mb-3">
              <button onClick={() => setForm(f => ({ ...f, has_partner: true }))} className={btn(form.has_partner)}>Yes</button>
              <button onClick={() => setForm(f => ({ ...f, has_partner: false }))} className={btn(!form.has_partner)}>No</button>
            </div>
            {form.has_partner && (
              <div className="mb-5 bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800 rounded-xl px-4 py-3 space-y-2">
                <p className="text-xs font-medium text-violet-800 dark:text-violet-300 mb-1">We&apos;ll generate partner-specific tasks and send them reminders too.</p>
                <input
                  type="text"
                  placeholder="Partner's full name"
                  value={form.partner_full_name}
                  onChange={e => setForm(f => ({ ...f, partner_full_name: e.target.value }))}
                  className="w-full border border-violet-200 dark:border-violet-700 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
                <input
                  type="email"
                  placeholder="Partner's email address"
                  value={form.partner_email}
                  onChange={e => setForm(f => ({ ...f, partner_email: e.target.value }))}
                  className="w-full border border-violet-200 dark:border-violet-700 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
                <select
                  value={form.partner_origin_country}
                  onChange={e => setForm(f => ({ ...f, partner_origin_country: e.target.value }))}
                  className="w-full border border-violet-200 dark:border-violet-700 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-400">
                  <option value="">Partner&apos;s origin country</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={() => setStep(2)}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                ← Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition">
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Permit & situation (NEW) */}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your permit &amp; situation</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Helps us tailor your visa and admin tasks. Skip anything you&apos;re unsure about.
            </p>

            {/* Permit arrangement */}
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Who is arranging your work permit?</label>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {[
                { val: 'employer', label: 'My employer (most common)' },
                { val: 'self', label: 'I\'m arranging it myself' },
                { val: 'eu_citizen', label: 'EU/EEA citizen — no permit needed' },
                { val: 'unsure', label: 'Not sure yet' },
              ].map(({ val, label }) => (
                <button key={val}
                  onClick={() => setForm(f => ({ ...f, employer_arranges_permit: val, employer_is_sponsor: null }))}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition text-left ${
                    form.employer_arranges_permit === val
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, employer_arranges_permit: '', employer_is_sponsor: null }))}
              className={`mb-5 w-full py-2 rounded-xl text-xs font-semibold border transition ${
                form.employer_arranges_permit === ''
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}>
              Skip this question
            </button>

            {/* IND sponsor — only if employer is handling */}
            {form.employer_arranges_permit === 'employer' && (
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Is your employer a registered IND sponsor?</label>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Most large companies are. If not, it adds 4–8 weeks before they can apply.</p>
                <div className="flex gap-3">
                  <button onClick={() => setForm(f => ({ ...f, employer_is_sponsor: true }))} className={btn(form.employer_is_sponsor === true)}>Yes</button>
                  <button onClick={() => setForm(f => ({ ...f, employer_is_sponsor: false }))} className={btn(form.employer_is_sponsor === false)}>No / not sure</button>
                  <button onClick={() => setForm(f => ({ ...f, employer_is_sponsor: null }))} className={btn(form.employer_is_sponsor === null)}>Skip</button>
                </div>
              </div>
            )}

            {/* Already in NL */}
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Are you already living in the Netherlands?</label>
            <div className="flex gap-3 mb-5">
              <button onClick={() => setForm(f => ({ ...f, already_in_netherlands: true }))} className={btn(form.already_in_netherlands === true)}>Yes, I&apos;m already here</button>
              <button onClick={() => setForm(f => ({ ...f, already_in_netherlands: false }))} className={btn(form.already_in_netherlands === false)}>No, moving from abroad</button>
              <button onClick={() => setForm(f => ({ ...f, already_in_netherlands: null }))} className={btn(form.already_in_netherlands === null)}>Skip</button>
            </div>

            {/* Driving licence */}
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Do you have a driving licence?</label>
            <div className="flex gap-3 mb-3">
              <button onClick={() => setForm(f => ({ ...f, has_driving_licence: true }))} className={btn(form.has_driving_licence === true)}>Yes</button>
              <button onClick={() => setForm(f => ({ ...f, has_driving_licence: false, driving_licence_country: '' }))} className={btn(form.has_driving_licence === false)}>No</button>
              <button onClick={() => setForm(f => ({ ...f, has_driving_licence: null, driving_licence_country: '' }))} className={btn(form.has_driving_licence === null)}>Skip</button>
            </div>
            {form.has_driving_licence === true && (
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Where was it issued?</label>
                <select
                  value={form.driving_licence_country}
                  onChange={e => setForm(f => ({ ...f, driving_licence_country: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select country (optional)</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
            {!form.has_driving_licence && form.has_driving_licence !== null && <div className="mb-5" />}

            {/* 30% ruling — only for salaried employees */}
            {form.employment_type === 'employed' && (
              <>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Do you expect to qualify for the 30% ruling?</label>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                  Tax benefit for international hires earning above the IND salary threshold — must apply within 4 months of your first Dutch workday.
                  <a href="/tools/30-ruling" target="_blank" className="text-indigo-500 dark:text-indigo-400 ml-1 underline">Check eligibility →</a>
                </p>
                <div className="flex gap-3 mb-2">
                  <button onClick={() => setForm(f => ({ ...f, expects_30_ruling: true }))} className={btn(form.expects_30_ruling === true)}>Yes, likely</button>
                  <button onClick={() => setForm(f => ({ ...f, expects_30_ruling: false }))} className={btn(form.expects_30_ruling === false)}>Probably not</button>
                  <button onClick={() => setForm(f => ({ ...f, expects_30_ruling: null }))} className={btn(form.expects_30_ruling === null)}>Not sure / skip</button>
                </div>
              </>
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(3)}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                ← Back
              </button>
              <button
                onClick={() => setStep(5)}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition">
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 5 — Move date */}
        {step === 5 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">When are you planning to move?</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">This helps us prioritise and sequence your tasks correctly.</p>
            <input
              type="date"
              value={form.move_date}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setForm(f => ({ ...f, move_date: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
            />
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">Don&apos;t know yet? Skip this — you can set it from your dashboard later.</p>
            <div className="flex gap-3">
              <button onClick={() => setStep(4)}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                ← Back
              </button>
              <button
                onClick={() => setStep(6)}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition">
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 6 — HR contact & generate */}
        {step === 6 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Do you have an HR or relocation contact?</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">They&apos;ll receive updates when you complete tasks. You can skip this.</p>
            <input
              type="text"
              placeholder="Contact name (e.g. Sarah — HR)"
              value={form.contact_name}
              onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
            />
            <input
              type="email"
              placeholder="Contact email address"
              value={form.contact_email}
              onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6"
            />

            <div className="mb-6">
              <label htmlFor="additional-context" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Anything specific about your situation? <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Steps already done, concerns, or anything unusual about your move. We&apos;ll use it to tailor your plan.
              </p>
              <textarea
                id="additional-context"
                value={form.additional_context}
                onChange={e => setForm(f => ({ ...f, additional_context: e.target.value }))}
                maxLength={800}
                rows={3}
                placeholder={`e.g. "I already have my IND approval letter and MVV appointment booked for next week. I also have two cats and a horse."`}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder-gray-400 dark:placeholder-gray-500"
              />
              {form.additional_context.length > 600 && (
                <p className="text-xs text-gray-400 text-right mt-1">{form.additional_context.length}/800</p>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(5)}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
                Generate my plan →
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
