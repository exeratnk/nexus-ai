import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { TAG_META, TAG_ORDER, getPrimaryTagColor } from './annotationConfig.js'
import { AttachIcon, NexusLogo } from './GlassIcons.jsx'

const EMPTY_PROMPTS = [
  'Сделай обзор стратегии',
  'Разбери документ',
  'Предложи UI-концепцию',
]

function formatBytes(bytes) {
  if (!bytes || Number.isNaN(bytes)) return ''
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1)
  const value = bytes / (1024 ** i)
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${sizes[i]}`
}

function ImportantIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.4v6.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16.9" r="1" fill="currentColor" />
    </svg>
  )
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
      <path d="M6 4h10l3 3v13H6z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 4v6h6V4" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
      <path d="M12 4.8 20.2 19H3.8z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 9.2v5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16.8" r="1" fill="currentColor" />
    </svg>
  )
}

function NoteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
      <path d="M5 5h14v14H5z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 9h8M8 12h8M8 15h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="9" y="9" width="10" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function CopyDoneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M5.5 12.5 9.7 16.7 18.5 7.9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const ICONS = {
  important: <ImportantIcon />,
  save: <SaveIcon />,
  check: <CheckIcon />,
}

function MarkdownMessage({ text }) {
  const source = typeof text === 'string' ? text : ''

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ node: _node, ...props }) => (
          <a {...props} target="_blank" rel="noreferrer noopener" />
        ),
      }}
    >
      {source}
    </ReactMarkdown>
  )
}

export default function MessageList({
  messages,
  annotations,
  toggleTag,
  setNote,
  getAnnotation,
  isFocus,
  onPromptSelect,
}) {
  const [hoveredId, setHoveredId] = useState(null)
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const copiedResetRef = useRef(null)

  useEffect(() => () => {
    if (copiedResetRef.current) {
      clearTimeout(copiedResetRef.current)
    }
  }, [])

  const messageIndexMap = useMemo(() => {
    const map = {}
    messages.forEach((msg, index) => {
      map[String(msg.id)] = index + 1
    })
    return map
  }, [messages])

  function openNoteEditor(messageId) {
    const current = getAnnotation?.(messageId)?.note ?? annotations?.[String(messageId)]?.note ?? ''
    setEditingNoteId(String(messageId))
    setNoteDraft(current || '')
    setHoveredId(String(messageId))
  }

  function commitNote(messageId) {
    const trimmed = noteDraft.trim()
    setNote?.(String(messageId), trimmed)
    setEditingNoteId(null)
  }

  async function handleCopyMessage(messageId, text) {
    if (!navigator?.clipboard?.writeText) return

    try {
      await navigator.clipboard.writeText(typeof text === 'string' ? text : '')
      setCopiedId(String(messageId))
      if (copiedResetRef.current) {
        clearTimeout(copiedResetRef.current)
      }
      copiedResetRef.current = setTimeout(() => {
        setCopiedId(current => (current === String(messageId) ? null : current))
      }, 1800)
    } catch {
      return
    }
  }

  return (
    <div className={`message-list ${messages.length === 0 ? 'message-list-empty' : ''}`}>
      {messages.length === 0 && (
        <div className="empty-state">
          <div className="empty-aurora">
            <NexusLogo size={52} />
          </div>
          <span className="empty-kicker">NexusAI готов к работе</span>
          <h2>Начните разговор с ясной задачи</h2>
          {isFocus && (
            <p>
              Здесь можно разобрать продуктовую идею, загрузить файл, продумать архитектуру
              или быстро собрать план без визуального шума.
            </p>
          )}
          <div className="empty-prompts" aria-label="Примеры запросов">
            {EMPTY_PROMPTS.map(prompt => (
              <button
                key={prompt}
                type="button"
                className="empty-prompt-btn glass-shimmer"
                onClick={() => onPromptSelect?.(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}
      {messages.map(msg => {
        const messageId = String(msg.id)
        const annotation = getAnnotation?.(messageId) || annotations?.[messageId]
        const tags = annotation?.tags || []
        const note = annotation?.note || null
        const primaryColor = getPrimaryTagColor(annotation)
        const isBotMessage = msg.role === 'bot'
        const isCompactBotMessage = isBotMessage
          && typeof msg.text === 'string'
          && msg.text.trim().length <= 32
          && !msg.text.includes('\n')
          && (!Array.isArray(msg.attachments) || msg.attachments.length === 0)
        const isToolbarVisible = hoveredId === messageId
        const isNoteEditing = editingNoteId === messageId

        return (
          <div
            key={msg.id}
            className={`msg-wrap msg-wrap-${msg.role}${isCompactBotMessage ? ' msg-wrap-compact-bot' : ''}`}
            onMouseEnter={() => setHoveredId(messageId)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div
              id={`msg-${msg.id}`}
              className={`message message-${msg.role}`}
              style={
                primaryColor
                  ? { borderLeft: `2.5px solid ${primaryColor}` }
                  : undefined
              }
            >
              <div className="message-role">
                {msg.role === 'user' ? 'Вы' : 'NexusAI'}
              </div>
              <div className="message-text markdown-body">
                <MarkdownMessage text={msg.text} />
              </div>
              <div className="message-actions">
                <button
                  type="button"
                  className={`message-copy-btn ${copiedId === messageId ? 'copied' : ''}`}
                  onClick={() => handleCopyMessage(messageId, msg.text)}
                  aria-label={copiedId === messageId ? 'Сообщение скопировано' : 'Копировать сообщение'}
                  title={copiedId === messageId ? 'Скопировано' : 'Копировать'}
                >
                  {copiedId === messageId ? <CopyDoneIcon /> : <CopyIcon />}
                </button>
              </div>

              {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                <div className="attachment-list">
                  {msg.attachments.map((file, idx) => (
                    <div className="attachment-chip" key={`${msg.id}-att-${idx}`}>
                      <span className="attachment-icon"><AttachIcon size={12} /></span>
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

            {isBotMessage && (
              <div className={`hover-toolbar ${isToolbarVisible ? 'visible' : ''}`}>
                {TAG_ORDER.map(tag => {
                  const meta = TAG_META[tag]
                  const active = tags.includes(tag)
                  return (
                    <button
                      key={`${messageId}-${tag}`}
                      type="button"
                      className={`toolbar-btn glass-shimmer ${active ? 'active' : ''}`}
                      style={active ? { color: meta.color } : undefined}
                      title={meta.label}
                      aria-label={meta.label}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleTag?.(messageId, tag)
                      }}
                    >
                      {ICONS[tag]}
                    </button>
                  )
                })}
                <span className="toolbar-divider" aria-hidden />
                <button
                  type="button"
                  className={`toolbar-btn glass-shimmer ${isNoteEditing ? 'active note-active' : ''}`}
                  title="Заметка"
                  aria-label="Заметка"
                  onClick={(e) => {
                    e.stopPropagation()
                    openNoteEditor(messageId)
                  }}
                >
                  <NoteIcon />
                </button>
              </div>
            )}

            {(tags.length > 0 || note || isNoteEditing) && (
              <div className="annotation-block">
                {tags.length > 0 && (
                  <div className="annotation-pill-row">
                    {tags.map(tag => {
                      const meta = TAG_META[tag]
                      return (
                        <button
                          key={`${messageId}-pill-${tag}`}
                          type="button"
                          className="annotation-pill glass-shimmer"
                          style={{
                            color: meta.color,
                            borderColor: `${meta.color}66`,
                          }}
                          onClick={() => toggleTag?.(messageId, tag)}
                          title="Снять метку"
                        >
                          {meta.label}
                        </button>
                      )
                    })}
                  </div>
                )}

                {isNoteEditing ? (
                  <textarea
                    className="annotation-note-editor"
                    value={noteDraft}
                    autoFocus
                    placeholder="Добавьте заметку"
                    onChange={e => setNoteDraft(e.target.value)}
                    onBlur={() => commitNote(messageId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        commitNote(messageId)
                      }
                    }}
                  />
                ) : (
                  note && (
                    <div className="annotation-note">
                      {note}
                      <button
                        type="button"
                        className="annotation-note-edit glass-shimmer"
                        onClick={() => openNoteEditor(messageId)}
                        title={`Редактировать заметку #${messageIndexMap[messageId]}`}
                        aria-label="Редактировать заметку"
                      >
                        <NoteIcon />
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
