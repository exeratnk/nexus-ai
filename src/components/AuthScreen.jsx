import React, { useState } from 'react'
import { NexusLogo } from './GlassIcons.jsx'

export default function AuthScreen({ onLogin, onRegister, loading, error, onClearError, onClose }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
  })
  const [localError, setLocalError] = useState('')

  const switchMode = (next) => {
    setMode(next)
    setForm(prev => ({
      username: prev.username,
      email: next === 'register' ? prev.email : '',
      password: '',
      password2: '',
    }))
    setLocalError('')
    onClearError?.()
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (localError) setLocalError('')
    if (error) onClearError?.()
  }

  async function submit(e) {
    e.preventDefault()
    setLocalError('')

    const username = form.username.trim()
    const email = form.email.trim()

    if (!username) {
      setLocalError('Введите логин')
      return
    }

    try {
      if (mode === 'login') {
        await onLogin(username, form.password)
      } else {
        if (!email) {
          setLocalError('Введите email')
          return
        }
        if (form.password !== form.password2) {
          setLocalError('Пароли не совпадают')
          return
        }
        await onRegister({
          username,
          email,
          password: form.password,
          password2: form.password2,
        })
      }
    } catch (_) {
      // error handled outside
    }
  }

  return (
    <div className={`auth-card auth-card-${mode}`}>
      <div className="auth-hero">
        <div className="auth-hero-badge">
          <NexusLogo size={22} />
          NexusAI
        </div>
        <h2>{mode === 'login' ? 'Вход' : 'Регистрация'}</h2>
      </div>

      <div className="auth-header">
        <div className="auth-tabs">
          <button
            className={`glass-shimmer ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
            type="button"
          >Вход</button>
          <button
            className={`glass-shimmer ${mode === 'register' ? 'active' : ''}`}
            onClick={() => switchMode('register')}
            type="button"
          >Регистрация</button>
        </div>
        {onClose && (
          <button className="auth-close glass-shimmer" type="button" onClick={onClose}>×</button>
        )}
      </div>

      <form className="auth-form" onSubmit={submit}>
        <label className="auth-field">
          <span>Логин</span>
          <div className="auth-field-control">
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              required
              autoComplete="username"
              placeholder="например, nexus.creator"
            />
          </div>
        </label>

        {mode === 'register' && (
          <label className="auth-field">
            <span>Email</span>
            <div className="auth-field-control">
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
                placeholder="you@studio.ai"
              />
            </div>
          </label>
        )}

        <label className="auth-field">
          <span>Пароль</span>
          <div className="auth-field-control">
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder={mode === 'login' ? 'Введите пароль' : 'Минимум 8 символов'}
            />
          </div>
        </label>

        {mode === 'register' && (
          <label className="auth-field">
            <span>Повторите пароль</span>
            <div className="auth-field-control">
              <input
                type="password"
                name="password2"
                value={form.password2}
                onChange={handleChange}
                required
                autoComplete="new-password"
                placeholder="Повторите пароль"
              />
            </div>
          </label>
        )}

        {(localError || error) && (
          <div className="auth-error">{localError || error}</div>
        )}

        <button className="auth-submit glass-shimmer" type="submit" disabled={loading}>
          {loading ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
        </button>
      </form>
    </div>
  )
}
