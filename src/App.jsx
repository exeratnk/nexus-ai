import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Sidebar from './components/Sidebar.jsx'
import ChatWindow from './components/ChatWindow.jsx'
import AuthScreen from './components/AuthScreen.jsx'
import ProfileModal from './components/ProfileModal.jsx'
import ProfileMenu from './components/ProfileMenu.jsx'
import SubscriptionPage from './components/SubscriptionPage.jsx'
import { useChats } from './hooks/useChats.js'
import { useAuth } from './hooks/useAuth.js'
import { useTheme } from './hooks/useTheme.js'
import { toAbsoluteMediaUrl } from './api.js'
import {
  EditIcon,
  FolderIcon,
  FocusIcon,
  NexusLogo,
  LogoutIcon,
  MessageIcon,
  MoonIcon,
  PanelLeftOpenIcon,
  SearchIcon,
  SettingsIcon,
  SunIcon,
} from './components/GlassIcons.jsx'

function getAppRoute() {
  if (typeof window === 'undefined') return 'chat'
  return window.location.pathname === '/subscription' || window.location.pathname === '/billing'
    ? 'subscription'
    : 'chat'
}

function getRoutePath(route) {
  return route === 'subscription' ? '/subscription' : '/'
}

function getSidebarLimitNotice(user) {
  const subscription = user?.subscription
  if (!user || !subscription || subscription.is_pro) return null

  const dailyLimit = subscription.daily_message_limit ?? null
  const dailyRemaining = subscription.daily_messages_remaining ?? null
  const dailyUsed = subscription.daily_messages_used ?? dailyLimit ?? 0

  if (dailyLimit == null || dailyRemaining !== 0) return null

  return {
    key: `${user.id}:${dailyLimit}:${dailyUsed}:${dailyRemaining}`,
    title: 'Лимит Free достигнут',
    caption: `Сегодня использовано ${dailyUsed} из ${dailyLimit} сообщений`,
    message: 'Откройте Pro, чтобы продолжить диалог без ожидания следующего дня.',
    ctaLabel: 'Перейти на Pro',
  }
}

function getSidebarProNotice(reason) {
  if (!reason) return null

  if (reason.type === 'deep_mode') {
    return {
      key: 'pro:deep_mode',
      title: 'Глубокий режим доступен в Pro',
      caption: 'Расширенный режим ответа',
      message: 'Подключите Pro, чтобы включить глубокий режим и получать более детальные ответы.',
      ctaLabel: 'Открыть Pro',
    }
  }

  if (reason.type === 'model' && reason.model) {
    return {
      key: `pro:model:${reason.model}`,
      title: 'Эта модель доступна в Pro',
      caption: `Выбрана модель ${reason.model}`,
      message: 'Перейдите на Pro, чтобы использовать продвинутые модели без ограничений Free.',
      ctaLabel: 'Открыть Pro',
    }
  }

  if (reason.type === 'send') {
    return {
      key: reason.model ? `pro:send:${reason.model}` : 'pro:send',
      title: 'Для отправки нужен Pro',
      caption: reason.model ? `Текущая модель: ${reason.model}` : 'Текущая конфигурация чата',
      message: 'Оформите Pro, чтобы отправлять сообщения с этой моделью и режимом без блокировки.',
      ctaLabel: 'Открыть Pro',
    }
  }

  return {
    key: 'pro:default',
    title: 'Нужен тариф Pro',
    caption: 'Расширенные возможности чата',
    message: 'Откройте Pro, чтобы снять ограничения и продолжить работу.',
    ctaLabel: 'Открыть Pro',
  }
}

