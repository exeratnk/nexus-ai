import { useEffect, useState, useCallback } from 'react'
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getProfile,
  updateProfile as apiUpdateProfile,
  changeSubscriptionPlan as apiChangeSubscriptionPlan,
  cancelSubscription as apiCancelSubscription,
} from '../api.js'

const ACCESS_KEY = 'access'
const REFRESH_KEY = 'refresh'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authEvent, setAuthEvent] = useState({ type: 'none', at: 0 })

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
        if (profile?.id) {
          setUser(profile)
          setAuthEvent({ type: 'restore', at: Date.now() })
        }
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
      setAuthEvent({ type: 'login', at: Date.now() })
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
      setAuthEvent({ type: 'register', at: Date.now() })
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
      setAuthEvent({ type: 'logout', at: Date.now() })
    }
  }, [access, refresh])

  const handleUpdateProfile = useCallback(async (payload) => {
    if (!access) {
      const message = 'Сначала выполните вход'
      setError(message)
      throw new Error(message)
    }

    setError('')
    try {
      const updated = await apiUpdateProfile(access, payload)
      setUser(updated)
      return updated
    } catch (e) {
      setError(e.message || 'Не удалось обновить профиль')
      throw e
    }
  }, [access])

  const refreshProfile = useCallback(async () => {
    if (!access) return null

    const profile = await getProfile(access)
    setUser(profile)
    return profile
  }, [access])

  const handleChangeSubscriptionPlan = useCallback(async (plan) => {
    if (!access) {
      const message = 'Сначала выполните вход'
      setError(message)
      throw new Error(message)
    }

    setError('')
    try {
      const response = await apiChangeSubscriptionPlan(access, plan)
      setUser(response.user)
      return response.user
    } catch (e) {
      setError(e.message || 'Не удалось изменить тариф')
      throw e
    }
  }, [access])

  const handleCancelSubscription = useCallback(async () => {
    if (!access) {
      const message = 'Сначала выполните вход'
      setError(message)
      throw new Error(message)
    }

    setError('')
    try {
      const response = await apiCancelSubscription(access)
      setUser(response.user)
      return response.user
    } catch (e) {
      setError(e.message || 'Не удалось изменить подписку')
      throw e
    }
  }, [access])

  return {
    user,
    loading,
    error,
    accessToken: access,
    refreshToken: refresh,
    authEvent,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    updateProfile: handleUpdateProfile,
    refreshProfile,
    changeSubscriptionPlan: handleChangeSubscriptionPlan,
    cancelSubscription: handleCancelSubscription,
    setError,
  }
}
