import React, { useState, useRef, useEffect } from 'react'
import AnchorBar from './AnchorBar.jsx'
import MessageList from './MessageList.jsx'

// Mock ответы бота
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

function getMockResponse() {
  return MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)]
}

export default function ChatWindow({ chat, onAddMessage }) {
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const textareaRef = useRef(null)

  // Якоря — только сообщения пользователя
  const anchors = chat.messages
    .filter(m => m.role === 'user')
    .map(m => ({
      id: m.id,
      text: m.text.length > 30 ? m.text.slice(0, 30) + '…' : m.text,
    }))

  // Прокрутка вниз при новом сообщении
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages, isTyping])

  function scrollToAnchor(msgId) {
    const el = document.getElementById(`msg-${msgId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      el.classList.add('highlight')
      setTimeout(() => el.classList.remove('highlight'), 1500)
    }
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || isTyping) return

    setInput('')

    // Сообщение пользователя
    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: Date.now(),
    }
    onAddMessage(chat.id, userMsg)

    // Имитация ответа бота
    setIsTyping(true)
    await new Promise(r => setTimeout(r, 800 + Math.random() * 700))

    const botMsg = {
      id: (Date.now() + 1).toString(),
      role: 'bot',
      text: getMockResponse(),
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

  // Автовысота textarea
  function handleInput(e) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <span className="chat-header-name">{chat.name}</span>
        <span className="chat-header-count">
          {chat.messages.length} сообщ.
        </span>
      </div>

      <AnchorBar anchors={anchors} onAnchorClick={scrollToAnchor} />

      <div className="messages-container" ref={messagesContainerRef}>
        <MessageList messages={chat.messages} />
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
          placeholder="Написать сообщение... (Enter — отправить, Shift+Enter — новая строка)"
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isTyping}
        />
        <button
          className="btn-send"
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
        >
          ↑
        </button>
      </div>
    </div>
  )
}
