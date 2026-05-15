const API_URL = process.env.NEXT_PUBLIC_API_URL

async function handleResponse(res: Response) {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}

export async function onboardUser(data: {
  user_id: string
  email: string
  full_name: string
  origin_country: string
  move_date?: string
  contact_name?: string
  contact_email?: string
}) {
  const res = await fetch(`${API_URL}/api/auth/onboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function generateChecklist(data: {
  user_id: string
  origin_country: string
  employment_type: string
  move_date?: string
  has_pets?: boolean
  shipping_type?: string
  has_relocation_allowance?: boolean
  container_ship_date?: string
  has_partner?: boolean
  partner_origin_country?: string
  has_children?: boolean
  number_of_children?: number
  additional_context?: string
  employer_arranges_permit?: string
  employer_is_sponsor?: boolean | null
  has_driving_licence?: boolean | null
  driving_licence_country?: string
  children_school_stage?: string
  expects_30_ruling?: boolean | null
  already_in_netherlands?: boolean | null
}) {
  const res = await fetch(`${API_URL}/api/checklist/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, destination_country: 'Netherlands' }),
  })
  return handleResponse(res)
}

export async function getChecklist(user_id: string) {
  const res = await fetch(`${API_URL}/api/checklist/${user_id}`)
  return handleResponse(res)
}

export async function updateTask(task_id: string, status: string) {
  const res = await fetch(`${API_URL}/api/checklist/task/${task_id}?status=${status}`, {
    method: 'PATCH',
  })
  return handleResponse(res)
}

export interface UsageStats {
  checklist_calls: number
  checklist_limit: number
  validation_calls: number
  validation_limit: number
  risk_score_calls: number
  risk_score_limit: number
  date: string
}

export async function getUsage(user_id: string): Promise<UsageStats> {
  const res = await fetch(`${API_URL}/api/usage/${user_id}`)
  return handleResponse(res)
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info'
  field: string
  message: string
  action: string
}

export interface ValidationResult {
  validation_id: string
  document_id: string
  status: 'pass' | 'warn' | 'fail'
  summary: string
  issues: ValidationIssue[]
  validated_at: string
}

export interface RiskItem {
  rank: number
  category: string
  title: string
  detail: string
  action: string
}

export interface RiskScore {
  score: number
  risk_level: 'low' | 'med' | 'high'
  risk_items: RiskItem[]
  dimension_scores: {
    critical_completion: number
    timeline_feasibility: number
    document_readiness: number
    profile_completeness: number
  }
  computed_at: string
}

export async function validateDocument(document_id: string, user_id: string): Promise<ValidationResult> {
  const res = await fetch(`${API_URL}/api/documents/${document_id}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id }),
  })
  return handleResponse(res)
}

export async function getDocumentValidation(document_id: string, user_id: string): Promise<ValidationResult> {
  const res = await fetch(`${API_URL}/api/documents/${document_id}/validation?user_id=${user_id}`)
  return handleResponse(res)
}

export async function computeRiskScore(user_id: string): Promise<RiskScore> {
  const res = await fetch(`${API_URL}/api/risk-score/compute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id }),
  })
  return handleResponse(res)
}

export async function getRiskScore(user_id: string): Promise<RiskScore> {
  const res = await fetch(`${API_URL}/api/risk-score/${user_id}`)
  return handleResponse(res)
}

export async function updateConsent(user_id: string, ai_validation_consent: boolean) {
  const res = await fetch(`${API_URL}/api/auth/profile/${user_id}/consent`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ai_validation_consent }),
  })
  return handleResponse(res)
}

export async function setDueDate(task_id: string, due_date: string) {
  const res = await fetch(`${API_URL}/api/reminders/task/${task_id}/due-date?due_date=${encodeURIComponent(due_date)}`, {
    method: 'PATCH',
  })
  return handleResponse(res)
}

