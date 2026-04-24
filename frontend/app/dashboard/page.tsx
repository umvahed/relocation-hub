'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { getChecklist, updateTask, getUsage, setDueDate, getProfile } from '@/lib/api'
import { useRouter } from 'next/navigation'

const SECTION_ORDER = ['critical', 'visa', 'admin', 'employment', 'housing', 'banking', 'healthcare', 'transport', 'shipping', 'pets']

const SECTION_META: Record<string, { label: string; color: string; text: string; border: string }> = {
  critical:   { label: 'Critical — Required First', color: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-400'   },
  visa:       { label: 'Visa & Immigration',         color: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-400'    },
  admin:      { label: 'Administration',             color: 'bg-gray-100',  text: 'text-gray-700',   border: 'border-gray-400'   },
  employment: { label: 'Employment',                 color: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-400' },
  housing:    { label: 'Housing',                    color: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-400'   },
  banking:    { label: 'Banking & Finance',          color: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-400'},
  healthcare: { label: 'Healthcare',                 color: 'bg-pink-50',   text: 'text-pink-700',   border: 'border-pink-400'   },
  transport:  { label: 'Transport',                  color: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-400'  },
  shipping:   { label: 'Shipping & Logistics',       color: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-400' },
  pets:       { label: 'Pet Relocation',             color: 'bg-lime-50',   text: 'text-lime-700',   border: 'border-lime-400'   },
}

function CountdownBanner({ moveDate }: { moveDate: string }) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const move = new Date(moveDate); move.setHours(0, 0, 0, 0)
  const daysLeft = Math.round((move.getTime() - today.getTime()) / 86400000)
  const formattedDate = move.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  if (daysLeft < 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3.5 flex items-center gap-3">
        <span className="text-xl flex-shrink-0">🌷</span>
        <div>
          <p className="text-sm font-semibold text-emerald-800">Welcome to the Netherlands!</p>
          <p className="text-xs text-emerald-600 mt-0.5">
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
          <span
            key={i}
            className="confetti-piece absolute text-2xl"
            style={{ left: `${5 + i * 12}%`, bottom: '8px', animationDelay: `${i * 0.35}s`, animationDuration: `${2.4 + (i % 3) * 0.4}s` }}
          >
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
    rose:   'bg-rose-50 border-rose-200 text-rose-800',
    amber:  'bg-amber-50 border-amber-200 text-amber-800',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-800',
  }
  const numStyles = {
    rose:   'text-rose-600',
    amber:  'text-amber-600',
    indigo: 'text-indigo-600',
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

export default function DashboardPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [taskDocs, setTaskDocs] = useState<Record<string, any[]>>({})
  const [uploading, setUploading] = useState<string | null>(null)
  const [usage, setUsage] = useState<{ call_count: number; limit: number } | null>(null)
  const [profile, setProfile] = useState<{ move_date?: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
      const result = await getChecklist(data.user.id)
      setTasks(result.tasks || [])
      getUsage(data.user.id).then(setUsage).catch(() => null)
      getProfile(data.user.id).then(setProfile).catch(() => null)
      setLoading(false)
    })
  }, [])

  const toggleTask = async (task: any) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    await updateTask(task.id, newStatus)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  const toggleExpand = async (taskId: string) => {
    if (expandedId === taskId) {
      setExpandedId(null)
      return
    }
    setExpandedId(taskId)
    if (!taskDocs[taskId]) {
      const { data } = await supabase.from('documents').select('*').eq('task_id', taskId)
      setTaskDocs(prev => ({ ...prev, [taskId]: data || [] }))
    }
  }

  const handleFileUpload = async (taskId: string, category: string, file: File) => {
    setUploading(taskId)
    const path = `${user.id}/${taskId}/${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage.from('documents').upload(path, file)
    if (!error && data) {
      await supabase.from('documents').insert({
        user_id: user.id,
        task_id: taskId,
        file_name: file.name,
        file_path: data.path,
        file_size: file.size,
        mime_type: file.type,
        category,
      })
      const { data: docs } = await supabase.from('documents').select('*').eq('task_id', taskId)
      setTaskDocs(prev => ({ ...prev, [taskId]: docs || [] }))
    }
    setUploading(null)
  }

  const handleDueDateChange = async (taskId: string, due_date: string) => {
    await setDueDate(taskId, due_date)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, due_date } : t))
  }

  const openFile = async (filePath: string) => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(filePath, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const googleCalendarUrl = (task: any) => {
    const title = encodeURIComponent(task.title)
    const details = encodeURIComponent(task.description || '')
    const date = task.due_date?.replace(/-/g, '') || ''
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${date}/${date}`
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const completed = tasks.filter(t => t.status === 'completed').length
  const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there'

  const criticalTasks = tasks.filter(t => t.category === 'critical')
  const criticalAllDone = criticalTasks.length === 0 || criticalTasks.every(t => t.status === 'completed')
  const criticalRemaining = criticalTasks.filter(t => t.status !== 'completed').length

  const sections = SECTION_ORDER
    .map(cat => ({
      cat,
      meta: SECTION_META[cat] || { label: cat, color: 'bg-gray-100', text: 'text-gray-700' },
      tasks: tasks.filter(t => t.category === cat).sort((a, b) => b.priority - a.priority),
    }))
    .filter(s => s.tasks.length > 0)

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-sm text-indigo-600 animate-pulse font-medium">Loading your relocation plan...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex justify-between items-center">
          <div className="text-base font-semibold tracking-tight text-gray-900">
            Relocation<span className="text-indigo-600">Hub</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm text-gray-400">Hi, {firstName}</span>
            <button
              onClick={() => router.push('/documents')}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Documents
            </button>
            {user && (
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL}/api/calendar/${user.id}/feed.ics`}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Export calendar
              </a>
            )}
            {usage && (
              <span className={`hidden sm:block text-xs font-medium px-2.5 py-1 rounded-full ${
                usage.call_count >= usage.limit
                  ? 'bg-red-50 text-red-600'
                  : usage.call_count >= usage.limit - 1
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {usage.call_count}/{usage.limit} AI calls today
              </span>
            )}
            <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-800 transition font-medium">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">

        {/* Move countdown */}
        {profile?.move_date && <CountdownBanner moveDate={profile.move_date} />}

        {/* Progress */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Relocation Progress</h2>
              <p className="text-xs text-gray-400 mt-0.5">{completed} of {tasks.length} tasks completed</p>
            </div>
            <span className="text-2xl font-bold text-indigo-600">{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          {progress === 100 && (
            <p className="text-xs text-emerald-600 font-medium mt-2">You're fully settled in — great work!</p>
          )}
          {progress >= 75 && progress < 100 && (
            <p className="text-xs text-indigo-500 mt-2">Almost there — just a few tasks left.</p>
          )}
          {progress >= 50 && progress < 75 && (
            <p className="text-xs text-indigo-500 mt-2">Halfway through your relocation plan.</p>
          )}
          {progress >= 25 && progress < 50 && (
            <p className="text-xs text-gray-400 mt-2">Good start — keep the momentum going.</p>
          )}
        </div>

        {/* Category sections */}
        {sections.map(({ cat, meta, tasks: sectionTasks }) => {
          const locked = cat !== 'critical' && !criticalAllDone
          return (
          <div key={cat} className={locked ? 'opacity-50 pointer-events-none select-none' : ''}>
            <div className={`flex items-center gap-2 mb-3 border-l-4 ${meta.border} pl-3`}>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${meta.color} ${meta.text}`}>
                {meta.label}
              </span>
              <span className="text-xs text-gray-400">
                {sectionTasks.filter(t => t.status === 'completed').length}/{sectionTasks.length} done
              </span>
              {locked && (
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  Complete {criticalRemaining} critical task{criticalRemaining !== 1 ? 's' : ''} first
                </span>
              )}
            </div>

            <div className="space-y-2">
              {sectionTasks.map(task => {
                const done = task.status === 'completed'
                const expanded = expandedId === task.id
                const docs = taskDocs[task.id] || []

                return (
                  <div
                    key={task.id}
                    className={`rounded-xl border transition-all ${
                      expanded ? 'bg-white border-indigo-200 shadow-sm' : done ? 'bg-emerald-50/40 border-emerald-100 opacity-70' : 'bg-white border-gray-100 hover:border-gray-200'
                    }`}>

                    {/* Task row */}
                    <div className="flex items-start gap-3 p-4">
                      <button
                        onClick={() => toggleTask(task)}
                        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition ${
                          done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 hover:border-indigo-500'
                        }`}>
                        {done && (
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>

                      <button
                        onClick={() => toggleExpand(task.id)}
                        className="flex-1 text-left min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm font-medium ${done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                            {task.title}
                          </span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {docs.length > 0 && (
                              <span className="text-xs text-indigo-600 font-medium">{docs.length} doc{docs.length !== 1 ? 's' : ''}</span>
                            )}
                            <svg
                              className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                              fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* Expanded detail */}
                    {expanded && (
                      <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-4">
                        <p className="text-sm text-gray-600 leading-relaxed">{task.description}</p>

                        {task.external_link && (
                          <a
                            href={task.external_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Official resource
                          </a>
                        )}

                        {/* Due date */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Due date</span>
                          <input
                            type="date"
                            value={task.due_date || ''}
                            onChange={e => handleDueDateChange(task.id, e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                          {task.due_date && (
                            <button
                              onClick={() => handleDueDateChange(task.id, '')}
                              className="text-xs text-gray-400 hover:text-gray-600">
                              Clear
                            </button>
                          )}
                        </div>

                        {/* Calendar */}
                        {task.due_date && (
                          <div className="flex items-center gap-2">
                            <a
                              href={googleCalendarUrl(task)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Add to Google Calendar
                            </a>
                          </div>
                        )}

                        {/* Documents section */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Attached documents</span>
                            <label className={`cursor-pointer text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                              uploading === task.id
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                            }`}>
                              {uploading === task.id ? 'Uploading...' : '+ Attach file'}
                              <input
                                type="file"
                                className="hidden"
                                disabled={uploading === task.id}
                                onChange={e => {
                                  const file = e.target.files?.[0]
                                  if (file) handleFileUpload(task.id, task.category, file)
                                  e.target.value = ''
                                }}
                              />
                            </label>
                          </div>

                          {docs.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No documents attached yet.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {docs.map((doc: any) => (
                                <div key={doc.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="text-xs text-gray-700 truncate">{doc.file_name}</span>
                                  </div>
                                  <button
                                    onClick={() => openFile(doc.file_path)}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium ml-2 flex-shrink-0">
                                    View
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          )
        })}

      </div>
    </main>
  )
}
