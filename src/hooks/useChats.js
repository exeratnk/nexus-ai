import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  getChats as apiGetChats,
  createChat as apiCreateChat,
  updateChat as apiUpdateChat,
  deleteChat as apiDeleteChat,
  getFolders as apiGetFolders,
  createFolder as apiCreateFolder,
  updateFolder as apiUpdateFolder,
  deleteFolder as apiDeleteFolder,
} from '../api.js'

const GUEST_STORAGE_KEY = 'chatai_workspace_v2'
const LEGACY_GUEST_STORAGE_KEY = 'chatai_chats'
const UI_STORAGE_PREFIX = 'chatai_workspace_ui'
const DEFAULT_MODEL = 'nexus-3.8'

function normalizeModel(model) {
  if (model === 'gpt-4o') return 'nexus-3.8'
  if (model === 'gpt-4o-mini') return 'nexus-mini'
  if (model === 'gpt-3.5-turbo') return 'nexus-3.7 code'
  if (model === 'nexus-3.7 code' || model === 'nexus-mini' || model === 'nexus-3.8') return model
  return DEFAULT_MODEL
}

function normalizeSkillList(raw) {
  if (!Array.isArray(raw)) return []
  const normalized = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const clean = item.trim()
    if (clean && !normalized.includes(clean)) normalized.push(clean)
  }
  return normalized
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

function getUiStorageKey(userId) {
  return `${UI_STORAGE_PREFIX}_${userId || 'guest'}`
}

function readChatUiState(userId) {
  try {
    const saved = localStorage.getItem(getUiStorageKey(userId))
    if (!saved) return {}
    const parsed = JSON.parse(saved)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed
  } catch {
    return {}
  }
}

function saveChatUiState(userId, uiMap) {
  localStorage.setItem(getUiStorageKey(userId), JSON.stringify(uiMap))
}

function createFolder(name) {
  return {
    id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    createdAt: Date.now(),
  }
}

function createChat(name, folderId = null) {
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    folderId,
    messages: [],
    createdAt: Date.now(),
    model: normalizeModel(DEFAULT_MODEL),
    deepMode: false,
    skills: [],
    annotations: {},
  }
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

function normalizeFolder(folder) {
  if (!folder) return createFolder('Новая папка')
  const createdAt = folder.createdAt
    ? Number(folder.createdAt)
    : (folder.created ? Date.parse(folder.created) : Date.now())

  return {
    id: String(folder.id),
    name: folder.name || 'Новая папка',
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
  }
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
    folderId: chat.folderId ?? (chat.folder != null ? String(chat.folder) : null),
    messages,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    model: normalizeModel(chat.model),
    deepMode: Boolean(chat.deep_mode ?? chat.deepMode),
    skills: normalizeSkillList(chat.skills),
    annotations: normalizeAnnotationRecord(chat.annotations),
  }
}

function applyUiStateToChats(chats, uiMap) {
  return chats.map(chat => {
    const ui = uiMap?.[String(chat.id)] || {}
    return {
      ...chat,
      skills: normalizeSkillList(ui.skills ?? chat.skills),
      annotations: normalizeAnnotationRecord(ui.annotations ?? chat.annotations),
    }
  })
}

function createUiStateFromChats(chats) {
  return chats.reduce((acc, chat) => {
    acc[String(chat.id)] = {
      skills: normalizeSkillList(chat.skills),
      annotations: normalizeAnnotationRecord(chat.annotations),
    }
    return acc
  }, {})
}

function readGuestWorkspaceFromStorage() {
  try {
    const saved = localStorage.getItem(GUEST_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      const folders = Array.isArray(parsed?.folders) ? parsed.folders.map(normalizeFolder) : []
      const chats = Array.isArray(parsed?.chats) ? parsed.chats.map(normalizeChat) : []
      return { folders, chats }
    }

    const legacy = localStorage.getItem(LEGACY_GUEST_STORAGE_KEY)
    if (!legacy) return { folders: [], chats: [] }
    const parsed = JSON.parse(legacy)
    if (!Array.isArray(parsed)) return { folders: [], chats: [] }
    return { folders: [], chats: parsed.map(normalizeChat) }
  } catch {
    return { folders: [], chats: [] }
  }
}

function saveGuestWorkspaceToStorage(workspace) {
  localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(workspace))
  localStorage.removeItem(LEGACY_GUEST_STORAGE_KEY)
}

function toApiPayload(chat) {
  return {
    name: chat.name || 'Чат',
    folder: chat.folderId ? Number(chat.folderId) : null,
    messages: Array.isArray(chat.messages) ? chat.messages : [],
    model: normalizeModel(chat.model),
    deep_mode: Boolean(chat.deepMode),
  }
}

