const API_URL = process.env.NEXT_PUBLIC_API_URL

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
  return res.json()
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
  return res.json()
}

export async function getChecklist(user_id: string) {
  const res = await fetch(`${API_URL}/api/checklist/${user_id}`)
  return res.json()
}

export async function updateTask(task_id: string, status: string) {
  const res = await fetch(`${API_URL}/api/checklist/task/${task_id}?status=${status}`, {
    method: 'PATCH',
  })
  return res.json()
}