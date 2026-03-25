import React from 'react'

function formatBytes(bytes) {
  if (!bytes || Number.isNaN(bytes)) return ''
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1)
  const value = bytes / (1024 ** i)
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${sizes[i]}`
}

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

          {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
            <div className="attachment-list">
              {msg.attachments.map((file, idx) => (
                <div className="attachment-chip" key={`${msg.id}-att-${idx}`}>
                  <span className="attachment-icon">📎</span>
                  <span className="attachment-name">{file.name}</span>
                  <span className="attachment-size">{formatBytes(file.size)}</span>
                </div>
              ))}
            </div>
          )}

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
