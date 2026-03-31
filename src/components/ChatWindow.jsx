import React, { useState, useRef, useEffect, useMemo } from 'react'
import AnchorBar from './AnchorBar.jsx'
import MessageList from './MessageList.jsx'
import AnnotationDigest from './AnnotationDigest.jsx'
import { isAnnotationTag } from './annotationConfig.js'


const MOCK_RESPONSES = [
  'Интересный вопрос! Давайте разберём его подробнее.',
  'Хорошо, я понял. Вот что могу сказать по этому поводу.',
  'Это действительно важная тема. Постараюсь объяснить понятно.',
  'Отличный вопрос! В двух словах: всё зависит от контекста.',
  'Давайте подумаем об этом вместе. Есть несколько аспектов.',
  'Согласен с вашей точкой зрения. Добавлю кое-что важное.',
  'Понял вас. Это классическая задача с несколькими решениями.',
  'Интересная постановка! Вот мои мысли на этот счёт.',
]

const DEEP_RESPONSES = [
  'Перечитываю контекст и раскладываю по полочкам. Вот ход мыслей: ...',
  'Давайте подойдём системно: сформулирую гипотезы, проверю допущения и предложу план.',
  'Разберём по слоям: цель → ограничения → варианты → риски. Ниже ключевые выводы.',
  'Сделаю короткий разбор и приведу несколько альтернативных подходов.',
  'Окей, погружусь глубже: сначала уточню задачу, затем дам пошаговое решение.',
]
const ANNOTATION_KEY_PREFIX = 'chat_annotations_'

function getMockResponse() {
  return MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)]
}

function getDeepResponse(model, hasFile) {
  const base = DEEP_RESPONSES[Math.floor(Math.random() * DEEP_RESPONSES.length)]
  const modelTag = model ? ` (модель: ${model})` : ''
  const fileNote = hasFile ? ' Учту приложенный файл.' : ''
  return `${base}${fileNote}${modelTag}`
}

