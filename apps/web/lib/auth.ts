'use client'

import { setToken, removeToken, auth as authApi } from './api-client'

export async function login(email: string, password: string): Promise<void> {
  const res = await authApi.login(email, password)
  setToken(res.token)
}

export async function logout(): Promise<void> {
  removeToken()
}

export function isLoggedIn(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('auth_token')
}
