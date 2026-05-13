import React, { useMemo, useState } from 'react'
import { TAG_META, getPrimaryTagColor } from './annotationConfig.js'

const FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'save', label: 'Сохранить' },
  { id: 'important', label: 'Важно' },
  { id: 'check', label: 'Перепроверить' },
]

function getPreview(text) {
  const clean = (text || '').trim()
  if (!clean) return 'Сообщение без текста'
  return clean.length > 60 ? `${clean.slice(0, 60)}…` : clean
}

export default function AnnotationDigest({ chatName, messages, annotations, onJump }) {
  const [filter, setFilter] = useState('all')

  const items = useMemo(() => {
    return messages
      .map((msg, index) => {
        const annotation = annotations?.[String(msg.id)]
        const tags = annotation?.tags || []
        const note = annotation?.note || null
        if (tags.length === 0 && !note) return null
        return {
          messageId: String(msg.id),
          preview: getPreview(msg.text),
          position: index + 1,
          tags,
          color: getPrimaryTagColor(annotation) || '#AFA9EC',
        }
      })
      .filter(Boolean)
  }, [messages, annotations])

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items
    return items.filter(item => item.tags.includes(filter))
  }, [items, filter])

  if (items.length === 0) return null

  return (
    <div className="annotation-digest">
      <div className="annotation-digest-tabs">
        {FILTERS.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`annotation-digest-tab glass-shimmer ${filter === tab.id ? 'active' : ''}`}
            onClick={() => setFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="annotation-digest-list">
        {filteredItems.length === 0 && (
          <div className="annotation-digest-empty">Нет аннотаций для этого фильтра</div>
        )}
        {filteredItems.map(item => (
          <button
            key={item.messageId}
            type="button"
            className="annotation-digest-item glass-shimmer"
            onClick={() => onJump?.(item.messageId)}
          >
            <span
              className="annotation-digest-dot"
              style={{ background: item.color }}
            />
            <span className="annotation-digest-text">{item.preview}</span>
            <span className="annotation-digest-meta">{chatName} · #{item.position}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
