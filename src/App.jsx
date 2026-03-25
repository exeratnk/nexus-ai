import React, { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar.jsx'
import ChatWindow from './components/ChatWindow.jsx'
import AuthScreen from './components/AuthScreen.jsx'
import { useChats } from './hooks/useChats.js'
import { useAuth } from './hooks/useAuth.js'
import { useTheme } from './hooks/useTheme.js'

export default function App() {
  const [showAuth, setShowAuth] = useState(false)
  const { toggleTheme, isDark } = useTheme()
  const {
    user,
    loading: authLoading,
    error: authError,
    login,
    register,
    logout,
    setError: setAuthError,
  } = useAuth()

  useEffect(() => {
    if (user && showAuth) setShowAuth(false)
  }, [user, showAuth])

  const {
    chats,
    activeChat,
    activeChatId,
    setActiveChatId,
    addChat,
    deleteChat,
    renameChat,
    addMessage,
    updateChat,
  } = useChats()

  return (
    <div className="layout">
      <header className="topbar">
        <div className="topbar-user">
          <div className="avatar-circle">
            {(user?.username || 'Г')[0].toUpperCase()}
          </div>
          <div>
            <div className="topbar-name">{user?.username || 'Гость'}</div>
            <div className="topbar-email">{user?.email || 'Без email'}</div>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="btn-ghost small" onClick={toggleTheme}>
            {isDark ? '☀️ Светлая' : '🌙 Тёмная'}
          </button>
          {user ? (
            <button className="btn-ghost small" onClick={logout}>Выйти</button>
          ) : (
            <button
              className="btn-ghost small"
              onClick={() => { setAuthError(''); setShowAuth(true) }}
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
        {activeChat && (
          <ChatWindow
            key={activeChat.id}
            chat={activeChat}
            onAddMessage={addMessage}
            onUpdateChat={updateChat}
          />
        )}
      </div>

      {showAuth && (
        <div className="auth-backdrop" onClick={() => setShowAuth(false)}>
          <div className="auth-modal" onClick={e => e.stopPropagation()}>
            <AuthScreen
              onLogin={login}
              onRegister={register}
              loading={authLoading}
              error={authError}
              onClearError={() => setAuthError('')}
              onClose={() => setShowAuth(false)}
            />
          </div>
        </div>
      )}

      {authLoading && (
        <div className="loader-overlay">
          <div className="loader-dot" />
        </div>
      )}
    </div>
  )
}
