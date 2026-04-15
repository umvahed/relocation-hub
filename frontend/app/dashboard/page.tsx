'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { getChecklist, updateTask } from '@/lib/api'
import { useRouter } from 'next/navigation'

const CATEGORY_COLORS: Record<string, string> = {
  visa: 'bg-red-100 text-red-700',
  housing: 'bg-blue-100 text-blue-700',
  banking: 'bg-green-100 text-green-700',
  employment: 'bg-purple-100 text-purple-700',
  healthcare: 'bg-pink-100 text-pink-700',
  transport: 'bg-yellow-100 text-yellow-700',
  admin: 'bg-gray-100 text-gray-700',
  shipping: 'bg-orange-100 text-orange-700',
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

  const completed = tasks.filter(t => t.status === 'completed').length
  const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0
  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.category === filter)
  const categories = [...new Set(tasks.map(t => t.category))]

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-indigo-600 animate-pulse text-lg">Loading your relocation plan...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="text-xl font-bold text-indigo-700">🇳🇱 RelocationHub</div>
          <div className="text-sm text-gray-500">Welcome, {user?.user_metadata?.full_name?.split(' ')[0]}</div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Progress */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Your Relocation Progress</h2>
            <span className="text-indigo-600 font-bold text-lg">{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
            <div 
              className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500">{completed} of {tasks.length} tasks completed</p>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-300'}`}>
            All ({tasks.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${filter === cat ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-300'}`}>
              {cat} ({tasks.filter(t => t.category === cat).length})
            </button>
          ))}
        </div>

        {/* Tasks */}
        <div className="space-y-3">
          {filtered.sort((a, b) => b.priority - a.priority).map(task => (
            <div
              key={task.id}
              className={`bg-white rounded-xl p-5 shadow-sm border-l-4 transition ${
                task.status === 'completed' ? 'border-green-400 opacity-75' : 'border-indigo-400'
              }`}>
              <div className="flex items-start gap-4">
                <button
                  onClick={() => toggleTask(task)}
                  className={`mt-1 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition ${
                    task.status === 'completed' 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : 'border-gray-300 hover:border-indigo-500'
                  }`}>
                  {task.status === 'completed' && '✓'}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className={`font-semibold ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {task.title}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[task.category] || 'bg-gray-100 text-gray-600'}`}>
                      {task.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{task.description}</p>
                  {task.external_link && (
                    <a 
                      href={task.external_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:underline">
                      🔗 Official resource →
                    </a>
                  )}
                </div>
                <div className="text-xs text-gray-400 flex-shrink-0">
                  Priority {task.priority}/10
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </main>
  )
}