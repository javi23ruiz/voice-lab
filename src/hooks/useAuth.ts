import { useState, useEffect, useCallback } from 'react'

const TOKEN_KEY = 'auth_token'
const USERNAME_KEY = 'auth_username'

export interface AuthUser {
  username: string
}

export interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  error: string | null
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // On mount: validate stored token
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) { setIsLoading(false); return }

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setUser({ username: data.username }))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USERNAME_KEY)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Login failed'); return false }
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USERNAME_KEY, data.username)
      setUser({ username: data.username })
      return true
    } catch {
      setError('Could not reach the server. Is it running?')
      return false
    }
  }, [])

  const register = useCallback(async (username: string, password: string) => {
    setError(null)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Registration failed'); return false }
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USERNAME_KEY, data.username)
      setUser({ username: data.username })
      return true
    } catch {
      setError('Could not reach the server. Is it running?')
      return false
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USERNAME_KEY)
    setUser(null)
    setError(null)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { user, isLoading, error, login, register, logout, clearError }
}
