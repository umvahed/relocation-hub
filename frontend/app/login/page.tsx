'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Mode = 'signin' | 'signup' | 'forgot' | 'check-email'

const GoogleIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const router = useRouter()

  const reset = (m: Mode) => { setMode(m); setError('') }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const handleSignIn = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Incorrect email or password.'
        : error.message)
      setLoading(false)
      return
    }
    if (data.user) {
      const { data: profile } = await supabase.from('profiles').select('id').eq('id', data.user.id).maybeSingle()
      router.push(profile ? '/dashboard' : '/onboarding')
    }
  }

  const handleSignUp = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) { setError(error.message); setLoading(false); return }
    setMode('check-email')
    setLoading(false)
  }

  const handleForgotPassword = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) { setError(error.message); setLoading(false); return }
    setMode('check-email')
    setLoading(false)
  }

  const inputClass = 'w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'
  const primaryBtn = 'w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50'

  // ── Check your email ──────────────────────────────────────────────
  if (mode === 'check-email') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg w-full max-w-md text-center">
          <div className="text-4xl mb-3">✉️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Check your email</h1>
          <p className="text-sm text-gray-500 mb-1">We sent a link to</p>
          <p className="text-sm font-semibold text-gray-800 mb-4">{email}</p>
          <p className="text-sm text-gray-500 mb-6">Click it to continue. Check your spam folder if it doesn't arrive within a minute.</p>
          <button onClick={() => reset('signin')} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition">
            ← Back to sign in
          </button>
        </div>
      </main>
    )
  }

  // ── Forgot password ───────────────────────────────────────────────
  if (mode === 'forgot') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg w-full max-w-md">
          <button onClick={() => reset('signin')} className="text-xs text-gray-400 hover:text-gray-600 transition mb-5 flex items-center gap-1">
            ← Back to sign in
          </button>
          <div className="text-3xl mb-3">🔑</div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Reset your password</h1>
          <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send a reset link.</p>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 mb-4">{error}</p>}

          <form onSubmit={handleForgotPassword} className="space-y-3">
            <input type="email" placeholder="Email address" value={email}
              onChange={e => setEmail(e.target.value)} required className={inputClass} />
            <button type="submit" disabled={loading} className={primaryBtn}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        </div>
      </main>
    )
  }

  // ── Sign in / Sign up ─────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 shadow-lg w-full max-w-md">

        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🇳🇱</div>
          <h1 className="text-xl font-bold text-gray-900">Welcome to RelocationHub</h1>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          <button
            onClick={() => reset('signin')}
            className={`flex-1 text-sm font-medium py-2 rounded-lg transition ${mode === 'signin' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            Sign in
          </button>
          <button
            onClick={() => reset('signup')}
            className={`flex-1 text-sm font-medium py-2 rounded-lg transition ${mode === 'signup' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            Create account
          </button>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 mb-4">{error}</p>}

        <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-3">
          <input type="email" placeholder="Email address" value={email}
            onChange={e => setEmail(e.target.value)} required className={inputClass} />
          <input type="password" placeholder="Password (min 8 characters)" value={password}
            onChange={e => setPassword(e.target.value)} required className={inputClass} />
          {mode === 'signup' && (
            <input type="password" placeholder="Confirm password" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} required className={inputClass} />
          )}
          <button type="submit" disabled={loading} className={primaryBtn}>
            {loading ? (mode === 'signin' ? 'Signing in…' : 'Creating account…')
              : (mode === 'signin' ? 'Sign in' : 'Create account')}
          </button>
        </form>

        {mode === 'signin' && (
          <button onClick={() => reset('forgot')}
            className="text-xs text-gray-400 hover:text-indigo-600 transition mt-3 block w-full text-center">
            Forgot password?
          </button>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <button onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-xl py-3 px-6 hover:bg-gray-50 transition text-sm font-medium text-gray-700">
          <GoogleIcon />
          Continue with Google
        </button>

        <p className="text-xs text-gray-400 mt-5 text-center">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </main>
  )
}
