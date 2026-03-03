import React from 'react'
import Sidebar from './components/Sidebar.jsx'
import ChatWindow from './components/ChatWindow.jsx'
import { useChats } from './hooks/useChats.js'

export default function App() {
  const {
    chats,
    activeChat,
    activeChatId,
    setActiveChatId,
    addChat,
    deleteChat,
    renameChat,
    addMessage,
  } = useChats()

  return (
    <div className="app">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelect={setActiveChatId}
        onAdd={addChat}
        onDelete={deleteChat}
        onRename={renameChat}
      />
      {activeChat && (
        <ChatWindow
          key={activeChat.id}
          chat={activeChat}
          onAddMessage={addMessage}
        />
      )}
    </div>
  )
}
