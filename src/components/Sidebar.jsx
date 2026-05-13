import React, { useMemo, useState } from 'react'
import {
  EditIcon,
  MessageIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from './GlassIcons.jsx'

function getChatPreview(chat) {
  const lastMessage = chat.messages?.[chat.messages.length - 1]
  const text = lastMessage?.text?.trim()
  if (text) return text.length > 54 ? `${text.slice(0, 54)}…` : text
  if (lastMessage?.attachments?.[0]?.name) return lastMessage.attachments[0].name
  return 'Новая сессия готова к работе'
}

export default function Sidebar({
  chats,
  activeChatId,
  onSelect,
  onAdd,
  onDelete,
  onRename,
}) {
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [search, setSearch] = useState('')

  const filteredChats = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return chats
    return chats.filter(chat => chat.name.toLowerCase().includes(query))
  }, [chats, search])

  function startEdit(chat, e) {
    e.stopPropagation()
    setEditingId(chat.id)
    setEditValue(chat.name)
  }

  function confirmEdit(id) {
    if (editValue.trim()) onRename(id, editValue.trim())
    setEditingId(null)
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div>
          <span className="sidebar-title">Workspace</span>
          <div className="sidebar-subtitle">AI cockpit</div>
        </div>
        <button className="btn-new glass-shimmer" onClick={onAdd} title="Новый чат" aria-label="Новый чат">
          <PlusIcon size={17} />
        </button>
      </div>

      <label className="sidebar-search">
        <SearchIcon size={15} />
        <input
          type="search"
          placeholder="Найти диалог"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </label>

      <div className="sidebar-section-row">
        <span className="sidebar-section-title">Диалоги</span>
        <span className="sidebar-section-count">{filteredChats.length}</span>
      </div>

      <ul className="chat-list">
        {filteredChats.map(chat => (
          <li
            key={chat.id}
            className={`chat-item ${chat.id === activeChatId ? 'active' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(chat.id)}
            onKeyDown={(e) => {
              if (editingId === chat.id) return
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(chat.id)
              }
            }}
          >
            {editingId === chat.id ? (
              <input
                className="rename-input"
                value={editValue}
                autoFocus
                onChange={e => setEditValue(e.target.value)}
                onBlur={() => confirmEdit(chat.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter') confirmEdit(chat.id)
                  if (e.key === 'Escape') setEditingId(null)
                }}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <>
                <div className="chat-icon">
                  <MessageIcon size={16} />
                </div>
                <div className="chat-copy">
                  <span className="chat-name">{chat.name}</span>
                  <span className="chat-meta">{getChatPreview(chat)}</span>
                </div>
                <span className="chat-count">{chat.messages?.length || 0}</span>
                <div className="chat-actions">
                  <button
                    className="btn-icon glass-shimmer"
                    title="Переименовать"
                    aria-label="Переименовать"
                    onClick={e => startEdit(chat, e)}
                  >
                    <EditIcon size={13} />
                  </button>
                  <button
                    className="btn-icon btn-delete glass-shimmer"
                    title="Удалить"
                    aria-label="Удалить"
                    onClick={e => { e.stopPropagation(); onDelete(chat.id) }}
                  >
                    <TrashIcon size={13} />
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
        {filteredChats.length === 0 && (
          <li className="sidebar-empty">Ничего не найдено. Попробуйте другой запрос.</li>
        )}
      </ul>
    </aside>
  )
}
