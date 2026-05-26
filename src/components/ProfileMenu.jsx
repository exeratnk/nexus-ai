import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BoltIcon, LogoutIcon, SettingsIcon, ShieldIcon } from './GlassIcons.jsx'

const VIEWPORT_MARGIN = 16
const POPOVER_GAP = 12
const DEFAULT_POPOVER_WIDTH = 228
const COMPACT_POPOVER_WIDTH = 244

export default function ProfileMenu({
  user,
  avatarUrl,
  compact = false,
  onOpenProfile,
  onOpenSubscription,
  onLogin,
  onLogout,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const popoverRef = useRef(null)
  const [popoverStyle, setPopoverStyle] = useState(null)
  const [popoverPlacement, setPopoverPlacement] = useState('above')
  const planLabel = user?.subscription?.is_pro ? 'Pro' : 'Free'
  const initials = useMemo(() => (user?.username || 'Г')[0].toUpperCase(), [user?.username])

  useEffect(() => {
    if (!isOpen) return undefined

    function handlePointerDown(event) {
      const isInsideTrigger = rootRef.current?.contains(event.target)
      const isInsidePopover = popoverRef.current?.contains(event.target)

      if (!isInsideTrigger && !isInsidePopover) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setPopoverStyle(null)
      setPopoverPlacement('above')
      return undefined
    }

    if (typeof window === 'undefined') return undefined

    let frameId = 0

    function updatePopoverPosition() {
      const trigger = triggerRef.current
      if (!trigger) return

      const triggerRect = trigger.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const maxWidth = Math.max(0, viewportWidth - VIEWPORT_MARGIN * 2)
      const targetWidth = compact
        ? Math.min(COMPACT_POPOVER_WIDTH, maxWidth)
        : Math.min(Math.max(triggerRect.width, DEFAULT_POPOVER_WIDTH), maxWidth)

      let left = compact
        ? triggerRect.left + triggerRect.width / 2 - targetWidth / 2
        : triggerRect.left

      left = Math.min(
        Math.max(left, VIEWPORT_MARGIN),
        Math.max(VIEWPORT_MARGIN, viewportWidth - targetWidth - VIEWPORT_MARGIN),
      )

      const popoverHeight = popoverRef.current?.offsetHeight ?? 0
      const spaceAbove = triggerRect.top - VIEWPORT_MARGIN - POPOVER_GAP
      const spaceBelow = viewportHeight - triggerRect.bottom - VIEWPORT_MARGIN - POPOVER_GAP
      const shouldOpenBelow = popoverHeight > spaceAbove && spaceBelow > spaceAbove
      const maxHeight = Math.max(0, shouldOpenBelow ? spaceBelow : spaceAbove)
      const nextStyle = {
        left: `${Math.round(left)}px`,
        width: `${Math.round(targetWidth)}px`,
        maxHeight: `${Math.round(maxHeight)}px`,
      }

      if (shouldOpenBelow) {
        nextStyle.top = `${Math.round(triggerRect.bottom + POPOVER_GAP)}px`
      } else {
        nextStyle.bottom = `${Math.round(viewportHeight - triggerRect.top + POPOVER_GAP)}px`
      }

      setPopoverStyle(nextStyle)
      setPopoverPlacement(shouldOpenBelow ? 'below' : 'above')
    }

    function requestUpdate() {
      cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(updatePopoverPosition)
    }

    requestUpdate()
    window.addEventListener('resize', requestUpdate)
    window.addEventListener('scroll', requestUpdate, true)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', requestUpdate)
      window.removeEventListener('scroll', requestUpdate, true)
    }
  }, [compact, isOpen, user])

  function runAndClose(fn) {
    setIsOpen(false)
    fn?.()
  }

  const popover =
    isOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={popoverRef}
            className={`profile-menu-popover ${compact ? 'is-compact' : ''}`}
            data-placement={popoverPlacement}
            style={popoverStyle ?? { visibility: 'hidden' }}
            role="menu"
          >
            <div className="profile-menu-head">
              <strong>{user?.username || 'Гость'}</strong>
              <span>{user ? `Тариф: ${planLabel}` : 'Локальный режим'}</span>
            </div>

            {user ? (
              <>
                <button type="button" className="profile-menu-item" onClick={() => runAndClose(onOpenProfile)}>
                  <SettingsIcon size={15} />
                  <span>Профиль</span>
                </button>
                <button type="button" className="profile-menu-item" onClick={() => runAndClose(onOpenSubscription)}>
                  <BoltIcon size={15} />
                  <span>Изменить план</span>
                </button>
                <button type="button" className="profile-menu-item is-danger" onClick={() => runAndClose(onLogout)}>
                  <LogoutIcon size={15} />
                  <span>Выйти</span>
                </button>
              </>
            ) : (
              <>
                <button type="button" className="profile-menu-item" onClick={() => runAndClose(onLogin)}>
                  <SettingsIcon size={15} />
                  <span>Войти / Регистрация</span>
                </button>
                <button type="button" className="profile-menu-item" onClick={() => runAndClose(onOpenSubscription)}>
                  <ShieldIcon size={15} />
                  <span>Посмотреть тарифы</span>
                </button>
              </>
            )}
          </div>,
          document.body,
        )
      : null

  return (
    <div
      ref={rootRef}
      className={`profile-menu-shell ${compact ? 'is-compact' : ''} ${isOpen ? 'is-open' : ''}`}
    >
      <button
        ref={triggerRef}
        type="button"
        className={compact ? 'sidebar-rail-btn sidebar-rail-profile glass-shimmer' : 'sidebar-profile-button glass-shimmer'}
        onClick={() => setIsOpen(prev => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={user ? 'Открыть меню профиля' : 'Открыть меню аккаунта'}
      >
        <div className="avatar-circle">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Аватар пользователя" />
          ) : (
            initials
          )}
        </div>
        {!compact && (
          <div className="sidebar-profile-copy">
            <div className="sidebar-profile-heading">
              <div className="sidebar-profile-name">{user?.username || 'Гость'}</div>
            </div>
            <div className="sidebar-profile-email">
              {user?.email || 'Войдите, чтобы сохранить тариф'}
            </div>
          </div>
        )}
      </button>

      {popover}
    </div>
  )
}
