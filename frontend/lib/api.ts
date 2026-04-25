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
