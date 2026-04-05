import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  getChats as apiGetChats,
  createChat as apiCreateChat,
  updateChat as apiUpdateChat,
  deleteChat as apiDeleteChat,
} from '../api.js'

const GUEST_STORAGE_KEY = 'chatai_chats'
const DEFAULT_MODEL = 'gpt-4o'

function createChat(name) {
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    messages: [],
    createdAt: Date.now(),
    model: DEFAULT_MODEL,
    deepMode: false,
    annotations: {},
  }
}

function normalizeAnnotationRecord(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const normalized = {}
  for (const [messageId, value] of Object.entries(raw)) {
    if (!value || typeof value !== 'object') continue
    const tags = Array.isArray(value.tags)
      ? value.tags.filter(tag => tag === 'important' || tag === 'save' || tag === 'check')
      : []
    const note = typeof value.note === 'string' ? value.note : null
    const createdAt = Number.isFinite(value.createdAt) ? value.createdAt : Date.now()
    if (tags.length > 0 || (note && note.trim())) {
      normalized[String(messageId)] = { tags, note: note && note.trim() ? note : null, createdAt }
    }
  }
  return normalized
}

function normalizeMessage(msg, index) {
  const text = msg?.text ?? msg?.content ?? ''
  const role = msg?.role === 'assistant' ? 'bot' : (msg?.role || 'bot')
  const timestamp = msg?.timestamp ?? msg?.createdAt ?? Date.now()
  const id = msg?.id ?? `${Date.now()}-${index}`
  const attachments = Array.isArray(msg?.attachments)
    ? msg.attachments.map(a => ({
      name: a?.name ?? 'file',
      size: a?.size ?? 0,
      type: a?.type ?? 'file',
    }))
    : []
  return { id, role, text, timestamp, attachments }
}

function normalizeChat(chat) {
  if (!chat) return createChat('Чат 1')
  const messages = Array.isArray(chat.messages)
    ? chat.messages.map((m, i) => normalizeMessage(m, i))
    : []

  const createdAt = chat.createdAt
    ? Number(chat.createdAt)
    : (chat.created ? Date.parse(chat.created) : Date.now())

  return {
    id: String(chat.id || `local-${Date.now()}`),
    name: chat.name || 'Чат 1',
    messages,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    model: chat.model || DEFAULT_MODEL,
    deepMode: Boolean(chat.deep_mode ?? chat.deepMode),
    annotations: normalizeAnnotationRecord(chat.annotations),
  }
}

function readGuestChatsFromStorage() {
  try {
    const saved = localStorage.getItem(GUEST_STORAGE_KEY)
    if (!saved) return []
    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeChat)
  } catch {
    return []
  }
}

function saveGuestChatsToStorage(chats) {
  localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(chats))
}

function toApiPayload(chat) {
  return {
    name: chat.name || 'Чат',
    messages: Array.isArray(chat.messages) ? chat.messages : [],
    model: chat.model || DEFAULT_MODEL,
    deep_mode: Boolean(chat.deepMode),
  }
}