export function useChats({ user, accessToken, authEvent }) {
  const isAuthenticated = Boolean(user?.id && accessToken)
  const [folders, setFolders] = useState([])
  const [chats, setChats] = useState([createChat('Чат 1')])
  const [activeChatId, setActiveChatId] = useState(null)
  const [loading, setLoading] = useState(true)
  const chatsRef = useRef(chats)
  const foldersRef = useRef(folders)

  useEffect(() => {
    chatsRef.current = chats
  }, [chats])

  useEffect(() => {
    foldersRef.current = folders
  }, [folders])

  const refreshRemoteWorkspace = useCallback(async () => {
    const [remoteChats, remoteFolders] = await Promise.all([
      apiGetChats(accessToken),
      apiGetFolders(accessToken),
    ])
    const uiState = readChatUiState(user?.id)
    return {
      chats: applyUiStateToChats(
        Array.isArray(remoteChats) ? remoteChats.map(normalizeChat) : [],
        uiState
      ),
      folders: Array.isArray(remoteFolders) ? remoteFolders.map(normalizeFolder) : [],
    }
  }, [accessToken, user?.id])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      setLoading(true)

      if (!isAuthenticated) {
        const guestWorkspace = readGuestWorkspaceFromStorage()
        const initialChats = guestWorkspace.chats.length > 0 ? guestWorkspace.chats : [createChat('Чат 1')]
        if (cancelled) return
        setFolders(guestWorkspace.folders)
        setChats(initialChats)
        setActiveChatId(prev => (
          prev && initialChats.some(c => String(c.id) === String(prev))
            ? String(prev)
            : initialChats[0]?.id || null
        ))
        setLoading(false)
        return
      }

      try {
        let remoteWorkspace = await refreshRemoteWorkspace()
        const shouldMigrateGuestChats = authEvent?.type === 'register'
        const guestWorkspace = readGuestWorkspaceFromStorage()

        if (shouldMigrateGuestChats && (guestWorkspace.folders.length > 0 || guestWorkspace.chats.length > 0)) {
          const folderIdMap = new Map()

          for (const folder of guestWorkspace.folders) {
            const createdFolder = await apiCreateFolder(accessToken, { name: folder.name })
            folderIdMap.set(String(folder.id), String(createdFolder.id))
          }

          for (const guestChat of guestWorkspace.chats) {
            const payload = toApiPayload({
              ...guestChat,
              folderId: guestChat.folderId ? folderIdMap.get(String(guestChat.folderId)) || null : null,
            })
            await apiCreateChat(accessToken, payload)
          }

          localStorage.removeItem(GUEST_STORAGE_KEY)
          localStorage.removeItem(LEGACY_GUEST_STORAGE_KEY)
          remoteWorkspace = await refreshRemoteWorkspace()
        }

        if (cancelled) return
        setFolders(remoteWorkspace.folders)
        setChats(remoteWorkspace.chats)
        setActiveChatId(prev => (
          prev && remoteWorkspace.chats.some(c => String(c.id) === String(prev))
            ? String(prev)
            : remoteWorkspace.chats[0]?.id || null
        ))
      } catch (e) {
        if (!cancelled) {
          console.error('Не удалось загрузить workspace:', e)
          setFolders([])
          setChats([])
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
  }, [isAuthenticated, accessToken, refreshRemoteWorkspace, user?.id, authEvent?.type, authEvent?.at])

  useEffect(() => {
    if (!isAuthenticated) {
      saveGuestWorkspaceToStorage({ folders, chats })
      return
    }

    saveChatUiState(user?.id, createUiStateFromChats(chats))
  }, [folders, chats, isAuthenticated, user?.id])

  const activeChat = useMemo(
    () => chats.find(c => String(c.id) === String(activeChatId)) || chats[0] || null,
    [chats, activeChatId]
  )

  async function addFolder(name = '') {
    const folderName = (name || `Папка ${foldersRef.current.length + 1}`).trim()

    if (!isAuthenticated) {
      const newFolder = createFolder(folderName)
      const newChat = createChat(`\u0427\u0430\u0442 ${chatsRef.current.length + 1}`, newFolder.id)
      setFolders(prev => [...prev, newFolder])
      setChats(prev => [...prev, newChat])
      setActiveChatId(newChat.id)
      return newFolder
    }

    try {
      const created = await apiCreateFolder(accessToken, { name: folderName })
      const normalized = normalizeFolder(created)
      setFolders(prev => [...prev, normalized])
      const nextChatName = `\u0427\u0430\u0442 ${chatsRef.current.length + 1}`
      const createdChat = await apiCreateChat(accessToken, toApiPayload(createChat(nextChatName, normalized.id)))
      const normalizedChat = applyUiStateToChats([normalizeChat(createdChat)], readChatUiState(user?.id))[0]
      setChats(prev => [...prev, normalizedChat])
      setActiveChatId(normalizedChat.id)
      return normalized
    } catch (e) {
      console.error('Не удалось создать папку:', e)
      return null
    }
  }

  async function renameFolder(id, name) {
    const folderId = String(id)
    const folderName = name.trim()
    if (!folderName) return

    setFolders(prev => prev.map(folder => (
      String(folder.id) === folderId ? { ...folder, name: folderName } : folder
    )))

    if (!isAuthenticated) return

    apiUpdateFolder(accessToken, folderId, { name: folderName }).catch(e => {
      console.error('Не удалось переименовать папку:', e)
    })
  }

  async function deleteFolder(id) {
    const folderId = String(id)

    setFolders(prev => prev.filter(folder => String(folder.id) !== folderId))
    setChats(prev => prev.map(chat => (
      String(chat.folderId) === folderId ? { ...chat, folderId: null } : chat
    )))

    if (!isAuthenticated) return

    try {
      await apiDeleteFolder(accessToken, folderId)
    } catch (e) {
      console.error('Не удалось удалить папку:', e)
    }
  }

  async function addChat(options = {}) {
    const folderId = options.folderId ? String(options.folderId) : null

    if (!isAuthenticated) {
      setChats(prev => {
        const newChat = createChat(`Чат ${prev.length + 1}`, folderId)
        setActiveChatId(newChat.id)
        return [...prev, newChat]
      })
      return
    }

    try {
      const nextName = `Чат ${chatsRef.current.length + 1}`
      const created = await apiCreateChat(accessToken, toApiPayload(createChat(nextName, folderId)))
      const normalized = applyUiStateToChats([normalizeChat(created)], readChatUiState(user?.id))[0]
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
      const refreshed = await refreshRemoteWorkspace()

      setFolders(refreshed.folders)
      setChats(refreshed.chats)
      setActiveChatId(prev => (
        prev && refreshed.chats.some(c => String(c.id) === String(prev))
          ? String(prev)
          : refreshed.chats[0]?.id || null
      ))
    } catch (e) {
      console.error('Не удалось удалить чат:', e)
    }
  }

  function renameChat(id, name) {
    const chatId = String(id)
    const chatName = name.trim()
    if (!chatName) return

    setChats(prev => prev.map(c => (String(c.id) === chatId ? { ...c, name: chatName } : c)))

    if (!isAuthenticated) return

    apiUpdateChat(accessToken, chatId, { name: chatName }).catch(e => {
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
    const nextData = { ...data }

    if (Object.prototype.hasOwnProperty.call(nextData, 'skills')) {
      nextData.skills = normalizeSkillList(nextData.skills)
    }
    if (Object.prototype.hasOwnProperty.call(nextData, 'annotations')) {
      nextData.annotations = normalizeAnnotationRecord(nextData.annotations)
    }
    if (Object.prototype.hasOwnProperty.call(nextData, 'folderId')) {
      nextData.folderId = nextData.folderId ? String(nextData.folderId) : null
    }

    setChats(prev => prev.map(c => (String(c.id) === id ? { ...c, ...nextData } : c)))

    if (!isAuthenticated) return

    const payload = {}
    if (Object.prototype.hasOwnProperty.call(nextData, 'name')) payload.name = nextData.name
    if (Object.prototype.hasOwnProperty.call(nextData, 'folderId')) payload.folder = nextData.folderId ? Number(nextData.folderId) : null
    if (Object.prototype.hasOwnProperty.call(nextData, 'model')) payload.model = nextData.model
    if (Object.prototype.hasOwnProperty.call(nextData, 'deepMode')) payload.deep_mode = Boolean(nextData.deepMode)
    if (Object.prototype.hasOwnProperty.call(nextData, 'messages')) payload.messages = nextData.messages
    if (Object.keys(payload).length === 0) return

    apiUpdateChat(accessToken, id, payload).catch(e => {
      console.error('Не удалось обновить чат:', e)
    })
  }

  return {
    folders,
    chats,
    activeChat,
    activeChatId,
    loading,
    setActiveChatId,
    addFolder,
    renameFolder,
    deleteFolder,
    addChat,
    deleteChat,
    renameChat,
    addMessage,
    updateChat,
  }
}

