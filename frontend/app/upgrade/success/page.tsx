'use client'
export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function UpgradeSuccessPage() {
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => router.push('/dashboard'), 4000)
    return () => clearTimeout(t)
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-10 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">You&rsquo;re on Pro!</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          AI document validation, risk score, and unlimited storage are now unlocked. Redirecting you to your dashboard&hellip;
        </p>
        <div className="flex justify-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-6 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          Go to dashboard now
        </button>
      </div>
    </div>
  )
}
