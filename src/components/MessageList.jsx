import React from 'react'

export default function MessageList({ messages }) {
  return (
    <div className="message-list">
      {messages.length === 0 && (
        <div className="empty-state">
          Начните диалог — напишите что-нибудь ↓
        </div>
      )}
      {messages.map(msg => (
        <div
          key={msg.id}
          id={`msg-${msg.id}`}
          className={`message message-${msg.role}`}
        >
          <div className="message-role">
            {msg.role === 'user' ? 'Вы' : 'Бот'}
          </div>
          <div className="message-text">{msg.text}</div>
          <div className="message-time">
            {new Date(msg.timestamp).toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
