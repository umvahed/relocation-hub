'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    // PKCE flow: code in query params
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(() => setReady(true))
      return
    }
    // Implicit flow: recovery event fired from URL hash token
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleReset = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
  }

  const inputClass = 'w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'

  if (!ready) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-10 shadow-lg w-full max-w-md text-center">
          <p className="text-sm text-gray-400 animate-pulse">Verifying reset link…</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 shadow-lg w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🔑</div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Set a new password</h1>
          <p className="text-sm text-gray-500">Choose something strong and memorable.</p>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 mb-4">{error}</p>}

        <form onSubmit={handleReset} className="space-y-3">
          <input type="password" placeholder="New password (min 8 characters)"
            value={password} onChange={e => setPassword(e.target.value)}
            required className={inputClass} />
          <input type="password" placeholder="Confirm new password"
            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
            required className={inputClass} />
          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
            {loading ? 'Updating…' : 'Set new password'}
          </button>
        </form>
      </div>
    </main>
  )
}
