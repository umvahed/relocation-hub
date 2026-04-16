'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { getChecklist, updateTask } from '@/lib/api'
import { useRouter } from 'next/navigation'

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  visa:       { bg: 'bg-red-50',     text: 'text-red-600'    },
  housing:    { bg: 'bg-blue-50',    text: 'text-blue-600'   },
  banking:    { bg: 'bg-emerald-50', text: 'text-emerald-600'},
  employment: { bg: 'bg-purple-50',  text: 'text-purple-600' },
  healthcare: { bg: 'bg-pink-50',    text: 'text-pink-600'   },
  transport:  { bg: 'bg-amber-50',   text: 'text-amber-600'  },
  admin:      { bg: 'bg-gray-100',   text: 'text-gray-600'   },
  shipping:   { bg: 'bg-orange-50',  text: 'text-orange-600' },
  pets:       { bg: 'bg-lime-50',    text: 'text-lime-600'   },
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
      const result = await getChecklist(data.user.id)
      setTasks(result.tasks || [])
      setLoading(false)
    })
  }, [])

  const toggleTask = async (task: any) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    await updateTask(task.id, newStatus)
    setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const completed = tasks.filter(t => t.status === 'completed').length
  const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0
  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.category === filter)
  const categories = [...new Set(tasks.map(t => t.category))]
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there'

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-indigo-600 animate-pulse text-sm font-medium">Loading your relocation plan...</p>
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
              onClick={signOut}
              className="text-sm text-gray-500 hover:text-gray-800 transition font-medium">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

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
        </div>

        {/* Category filters — horizontally scrollable on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
          <button
            onClick={() => setFilter('all')}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition border ${
              filter === 'all'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}>
            All · {tasks.length}
          </button>
          {categories.map(cat => {
            const c = CATEGORY_COLORS[cat] || { bg: 'bg-gray-100', text: 'text-gray-600' }
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition border capitalize ${
                  filter === cat
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : `${c.bg} ${c.text} border-transparent`
                }`}>
                {cat} · {tasks.filter(t => t.category === cat).length}
              </button>
            )
          })}
        </div>

        {/* Task list */}
        <div className="space-y-2.5">
          {filtered
            .sort((a, b) => b.priority - a.priority)
            .map(task => {
              const c = CATEGORY_COLORS[task.category] || { bg: 'bg-gray-100', text: 'text-gray-600' }
              const done = task.status === 'completed'
              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-xl p-4 border transition ${
                    done ? 'border-gray-100 opacity-60' : 'border-gray-100 hover:border-indigo-100 hover:shadow-sm'
                  }`}>
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleTask(task)}
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition ${
                        done
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-gray-300 hover:border-indigo-500'
                      }`}>
                      {done && (
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-sm font-medium ${done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                          {task.title}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${c.bg} ${c.text}`}>
                          {task.category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{task.description}</p>
                      {task.external_link && (
                        <a
                          href={task.external_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition">
                          Official resource →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
        </div>

      </div>
    </main>
  )
}
