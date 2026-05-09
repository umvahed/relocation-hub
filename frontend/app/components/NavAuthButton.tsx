'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function NavAuthButton() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session)
    })
  }, [])

  // Render nothing until auth state is known — prevents "Get started" flash for logged-in users
  if (loggedIn === null) return <div className="w-24 h-9" />

  if (loggedIn) {
    return (
      <Link href="/dashboard" className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
        My Dashboard →
      </Link>
    )
  }

  return (
    <Link href="/login" className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
      Get started
    </Link>
  )
}
