'use client'
import { useEffect, useState } from 'react'

type Platform = 'android' | 'ios' | null

export default function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> } | null>(null)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (localStorage.getItem('pwa-install-dismissed')) return

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isStandalone = ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
      || window.matchMedia('(display-mode: standalone)').matches

    if (isStandalone) return

    if (isIos) {
      setPlatform('ios')
      setDismissed(false)
      return
    }

    function handleBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as typeof deferredPrompt)
      setPlatform('android')
      setDismissed(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  function dismiss() {
    localStorage.setItem('pwa-install-dismissed', '1')
    setDismissed(true)
  }

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      localStorage.setItem('pwa-install-dismissed', '1')
    }
    setDismissed(true)
  }

  if (dismissed || !platform) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold tracking-widest text-sm">V</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">Add Valryn to your home screen</p>
          {platform === 'android' ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">Install the app for quick access — works like a native app.</p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Tap <span className="font-medium text-gray-700 dark:text-gray-300">Share</span>
              {' '}then <span className="font-medium text-gray-700 dark:text-gray-300">"Add to Home Screen"</span>.
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {platform === 'android' && (
            <button
              onClick={install}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 whitespace-nowrap"
            >
              Install
            </button>
          )}
          <button
            onClick={dismiss}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
