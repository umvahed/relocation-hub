'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { getChecklist, updateTask, getUsage, setDueDate, getProfile, deleteAccount, getRiskScore, updateConsent, updateProfile, getDocumentValidation, validateDocument, createCustomTask, deleteTask, type RiskScore, type ValidationResult } from '@/lib/api'
import RiskScoreWidget from '@/app/components/RiskScoreWidget'
import IndMonitorWidget from '@/app/components/IndMonitorWidget'
import ResourcesWidget from '@/app/components/ResourcesWidget'
import ThemeToggle from '@/app/components/ThemeToggle'
import AiConsentModal from '@/app/components/AiConsentModal'
import EditProfileModal from '@/app/components/EditProfileModal'
import { compressImage, formatBytes, MAX_FILE_SIZE_FREE, MAX_FILE_SIZE_PAID, STORAGE_QUOTA_FREE, STORAGE_QUOTA_PAID } from '@/lib/storage'
import { useRouter } from 'next/navigation'

const SECTION_ORDER = ['critical', 'visa', 'employment', 'transport', 'shipping', 'admin', 'housing', 'banking', 'healthcare', 'pets']

const LEGAL_DEADLINE_RE = /gemeente|inschrijving|zorgverzekering|health insurance|driving licen|rdw|digid/i
const dueDateLabel = (task: any) =>
  LEGAL_DEADLINE_RE.test(task.title + ' ' + (task.description || '')) ? 'Legal deadline' : 'Target date'
const PRE_DEPARTURE_CATS = new Set(['critical', 'visa', 'employment', 'transport', 'shipping'])
const POST_ARRIVAL_CATS = new Set(['admin', 'housing', 'banking', 'healthcare', 'pets'])
const VALIDATABLE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'])

