import React, { useState, useRef, useEffect, useMemo } from 'react'
import AnchorBar from './AnchorBar.jsx'
import AnnotationDigest from './AnnotationDigest.jsx'
import MessageList from './MessageList.jsx'
import { isAnnotationTag } from './annotationConfig.js'
import {
  AttachIcon,
  SendIcon,
  SkillIcon,
  SparkIcon,
} from './GlassIcons.jsx'

const MODEL_OPTIONS = [
  { value: 'nexus-3.7 code', label: 'nexus-3.7 code' },
  { value: 'nexus-mini', label: 'nexus-mini' },
  { value: 'nexus-3.8', label: 'nexus-3.8' },
]

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
const COMPOSER_MIN_HEIGHT = 44

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

export default function ChatWindow({ chat, folders, onAddMessage, onUpdateChat, isFocus }) {
  const [input, setInput] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [isTyping, setIsTyping] = useState(false)
  const [skillInput, setSkillInput] = useState('')
  const [isAnnotationPopoverOpen, setIsAnnotationPopoverOpen] = useState(false)
  const messagesContainerRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const annotationPopoverRef = useRef(null)


  const anchors = chat.messages
    .filter(m => m.role === 'user')
    .map(m => {
      const base = (m.text || '').trim() || (m.attachments?.[0]?.name ? `Файл: ${m.attachments[0].name}` : 'Сообщение')
      const preview = base.length > 30 ? base.slice(0, 30) + '…' : base
      return { id: m.id, text: preview }
    })

  const annotations = useMemo(
    () => normalizeAnnotationRecord(chat.annotations),
    [chat.annotations]
  )
  const annotationCount = useMemo(
    () => Object.keys(annotations).length,
    [annotations]
  )


  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    container.scrollTo({
      top: container.scrollHeight,
      behavior: chat.messages.length > 0 ? 'smooth' : 'auto',
    })
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

  useEffect(() => {
    if (!isAnnotationPopoverOpen) return

    function handlePointerDown(event) {
      if (!annotationPopoverRef.current?.contains(event.target)) {
        setIsAnnotationPopoverOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsAnnotationPopoverOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isAnnotationPopoverOpen])

  function scrollToAnchor(msgId) {
    const el = document.getElementById(`msg-${msgId}`)
    const container = messagesContainerRef.current
    if (!el || !container) return

    const containerRect = container.getBoundingClientRect()
    const messageRect = el.getBoundingClientRect()
    const scrollMarginTop = parseFloat(getComputedStyle(el).scrollMarginTop || '0')
    const nextTop = container.scrollTop + messageRect.top - containerRect.top - scrollMarginTop

    container.scrollTo({
      top: Math.max(0, nextTop),
      behavior: 'smooth',
    })

    setIsAnnotationPopoverOpen(false)
    el.classList.add('highlight')
    setTimeout(() => el.classList.remove('highlight'), 1500)
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
    if (textareaRef.current) {
      textareaRef.current.style.height = `${COMPOSER_MIN_HEIGHT}px`
    }
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

  function handleFolderChange(e) {
    onUpdateChat?.(chat.id, { folderId: e.target.value || null })
  }

  function addSkill() {
    const clean = skillInput.trim()
    if (!clean) return
    onUpdateChat?.(chat.id, { skills: [...(chat.skills || []), clean] })
    setSkillInput('')
  }

  function removeSkill(skillToRemove) {
    onUpdateChat?.(chat.id, {
      skills: (chat.skills || []).filter(skill => skill !== skillToRemove),
    })
  }

  function toggleAnnotationPopover() {
    if (annotationCount === 0) return
    setIsAnnotationPopoverOpen(prev => !prev)
  }

  function applyPrompt(prompt) {
    setInput(prompt)
    requestAnimationFrame(() => {
      if (!textareaRef.current) return
      textareaRef.current.focus()
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`
    })
  }

  return (
    <div className="chat-window">
      <input
        ref={fileInputRef}
        id={`file-input-${chat.id}`}
        type="file"
        onChange={handleFileChange}
        hidden
      />

      <div className="chat-top">
        <div className="chat-header">
          <div className="chat-title-stack">
            <span className="chat-eyebrow">
              <SparkIcon size={13} />
              Активная сессия
            </span>
            <div className="chat-heading-row">
              <h1 className="chat-header-name">{chat.name}</h1>
              <span className="chat-header-count">
                {chat.messages.length} сообщ.
              </span>
            </div>
          </div>
        </div>

        <div className="chat-controls">
          <div className="control model-control">
            <span className="control-label">Папка</span>
            <div className="select-wrap">
              <select
                className="select-model"
                value={chat.folderId || ''}
                onChange={handleFolderChange}
              >
                <option value="">Без папки</option>
                {folders.map(folder => (
                  <option key={folder.id} value={folder.id}>{folder.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="control model-control">
            <span className="control-label">Модель</span>
            <div className="select-wrap">
              <select
                className="select-model"
                value={chat.model}
                onChange={handleModelChange}
              >
                {MODEL_OPTIONS.map(model => (
                  <option key={model.value} value={model.value}>{model.label}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="toggle" title="Ответы будут детальнее и чуть дольше">
            <input
              type="checkbox"
              checked={chat.deepMode}
              onChange={toggleDeepMode}
            />
            <span className="toggle-slider" aria-hidden />
            <span className="toggle-label">Глубокий режим</span>
          </label>
        </div>

        <div className={`skill-panel ${(chat.skills || []).length > 0 ? 'has-skills' : 'is-empty'}`}>
          <div className="skill-panel-header">
            <span className="chat-eyebrow">
              <SkillIcon size={13} />
              Скиллы проекта
            </span>
            <span className="skill-count">{chat.skills?.length || 0}</span>
          </div>
          <div className="skill-input-row">
            <label className="skill-input-shell">
              <SkillIcon size={15} />
              <input
                type="text"
                className="skill-input"
                placeholder="Добавить skill, например React, Prompting, UX Research"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addSkill()
                  }
                }}
              />
            </label>
            <button type="button" className="btn-ghost small glass-shimmer" onClick={addSkill}>
              Добавить
            </button>
          </div>
          {(chat.skills || []).length > 0 && (
            <div className="skill-chip-list">
              {(chat.skills || []).map(skill => (
                <button
                  key={skill}
                  type="button"
                  className="skill-chip glass-shimmer"
                  onClick={() => removeSkill(skill)}
                  title={`Удалить skill ${skill}`}
                >
                  <SkillIcon size={12} />
                  <span>{skill}</span>
                  <span className="skill-chip-close">×</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {anchors.length > 0 && (
          <div className="chat-meta-rail">
            <AnchorBar anchors={anchors} onAnchorClick={scrollToAnchor} />
          </div>
        )}
      </div>

      <div className="messages-container" ref={messagesContainerRef}>
        <div className="messages">
          <MessageList
            messages={chat.messages}
            annotations={annotations}
            toggleTag={toggleTag}
            setNote={setNote}
            getAnnotation={getAnnotation}
            isFocus={isFocus}
            onPromptSelect={applyPrompt}
          />
          {isTyping && (
            <div className="message-list typing-list">
              <div className="msg-wrap msg-wrap-bot">
                <div className="message message-bot typing">
                  <div className="message-role">NexusAI</div>
                  <div className="typing-dots">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="input-area">
        {selectedFile && (
          <div className="file-chip composer-file-chip" title={selectedFile.name}>
            <span className="file-chip-name">{selectedFile.name}</span>
            <span className="file-chip-size">{formatBytes(selectedFile.size)}</span>
            <button className="chip-close glass-shimmer" onClick={removeFile} type="button" aria-label="Убрать файл">×</button>
          </div>
        )}
        <div className="input-area-tools">
          <div className="annotation-popover-wrap" ref={annotationPopoverRef}>
            <button
              type="button"
              className={`btn-ghost small glass-shimmer annotation-toggle ${isAnnotationPopoverOpen ? 'active' : ''}`}
              onClick={toggleAnnotationPopover}
              disabled={annotationCount === 0}
              aria-expanded={isAnnotationPopoverOpen}
              aria-haspopup="dialog"
              title={annotationCount > 0 ? 'Открыть сохраненные аннотации' : 'Сохранённых аннотаций пока нет'}
            >
              <SparkIcon size={14} />
              <span>Аннотации</span>
              <span className="annotation-toggle-count">{annotationCount}</span>
            </button>

            {isAnnotationPopoverOpen && (
              <div className="annotation-popover" role="dialog" aria-label="Сохраненные аннотации">
                <AnnotationDigest
                  chatName={chat.name}
                  messages={chat.messages}
                  annotations={annotations}
                  onJump={scrollToAnchor}
                />
              </div>
            )}
          </div>
        </div>
        <div className="input-shell">
          <button
            className="composer-tool glass-shimmer"
            onClick={() => fileInputRef.current?.click()}
            type="button"
            aria-label="Добавить файл"
            title="Добавить файл"
          >
            <AttachIcon size={18} />
          </button>
          <textarea
            ref={textareaRef}
            className="input-field"
            placeholder="Спросите NexusAI о стратегии, коде, исследовании или файлах..."
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isTyping}
          />
          <span className="composer-hint">Enter</span>
          <button
            className="btn-send glass-shimmer"
            onClick={handleSend}
            disabled={(!input.trim() && !selectedFile) || isTyping}
            aria-label="Отправить сообщение"
            title="Отправить сообщение"
          >
            <SendIcon size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
