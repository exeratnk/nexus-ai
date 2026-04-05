import React, { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar.jsx'
import ChatWindow from './components/ChatWindow.jsx'
import AuthScreen from './components/AuthScreen.jsx'
import ProfileModal from './components/ProfileModal.jsx'
import { useChats } from './hooks/useChats.js'
import { useAuth } from './hooks/useAuth.js'
import { useTheme } from './hooks/useTheme.js'
import { toAbsoluteMediaUrl } from './api.js'

export default function App() {
  const [showAuth, setShowAuth] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [isFocus, setIsFocus] = useState(false)
  const { toggleTheme, isDark } = useTheme()
  const {
    user,
    loading: authLoading,
    error: authError,
    accessToken,
    authEvent,
    login,
    register,
    logout,
    updateProfile,
    setError: setAuthError,
  } = useAuth()
  const clearAuthError = useCallback(() => setAuthError(''), [setAuthError])

  useEffect(() => {
    if (user && showAuth) setShowAuth(false)
  }, [user, showAuth])

  useEffect(() => {
    if (!user && showProfile) setShowProfile(false)
  }, [user, showProfile])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') setIsFocus(false)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const {
    chats,
    activeChat,
    activeChatId,
    loading: chatsLoading,
    setActiveChatId,
    addChat,
    deleteChat,
    renameChat,
    addMessage,
    updateChat,
  } = useChats({ user, accessToken, authEvent })

  async function handleSaveProfile(payload) {
    setProfileSaving(true)
    try {
      await updateProfile(payload)
      setShowProfile(false)
    } finally {
      setProfileSaving(false)
    }
  }

  const avatarUrl = toAbsoluteMediaUrl(user?.avatar)
  const focusButtonLabel = isFocus ? 'Выйти из фокуса' : 'Включить фокус'

  return (
    <div id="shell" className={`layout shell ${isFocus ? 'focus' : ''}`}>
      <header className="topbar">
        <div className="topbar-user">
          <div className="avatar-circle">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Аватар пользователя" />
            ) : (
              (user?.username || 'Г')[0].toUpperCase()
            )}
          </div>
          <div>
            <div className="topbar-name">{user?.username || 'Гость'}</div>
            <div className="topbar-email">{user?.email || 'Без email'}</div>
          </div>
        </div>
        <div className="topbar-actions">
          <button
            className={`btn-ghost small btn-focus ${isFocus ? 'active' : ''}`}
            onClick={() => setIsFocus(prev => !prev)}
            title={focusButtonLabel}
            aria-label={focusButtonLabel}
          >
            {isFocus ? '✕' : '𖦏'}
          </button>
          <button className="btn-ghost small" onClick={toggleTheme}>
            {isDark ? '☀️ Светлая' : '🌙 Тёмная'}
          </button>
          {user ? (
            <>
              <button
                className="btn-ghost small"
                onClick={() => { clearAuthError(); setShowProfile(true) }}
              >
                Личный кабинет
              </button>
              <button className="btn-ghost small" onClick={logout}>Выйти</button>
            </>
          ) : (
            <button
              className="btn-ghost small"
              onClick={() => { clearAuthError(); setShowAuth(true) }}
            >
              Войти / Регистрация
            </button>
          )}
        </div>
      </header>

      <div className="app">
        <Sidebar
          chats={chats}
          activeChatId={activeChatId}
          onSelect={setActiveChatId}
          onAdd={addChat}
          onDelete={deleteChat}
          onRename={renameChat}
        />
        <div className="chat-col">
          <button
            type="button"
            className="focus-pill"
            onClick={() => setIsFocus(false)}
            aria-label="Выйти из фокуса"
            title="Выйти из фокуса"
          >
            Выйти из фокуса
          </button>
          {activeChat && (
            <ChatWindow
              key={activeChat.id}
              chat={activeChat}
              onAddMessage={addMessage}
              onUpdateChat={updateChat}
            />
          )}
        </div>
      </div>

      {showAuth && (
        <div className="auth-backdrop" onClick={() => setShowAuth(false)}>
          <div className="auth-modal" onClick={e => e.stopPropagation()}>
            <AuthScreen
              onLogin={login}
              onRegister={register}
              loading={authLoading}
              error={authError}
              onClearError={clearAuthError}
              onClose={() => setShowAuth(false)}
            />
          </div>
        </div>
      )}

      {showProfile && user && (
        <div className="auth-backdrop" onClick={() => setShowProfile(false)}>
          <div className="profile-modal" onClick={e => e.stopPropagation()}>
            <ProfileModal
              user={user}
              onClose={() => setShowProfile(false)}
              onSave={handleSaveProfile}
              saving={profileSaving}
              error={authError}
              onClearError={clearAuthError}
            />
          </div>
        </div>
      )}

      {(authLoading || chatsLoading) && (
        <div className="loader-overlay">
          <div className="loader-dot" />
        </div>
      )}
    </div>
  )
}
