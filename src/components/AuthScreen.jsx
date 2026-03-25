import React, { useState } from 'react'

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
    try {
      if (mode === 'login') {
        await onLogin(form.username.trim(), form.password)
      } else {
        if (form.password !== form.password2) {
          setLocalError('Пароли не совпадают')
          return
        }
        await onRegister({
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          password2: form.password2,
        })
      }
    } catch (_) {
      // error handled outside
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="auth-tabs">
          <button
            className={mode === 'login' ? 'active' : ''}
            onClick={() => switchMode('login')}
            type="button"
          >Вход</button>
          <button
            className={mode === 'register' ? 'active' : ''}
            onClick={() => switchMode('register')}
            type="button"
          >Регистрация</button>
        </div>
        {onClose && (
          <button className="auth-close" type="button" onClick={onClose}>×</button>
        )}
      </div>

      <form className="auth-form" onSubmit={submit}>
        <label className="auth-field">
          <span>Логин</span>
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            required
            autoComplete="username"
          />
        </label>

        {mode === 'register' && (
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </label>
        )}

        <label className="auth-field">
          <span>Пароль</span>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </label>

        {mode === 'register' && (
          <label className="auth-field">
            <span>Повторите пароль</span>
            <input
              type="password"
              name="password2"
              value={form.password2}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
          </label>
        )}

        {(localError || error) && (
          <div className="auth-error">{localError || error}</div>
        )}

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
        </button>
      </form>
    </div>
  )
}
