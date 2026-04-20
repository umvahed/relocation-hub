'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { getDocuments, deleteDocument } from '@/lib/api'
import { useRouter } from 'next/navigation'

const MIME_ICONS: Record<string, string> = {
  'application/pdf': '📄',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/gif': '🖼️',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
}

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
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
      const result = await getDocuments(data.user.id)
      setDocs(result.documents || [])
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
    setDeleting(null)
  }

  const grouped = docs.reduce<Record<string, any[]>>((acc, doc) => {
    const cat = doc.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(doc)
    return acc
  }, {})

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-sm text-indigo-600 animate-pulse font-medium">Loading documents...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-500 hover:text-gray-800 transition font-medium">
              ← Dashboard
            </button>
            <div className="text-base font-semibold tracking-tight text-gray-900">
              Relocation<span className="text-indigo-600">Hub</span>
              <span className="text-gray-400 font-normal ml-2 text-sm">/ Documents</span>
            </div>
          </div>
          <span className="text-xs text-gray-400">{docs.length} file{docs.length !== 1 ? 's' : ''}</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {docs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-3">📁</div>
            <p className="text-gray-500 text-sm">No documents uploaded yet.</p>
            <p className="text-gray-400 text-xs mt-1">Attach files to tasks from your dashboard.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([category, categoryDocs]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">
                  {category}
                </span>
                <span className="text-xs text-gray-400">{categoryDocs.length} file{categoryDocs.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2">
                {categoryDocs.map(doc => (
                  <div key={doc.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl flex-shrink-0">{MIME_ICONS[doc.mime_type] || '📎'}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatBytes(doc.file_size)} · {formatDate(doc.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => openFile(doc.file_path)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition px-3 py-1.5 rounded-lg hover:bg-indigo-50">
                        View
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={deleting === doc.id}
                        className="text-xs font-medium text-red-400 hover:text-red-600 transition px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-40">
                        {deleting === doc.id ? '...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )
}
