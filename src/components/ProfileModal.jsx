import React, { useEffect, useMemo, useRef, useState } from 'react'
import { toAbsoluteMediaUrl } from '../api.js'

const MAX_AVATAR_SIZE = 5 * 1024 * 1024

function getInitialForm(user) {
  return {
    email: user?.email || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    bio: user?.bio || '',
  }
}

export default function ProfileModal({
  user,
  onClose,
  onSave,
  saving,
  error,
  onClearError,
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

    const payload = {
      email: form.email.trim(),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      bio: form.bio.trim(),
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
        <h2>Личный кабинет</h2>
        <button className="auth-close" type="button" onClick={onClose}>×</button>
      </div>

      <form className="profile-form" onSubmit={handleSubmit}>
        <div className="profile-avatar-row">
          <div className="profile-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Аватар пользователя" />
            ) : (
              <span>{initials}</span>
            )}
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
              className="btn-ghost small"
              onClick={() => fileInputRef.current?.click()}
            >
              Загрузить аватар
            </button>

            {avatarFile && (
              <button
                type="button"
                className="btn-ghost small"
                onClick={() => setAvatarFile(null)}
              >
                Убрать файл
              </button>
            )}

            {!avatarFile && user?.avatar && !removeAvatar && (
              <button
                type="button"
                className="btn-ghost small"
                onClick={handleRemoveAvatar}
              >
                Удалить аватар
              </button>
            )}

            {!avatarFile && removeAvatar && (
              <button
                type="button"
                className="btn-ghost small"
                onClick={handleRestoreAvatar}
              >
                Вернуть аватар
              </button>
            )}
          </div>
        </div>

        <label className="auth-field">
          <span>Логин</span>
          <input value={user?.username || ''} disabled />
        </label>

        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            autoComplete="email"
          />
        </label>

        <div className="profile-grid">
          <label className="auth-field">
            <span>Имя</span>
            <input
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              autoComplete="given-name"
            />
          </label>

          <label className="auth-field">
            <span>Фамилия</span>
            <input
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              autoComplete="family-name"
            />
          </label>
        </div>

        <label className="auth-field">
          <span>О себе</span>
          <textarea
            className="profile-bio"
            name="bio"
            value={form.bio}
            onChange={handleChange}
            placeholder="Расскажите немного о себе"
            rows={4}
          />
        </label>

        {(localError || error) && (
          <div className="auth-error">{localError || error}</div>
        )}

        <div className="profile-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Отмена
          </button>
          <button className="auth-submit" type="submit" disabled={saving}>
            {saving ? 'Сохраняем…' : 'Сохранить изменения'}
          </button>
        </div>
      </form>
    </div>
  )
}
