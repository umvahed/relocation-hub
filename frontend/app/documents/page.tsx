'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { getDocuments, deleteDocument, getProfile, getDocumentValidation, validateDocument, downloadDocpack, sendDocpackToHr, type ValidationResult } from '@/lib/api'
import { useRouter } from 'next/navigation'
import AiConsentModal from '@/app/components/AiConsentModal'
import ValidationBadge from '@/app/components/ValidationBadge'

const MIME_ICONS: Record<string, string> = {
  'application/pdf': '📄',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/gif': '🖼️',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
}

const VALIDATABLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'])

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [validations, setValidations] = useState<Record<string, ValidationResult>>({})
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [validating, setValidating] = useState<string | null>(null)
  const [consentPending, setConsentPending] = useState<string | null>(null) // document_id waiting for consent
  const [downloadingDocpack, setDownloadingDocpack] = useState(false)
  const [sendingToHr, setSendingToHr] = useState(false)
  const [sentToHr, setSentToHr] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
      const [result, prof] = await Promise.all([
        getDocuments(data.user.id),
        getProfile(data.user.id),
      ])
      const fetchedDocs = result.documents || []
      setDocs(fetchedDocs)
      setProfile(prof)

      // Fetch existing validations for all documents
      if (prof.tier === 'paid') {
        const entries = await Promise.all(
          fetchedDocs.map(async (doc: any) => {
            try {
              const v = await getDocumentValidation(doc.id, data.user.id)
              return [doc.id, v] as const
            } catch {
              return null
            }
          })
        )
        setValidations(Object.fromEntries(entries.filter(Boolean) as [string, ValidationResult][]))
      }

      setLoading(false)
    })
  }, [])

  const openFile = async (filePath: string) => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(filePath, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const handleDelete = async (docId: string) => {
    if (!user) return
    setDeleting(docId)
    await deleteDocument(docId, user.id)
    setDocs(prev => prev.filter(d => d.id !== docId))
    setValidations(prev => { const n = { ...prev }; delete n[docId]; return n })
    setDeleting(null)
  }

  const triggerValidation = async (docId: string) => {
    if (!user || !profile) return
    if (!profile.ai_validation_consent) {
      setConsentPending(docId)
      return
    }
    await runValidation(docId)
  }

  const runValidation = async (docId: string) => {
    setValidating(docId)
    try {
      const result = await validateDocument(docId, user.id)
      setValidations(prev => ({ ...prev, [docId]: result }))
    } catch (err: any) {
      alert(err.message || 'Validation failed')
    } finally {
      setValidating(null)
    }
  }

  const handleConsent = async () => {
    setProfile((p: any) => ({ ...p, ai_validation_consent: true }))
    const docId = consentPending
    setConsentPending(null)
    if (docId) await runValidation(docId)
  }

  const handleDownloadDocpack = async () => {
    if (!user) return
    setDownloadingDocpack(true)
    try {
      await downloadDocpack(user.id)
    } catch (err: any) {
      alert(err.message || 'Failed to build document pack')
    } finally {
      setDownloadingDocpack(false)
    }
  }

  const handleSendToHr = async () => {
    if (!user) return
    setSendingToHr(true)
    try {
      await sendDocpackToHr(user.id)
      setSentToHr(true)
    } catch (err: any) {
      alert(err.message || 'Failed to send document pack')
    } finally {
      setSendingToHr(false)
    }
  }

  const grouped = docs.reduce<Record<string, any[]>>((acc, doc) => {
    const cat = doc.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(doc)
    return acc
  }, {})

  const isPaid = profile?.tier === 'paid'

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <p className="text-sm text-indigo-600 animate-pulse font-medium">Loading documents...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {consentPending && user && (
        <AiConsentModal
          userId={user.id}
          onConsent={handleConsent}
          onDecline={() => setConsentPending(null)}
        />
      )}

      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition font-medium">
              ← Dashboard
            </button>
            <div className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">
              Relocation<span className="text-indigo-600">Hub</span>
              <span className="text-gray-400 dark:text-gray-500 font-normal ml-2 text-sm">/ Documents</span>
            </div>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">{docs.length} file{docs.length === 1 ? '' : 's'}</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Upload, validate with AI, and share with your HR contact.
        </p>

        {!isPaid && docs.length > 0 && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl px-4 py-3.5 flex items-center gap-3">
            <span className="text-xl flex-shrink-0">✨</span>
            <div>
              <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">Unlock AI document validation</p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">Upgrade to paid plan to validate documents against IND 2025 requirements. <span className="font-medium">Coming soon.</span></p>
            </div>
          </div>
        )}

        {docs.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 py-3.5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Document Pack</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Cover page + all files bundled in one ZIP</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {profile?.contact_email && (
                <button
                  onClick={handleSendToHr}
                  disabled={sendingToHr || sentToHr}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
                >
                  {sentToHr ? 'Sent to HR!' : sendingToHr ? 'Sending…' : 'Send to HR'}
                </button>
              )}
              <button
                onClick={handleDownloadDocpack}
                disabled={downloadingDocpack}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {downloadingDocpack ? 'Building…' : 'Download'}
              </button>
            </div>
          </div>
        )}

        {docs.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
            <div className="text-4xl mb-3">📁</div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">No documents uploaded yet.</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Attach files to tasks from your dashboard.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([category, categoryDocs]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 capitalize">
                  {category}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{categoryDocs.length} file{categoryDocs.length === 1 ? '' : 's'}</span>
              </div>
              <div className="space-y-2">
                {categoryDocs.map(doc => {
                  const validation = validations[doc.id]
                  const canValidate = isPaid && VALIDATABLE_TYPES.has(doc.mime_type)
                  const isValidating = validating === doc.id
                  let validateLabel = 'Validate'
                  if (isValidating) validateLabel = 'Validating…'
                  else if (validation) validateLabel = 'Re-validate'
                  return (
                    <div key={doc.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xl flex-shrink-0">{MIME_ICONS[doc.mime_type] || '📎'}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.file_name}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              {formatBytes(doc.file_size)} · {formatDate(doc.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {canValidate && (
                            <button
                              onClick={() => triggerValidation(doc.id)}
                              disabled={isValidating}
                              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 disabled:opacity-40"
                            >
                              {validateLabel}
                            </button>
                          )}
                          <button
                            onClick={() => openFile(doc.file_path)}
                            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30">
                            View
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            disabled={deleting === doc.id}
                            className="text-xs font-medium text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 transition px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40">
                            {deleting === doc.id ? '...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                      {validation && (
                        <div className="pl-9">
                          <ValidationBadge validation={validation} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )
}
