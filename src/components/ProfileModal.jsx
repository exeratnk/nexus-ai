import React, { useEffect, useMemo, useRef, useState } from 'react'
import { toAbsoluteMediaUrl } from '../api.js'
import { CrownIcon, ShieldIcon } from './GlassIcons.jsx'

const MAX_AVATAR_SIZE = 5 * 1024 * 1024

function getInitialForm(user) {
  return {
    email: user?.email || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    current_password: '',
    new_password: '',
    new_password2: '',
  }
}

export default function ProfileModal({
  user,
  onClose,
  onSave,
  saving,
  error,
  onClearError,
  onOpenSubscription,
}) {
  const [form, setForm] = useState(() => getInitialForm(user))
  const [avatarFile, setAvatarFile] = useState(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [localError, setLocalError] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    setForm(getInitialForm(user))
    setAvatarFile(null)
    setRemoveAvatar(false)
    setPreviewUrl('')
    setLocalError('')
    onClearError?.()
  }, [user, onClearError])

  useEffect(() => {
    if (!avatarFile) {
      setPreviewUrl('')
      return
    }

    const url = URL.createObjectURL(avatarFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [avatarFile])

  const avatarUrl = useMemo(() => {
    if (previewUrl) return previewUrl
    if (removeAvatar) return ''
    return toAbsoluteMediaUrl(user?.avatar)
  }, [previewUrl, removeAvatar, user?.avatar])

  const initials = useMemo(() => {
    const source = user?.first_name?.trim() || user?.username || 'Г'
    return source[0].toUpperCase()
  }, [user?.first_name, user?.username])
  const fullName = useMemo(() => {
    const parts = [form.first_name.trim(), form.last_name.trim()].filter(Boolean)
    return parts.join(' ') || user?.username || 'Пользователь NexusAI'
  }, [form.first_name, form.last_name, user?.username])
  const hasAvatar = Boolean(user?.avatar || avatarFile) && !removeAvatar
  const subscription = user?.subscription || {}
  const isPro = Boolean(subscription?.is_pro)
  const dailyLimit = subscription?.daily_message_limit ?? null
  const dailyRemaining = subscription?.daily_messages_remaining ?? null
  const dailyUsed = subscription?.daily_messages_used ?? 0
  const planLabel = isPro ? 'Pro' : 'Free'
  const planName = isPro ? 'NexusAI Pro' : 'NexusAI Free'
  const avatarStatusLabel = hasAvatar ? 'Аватар загружен' : 'Аватар не добавлен'

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (localError) setLocalError('')
    if (error) onClearError?.()
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setLocalError('Можно загружать только изображения')
      return
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setLocalError('Размер аватара должен быть не больше 5 МБ')
      return
    }

    setAvatarFile(file)
    setRemoveAvatar(false)
    setLocalError('')
    if (error) onClearError?.()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLocalError('')

    const hasPasswordChange = Boolean(
      form.current_password.trim() || form.new_password.trim() || form.new_password2.trim()
    )

    if (hasPasswordChange) {
      if (!form.current_password) {
        setLocalError('Введите текущий пароль')
        return
      }
      if (!form.new_password) {
        setLocalError('Введите новый пароль')
        return
      }
      if (!form.new_password2) {
        setLocalError('Подтвердите новый пароль')
        return
      }
      if (form.new_password !== form.new_password2) {
        setLocalError('Новые пароли не совпадают')
        return
      }
    }

    const payload = {
      email: form.email.trim(),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
    }

    if (hasPasswordChange) {
      payload.current_password = form.current_password
      payload.new_password = form.new_password
      payload.new_password2 = form.new_password2
    }

    try {
      if (avatarFile) {
        const formData = new FormData()
        Object.entries(payload).forEach(([key, value]) => formData.append(key, value))
        formData.append('avatar', avatarFile)
        await onSave(formData)
        return
      }

      if (removeAvatar) {
        await onSave({ ...payload, avatar: null })
        return
      }

      await onSave(payload)
    } catch (_) {
      // Ошибка показывается через error prop
    }
  }

  function handleRemoveAvatar() {
    setAvatarFile(null)
    setRemoveAvatar(true)
    setLocalError('')
    if (error) onClearError?.()
  }

  function handleRestoreAvatar() {
    setRemoveAvatar(false)
  }

  return (
    <div className="profile-card">
      <div className="profile-header">
        <div className="profile-header-copy">
          <span className="brand-kicker">Аккаунт</span>
          <h2>Личный кабинет</h2>
        </div>
        <button className="auth-close glass-shimmer" type="button" onClick={onClose}>×</button>
      </div>

      <div className="profile-shell">
        <aside className="profile-overview">
          <div className="profile-overview-card">
            <div className="profile-overview-head">
              <span className={`plan-pill ${isPro ? 'plan-pill-pro' : 'plan-pill-free'}`}>
                {isPro ? <CrownIcon size={13} /> : <ShieldIcon size={13} />}
                {planLabel}
              </span>
            </div>

            <div className="profile-identity-row">
              <div className="profile-avatar">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Аватар пользователя" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>

              <div className="profile-overview-copy">
                <div className="profile-name-line">
                  <h3>{fullName}</h3>
                  <span className={`profile-status ${hasAvatar ? 'with-avatar' : ''}`}>
                    {avatarStatusLabel}
                  </span>
                </div>
                <p>{form.email || 'Email пока не указан'}</p>
                <strong>@{user?.username || 'guest'}</strong>
              </div>
            </div>

            <div className="profile-avatar-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                hidden
              />
              <button
                type="button"
                className="btn-ghost small glass-shimmer"
                onClick={() => fileInputRef.current?.click()}
              >
                Загрузить
              </button>

              {avatarFile && (
                <button
                  type="button"
                  className="btn-ghost small glass-shimmer"
                  onClick={() => setAvatarFile(null)}
                >
                  Сбросить
                </button>
              )}

              {!avatarFile && user?.avatar && !removeAvatar && (
                <button
                  type="button"
                  className="btn-ghost small glass-shimmer"
                  onClick={handleRemoveAvatar}
                >
                  Удалить
                </button>
              )}

              {!avatarFile && removeAvatar && (
                <button
                  type="button"
                  className="btn-ghost small glass-shimmer"
                  onClick={handleRestoreAvatar}
                >
                  Вернуть
                </button>
              )}
            </div>
          </div>

          <div className="profile-summary-card">
            <div className="profile-section-head">
              <h3>Основная информация</h3>
            </div>
            <div className="profile-summary-row">
              <span>Логин</span>
              <strong>@{user?.username || 'guest'}</strong>
            </div>
            <div className="profile-summary-row">
              <span>Имя</span>
              <strong>{fullName}</strong>
            </div>
            <div className="profile-summary-row">
              <span>Email</span>
              <strong>{form.email || 'Не указан'}</strong>
            </div>
            <div className="profile-summary-row">
              <span>Текущий план</span>
              <strong>{planName}</strong>
            </div>
          </div>

          <div className={`profile-plan-card ${isPro ? 'is-pro' : ''}`}>
            <div className="profile-section-head">
              <h3>Тариф и действия</h3>
            </div>

            <div className="profile-plan-head">
              <span className={`plan-pill ${isPro ? 'plan-pill-pro' : 'plan-pill-free'}`}>
                {isPro ? <CrownIcon size={13} /> : <ShieldIcon size={13} />}
                {planLabel}
              </span>
              <span className="profile-plan-note">
                {isPro ? 'Активен сейчас' : 'Можно улучшить'}
              </span>
            </div>

            <div className="profile-plan-stats">
              <div className="profile-inline-stat">
                <span>Осталось сегодня</span>
                <strong>{isPro ? 'Без лимита' : `${dailyRemaining ?? 0}`}</strong>
              </div>
              <div className="profile-inline-stat">
                <span>Использовано</span>
                <strong>{isPro ? 'Не ограничено' : `${dailyUsed}${dailyLimit ? ` / ${dailyLimit}` : ''}`}</strong>
              </div>
            </div>

            <div className="profile-stack-actions">
              <button
                type="button"
                className="btn-ghost glass-shimmer subscription-primary-action"
                onClick={onOpenSubscription}
              >
                Открыть тариф
              </button>
              <button
                type="button"
                className="btn-ghost glass-shimmer"
                onClick={onClose}
              >
                Закрыть
              </button>
            </div>
          </div>
        </aside>

        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="profile-form-section">
            <div className="profile-section-head">
              <h3>Основные данные</h3>
            </div>

            <div className="profile-grid">
              <label className="auth-field">
                <span>Логин</span>
                <div className="auth-field-control">
                  <input value={user?.username || ''} disabled />
                </div>
              </label>

              <label className="auth-field">
                <span>Email</span>
                <div className="auth-field-control">
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                    placeholder="you@studio.ai"
                  />
                </div>
              </label>

              <label className="auth-field">
                <span>Имя</span>
                <div className="auth-field-control">
                  <input
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    autoComplete="given-name"
                    placeholder="Например, Анна"
                  />
                </div>
              </label>

              <label className="auth-field">
                <span>Фамилия</span>
                <div className="auth-field-control">
                  <input
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    autoComplete="family-name"
                    placeholder="Например, Орлова"
                  />
                </div>
              </label>
            </div>
          </div>

          <div className="profile-form-section">
            <div className="profile-section-head">
              <h3>Безопасность</h3>
            </div>

            <div className="profile-grid profile-grid-security">
              <label className="auth-field">
                <span>Текущий пароль</span>
                <div className="auth-field-control">
                  <input
                    type="password"
                    name="current_password"
                    value={form.current_password}
                    onChange={handleChange}
                    autoComplete="current-password"
                    placeholder="Введите текущий пароль"
                  />
                </div>
              </label>

              <label className="auth-field">
                <span>Новый пароль</span>
                <div className="auth-field-control">
                  <input
                    type="password"
                    name="new_password"
                    value={form.new_password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    placeholder="Введите новый пароль"
                  />
                </div>
              </label>
            </div>

            <label className="auth-field">
              <span>Подтверждение нового пароля</span>
              <div className="auth-field-control">
                <input
                  type="password"
                  name="new_password2"
                  value={form.new_password2}
                  onChange={handleChange}
                  autoComplete="new-password"
                  placeholder="Повторите новый пароль"
                />
              </div>
            </label>
          </div>

          {(localError || error) && (
            <div className="auth-error">{localError || error}</div>
          )}

          <div className="profile-actions">
            <button type="button" className="btn-ghost glass-shimmer" onClick={onClose}>
              Отмена
            </button>
            <button className="auth-submit glass-shimmer" type="submit" disabled={saving}>
              {saving ? 'Сохраняем…' : 'Сохранить изменения'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