export async function createCustomTask(data: { user_id: string; title: string; category: string; description?: string }) {
  const res = await fetch(`${API_URL}/api/checklist/custom-task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function deleteTask(task_id: string, user_id: string) {
  const res = await fetch(`${API_URL}/api/checklist/task/${task_id}?user_id=${encodeURIComponent(user_id)}`, {
    method: 'DELETE',
  })
  return handleResponse(res)
}

export async function updateProfile(user_id: string, data: Partial<{
  full_name: string
  origin_country: string
  move_date: string
  employment_type: string
  has_pets: boolean
  shipping_type: string
  has_relocation_allowance: boolean
  contact_name: string
  contact_email: string
  destination_city: string
  has_children: boolean
  number_of_children: number
  container_ship_date: string
  notify_by_email: boolean
  has_partner: boolean
  partner_full_name: string
  partner_email: string
  partner_origin_country: string
  employer_arranges_permit: string
  employer_is_sponsor: boolean | null
  has_driving_licence: boolean | null
  driving_licence_country: string
  children_school_stage: string
  expects_30_ruling: boolean | null
  already_in_netherlands: boolean | null
}>) {
  const res = await fetch(`${API_URL}/api/auth/profile/${user_id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function regenerateChecklist(user_id: string) {
  const res = await fetch(`${API_URL}/api/checklist/regenerate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id }),
  })
  return handleResponse(res)
}

export async function applyDueDates(user_id: string): Promise<{ updated: { id: string; due_date: string }[] }> {
  const res = await fetch(`${API_URL}/api/checklist/${user_id}/apply-dates`, { method: 'POST' })
  return handleResponse(res)
}

export async function getShareData(token: string) {
  const res = await fetch(`${API_URL}/api/share/${token}`)
  return handleResponse(res)
}

export async function getProfile(user_id: string) {
  const res = await fetch(`${API_URL}/api/auth/profile/${user_id}`)
  return handleResponse(res)
}

export async function deleteAccount(user_id: string) {
  const res = await fetch(`${API_URL}/api/auth/profile/${user_id}`, { method: 'DELETE' })
  return handleResponse(res)
}

export async function getDocuments(user_id: string) {
  const res = await fetch(`${API_URL}/api/documents/${user_id}`)
  return handleResponse(res)
}

export async function deleteDocument(document_id: string, user_id: string) {
  const res = await fetch(`${API_URL}/api/documents/${document_id}?user_id=${user_id}`, {
    method: 'DELETE',
  })
  return handleResponse(res)
}

export interface IndMonitorStatus {
  subscribed: boolean
  subscription: {
    active: boolean
    last_notified_at: string | null
    created_at: string
    user_slots_available: boolean
  } | null
}

export async function getIndMonitorStatus(user_id: string): Promise<IndMonitorStatus> {
  const res = await fetch(`${API_URL}/api/ind-monitor/status/${user_id}`)
  return handleResponse(res)
}

export async function subscribeIndMonitor(user_id: string, email: string) {
  const res = await fetch(`${API_URL}/api/ind-monitor/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id, email }),
  })
  return handleResponse(res)
}

export async function unsubscribeIndMonitor(user_id: string) {
  const res = await fetch(`${API_URL}/api/ind-monitor/subscribe/${user_id}`, {
    method: 'DELETE',
  })
  return handleResponse(res)
}

