import { useState, useEffect } from 'react'

const STORAGE_KEY = 'chatai_chats'

function createChat(name) {
  return {
    id: Date.now().toString(),
    name,
    messages: [],
    createdAt: Date.now(),
  }
}

function normalizeMessage(msg, index) {
  const text = msg?.text ?? msg?.content ?? ''
  const role = msg?.role === 'assistant' ? 'bot' : (msg?.role || 'bot')
  const timestamp = msg?.timestamp ?? msg?.createdAt ?? Date.now()
  const id = msg?.id ?? `${Date.now()}-${index}`
  return { id, role, text, timestamp }
}

function normalizeChat(chat) {
  if (!chat) return createChat('Чат 1')
  const messages = Array.isArray(chat.messages)
    ? chat.messages.map((m, i) => normalizeMessage(m, i))
    : []
  return {
    id: chat.id || Date.now().toString(),
    name: chat.name || 'Чат 1',
    messages,
    createdAt: chat.createdAt || Date.now(),
  }
}

export function useChats() {
  const [chats, setChats] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.length > 0) return parsed.map(normalizeChat)
      }
    } catch {}
    return [createChat('Чат 1')]
  })

  const [activeChatId, setActiveChatId] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.length > 0) return parsed[0].id
      }
    } catch {}
    return null
  })

  // Sync activeChatId if chats loaded from storage
  useEffect(() => {
    if (!activeChatId && chats.length > 0) {
      setActiveChatId(chats[0].id)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats))
  }, [chats])

  const activeChat = chats.find(c => c.id === activeChatId) || chats[0]

  function addChat() {
    const newChat = createChat(`Чат ${chats.length + 1}`)
    setChats(prev => [...prev, newChat])
    setActiveChatId(newChat.id)
  }

  function deleteChat(id) {
    setChats(prev => {
      const updated = prev.filter(c => c.id !== id)
      if (updated.length === 0) {
        const fresh = createChat('Чат 1')
        setActiveChatId(fresh.id)
        return [fresh]
      }
      if (activeChatId === id) {
        setActiveChatId(updated[0].id)
      }
      return updated
    })
  }

  function renameChat(id, name) {
    setChats(prev => prev.map(c => c.id === id ? { ...c, name } : c))
  }

  function addMessage(chatId, message) {
    setChats(prev =>
      prev.map(c =>
        c.id === chatId
          ? { ...c, messages: [...c.messages, message] }
          : c
      )
    )
  }

  return {
    chats,
    activeChat,
    activeChatId,
    setActiveChatId,
    addChat,
    deleteChat,
    renameChat,
    addMessage,
  }
}
