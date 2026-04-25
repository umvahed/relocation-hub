'use client'
import { useState } from 'react'
import type { ValidationResult } from '@/lib/api'

const STATUS_STYLES = {
  pass: { pill: 'bg-emerald-100 text-emerald-700', label: 'Pass', dot: 'bg-emerald-500' },
  warn: { pill: 'bg-amber-100 text-amber-700',    label: 'Review', dot: 'bg-amber-500' },
  fail: { pill: 'bg-red-100 text-red-700',         label: 'Fail',  dot: 'bg-red-500'   },
}

const SEVERITY_STYLES = {
  error:   'text-red-600',
  warning: 'text-amber-600',
  info:    'text-blue-600',
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
          <p className="text-xs text-gray-500">{validation.summary}</p>
          {validation.issues.map((issue, i) => (
            <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
              <span className={`font-semibold uppercase tracking-wide ${SEVERITY_STYLES[issue.severity]}`}>
                {issue.severity}
              </span>
              {issue.field && <span className="text-gray-400 ml-1">· {issue.field}</span>}
              <p className="text-gray-700 mt-0.5">{issue.message}</p>
              <p className="text-gray-500 mt-0.5 italic">{issue.action}</p>
            </div>
          ))}
        </div>
      )}

      {open && validation.issues.length === 0 && (
        <p className="mt-2 text-xs text-gray-500">{validation.summary}</p>
      )}
    </div>
  )
}
