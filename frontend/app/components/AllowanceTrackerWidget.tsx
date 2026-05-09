'use client'

import { useEffect, useState } from 'react'
import {
  getAllowance,
  setAllowanceAmount,
  addAllowanceExpense,
  deleteAllowanceExpense,
  downloadAllowanceStatement,
  type AllowanceSummary,
  type AllowanceExpense,
} from '@/lib/api'

interface Props {
  userId: string
  prefillExpense?: { description: string; taskId: string } | null
  onPrefillConsumed?: () => void
}

export default function AllowanceTrackerWidget({ userId, prefillExpense, onPrefillConsumed }: Props) {
  const [data, setData] = useState<AllowanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [settingAmount, setSettingAmount] = useState(false)
  const [amountInput, setAmountInput] = useState('')
  const [amountSaving, setAmountSaving] = useState(false)

  const [showAddForm, setShowAddForm] = useState(false)
  const [expDesc, setExpDesc] = useState('')
  const [expAmount, setExpAmount] = useState('')
  const [expTaskId, setExpTaskId] = useState<string | undefined>(undefined)
  const [expSaving, setExpSaving] = useState(false)
  const [expError, setExpError] = useState('')

  const [deleting, setDeleting] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [amountError, setAmountError] = useState('')

  const load = async () => {
    try {
      const res = await getAllowance(userId)
      setData(res)
      setAmountInput(res.total > 0 ? String(res.total) : '')
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [userId])

  // When a task completion triggers a pre-filled expense form
  useEffect(() => {
    if (prefillExpense) {
      setExpDesc(prefillExpense.description)
      setExpTaskId(prefillExpense.taskId)
      setExpAmount('')
      setShowAddForm(true)
      onPrefillConsumed?.()
    }
  }, [prefillExpense])

  const saveAmount = async () => {
    const val = parseFloat(amountInput.replace(',', '.'))
    if (isNaN(val) || val < 0) { setAmountError('Enter a valid amount'); return }
    setAmountError('')
    setAmountSaving(true)
    try {
      await setAllowanceAmount(userId, val)
      setSettingAmount(false)
      await load()
    } finally {
      setAmountSaving(false)
    }
  }

  const addExpense = async () => {
    const val = parseFloat(expAmount.replace(',', '.'))
    if (!expDesc.trim()) { setExpError('Enter a description'); return }
    if (isNaN(val) || val <= 0) { setExpError('Enter a valid amount'); return }
    setExpError('')
    setExpSaving(true)
    try {
      await addAllowanceExpense(userId, { description: expDesc.trim(), amount_eur: val, task_id: expTaskId })
      setExpDesc(''); setExpAmount(''); setExpTaskId(undefined); setShowAddForm(false)
      await load()
    } catch (e: any) {
      setExpError(e.message || 'Failed to save')
    } finally {
      setExpSaving(false)
    }
  }

  const removeExpense = async (id: string) => {
    setDeleting(id)
    try {
      await deleteAllowanceExpense(id, userId)
      await load()
    } finally {
      setDeleting(null)
    }
  }

  const exportPdf = async () => {
    setExporting(true)
    try { await downloadAllowanceStatement(userId) } finally { setExporting(false) }
  }

  const fmtDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
    catch { return '' }
  }

  const pct = data && data.total > 0 ? Math.min(100, (data.spent / data.total) * 100) : 0
  const overBudget = (data?.balance ?? 0) < 0

  if (loading) return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 animate-pulse">
      <div className="h-4 w-40 bg-gray-100 dark:bg-gray-700 rounded mb-4" />
      <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded" />
    </div>
  )

  return (
    <div id="allowance-tracker" className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Relocation Allowance</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Track spend against your employer allowance</p>
        </div>
        {data && data.total > 0 && (
          <button
            onClick={exportPdf}
            disabled={exporting}
            className="text-xs text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1 disabled:opacity-50"
          >
            {exporting ? 'Exporting…' : '↓ Export PDF'}
          </button>
        )}
      </div>

      {/* Not configured yet */}
      {(!data || data.total === 0) && !settingAmount && (
        <div className="text-center py-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Enter your total relocation allowance to start tracking.</p>
          <button
            onClick={() => setSettingAmount(true)}
            className="bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition"
          >
            Set allowance amount
          </button>
        </div>
      )}

      {/* Set / edit amount inline form */}
      {settingAmount && (
        <div className="mb-5">
          <label htmlFor="allowance-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Total allowance (EUR)
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
              <input
                id="allowance-amount"
                type="number"
                min="0"
                step="100"
                value={amountInput}
                onChange={e => setAmountInput(e.target.value)}
                placeholder="10000"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl pl-7 pr-4 py-2.5 text-sm text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={saveAmount}
              disabled={amountSaving}
              className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {amountSaving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => { setSettingAmount(false); setAmountError('') }}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2"
            >
              Cancel
            </button>
          </div>
          {amountError && <p className="text-xs text-red-500 mt-1">{amountError}</p>}
        </div>
      )}

      {/* Summary when configured */}
      {data && data.total > 0 && (
        <>
          {/* Progress bar */}
          <div className="mb-5">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              <span>€{data.spent.toLocaleString('en-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} spent</span>
              <span className={overBudget ? 'text-red-500 font-semibold' : 'text-gray-500'}>
                {overBudget ? `€${Math.abs(data.balance).toLocaleString('en-NL', { minimumFractionDigits: 2 })} over budget` : `€${data.balance.toLocaleString('en-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} remaining`}
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${overBudget ? 'bg-red-500' : pct > 80 ? 'bg-amber-400' : 'bg-indigo-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
              <span>€0</span>
              <button onClick={() => setSettingAmount(true)} className="text-indigo-500 hover:text-indigo-600">
                Total: €{data.total.toLocaleString('en-NL', { minimumFractionDigits: 2 })} ✎
              </button>
            </div>
          </div>

          {/* Expense list */}
          {data.expenses.length > 0 && (
            <div className="mb-4">
              <div className="space-y-1">
                {data.expenses.map((e: AllowanceExpense) => (
                  <div key={e.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0 group">
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{e.description}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{fmtDate(e.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        €{Number(e.amount_eur).toLocaleString('en-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <button
                        onClick={() => removeExpense(e.id)}
                        disabled={deleting === e.id}
                        className="text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-500 text-xs transition disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
                        aria-label="Delete expense"
                      >
                        {deleting === e.id ? '…' : '×'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add expense form */}
          {showAddForm ? (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mt-2">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide">Log expense</p>
              <input
                type="text"
                placeholder="Description (e.g. Flight tickets)"
                value={expDesc}
                onChange={e => setExpDesc(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
              />
              <div className="relative mb-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={expAmount}
                  onChange={e => setExpAmount(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl pl-7 pr-4 py-2 text-sm text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {expError && <p className="text-xs text-red-500 mb-2">{expError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={addExpense}
                  disabled={expSaving}
                  className="flex-1 bg-indigo-600 text-white text-sm font-semibold py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {expSaving ? 'Saving…' : 'Add expense'}
                </button>
                <button
                  onClick={() => { setShowAddForm(false); setExpDesc(''); setExpAmount(''); setExpTaskId(undefined); setExpError('') }}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setExpTaskId(undefined); setExpDesc(''); setExpAmount(''); setShowAddForm(true) }}
              className="w-full mt-1 text-sm text-indigo-600 font-medium border border-dashed border-indigo-200 rounded-xl py-2 hover:bg-indigo-50 transition"
            >
              + Log expense
            </button>
          )}
        </>
      )}
    </div>
  )
}