export default function App() {
  const [showAuth, setShowAuth] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [isFocus, setIsFocus] = useState(false)
  const [isSidebarHidden, setIsSidebarHidden] = useState(false)
  const [route, setRoute] = useState(() => getAppRoute())
  const [sidebarActionNotice, setSidebarActionNotice] = useState(null)
  const [dismissedSidebarNoticeKey, setDismissedSidebarNoticeKey] = useState('')
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
    refreshProfile,
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

  useEffect(() => {
    function handlePopState() {
      setRoute(getAppRoute())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
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
  const sidebarLimitNotice = useMemo(() => getSidebarLimitNotice(user), [user])
  const sidebarNotice = sidebarLimitNotice || sidebarActionNotice
  const visibleSidebarNotice = sidebarNotice?.key === dismissedSidebarNoticeKey
    ? null
    : sidebarNotice

  useEffect(() => {
    if (user?.subscription?.is_pro) {
      setSidebarActionNotice(null)
    }
  }, [user?.subscription?.is_pro])

  useEffect(() => {
    if (!sidebarNotice) {
      setDismissedSidebarNoticeKey('')
    }
  }, [sidebarNotice])

  const navigateTo = useCallback((nextRoute, options = {}) => {
    const nextPath = getRoutePath(nextRoute)
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''

    if (typeof window !== 'undefined' && currentPath !== nextPath) {
      const method = options.replace ? 'replaceState' : 'pushState'
      window.history[method]({}, '', nextPath)
    }

    setRoute(nextRoute)
  }, [])

  const openAuthEntry = useCallback(() => {
    clearAuthError()
    setShowAuth(true)
  }, [clearAuthError])

  const openProfileEntry = useCallback(() => {
    clearAuthError()
    if (user) {
      setShowProfile(true)
      return
    }
    setShowAuth(true)
  }, [clearAuthError, user])

  const openSubscriptionEntry = useCallback(() => {
    clearAuthError()
    navigateTo('subscription')
  }, [clearAuthError, navigateTo])

  const showSidebarSubscriptionNotice = useCallback((reason) => {
    const nextNotice = getSidebarProNotice(reason)
    if (!nextNotice) return

    setSidebarActionNotice(nextNotice)
    setDismissedSidebarNoticeKey('')
    setIsFocus(false)
    setIsSidebarHidden(false)
  }, [])

  const handleSelectChat = useCallback((chatId) => {
    setActiveChatId(chatId)
    navigateTo('chat')
  }, [navigateTo, setActiveChatId])

  return (
    <div id="shell" className={`layout shell ${isFocus ? 'focus' : ''}`}>
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-mark">
            <NexusLogo size={46} />
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

            <div className="sidebar-rail-bottom">
              <ProfileMenu
                compact
                user={user}
                avatarUrl={avatarUrl}
                onOpenProfile={openProfileEntry}
                onOpenSubscription={openSubscriptionEntry}
                onLogin={openAuthEntry}
                onLogout={logout}
              />
            </div>
          </aside>
        )}

        {!isSidebarHidden && (
          <Sidebar
            folders={folders}
            chats={chats}
            activeChatId={activeChatId}
            onHide={() => setIsSidebarHidden(true)}
            onSelect={handleSelectChat}
            onAdd={addChat}
            onAddFolder={addFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
            onDelete={deleteChat}
            onRename={renameChat}
            user={user}
            avatarUrl={avatarUrl}
            onProfileClick={openProfileEntry}
            onSubscriptionClick={openSubscriptionEntry}
            onLoginClick={openAuthEntry}
            onLogoutClick={logout}
            subscriptionNotice={visibleSidebarNotice}
            onDismissSubscriptionNotice={() => setDismissedSidebarNoticeKey(sidebarNotice?.key || '')}
          />
        )}
        <div className="chat-col">
          {route === 'subscription' ? (
            <SubscriptionPage
              user={user}
              accessToken={accessToken}
              onRequireAuth={openAuthEntry}
              onRefreshSubscription={refreshProfile}
            />
          ) : activeChat ? (
            <ChatWindow
              key={activeChat.id}
              chat={activeChat}
              folders={folders}
              onAddMessage={addMessage}
              onUpdateChat={updateChat}
              isFocus={isFocus}
              onExitFocus={() => setIsFocus(false)}
              accessToken={accessToken}
              user={user}
              onRefreshSubscription={refreshProfile}
              onShowSubscriptionNotice={showSidebarSubscriptionNotice}
            />
          ) : (
            <section className="workspace-empty">
              <div className="workspace-empty-card">
                <div className="empty-aurora">
                  <NexusLogo size={52} />
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
              onOpenSubscription={() => {
                setShowProfile(false)
                openSubscriptionEntry()
              }}
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