export function useChats({ user, accessToken, authEvent }) {
  const isAuthenticated = Boolean(user?.id && accessToken)
  const [chats, setChats] = useState([createChat('Чат 1')])
  const [activeChatId, setActiveChatId] = useState(null)
  const [loading, setLoading] = useState(true)
  const chatsRef = useRef(chats)

  useEffect(() => {
    chatsRef.current = chats
  }, [chats])

  const refreshRemoteChats = useCallback(async () => {
    const remote = await apiGetChats(accessToken)
    if (!Array.isArray(remote)) return []
    return remote.map(normalizeChat)
  }, [accessToken])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      setLoading(true)

      if (!isAuthenticated) {
        const guestChats = readGuestChatsFromStorage()
        const initial = guestChats.length > 0 ? guestChats : [createChat('Чат 1')]
        if (cancelled) return
        setChats(initial)
        setActiveChatId(prev => (
          prev && initial.some(c => String(c.id) === String(prev))
            ? String(prev)
            : initial[0]?.id || null
        ))
        setLoading(false)
        return
      }

      try {
        let remoteChats = await refreshRemoteChats()
        const shouldMigrateGuestChats = authEvent?.type === 'register'

        const guestChats = readGuestChatsFromStorage()
        if (shouldMigrateGuestChats && guestChats.length > 0) {
          for (const guestChat of guestChats) {
            await apiCreateChat(accessToken, toApiPayload(guestChat))
          }
          localStorage.removeItem(GUEST_STORAGE_KEY)
          remoteChats = await refreshRemoteChats()
        }

        if (cancelled) return
        setChats(remoteChats)
        setActiveChatId(prev => (
          prev && remoteChats.some(c => String(c.id) === String(prev))
            ? String(prev)
            : remoteChats[0]?.id || null
        ))
      } catch (e) {
        if (!cancelled) {
          console.error('Не удалось загрузить чаты:', e)
          const fallback = []
          setChats(fallback)
          setActiveChatId(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    bootstrap()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, accessToken, refreshRemoteChats, user?.id, authEvent?.type, authEvent?.at])

  useEffect(() => {
    if (!isAuthenticated) {
      saveGuestChatsToStorage(chats)
    }
  }, [chats, isAuthenticated])

  const activeChat = useMemo(
    () => chats.find(c => String(c.id) === String(activeChatId)) || chats[0] || null,
    [chats, activeChatId]
  )

  async function addChat() {
    if (!isAuthenticated) {
      setChats(prev => {
        const newChat = createChat(`Чат ${prev.length + 1}`)
        setActiveChatId(newChat.id)
        return [...prev, newChat]
      })
      return
    }

    try {
      const nextName = `Чат ${chatsRef.current.length + 1}`
      const created = await apiCreateChat(accessToken, toApiPayload(createChat(nextName)))
      const normalized = normalizeChat(created)
      setChats(prev => [...prev, normalized])
      setActiveChatId(normalized.id)
    } catch (e) {
      console.error('Не удалось создать чат:', e)
    }
  }

  async function deleteChat(id) {
    const chatId = String(id)

    if (!isAuthenticated) {
      setChats(prev => {
        const updated = prev.filter(c => String(c.id) !== chatId)
        if (updated.length === 0) {
          const fresh = createChat('Чат 1')
          setActiveChatId(fresh.id)
          return [fresh]
        }
        if (String(activeChatId) === chatId) {
          setActiveChatId(updated[0].id)
        }
        return updated
      })
      return
    }

    try {
      await apiDeleteChat(accessToken, chatId)
      const refreshed = await refreshRemoteChats()

      setChats(refreshed)
      setActiveChatId(prev => (
        prev && refreshed.some(c => String(c.id) === String(prev))
          ? String(prev)
          : refreshed[0]?.id || null
      ))
    } catch (e) {
      console.error('Не удалось удалить чат:', e)
    }
  }

  function renameChat(id, name) {
    const chatId = String(id)
    setChats(prev => prev.map(c => (String(c.id) === chatId ? { ...c, name } : c)))

    if (!isAuthenticated) return

    apiUpdateChat(accessToken, chatId, { name }).catch(e => {
      console.error('Не удалось переименовать чат:', e)
    })
  }

  function addMessage(chatId, message) {
    const id = String(chatId)
    const current = chatsRef.current.find(c => String(c.id) === id)
    if (!current) return

    const nextMessages = [...current.messages, message]
    setChats(prev => prev.map(c => (String(c.id) === id ? { ...c, messages: nextMessages } : c)))

    if (!isAuthenticated) return

    apiUpdateChat(accessToken, id, { messages: nextMessages }).catch(e => {
      console.error('Не удалось сохранить сообщение:', e)
    })
  }

  function updateChat(chatId, data) {
    const id = String(chatId)
    setChats(prev => prev.map(c => (String(c.id) === id ? { ...c, ...data } : c)))

    if (!isAuthenticated) return

    const payload = {}
    if (Object.prototype.hasOwnProperty.call(data, 'name')) payload.name = data.name
    if (Object.prototype.hasOwnProperty.call(data, 'model')) payload.model = data.model
    if (Object.prototype.hasOwnProperty.call(data, 'deepMode')) payload.deep_mode = Boolean(data.deepMode)
    if (Object.prototype.hasOwnProperty.call(data, 'messages')) payload.messages = data.messages
    if (Object.keys(payload).length === 0) return

    apiUpdateChat(accessToken, id, payload).catch(e => {
      console.error('Не удалось обновить чат:', e)
    })
  }

  return {
    chats,
    activeChat,
    activeChatId,
    loading,
    setActiveChatId,
    addChat,
    deleteChat,
    renameChat,
    addMessage,
    updateChat,
  }
}
