import React, { useState } from 'react'

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
        <span className="sidebar-title">Мои чаты</span>
        <button className="btn-new" onClick={onAdd} title="Новый чат">＋</button>
      </div>

      <ul className="chat-list">
        {chats.map(chat => (
          <li
            key={chat.id}
            className={`chat-item ${chat.id === activeChatId ? 'active' : ''}`}
            onClick={() => onSelect(chat.id)}
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
                <span className="chat-name">{chat.name}</span>
                <div className="chat-actions">
                  <button
                    className="btn-icon"
                    title="Переименовать"
                    onClick={e => startEdit(chat, e)}
                  >✎</button>
                  <button
                    className="btn-icon btn-delete"
                    title="Удалить"
                    onClick={e => { e.stopPropagation(); onDelete(chat.id) }}
                  >✕</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </aside>
  )
}