export async function reportNoSlots(user_id: string) {
  const res = await fetch(`${API_URL}/api/ind-monitor/report-no-slots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id }),
  })
  return handleResponse(res)
}

export interface IndAppointment {
  id: string
  user_id: string
  desk_code: string
  desk_name: string
  appointment_date: string
  reminder_sent_7d: boolean
  reminder_sent_1d: boolean
  created_at: string
}

export async function saveIndAppointment(data: {
  user_id: string
  desk_code: string
  desk_name: string
  appointment_date: string
}): Promise<{ saved: boolean }> {
  const res = await fetch(`${API_URL}/api/ind-monitor/appointment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function getIndAppointment(user_id: string): Promise<IndAppointment | null> {
  const res = await fetch(`${API_URL}/api/ind-monitor/appointment/${user_id}`)
  return handleResponse(res)
}

export async function deleteIndAppointment(user_id: string): Promise<{ deleted: boolean }> {
  const res = await fetch(`${API_URL}/api/ind-monitor/appointment/${user_id}`, {
    method: 'DELETE',
  })
  return handleResponse(res)
}

export async function downloadDocpack(user_id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/docpack/${user_id}`)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail || `Request failed: ${res.status}`)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const disposition = res.headers.get('Content-Disposition') || ''
  const match = /filename="(.+)"/.exec(disposition)
  a.download = match ? match[1] : 'Valryn_DocPack.pdf'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function sendDocpackToHr(user_id: string): Promise<{ sent: boolean; to: string }> {
  const res = await fetch(`${API_URL}/api/docpack/${user_id}/send-to-hr`, {
    method: 'POST',
  })
  return handleResponse(res)
}

// ── Allowance tracker ────────────────────────────────────────────────────────

export interface AllowanceExpense {
  id: string
  task_id: string | null
  description: string
  amount_eur: number
  created_at: string
}

export interface AllowanceSummary {
  total: number
  spent: number
  balance: number
  expenses: AllowanceExpense[]
}

export async function getAllowance(user_id: string): Promise<AllowanceSummary> {
  const res = await fetch(`${API_URL}/api/allowance/${user_id}`)
  return handleResponse(res)
}

export async function setAllowanceAmount(user_id: string, amount: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/allowance/${user_id}/amount`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  })
  return handleResponse(res)
}

export async function addAllowanceExpense(
  user_id: string,
  data: { description: string; amount_eur: number; task_id?: string }
): Promise<AllowanceExpense> {
  const res = await fetch(`${API_URL}/api/allowance/${user_id}/expense`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function deleteAllowanceExpense(expense_id: string, user_id: string): Promise<void> {
  const res = await fetch(
    `${API_URL}/api/allowance/expense/${expense_id}?user_id=${encodeURIComponent(user_id)}`,
    { method: 'DELETE' }
  )
  return handleResponse(res)
}

export async function downloadAllowanceStatement(user_id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/allowance/${user_id}/export`)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail || `Request failed: ${res.status}`)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'Valryn_Allowance_Statement.pdf'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ── Document date extraction (for timeline) ──────────────────────────────────

export async function extractDocumentDate(
  document_id: string,
  user_id: string
): Promise<{ extracted_date: string | null; extracted_date_label: string | null }> {
  const res = await fetch(`${API_URL}/api/documents/${document_id}/extract-date`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id }),
  })
  return handleResponse(res)
}

// ── Billing ──────────────────────────────────────────────────────────────────

export async function createCheckoutSession(user_id: string, email: string, promo_code?: string): Promise<{ checkout_url: string }> {
  const res = await fetch(`${API_URL}/api/billing/create-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id, email, promo_code: promo_code || undefined }),
  })
  return handleResponse(res)
}

export async function validatePromoCode(code: string): Promise<{ valid: boolean; discount_percent: number; code: string }> {
  const res = await fetch(`${API_URL}/api/billing/promo-code/${encodeURIComponent(code.toUpperCase())}`)
  return handleResponse(res)
}

// ── Profile enrichment from document ────────────────────────────────────────

export interface ProfileHints {
  salary_monthly_eur: number | null
  job_title: string | null
  permit_track: 'highly_skilled_migrant' | 'ict_transfer' | 'daft' | 'unknown'
  employer_name: string | null
}

export async function enrichProfileFromDocument(
  document_id: string,
  user_id: string
): Promise<{ profile_hints: ProfileHints | null }> {
  const res = await fetch(`${API_URL}/api/documents/${document_id}/enrich-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id }),
  })
  return handleResponse(res)
}
