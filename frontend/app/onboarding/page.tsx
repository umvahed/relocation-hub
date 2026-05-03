'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { onboardUser, generateChecklist, getChecklist, updateProfile } from '@/lib/api'
import { useRouter } from 'next/navigation'

const COUNTRIES = [
  'South Africa', 'United Kingdom', 'United States', 'Germany',
  'France', 'India', 'Australia', 'Canada', 'Spain', 'Italy',
  'Brazil', 'Nigeria', 'Kenya', 'Ghana', 'Zimbabwe', 'Other'
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
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
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      // Already onboarded — skip the form
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
      })

      const checklistResult = await generateChecklist({
        user_id: user.id,
        origin_country: form.origin_country,
        employment_type: form.employment_type,
        move_date: form.move_date,
        has_pets: form.has_pets,
        shipping_type: form.shipping_type,
        has_relocation_allowance: form.has_relocation_allowance,
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-8">

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4, 5].map(s => (
            <div key={s} className={`h-2 flex-1 rounded-full ${s <= step ? 'bg-indigo-600' : 'bg-gray-200'}`} />
          ))}
        </div>

        {/* Step 1 — Name */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome! What's your name?</h2>
            <p className="text-gray-500 mb-6">Let's personalise your relocation plan.</p>
            <input
              type="text"
              placeholder="Your full name"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
            />
            <button
              onClick={() => setStep(2)}
              disabled={!form.full_name}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
              Continue →
            </button>
          </div>
        )}

        {/* Step 2 — Origin & employment */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Where are you moving from?</h2>
            <p className="text-gray-500 mb-6">We'll tailor your checklist to your specific situation.</p>
            <select
              value={form.origin_country}
              onChange={e => setForm(f => ({ ...f, origin_country: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4">
              <option value="">Select your country</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={form.employment_type}
              onChange={e => setForm(f => ({ ...f, employment_type: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4">
              <option value="employed">Moving for employment</option>
              <option value="self_employed">Self-employed / Freelance</option>
              <option value="student">Student</option>
              <option value="family">Family reunification</option>
            </select>
            <select
              value={form.destination_city}
              onChange={e => setForm(f => ({ ...f, destination_city: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4">
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
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition">
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Tell us about your move</h2>
            <p className="text-gray-500 mb-6">This helps us include the right tasks in your plan.</p>

            <label className="block text-sm font-medium text-gray-700 mb-2">How are you moving your belongings?</label>
            <select
              value={form.shipping_type}
              onChange={e => setForm(f => ({ ...f, shipping_type: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-5">
              <option value="luggage_only">Luggage / carry-on only</option>
              <option value="container">Shipping a container</option>
            </select>

            <label className="block text-sm font-medium text-gray-700 mb-3">Does your employer provide a relocation or housing allowance?</label>
            <div className="flex gap-3 mb-5">
              <button
                onClick={() => setForm(f => ({ ...f, has_relocation_allowance: true }))}
                className={`flex-1 py-3 rounded-xl font-semibold border transition ${form.has_relocation_allowance ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                Yes
              </button>
              <button
                onClick={() => setForm(f => ({ ...f, has_relocation_allowance: false }))}
                className={`flex-1 py-3 rounded-xl font-semibold border transition ${!form.has_relocation_allowance ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                No
              </button>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-3">Are you bringing pets?</label>
            <div className="flex gap-3 mb-5">
              <button
                onClick={() => setForm(f => ({ ...f, has_pets: true }))}
                className={`flex-1 py-3 rounded-xl font-semibold border transition ${form.has_pets ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                Yes
              </button>
              <button
                onClick={() => setForm(f => ({ ...f, has_pets: false }))}
                className={`flex-1 py-3 rounded-xl font-semibold border transition ${!form.has_pets ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                No
              </button>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-3">Are you bringing children?</label>
            <div className="flex gap-3 mb-3">
              <button
                onClick={() => setForm(f => ({ ...f, has_children: true }))}
                className={`flex-1 py-3 rounded-xl font-semibold border transition ${form.has_children ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                Yes
              </button>
              <button
                onClick={() => setForm(f => ({ ...f, has_children: false }))}
                className={`flex-1 py-3 rounded-xl font-semibold border transition ${!form.has_children ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                No
              </button>
            </div>
            {form.has_children && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">How many children?</label>
                <select
                  value={form.number_of_children}
                  onChange={e => setForm(f => ({ ...f, number_of_children: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            )}
            {!form.has_children && <div className="mb-6" />}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition">
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

        {/* Step 4 — Move date */}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">When are you planning to move?</h2>
            <p className="text-gray-500 mb-6">This helps us prioritise and sequence your tasks correctly.</p>
            <input
              type="date"
              value={form.move_date}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setForm(f => ({ ...f, move_date: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
            />
            <p className="text-sm text-gray-400 mb-6">Don't know yet? Skip this — you can set it from your dashboard later.</p>
            <div className="flex gap-3">
              <button onClick={() => setStep(3)}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition">
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

        {/* Step 5 — HR contact (optional) & generate */}
        {step === 5 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Do you have an HR or relocation contact?</h2>
            <p className="text-gray-500 mb-6">They'll receive updates when you complete tasks. You can skip this.</p>
            <input
              type="text"
              placeholder="Contact name (e.g. Sarah — HR)"
              value={form.contact_name}
              onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
            />
            <input
              type="email"
              placeholder="Contact email address"
              value={form.contact_email}
              onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6"
            />
            <div className="flex gap-3">
              <button onClick={() => setStep(4)}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition">
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
                {loading ? 'Generating your plan...' : 'Generate my plan →'}
              </button>
            </div>
            {loading && (
              <p className="text-center text-sm text-indigo-600 mt-4 animate-pulse">
                We're generating your personalised checklist...
              </p>
            )}
          </div>
        )}

      </div>
    </main>
  )
}