const SECTION_META: Record<string, { label: string; color: string; text: string; border: string }> = {
  critical:   { label: 'Critical — Required First', color: 'bg-rose-50 dark:bg-rose-900/20',    text: 'text-rose-700 dark:text-rose-300',    border: 'border-rose-400'   },
  visa:       { label: 'Visa & Immigration',         color: 'bg-red-50 dark:bg-red-900/20',      text: 'text-red-700 dark:text-red-300',      border: 'border-red-400'    },
  admin:      { label: 'Dutch Administration',        color: 'bg-gray-100 dark:bg-gray-700',      text: 'text-gray-700 dark:text-gray-300',    border: 'border-gray-400'   },
  employment: { label: 'Employment',                 color: 'bg-purple-50 dark:bg-purple-900/20',text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-400' },
  housing:    { label: 'Housing',                    color: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-700 dark:text-blue-300',    border: 'border-blue-400'   },
  banking:    { label: 'Banking & Finance',          color: 'bg-emerald-50 dark:bg-emerald-900/20',text: 'text-emerald-700 dark:text-emerald-300',border: 'border-emerald-400'},
  healthcare: { label: 'Healthcare',                 color: 'bg-pink-50 dark:bg-pink-900/20',    text: 'text-pink-700 dark:text-pink-300',    border: 'border-pink-400'   },
  transport:  { label: 'Transport',                  color: 'bg-amber-50 dark:bg-amber-900/20',  text: 'text-amber-700 dark:text-amber-300',  border: 'border-amber-400'  },
  shipping:   { label: 'Shipping & Logistics',       color: 'bg-orange-50 dark:bg-orange-900/20',text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-400' },
  pets:       { label: 'Pet Relocation',             color: 'bg-lime-50 dark:bg-lime-900/20',    text: 'text-lime-700 dark:text-lime-300',    border: 'border-lime-400'   },
}

function CountdownBanner({ moveDate }: { moveDate: string }) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const move = new Date(moveDate); move.setHours(0, 0, 0, 0)
  const daysLeft = Math.round((move.getTime() - today.getTime()) / 86400000)
  const formattedDate = move.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  if (daysLeft < 0) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl px-4 py-3.5 flex items-center gap-3">
        <span className="text-xl flex-shrink-0">🌷</span>
        <div>
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Welcome to the Netherlands!</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
            You moved {Math.abs(daysLeft)} day{Math.abs(daysLeft) !== 1 ? 's' : ''} ago — keep ticking off the list.
          </p>
        </div>
      </div>
    )
  }

  if (daysLeft === 0) {
    const pieces = ['🎉', '🇳🇱', '🌷', '✈️', '🎊', '🎈', '⭐', '🥳']
    return (
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl px-5 py-6 text-white text-center">
        {pieces.map((emoji, i) => (
          <span key={i} className="confetti-piece absolute text-2xl"
            style={{ left: `${5 + i * 12}%`, bottom: '8px', animationDelay: `${i * 0.35}s`, animationDuration: `${2.4 + (i % 3) * 0.4}s` }}>
            {emoji}
          </span>
        ))}
        <p className="text-2xl font-bold mb-1">Today's the day! 🎉</p>
        <p className="text-sm opacity-90">Welcome to the Netherlands — your new chapter starts now.</p>
      </div>
    )
  }

  const urgency = daysLeft <= 7 ? 'rose' : daysLeft <= 30 ? 'amber' : 'indigo'
  const styles = {
    rose:   'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300',
    amber:  'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300',
  }
  const numStyles = {
    rose:   'text-rose-600 dark:text-rose-400',
    amber:  'text-amber-600 dark:text-amber-400',
    indigo: 'text-indigo-600 dark:text-indigo-400',
  }

  return (
    <div className={`${styles[urgency]} border rounded-2xl px-4 py-3.5 flex items-center justify-between gap-4`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xl flex-shrink-0">✈️</span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-60">Moving to the Netherlands</p>
          <p className="text-sm font-medium truncate">{formattedDate}</p>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-3xl font-bold leading-none ${numStyles[urgency]}`}>{daysLeft}</p>
        <p className="text-xs font-medium opacity-60 mt-0.5">day{daysLeft !== 1 ? 's' : ''} to go</p>
      </div>
    </div>
  )
}

const CONTAINER_WEEKS: Record<string, [number, number]> = {
  'South Africa': [7, 10], 'United Kingdom': [2, 4], 'United States': [6, 8],
  'Germany': [1, 3], 'France': [1, 3], 'India': [6, 8], 'Australia': [10, 14],
  'Canada': [6, 8], 'Spain': [2, 4], 'Italy': [2, 4], 'Brazil': [7, 9],
  'Nigeria': [5, 7], 'Kenya': [6, 8], 'Ghana': [5, 7], 'Zimbabwe': [8, 11],
}

function ContainerArrivalBanner({ shipDate, originCountry }: { shipDate: string; originCountry: string }) {
  const [min, max] = CONTAINER_WEEKS[originCountry] ?? [7, 10]
  const ship = new Date(shipDate)
  const earliest = new Date(ship); earliest.setDate(earliest.getDate() + min * 7)
  const latest = new Date(ship); latest.setDate(latest.getDate() + max * 7)
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const shipped = ship <= today
  const arrived = latest < today
  return (
    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl px-4 py-3.5 flex items-center gap-3">
      <span className="text-xl flex-shrink-0">🚢</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 uppercase tracking-wide">Container shipment</p>
        {arrived
          ? <p className="text-sm text-orange-800 dark:text-orange-200">Your container should have arrived. Confirm delivery with your moving company.</p>
          : <p className="text-sm text-orange-800 dark:text-orange-200">
              {shipped ? 'Shipped' : 'Ships'} {fmt(ship)} · Estimated arrival <span className="font-semibold">{fmt(earliest)}–{fmt(latest)}</span> · Allow extra time for customs clearance.
            </p>
        }
        <a href="#section-shipping" className="inline-block mt-1 text-xs font-medium text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200 underline underline-offset-2 transition">
          See your Shipping &amp; Logistics tasks →
        </a>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [taskDocs, setTaskDocs] = useState<Record<string, any[]>>({})
  const [taskValidations, setTaskValidations] = useState<Record<string, ValidationResult | null>>({})
  const [taskBlockMsg, setTaskBlockMsg] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState<string | null>(null)
  const [usage, setUsage] = useState<any | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [riskScore, setRiskScore] = useState<RiskScore | null>(null)
  const [showRiskNudge, setShowRiskNudge] = useState(false)
  const [validatingDoc, setValidatingDoc] = useState<string | null>(null)
  const [consentPendingDoc, setConsentPendingDoc] = useState<string | null>(null)
  const [storageUsed, setStorageUsed] = useState(0)
  const [addingTaskCat, setAddingTaskCat] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [savingTask, setSavingTask] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
      const result = await getChecklist(data.user.id)
      setTasks(result.tasks || [])
      getUsage(data.user.id).then(setUsage).catch(() => null)
      const prof = await getProfile(data.user.id).catch(() => null)
      setProfile(prof)
      if (prof?.tier === 'paid') {
        getRiskScore(data.user.id).then(setRiskScore).catch(() => null)
      }
      // Load storage usage
      const { data: docs } = await supabase.from('documents').select('file_size').eq('user_id', data.user.id)
      if (docs) setStorageUsed(docs.reduce((sum, d) => sum + (d.file_size || 0), 0))
      setLoading(false)
    })
  }, [])

  const toggleTask = async (task: any) => {
    if (task.status !== 'completed' && task.category === 'critical' && isPaid) {
      const docs = taskDocs[task.id] || []
      const blockedDoc = docs.find(d => taskValidations[d.id]?.status === 'fail' || taskValidations[d.id]?.status === 'warn')
      if (blockedDoc) {
        const v = taskValidations[blockedDoc.id]
        const reason = v?.status === 'fail' ? 'failed validation' : 'has unresolved warnings'
        setTaskBlockMsg(prev => ({ ...prev, [task.id]: `"${blockedDoc.file_name}" ${reason} — resolve all document issues before marking this critical task complete.` }))
        return
      }
    }
    setTaskBlockMsg(prev => { const n = { ...prev }; delete n[task.id]; return n })
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    await updateTask(task.id, newStatus)
    setTasks(prev => {
      const updated = prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t)
      if (isPaid && newStatus === 'completed' && task.category === 'critical') {
        const allCriticalDone = updated.filter(t => t.category === 'critical').every(t => t.status === 'completed')
        if (allCriticalDone) setShowRiskNudge(true)
      }
      return updated
    })
  }

  const toggleExpand = async (taskId: string) => {
    if (expandedId === taskId) { setExpandedId(null); return }
    setExpandedId(taskId)
    if (!taskDocs[taskId]) {
      const { data } = await supabase.from('documents').select('*').eq('task_id', taskId)
      const docs = data || []
      setTaskDocs(prev => ({ ...prev, [taskId]: docs }))
      if (isPaid && docs.length > 0) {
        docs.forEach((doc: any) => {
          if (taskValidations[doc.id] !== undefined) return
          getDocumentValidation(doc.id, user.id)
            .then(v => setTaskValidations(prev => ({ ...prev, [doc.id]: v })))
            .catch(() => setTaskValidations(prev => ({ ...prev, [doc.id]: null })))
        })
      }
    }
  }

  const handleFileUpload = async (taskId: string, category: string, file: File) => {
    const maxFileSize = isPaid ? MAX_FILE_SIZE_PAID : MAX_FILE_SIZE_FREE
    const quota = isPaid ? STORAGE_QUOTA_PAID : STORAGE_QUOTA_FREE

    if (file.size > maxFileSize) {
      alert(`File too large. Maximum is ${formatBytes(maxFileSize)} per file.`)
      return
    }
    if (storageUsed + file.size > quota) {
      alert(`Storage full. You've used ${formatBytes(storageUsed)} of your ${formatBytes(quota)} quota.`)
      return
    }

    const processed = await compressImage(file)
    setUploading(taskId)
    const path = `${user.id}/${taskId}/${Date.now()}-${processed.name}`
    const { data, error } = await supabase.storage.from('documents').upload(path, processed)
    if (!error && data) {
      const { data: newDoc } = await supabase.from('documents').insert({
        user_id: user.id, task_id: taskId,
        file_name: file.name, file_path: data.path,
        file_size: processed.size, mime_type: processed.type, category,
      }).select()
      setStorageUsed(prev => prev + processed.size)
      const { data: docs } = await supabase.from('documents').select('*').eq('task_id', taskId)
      setTaskDocs(prev => ({ ...prev, [taskId]: docs || [] }))

      const task = tasks.find(t => t.id === taskId)
      const docId = newDoc?.[0]?.id
      if (docId && task?.category === 'critical' && isPaid && profile?.ai_validation_consent && VALIDATABLE_MIME_TYPES.has(processed.type)) {
        validateDocument(docId, user.id)
          .then(result => setTaskValidations(prev => ({ ...prev, [docId]: result })))
          .catch(() => null)
      }
    }
    setUploading(null)
  }

  const handleDueDateChange = async (taskId: string, due_date: string) => {
    await setDueDate(taskId, due_date)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, due_date } : t))
  }

  const handleInlineValidate = async (docId: string, skipConsentCheck = false) => {
    if (!skipConsentCheck && !profile?.ai_validation_consent) {
      setConsentPendingDoc(docId)
      return
    }
    setValidatingDoc(docId)
    try {
      const result = await validateDocument(docId, user.id)
      setTaskValidations(prev => ({ ...prev, [docId]: result }))
    } catch { /* silent — user can validate from Documents page */ }
    finally { setValidatingDoc(null) }
  }

  const openFile = async (filePath: string) => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(filePath, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const handleAddCustomTask = async (category: string) => {
    if (!newTaskTitle.trim() || !user) return
    setSavingTask(true)
    try {
      const result = await createCustomTask({ user_id: user.id, title: newTaskTitle.trim(), category })
      if (result.task) setTasks(prev => [...prev, result.task])
      setNewTaskTitle('')
      setAddingTaskCat(null)
    } catch { /* silent */ }
    finally { setSavingTask(false) }
  }

  const handleDeleteCustomTask = async (taskId: string) => {
    if (!user) return
    await deleteTask(taskId, user.id).catch(() => null)
    setTasks(prev => prev.filter(t => t.id !== taskId))
    setTaskDocs(prev => { const n = { ...prev }; delete n[taskId]; return n })
  }

  const googleCalendarUrl = (task: any) => {
    const title = encodeURIComponent(task.title)
    const details = encodeURIComponent(task.description || '')
    const date = task.due_date?.replace(/-/g, '') || ''
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${date}/${date}`
  }

  const signOut = async () => { await supabase.auth.signOut(); router.push('/') }

  const handleDeleteAccount = async () => {
    if (!user) return
    setDeletingAccount(true)
    try {
      await deleteAccount(user.id)
      await supabase.auth.signOut()
      router.push('/')
    } catch { setDeletingAccount(false); setDeleteConfirm(false) }
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false); setDeleteConfirm(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const completed = tasks.filter(t => t.status === 'completed').length
  const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there'
  const criticalTasks = tasks.filter(t => t.category === 'critical')
  const criticalAllDone = criticalTasks.length === 0 || criticalTasks.every(t => t.status === 'completed')
  const criticalRemaining = criticalTasks.filter(t => t.status !== 'completed').length
  const isPaid = profile?.tier === 'paid'
  const storageQuota = isPaid ? STORAGE_QUOTA_PAID : STORAGE_QUOTA_FREE
  const storagePercent = Math.min(100, Math.round((storageUsed / storageQuota) * 100))

  const searchLower = search.toLowerCase()
  const filteredTasks = search
    ? tasks.filter(t =>
        t.title?.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower) ||
        t.category?.toLowerCase().includes(searchLower)
      )
    : tasks

  const sections = SECTION_ORDER
    .map(cat => ({
      cat,
      meta: SECTION_META[cat] || { label: cat, color: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-400' },
      tasks: filteredTasks.filter(t => t.category === cat).sort((a, b) => b.priority - a.priority),
    }))
    .filter(s => s.tasks.length > 0)

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <p className="text-sm text-indigo-600 animate-pulse font-medium">Loading your relocation plan...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {showEditProfile && user && profile && (
        <EditProfileModal
          userId={user.id}
          profile={profile}
          onSave={(updated) => { setProfile(updated) }}
          onRegenerate={(newTasks) => {
            setTasks(newTasks)
            setTaskDocs({})
            setExpandedId(null)
          }}
          onClose={() => setShowEditProfile(false)}
        />
      )}

      {consentPendingDoc && user && (
        <AiConsentModal
          userId={user.id}
          onConsent={() => {
            setProfile((p: any) => ({ ...p, ai_validation_consent: true }))
            const docId = consentPendingDoc
            setConsentPendingDoc(null)
            if (docId) handleInlineValidate(docId, true)
          }}
          onDecline={() => setConsentPendingDoc(null)}
        />
      )}

      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex justify-between items-center">
          <div className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">
            Relocation<span className="text-indigo-600">Hub</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/documents')}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Documents
              <span className="px-1 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold leading-none">AI</span>
            </button>
            {user && (
              <a href={`${process.env.NEXT_PUBLIC_API_URL}/api/calendar/${user.id}/feed.ics`}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Export calendar
              </a>
            )}
            {usage && (
              <span className={`hidden sm:block text-xs font-medium px-2.5 py-1 rounded-full ${
                usage.checklist_calls >= usage.checklist_limit ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  : usage.checklist_calls >= usage.checklist_limit - 1 ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}>
                {usage.checklist_calls}/{usage.checklist_limit} AI calls
              </span>
            )}

            {/* Settings */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => { setShowSettings(s => !s); setDeleteConfirm(false) }}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition ${showSettings ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {showSettings && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-30 overflow-hidden">

                  {/* User */}
                  <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                        {firstName[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{profile?.full_name || firstName}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Profile details */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 space-y-2">
                    {profile?.move_date ? (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Moving date</span>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                          {new Date(profile.move_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600 dark:text-amber-400">No move date set — expand a task to add due dates.</p>
                    )}
                    {profile?.contact_name && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400">HR contact</span>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate ml-4 max-w-[160px]">{profile.contact_name}</span>
                      </div>
                    )}
                    {profile?.contact_email && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Contact email</span>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate ml-4 max-w-[160px]">{profile.contact_email}</span>
                      </div>
                    )}
                  </div>

                  {/* Edit profile */}
                  <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => { setShowSettings(false); setShowEditProfile(true) }}
                      className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition w-full text-left font-medium">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit profile &amp; plan
                    </button>
                  </div>

                  {/* 30% Ruling tool */}
                  <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
                    <a
                      href="/tools/30-ruling"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition w-full text-left font-medium">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      30% Ruling calculator
                    </a>
                  </div>

                  {/* Storage usage */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Storage</span>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{formatBytes(storageUsed)} / {formatBytes(storageQuota)}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${storagePercent >= 90 ? 'bg-red-500' : storagePercent >= 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                        style={{ width: `${storagePercent}%` }}
                      />
                    </div>
                  </div>

                  {/* AI consent withdrawal */}
                  {profile?.ai_validation_consent && (
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                      <button
                        onClick={async () => { await updateConsent(user.id, false); setProfile((p: any) => ({ ...p, ai_validation_consent: false })) }}
                        className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition w-full text-left">
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        Withdraw AI processing consent
                      </button>
                    </div>
                  )}

                  {/* Email alerts toggle */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Email alerts</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Validation, IND slots, reminders</p>
                      </div>
                      <button
                        onClick={async () => {
                          const newVal = !(profile?.notify_by_email ?? true)
                          await updateProfile(user.id, { notify_by_email: newVal })
                          setProfile((p: any) => ({ ...p, notify_by_email: newVal }))
                        }}
                        className={`relative inline-flex w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                          (profile?.notify_by_email ?? true) ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block w-4 h-4 bg-white rounded-full shadow transform transition-transform mt-0.5 ${
                          (profile?.notify_by_email ?? true) ? 'translate-x-4' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                  </div>

                  {/* Trial expiry notice */}
                  {(() => {
                    const trialEndsAt = profile?.trial_ends_at
                    if (!trialEndsAt || isPaid) return null
                    const daysLeft = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000)
                    if (daysLeft <= 0) return null
                    return (
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                          Trial ends in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                          <span className="text-indigo-500 dark:text-indigo-400 ml-2 cursor-pointer hover:underline">Upgrade →</span>
                        </p>
                      </div>
                    )
                  })()}

                  {/* Support + sign out + theme */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 space-y-2">
                    <ThemeToggle />
                    <a href="mailto:support@relocationhub.app"
                      className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      support@relocationhub.app
                    </a>
                    <button onClick={signOut}
                      className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition w-full text-left">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>

                  {/* Delete account */}
                  <div className="px-4 py-3">
                    {!deleteConfirm ? (
                      <button onClick={() => setDeleteConfirm(true)}
                        className="flex items-center gap-2 text-xs text-red-400 hover:text-red-600 transition w-full text-left">
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete account
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-red-600 font-medium">Permanently deletes all your data. Cannot be undone.</p>
                        <div className="flex gap-2">
                          <button onClick={() => setDeleteConfirm(false)}
                            className="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                            Cancel
                          </button>
                          <button onClick={handleDeleteAccount} disabled={deletingAccount}
                            className="flex-1 text-xs py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition">
                            {deletingAccount ? 'Deleting…' : 'Yes, delete'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Full-width banners */}
        <div className="space-y-4 mb-6">
          {profile?.move_date && <CountdownBanner moveDate={profile.move_date} />}
          {profile?.container_ship_date && (profile?.shipping_type === 'container' || profile?.shipping_type === 'both') && (
            <ContainerArrivalBanner shipDate={profile.container_ship_date} originCountry={profile.origin_country ?? ''} />
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* Sidebar */}
          <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0 space-y-4 lg:sticky lg:top-[57px]">
            {showRiskNudge && isPaid && (
              <div className="flex items-start gap-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl px-4 py-3">
                <span className="text-base flex-shrink-0">📊</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-300">All critical tasks done — recompute your risk score</p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">Your score may have improved significantly.</p>
                </div>
                <button onClick={() => setShowRiskNudge(false)} className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 flex-shrink-0 text-lg leading-none">×</button>
              </div>
            )}
            {user && profile && (
              <RiskScoreWidget
                userId={user.id}
                isPaid={isPaid}
                hasConsent={profile.ai_validation_consent ?? false}
                initialScore={riskScore}
                onConsentGranted={() => setProfile((p: any) => ({ ...p, ai_validation_consent: true }))}
              />
            )}
            {user && profile && (
              <IndMonitorWidget userId={user.id} userEmail={user.email ?? profile.email ?? ''} />
            )}
            {profile && (
              <ResourcesWidget profile={profile} />
            )}
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0 space-y-6">

            {/* Progress */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Relocation Progress</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{completed} of {tasks.length} tasks completed</p>
                </div>
                <span className="text-2xl font-bold text-indigo-600">{progress}%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              {progress === 100 && <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-2">You&apos;re fully settled in — great work!</p>}
              {progress >= 75 && progress < 100 && <p className="text-xs text-indigo-500 mt-2">Almost there — just a few tasks left.</p>}
              {progress >= 50 && progress < 75 && <p className="text-xs text-indigo-500 mt-2">Halfway through your relocation plan.</p>}
              {progress >= 25 && progress < 50 && <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Good start — keep the momentum going.</p>}
            </div>

            {/* Search */}
            <div>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search tasks…"
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
              {search && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} match &ldquo;{search}&rdquo;
                </p>
              )}
            </div>

        {/* Category sections */}
        {(() => {
          const firstPreCat = sections.find(s => PRE_DEPARTURE_CATS.has(s.cat))?.cat
          const firstPostCat = sections.find(s => POST_ARRIVAL_CATS.has(s.cat))?.cat
          return sections.map(({ cat, meta, tasks: sectionTasks }) => {
          const locked = cat !== 'critical' && !criticalAllDone
          return (
            <div key={cat}>
              {!search && cat === firstPreCat && (
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest whitespace-nowrap">
                    ✈️ Before you leave
                  </span>
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                </div>
              )}
              {!search && cat === firstPostCat && (
                <div className="flex items-center gap-3 mb-4 mt-2">
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest whitespace-nowrap">
                    🇳🇱 After you arrive
                  </span>
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                </div>
              )}
            <div id={`section-${cat}`} className={locked ? 'opacity-50 pointer-events-none select-none' : ''}>
              <div className={`flex items-center gap-2 mb-3 border-l-4 ${meta.border} pl-3`}>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${meta.color} ${meta.text}`}>
                  {meta.label}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {sectionTasks.filter(t => t.status === 'completed').length}/{sectionTasks.length} done
                </span>
                {locked && (
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                    Complete {criticalRemaining} critical task{criticalRemaining !== 1 ? 's' : ''} first
                  </span>
                )}
              </div>

              <div className="space-y-2" id={`tasks-${cat}`}>
                {sectionTasks.map(task => {
                  const done = task.status === 'completed'
                  const expanded = expandedId === task.id
                  const docs = taskDocs[task.id] || []

                  return (
                    <div key={task.id} className={`rounded-xl border transition-all ${
                      expanded
                        ? 'bg-white dark:bg-gray-800 border-indigo-200 dark:border-indigo-500 shadow-sm'
                        : done
                          ? 'bg-emerald-50/40 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800 opacity-70'
                          : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
                    }`}>

                      {taskBlockMsg[task.id] && (
                        <div className="mx-4 mt-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <p className="text-xs text-red-700 dark:text-red-400">{taskBlockMsg[task.id]}</p>
                        </div>
                      )}

                      <div className="flex items-start gap-3 p-4">
                        <button
                          onClick={() => toggleTask(task)}
                          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition ${
                            done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 dark:border-gray-600 hover:border-indigo-500'
                          }`}>
                          {done && (
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>

                        <button onClick={() => toggleExpand(task.id)} className="flex-1 text-left min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {task.title.startsWith('[Partner]') && (
                                <span className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">Partner</span>
                              )}
                              <span className={`text-sm font-medium ${done ? 'line-through text-gray-400 dark:text-gray-600' : 'text-gray-900 dark:text-white'}`}>
                                {task.title.startsWith('[Partner]') ? task.title.slice(10) : task.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {docs.length > 0 && (
                                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{docs.length} doc{docs.length !== 1 ? 's' : ''}</span>
                              )}
                              {task.source === 'custom' && !expanded && (
                                <button
                                  onClick={e => { e.stopPropagation(); handleDeleteCustomTask(task.id) }}
                                  className="text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-500 transition text-base leading-none">
                                  ×
                                </button>
                              )}
                              <svg className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
                                fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </button>
                      </div>

                      {expanded && (
                        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3 space-y-4">
                          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{task.description}</p>

                          {task.external_link && (
                            <a href={task.external_link} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              {task.external_link.startsWith('/tools/') ? 'Open calculator' : 'Official resource'}
                            </a>
                          )}

                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-semibold uppercase tracking-wide whitespace-nowrap ${LEGAL_DEADLINE_RE.test(task.title + ' ' + (task.description || '')) ? 'text-rose-500 dark:text-rose-400' : 'text-gray-500 dark:text-gray-400'}`}>{dueDateLabel(task)}</span>
                            <input
                              type="date"
                              value={task.due_date || ''}
                              onChange={e => handleDueDateChange(task.id, e.target.value)}
                              className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                            {task.due_date && (
                              <button onClick={() => handleDueDateChange(task.id, '')}
                                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                                Clear
                              </button>
                            )}
                          </div>

                          {task.due_date && (
                            <a href={googleCalendarUrl(task)} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Add to Google Calendar
                            </a>
                          )}

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Attached documents</span>
                              <label className={`cursor-pointer text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                                uploading === task.id
                                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                  : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                              }`}>
                                {uploading === task.id ? 'Uploading...' : '+ Attach file'}
                                <input type="file" className="hidden" disabled={uploading === task.id}
                                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(task.id, task.category, f); e.target.value = '' }} />
                              </label>
                            </div>

                            {docs.length === 0 ? (
                              <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                                {task.category === 'critical' && isPaid
                                  ? 'No documents yet — attach one and validate it with AI.'
                                  : 'No documents attached yet.'}
                              </p>
                            ) : (
                              <div className="space-y-1.5">
                                {docs.map((doc: any) => {
                                    const v = taskValidations[doc.id]
                                    const badgeClass = v?.status === 'pass'
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                      : v?.status === 'warn'
                                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                    const badgeLabel = v?.status === 'pass' ? '✓ pass' : v?.status === 'warn' ? '⚠ warn' : '✗ fail'
                                    return (
                                      <div key={doc.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                          </svg>
                                          <span className="text-xs text-gray-700 dark:text-gray-200 truncate">{doc.file_name}</span>
                                          {v && (
                                            <span className={`flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded ${badgeClass}`}>
                                              {badgeLabel}
                                            </span>
                                          )}
                                        </div>
                                                        <button onClick={() => openFile(doc.file_path)}
                                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium ml-2 flex-shrink-0">
                                          View
                                        </button>
                                        {v && (
                                          <button onClick={() => router.push(`/documents?from_category=${task.category}`)}
                                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium ml-2 flex-shrink-0">
                                            Details
                                          </button>
                                        )}
                                        {isPaid && v === null && VALIDATABLE_MIME_TYPES.has(doc.mime_type) && (
                                          <button
                                            onClick={() => handleInlineValidate(doc.id)}
                                            disabled={validatingDoc === doc.id}
                                            className="text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium ml-2 flex-shrink-0 disabled:opacity-50 whitespace-nowrap">
                                            {validatingDoc === doc.id ? 'Validating…' : 'Validate it with AI'}
                                          </button>
                                        )}
                                      </div>
                                    )
                                  })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                {!search && !locked && (
                  <div className="mt-1">
                    {addingTaskCat === cat ? (
                      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl border border-indigo-200 dark:border-indigo-600 px-3 py-2">
                        <input
                          type="text"
                          value={newTaskTitle}
                          onChange={e => setNewTaskTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleAddCustomTask(cat)
                            if (e.key === 'Escape') { setAddingTaskCat(null); setNewTaskTitle('') }
                          }}
                          placeholder="Task title…"
                          autoFocus
                          className="flex-1 text-sm text-gray-900 dark:text-white bg-transparent outline-none placeholder-gray-400"
                        />
                        <button
                          onClick={() => handleAddCustomTask(cat)}
                          disabled={savingTask || !newTaskTitle.trim()}
                          className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 disabled:opacity-40 transition">
                          {savingTask ? 'Adding…' : 'Add'}
                        </button>
                        <button
                          onClick={() => { setAddingTaskCat(null); setNewTaskTitle('') }}
                          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddingTaskCat(cat); setNewTaskTitle('') }}
                        className="text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center gap-1 py-1 px-1">
                        + Add a task
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          )
        })
        })()}
          </main>
        </div>
      </div>
    </main>
  )
}
