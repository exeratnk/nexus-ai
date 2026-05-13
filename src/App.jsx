import React, { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar.jsx'
import ChatWindow from './components/ChatWindow.jsx'
import AuthScreen from './components/AuthScreen.jsx'
import ProfileModal from './components/ProfileModal.jsx'
import { useChats } from './hooks/useChats.js'
import { useAuth } from './hooks/useAuth.js'
import { useTheme } from './hooks/useTheme.js'
import { toAbsoluteMediaUrl } from './api.js'
import {
  EditIcon,
  FolderIcon,
  FocusIcon,
  LogoutIcon,
  MessageIcon,
  MoonIcon,
  PanelLeftOpenIcon,
  SearchIcon,
  SettingsIcon,
  SparkIcon,
  SunIcon,
} from './components/GlassIcons.jsx'

export default function App() {
  const [showAuth, setShowAuth] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [isFocus, setIsFocus] = useState(false)
  const [isSidebarHidden, setIsSidebarHidden] = useState(false)
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
    folders,
    chats,
    activeChat,
    activeChatId,
    loading: chatsLoading,
    addFolder,
    renameFolder,
    deleteFolder,
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
        <div className="topbar-brand">
          <div className="brand-mark">
            <SparkIcon size={20} />
          </div>
          <div className="brand-copy">
            <span className="brand-kicker">NexusAI OS</span>
            <strong>Liquid Intelligence</strong>
          </div>
        </div>

        <div className="topbar-actions">
          <button
            className={`btn-ghost small btn-focus glass-shimmer ${isFocus ? 'active' : ''}`}
            type="button"
            onClick={() => setIsFocus(prev => !prev)}
            title={focusButtonLabel}
            aria-label={focusButtonLabel}
          >
            <FocusIcon size={16} />
          </button>
          <button className="btn-ghost small glass-shimmer" type="button" onClick={toggleTheme}>
            {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
            <span>{isDark ? 'Светлая' : 'Тёмная'}</span>
          </button>
          {user ? (
            <>
              <button
                className="btn-ghost small glass-shimmer"
                type="button"
                onClick={() => { clearAuthError(); setShowProfile(true) }}
              >
                <SettingsIcon size={16} />
                <span>Настройки</span>
              </button>
              <button className="btn-ghost small glass-shimmer" type="button" onClick={logout}>
                <LogoutIcon size={16} />
                <span>Выйти</span>
              </button>
            </>
          ) : (
            <button
              className="btn-ghost small glass-shimmer"
              type="button"
              onClick={() => { clearAuthError(); setShowAuth(true) }}
            >
              <SettingsIcon size={16} />
              <span>Войти / Регистрация</span>
            </button>
          )}
        </div>

        <button
          type="button"
          className="topbar-profile topbar-profile-button glass-shimmer"
          onClick={() => {
            clearAuthError()
            if (user) {
              setShowProfile(true)
              return
            }
            setShowAuth(true)
          }}
          aria-label={user ? 'Открыть профиль' : 'Открыть авторизацию'}
          title={user ? 'Открыть профиль' : 'Войти или зарегистрироваться'}
        >
          <div className="avatar-circle">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Аватар пользователя" />
            ) : (
              (user?.username || 'Г')[0].toUpperCase()
            )}
          </div>
          <div>
            <div className="topbar-name">{user?.username || 'Гость'}</div>
            <div className="topbar-email">{user?.email || 'Local workspace'}</div>
          </div>
        </button>
      </header>

      <div className={`app ${isSidebarHidden ? 'sidebar-collapsed' : ''}`}>
        {isSidebarHidden && !isFocus && (
          <aside className="sidebar-rail" aria-label="Свернутая боковая панель">
            <div className="sidebar-rail-top">
              <button
                type="button"
                className="sidebar-rail-toggle glass-shimmer"
                onClick={() => setIsSidebarHidden(false)}
                aria-label="Открыть боковую панель"
                title="Открыть боковую панель"
              >
                <PanelLeftOpenIcon size={18} />
              </button>

              <div className="sidebar-rail-actions">
                <button
                  type="button"
                  className="sidebar-rail-btn glass-shimmer"
                  onClick={addChat}
                  aria-label="Новый чат"
                  title="Новый чат"
                >
                  <EditIcon size={20} />
                </button>
                <button
                  type="button"
                  className="sidebar-rail-btn glass-shimmer"
                  onClick={() => setIsSidebarHidden(false)}
                  aria-label="Поиск чатов"
                  title="Поиск чатов"
                >
                  <SearchIcon size={20} />
                </button>
                <button
                  type="button"
                  className="sidebar-rail-btn glass-shimmer"
                  onClick={() => setIsSidebarHidden(false)}
                  aria-label="Проекты"
                  title="Проекты"
                >
                  <FolderIcon size={20} />
                </button>
                <button
                  type="button"
                  className="sidebar-rail-btn glass-shimmer"
                  onClick={() => setIsSidebarHidden(false)}
                  aria-label="История диалогов"
                  title="История диалогов"
                >
                  <MessageIcon size={20} />
                </button>
              </div>
            </div>
          </aside>
        )}

        {!isSidebarHidden && (
          <Sidebar
            folders={folders}
            chats={chats}
            activeChatId={activeChatId}
            onHide={() => setIsSidebarHidden(true)}
            onSelect={setActiveChatId}
            onAdd={addChat}
            onAddFolder={addFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
            onDelete={deleteChat}
            onRename={renameChat}
          />
        )}
        <div className="chat-col">
          {isFocus && (
            <div className="focus-toolbar" role="toolbar" aria-label="Панель режима фокуса">
              <button
                type="button"
                className="focus-pill glass-shimmer"
                onClick={() => setIsFocus(false)}
                aria-label="Выйти из фокуса"
                title="Выйти из фокуса"
              >
                <FocusIcon size={18} />
                Выйти из фокуса
              </button>
            </div>
          )}
          {activeChat ? (
            <ChatWindow
              key={activeChat.id}
              chat={activeChat}
              folders={folders}
              onAddMessage={addMessage}
              onUpdateChat={updateChat}
              isFocus={isFocus}
            />
          ) : (
            <section className="workspace-empty">
              <div className="workspace-empty-card">
                <div className="empty-aurora">
                  <SparkIcon size={22} />
                </div>
                <h2>Нет активного диалога</h2>
                <p>Создайте новый чат, чтобы открыть рабочую область и начать переписку.</p>
                <button type="button" className="btn-ghost glass-shimmer workspace-empty-action" onClick={addChat}>
                  Создать чат
                </button>
              </div>
            </section>
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
