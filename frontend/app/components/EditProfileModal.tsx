'use client'
import { useState } from 'react'
import { updateProfile, regenerateChecklist } from '@/lib/api'

const COUNTRIES = [
  'South Africa', 'United Kingdom', 'United States', 'Germany',
  'France', 'India', 'Australia', 'Canada', 'Spain', 'Italy',
  'Brazil', 'Nigeria', 'Kenya', 'Ghana', 'Zimbabwe', 'Other'
]

interface Props {
  userId: string
  profile: any
  onSave: (updatedProfile: any) => void
  onRegenerate: (newTasks: any[]) => void
  onClose: () => void
}

export default function EditProfileModal({ userId, profile, onSave, onRegenerate, onClose }: Props) {
  const [form, setForm] = useState({
    full_name: profile.full_name || '',
    origin_country: profile.origin_country || '',
    move_date: profile.move_date || '',
    employment_type: profile.employment_type || 'employed',
    shipping_type: profile.shipping_type || 'luggage_only',
    has_pets: profile.has_pets ?? false,
    has_relocation_allowance: profile.has_relocation_allowance ?? false,
    contact_name: profile.contact_name || '',
    contact_email: profile.contact_email || '',
    destination_city: profile.destination_city || '',
    has_children: profile.has_children ?? false,
    number_of_children: profile.number_of_children ?? 1,
    container_ship_date: profile.container_ship_date || '',
  })
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [showRegenConfirm, setShowRegenConfirm] = useState(false)
  const [error, setError] = useState('')

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const updated = await updateProfile(userId, {
        ...form,
        move_date: form.move_date || undefined,
        contact_name: form.contact_name || undefined,
        contact_email: form.contact_email || undefined,
        destination_city: form.destination_city || undefined,
        number_of_children: form.has_children ? form.number_of_children : undefined,
        container_ship_date: form.container_ship_date || undefined,
      })
      onSave(updated)
      onClose()
    } catch (e: any) {
      setError(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    setError('')
    try {
      await updateProfile(userId, {
        ...form,
        move_date: form.move_date || undefined,
        contact_name: form.contact_name || undefined,
        contact_email: form.contact_email || undefined,
        destination_city: form.destination_city || undefined,
        number_of_children: form.has_children ? form.number_of_children : undefined,
        container_ship_date: form.container_ship_date || undefined,
      })
      const result = await regenerateChecklist(userId)
      onRegenerate(result.tasks || [])
      onClose()
    } catch (e: any) {
      setError(e.message || 'Regeneration failed')
      setRegenerating(false)
    }
  }

  const inputClass = 'w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-400'
  const labelClass = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5'
  const toggleBtn = (active: boolean) => `flex-1 py-2 rounded-lg text-sm font-medium border transition ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 px-4 py-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Edit profile & plan</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Update your details, then save or regenerate your checklist.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">

          {/* Name + country */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Full name</label>
              <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)} className={inputClass} placeholder="Your name" />
            </div>
            <div>
              <label className={labelClass}>Origin country</label>
              <select value={form.origin_country} onChange={e => set('origin_country', e.target.value)} className={inputClass}>
                <option value="">Select country</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Move date */}
          <div>
            <label className={labelClass}>Move date <span className="normal-case font-normal text-gray-400">(optional)</span></label>
            <input type="date" value={form.move_date} min={new Date().toISOString().split('T')[0]}
              onChange={e => set('move_date', e.target.value)} className={inputClass} />
          </div>

          {/* Employment type */}
          <div>
            <label className={labelClass}>Employment type</label>
            <select value={form.employment_type} onChange={e => set('employment_type', e.target.value)} className={inputClass}>
              <option value="employed">Moving for employment</option>
              <option value="self_employed">Self-employed / Freelance</option>
              <option value="student">Student</option>
              <option value="family">Family reunification</option>
            </select>
          </div>

          {/* Shipping */}
          <div>
            <label className={labelClass}>How are you moving your belongings?</label>
            <div className="flex gap-2">
              <button onClick={() => set('shipping_type', 'luggage_only')} className={toggleBtn(form.shipping_type === 'luggage_only')}>Luggage only</button>
              <button onClick={() => set('shipping_type', 'container')} className={toggleBtn(form.shipping_type === 'container')}>Container</button>
              <button onClick={() => set('shipping_type', 'both')} className={toggleBtn(form.shipping_type === 'both')}>Both</button>
            </div>
          </div>

          {/* Destination city */}
          <div>
            <label className={labelClass}>Destination city <span className="normal-case font-normal text-gray-400">(optional)</span></label>
            <select value={form.destination_city} onChange={e => set('destination_city', e.target.value)} className={inputClass}>
              <option value="">Select city</option>
              <option value="amsterdam">Amsterdam</option>
              <option value="rotterdam">Rotterdam</option>
              <option value="den-haag">Den Haag</option>
              <option value="utrecht">Utrecht</option>
              <option value="eindhoven">Eindhoven</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Container ship date */}
          {(form.shipping_type === 'container' || form.shipping_type === 'both') && (
            <div>
              <label className={labelClass}>Container ship date <span className="normal-case font-normal text-gray-400">(optional)</span></label>
              <input type="date" value={form.container_ship_date}
                onChange={e => set('container_ship_date', e.target.value)} className={inputClass} />
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Containers typically take 2–14 weeks to arrive depending on your origin country.</p>
            </div>
          )}

          {/* Pets + allowance */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Bringing pets?</label>
              <div className="flex gap-2">
                <button onClick={() => set('has_pets', true)} className={toggleBtn(form.has_pets)}>Yes</button>
                <button onClick={() => set('has_pets', false)} className={toggleBtn(!form.has_pets)}>No</button>
              </div>
            </div>
            <div>
              <label className={labelClass}>Relocation allowance?</label>
              <div className="flex gap-2">
                <button onClick={() => set('has_relocation_allowance', true)} className={toggleBtn(form.has_relocation_allowance)}>Yes</button>
                <button onClick={() => set('has_relocation_allowance', false)} className={toggleBtn(!form.has_relocation_allowance)}>No</button>
              </div>
            </div>
          </div>

          {/* Children */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Bringing children?</label>
              <div className="flex gap-2">
                <button onClick={() => set('has_children', true)} className={toggleBtn(form.has_children)}>Yes</button>
                <button onClick={() => set('has_children', false)} className={toggleBtn(!form.has_children)}>No</button>
              </div>
            </div>
            {form.has_children && (
              <div>
                <label className={labelClass}>How many?</label>
                <select value={form.number_of_children} onChange={e => set('number_of_children', Number(e.target.value))} className={inputClass}>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* HR contact */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">HR / relocation contact <span className="normal-case font-normal text-gray-400">(optional)</span></p>
            <input type="text" value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
              placeholder="Contact name (e.g. Sarah — HR)" className={inputClass} />
            <input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)}
              placeholder="Contact email address" className={inputClass} />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2.5">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0 space-y-3">
          {!showRegenConfirm ? (
            <div className="flex gap-3">
              <button onClick={onClose} disabled={saving || regenerating}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || regenerating || !form.origin_country}
                className="flex-1 py-2.5 rounded-xl bg-gray-900 dark:bg-gray-100 text-sm font-medium text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-white transition disabled:opacity-50">
                {saving ? 'Saving…' : 'Save profile'}
              </button>
              <button onClick={() => setShowRegenConfirm(true)} disabled={saving || regenerating || !form.origin_country}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 transition disabled:opacity-50">
                Save & regenerate
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Regenerate checklist?</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">This will delete all your current tasks and create a fresh plan from your updated profile. Completed tasks and attached documents will be lost.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowRegenConfirm(false)} disabled={regenerating}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50">
                  Go back
                </button>
                <button onClick={handleRegenerate} disabled={regenerating}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {regenerating && (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {regenerating ? 'Generating…' : 'Yes, regenerate'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
