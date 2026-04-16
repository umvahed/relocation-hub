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
