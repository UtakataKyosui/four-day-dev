const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5150'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

export function setToken(token: string): void {
  localStorage.setItem('auth_token', token)
}

export function removeToken(): void {
  localStorage.removeItem('auth_token')
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message || `HTTP ${res.status}`)
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return {} as T
  }

  return res.json()
}

// Auth
export const auth = {
  login: (email: string, password: string) =>
    request<{ token: string; name: string; email: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string) =>
    request<void>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
  current: () =>
    request<{ pid: string; name: string; email: string }>('/api/auth/current'),
}

// Meals
export interface Meal {
  id: number
  pid: string
  meal_type: 'breakfast' | 'lunch' | 'dinner'
  eaten_at: string
  notes: string
  created_at: string
}

export interface CreateMealInput {
  meal_type: string
  eaten_at: string
  notes: string
}

export const meals = {
  list: (date?: string) =>
    request<Meal[]>(`/api/meals${date ? `?date=${date}` : ''}`),
  create: (data: CreateMealInput) =>
    request<Meal>('/api/meals', { method: 'POST', body: JSON.stringify(data) }),
  update: (pid: string, data: Partial<CreateMealInput>) =>
    request<Meal>(`/api/meals/${pid}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (pid: string) =>
    request<void>(`/api/meals/${pid}`, { method: 'DELETE' }),
}

// Sleep
export interface SleepRecord {
  id: number
  pid: string
  sleep_start: string
  sleep_end: string
  duration_minutes: number
  efficiency: number | null
  stages_deep_minutes: number | null
  stages_light_minutes: number | null
  stages_rem_minutes: number | null
  stages_wake_minutes: number | null
  is_main_sleep: boolean
  source: 'fitbit' | 'manual'
  created_at: string
}

export interface CreateSleepInput {
  sleep_start: string
  sleep_end: string
  duration_minutes: number
  efficiency?: number
  is_main_sleep?: boolean
}

export const sleep = {
  list: (date?: string) =>
    request<SleepRecord[]>(`/api/sleep${date ? `?date=${date}` : ''}`),
  create: (data: CreateSleepInput) =>
    request<SleepRecord>('/api/sleep', { method: 'POST', body: JSON.stringify(data) }),
  delete: (pid: string) =>
    request<void>(`/api/sleep/${pid}`, { method: 'DELETE' }),
}

// Fitbit
export interface FitbitStatus {
  connected: boolean
  last_synced_at: string | null
}

export const fitbit = {
  status: () => request<FitbitStatus>('/api/fitbit/status'),
  authUrl: () => request<{ url: string }>('/api/fitbit/auth-url'),
  disconnect: () => request<void>('/api/fitbit/connection', { method: 'DELETE' }),
  sync: (date?: string) =>
    request<{ status: string }>('/api/fitbit/sync', {
      method: 'POST',
      body: JSON.stringify({ date }),
    }),
}

// Analysis
export interface Recommendation {
  category: 'meal' | 'sleep' | 'lifestyle'
  text: string
  priority: 'high' | 'medium' | 'low'
}

export interface HealthAnalysis {
  pid: string
  analysis_date: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  meal_score: number | null
  sleep_score: number | null
  overall_score: number | null
  summary: string | null
  recommendations: Recommendation[] | null
  created_at: string
}

export const analysis = {
  trigger: (date?: string) =>
    request<{ job_id: string; status: string }>('/api/analysis/trigger', {
      method: 'POST',
      body: JSON.stringify({ date }),
    }),
  status: (jobId: string) =>
    request<{ status: string; analysis_pid: string | null }>(`/api/analysis/status/${jobId}`),
  get: (date?: string) =>
    request<HealthAnalysis | null>(`/api/analysis${date ? `?date=${date}` : ''}`),
  history: (from?: string, to?: string) => {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    return request<HealthAnalysis[]>(`/api/analysis/history?${params}`)
  },
}
