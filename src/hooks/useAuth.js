import { useEffect, useState, useCallback } from 'react'
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getProfile,
} from '../api.js'

const ACCESS_KEY = 'access'
const REFRESH_KEY = 'refresh'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const access = typeof window !== 'undefined' ? localStorage.getItem(ACCESS_KEY) : null
  const refresh = typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null

  useEffect(() => {
    async function bootstrap() {
      if (!access) {
        setLoading(false)
        return
      }
      try {
        const profile = await getProfile(access)
        if (profile?.id) setUser(profile)
      } catch {
        // access token is invalid; clear
        localStorage.removeItem(ACCESS_KEY)
        localStorage.removeItem(REFRESH_KEY)
      } finally {
        setLoading(false)
      }
    }
    bootstrap()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const persistTokens = useCallback((accessToken, refreshToken) => {
    localStorage.setItem(ACCESS_KEY, accessToken)
    localStorage.setItem(REFRESH_KEY, refreshToken)
  }, [])

  const handleLogin = useCallback(async (username, password) => {
    setError('')
    setLoading(true)
    try {
      const res = await apiLogin(username, password)
      if (!res?.access) throw new Error(res?.detail || 'Не удалось войти')
      persistTokens(res.access, res.refresh)
      const profile = await getProfile(res.access)
      setUser(profile)
    } catch (e) {
      setError(e.message || 'Ошибка авторизации')
      throw e
    } finally {
      setLoading(false)
    }
  }, [persistTokens])

  const handleRegister = useCallback(async (payload) => {
    setError('')
    setLoading(true)
    try {
      const res = await apiRegister(payload.username, payload.email, payload.password, payload.password2)
      if (!res?.access) throw new Error(res?.detail || 'Не удалось зарегистрироваться')
      persistTokens(res.access, res.refresh)
      setUser(res.user)
    } catch (e) {
      // backend may send validation dict; stringify
      const detail = typeof e?.message === 'string' ? e.message : 'Ошибка регистрации'
      setError(detail)
      throw e
    } finally {
      setLoading(false)
    }
  }, [persistTokens])

  const handleLogout = useCallback(async () => {
    setError('')
    try {
      if (access && refresh) await apiLogout(access, refresh)
    } catch (_) {
      // ignore api errors on logout
    } finally {
      localStorage.removeItem(ACCESS_KEY)
      localStorage.removeItem(REFRESH_KEY)
      setUser(null)
    }
  }, [access, refresh])

  return {
    user,
    loading,
    error,
    accessToken: access,
    refreshToken: refresh,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    setError,
  }
}
