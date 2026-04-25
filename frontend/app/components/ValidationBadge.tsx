'use client'
import { useState } from 'react'
import type { ValidationResult } from '@/lib/api'

const STATUS_STYLES = {
  pass: { pill: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400', label: 'Pass', dot: 'bg-emerald-500' },
  warn: { pill: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',         label: 'Review', dot: 'bg-amber-500' },
  fail: { pill: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',                 label: 'Fail',  dot: 'bg-red-500'   },
}

const SEVERITY_STYLES = {
  error:   'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
  info:    'text-blue-600 dark:text-blue-400',
}

interface Props {
  validation: ValidationResult
}

export default function ValidationBadge({ validation }: Props) {
  const [open, setOpen] = useState(false)
  const s = STATUS_STYLES[validation.status]

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.pill} transition-opacity hover:opacity-80`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {s.label}
        {validation.issues.length > 0 && (
          <span className="ml-0.5 opacity-60">{open ? '▲' : '▼'}</span>
        )}
      </button>

      {open && validation.issues.length > 0 && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">{validation.summary}</p>
          {validation.issues.map((issue, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-xs">
              <span className={`font-semibold uppercase tracking-wide ${SEVERITY_STYLES[issue.severity]}`}>
                {issue.severity}
              </span>
              {issue.field && <span className="text-gray-400 dark:text-gray-500 ml-1">· {issue.field}</span>}
              <p className="text-gray-700 dark:text-gray-200 mt-0.5">{issue.message}</p>
              <p className="text-gray-500 dark:text-gray-400 mt-0.5 italic">{issue.action}</p>
            </div>
          ))}
        </div>
      )}

      {open && validation.issues.length === 0 && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{validation.summary}</p>
      )}
    </div>
  )
}