function formatBytes(bytes) {
  if (!bytes || Number.isNaN(bytes)) return ''
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1)
  const value = bytes / (1024 ** i)
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${sizes[i]}`
}

function getAnnotationStorageKey(chatId) {
  return `${ANNOTATION_KEY_PREFIX}${chatId}`
}

function normalizeAnnotationRecord(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}

  const normalized = {}
  for (const [messageId, value] of Object.entries(raw)) {
    if (!value || typeof value !== 'object') continue
    const tags = Array.isArray(value.tags)
      ? value.tags.filter(isAnnotationTag)
      : []
    const note = typeof value.note === 'string' ? value.note.trim() : ''
    const createdAt = Number.isFinite(value.createdAt) ? value.createdAt : Date.now()
    if (tags.length > 0 || note) {
      normalized[String(messageId)] = { tags, note: note || null, createdAt }
    }
  }
  return normalized
}

function readAnnotations(chatId) {
  try {
    const raw = localStorage.getItem(getAnnotationStorageKey(chatId))
    if (!raw) return {}
    return normalizeAnnotationRecord(JSON.parse(raw))
  } catch {
    return {}
  }
}

function writeAnnotations(chatId, annotations) {
  const normalized = normalizeAnnotationRecord(annotations)
  if (Object.keys(normalized).length === 0) {
    localStorage.removeItem(getAnnotationStorageKey(chatId))
    return
  }
  localStorage.setItem(getAnnotationStorageKey(chatId), JSON.stringify(normalized))
}

export default function ChatWindow({ chat, onAddMessage, onUpdateChat }) {
  const [input, setInput] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)


  const anchors = chat.messages
    .filter(m => m.role === 'user')
    .map(m => {
      const base = (m.text || '').trim() || (m.attachments?.[0]?.name ? `📎 ${m.attachments[0].name}` : 'Сообщение')
      const preview = base.length > 30 ? base.slice(0, 30) + '…' : base
      return { id: m.id, text: preview }
    })

  const annotations = useMemo(
    () => normalizeAnnotationRecord(chat.annotations),
    [chat.annotations]
  )


  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages, isTyping])

  useEffect(() => {
    const stored = readAnnotations(chat.id)
    if (Object.keys(stored).length > 0 && JSON.stringify(stored) !== JSON.stringify(annotations)) {
      onUpdateChat?.(chat.id, { annotations: stored })
      return
    }
    if (Object.keys(stored).length === 0 && Object.keys(annotations).length > 0) {
      writeAnnotations(chat.id, annotations)
    }
  }, [chat.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    writeAnnotations(chat.id, annotations)
  }, [chat.id, annotations])

  function scrollToAnchor(msgId) {
    const el = document.getElementById(`msg-${msgId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      el.classList.add('highlight')
      setTimeout(() => el.classList.remove('highlight'), 1500)
    }
  }

  function getAnnotation(messageId) {
    return annotations[String(messageId)]
  }

  function toggleTag(messageId, tag) {
    if (!isAnnotationTag(tag)) return
    const id = String(messageId)
    const current = annotations[id]
    const currentTags = current?.tags || []
    const nextTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag]

    const nextAnnotations = { ...annotations }
    const currentNote = current?.note || null
    if (nextTags.length === 0 && !currentNote) {
      delete nextAnnotations[id]
    } else {
      nextAnnotations[id] = {
        tags: nextTags,
        note: currentNote,
        createdAt: current?.createdAt ?? Date.now(),
      }
    }

    onUpdateChat?.(chat.id, { annotations: nextAnnotations })
    writeAnnotations(chat.id, nextAnnotations)
  }

  function setNote(messageId, note) {
    const id = String(messageId)
    const cleanNote = (note || '').trim()
    const current = annotations[id]
    const currentTags = current?.tags || []
    const nextAnnotations = { ...annotations }

    if (!cleanNote && currentTags.length === 0) {
      delete nextAnnotations[id]
    } else {
      nextAnnotations[id] = {
        tags: currentTags,
        note: cleanNote || null,
        createdAt: current?.createdAt ?? Date.now(),
      }
    }

    onUpdateChat?.(chat.id, { annotations: nextAnnotations })
    writeAnnotations(chat.id, nextAnnotations)
  }

  async function handleSend() {
    const text = input.trim()
    if ((!text && !selectedFile) || isTyping) return

    setInput('')
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''


    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      text,
      attachments: selectedFile
        ? [{
            name: selectedFile.name,
            size: selectedFile.size,
            type: selectedFile.type,
          }]
        : [],
      timestamp: Date.now(),
    }
    onAddMessage(chat.id, userMsg)


    setIsTyping(true)
    const baseDelay = 800 + Math.random() * 700
    const deepExtra = chat.deepMode ? 900 : 0
    await new Promise(r => setTimeout(r, baseDelay + deepExtra))

    const botMsg = {
      id: (Date.now() + 1).toString(),
      role: 'bot',
      text: chat.deepMode
        ? getDeepResponse(chat.model, Boolean(selectedFile))
        : getMockResponse(),
      timestamp: Date.now(),
    }
    onAddMessage(chat.id, botMsg)
    setIsTyping(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }


  function handleInput(e) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  function removeFile() {
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function toggleDeepMode() {
    onUpdateChat?.(chat.id, { deepMode: !chat.deepMode })
  }

  function handleModelChange(e) {
    onUpdateChat?.(chat.id, { model: e.target.value })
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <span className="chat-header-name">{chat.name}</span>
        <span className="chat-header-count">
          {chat.messages.length} сообщ.
        </span>
      </div>

      <div className="chat-controls">
        <div className="control">
          <span className="control-label">Модель</span>
          <select
            className="select-model"
            value={chat.model}
            onChange={handleModelChange}
          >
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4o-mini">GPT-4o mini</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          </select>
        </div>

        <label className="toggle" title="Ответы будут детальнее и чуть дольше">
          <input
            type="checkbox"
            checked={chat.deepMode}
            onChange={toggleDeepMode}
          />
          <span className="toggle-slider" aria-hidden />
          <span className="toggle-label">Глубокое размышление</span>
        </label>

        <div className="file-control">
          <input
            ref={fileInputRef}
            id="file-input"
            type="file"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button
            className="btn-ghost"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            📎 Добавить файл
          </button>
          {selectedFile && (
            <div className="file-chip" title={selectedFile.name}>
              <span className="file-chip-name">{selectedFile.name}</span>
              <span className="file-chip-size">{formatBytes(selectedFile.size)}</span>
              <button className="chip-close" onClick={removeFile} type="button">×</button>
            </div>
          )}
        </div>
      </div>

      <AnchorBar anchors={anchors} onAnchorClick={scrollToAnchor} />
      <AnnotationDigest
        chatName={chat.name}
        messages={chat.messages}
        annotations={annotations}
        onJump={scrollToAnchor}
      />

      <div className="messages-container messages" ref={messagesContainerRef}>
        <MessageList
          messages={chat.messages}
          annotations={annotations}
          toggleTag={toggleTag}
          setNote={setNote}
          getAnnotation={getAnnotation}
        />
        {isTyping && (
          <div className="message message-bot typing">
            <div className="message-role">Бот</div>
            <div className="typing-dots">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="input-area">
        <textarea
          ref={textareaRef}
          className="input-field"
          placeholder="Написать сообщение..."
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isTyping}
        />
        <button
          className="btn-send"
          onClick={handleSend}
          disabled={(!input.trim() && !selectedFile) || isTyping}
        >
          ↑
        </button>
      </div>
    </div>
  )
}
