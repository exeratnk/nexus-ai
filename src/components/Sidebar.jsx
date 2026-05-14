import React, { useMemo, useState } from 'react'
import {
  EditIcon,
  FolderIcon,
  MessageIcon,
  PanelLeftCloseIcon,
  PlusIcon,
  SearchIcon,
  SkillIcon,
  TrashIcon,
} from './GlassIcons.jsx'

function includesQuery(value, query) {
  return typeof value === 'string' && value.toLowerCase().includes(query)
}

function chatMatchesSearch(chat, query) {
  if (!query) return true

  if (includesQuery(chat.name, query)) return true
  if (chat.skills?.some(skill => includesQuery(skill, query))) return true
  if (chat.messages?.some(message => includesQuery(message?.text, query))) return true

  return Object.values(chat.annotations || {}).some(annotation => (
    includesQuery(annotation?.note, query)
    || annotation?.tags?.some(tag => includesQuery(tag, query))
  ))
}

function getChatPreview(chat) {
  const lastMessage = chat.messages?.[chat.messages.length - 1]
  const text = lastMessage?.text?.trim()
  if (text) return text.length > 54 ? `${text.slice(0, 54)}…` : text
  if (chat.skills?.length) return `Скиллы: ${chat.skills.slice(0, 2).join(', ')}`
  if (lastMessage?.attachments?.[0]?.name) return lastMessage.attachments[0].name
  return 'Новый проект готов к работе'
}

function SidebarProfileButton({ user, avatarUrl, onClick }) {
  const label = user ? 'Открыть профиль' : 'Открыть авторизацию'
  const title = user ? 'Открыть профиль' : 'Войти или зарегистрироваться'

  return (
    <button
      type="button"
      className="sidebar-profile-button glass-shimmer"
      onClick={onClick}
      aria-label={label}
      title={title}
    >
      <div className="avatar-circle">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Аватар пользователя" />
        ) : (
          (user?.username || 'Г')[0].toUpperCase()
        )}
      </div>
      <div className="sidebar-profile-copy">
        <div className="sidebar-profile-name">{user?.username || 'Гость'}</div>
        <div className="sidebar-profile-email">{user?.email || 'Local workspace'}</div>
      </div>
    </button>
  )
}

function ChatItem({ chat, activeChatId, editingId, editValue, setEditValue, setEditingId, onSelect, onDelete, onRename }) {
  function startEdit(e) {
    e.stopPropagation()
    setEditingId(chat.id)
    setEditValue(chat.name)
  }

  function confirmEdit() {
    if (editValue.trim()) onRename(chat.id, editValue.trim())
    setEditingId(null)
  }

  return (
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
          onBlur={confirmEdit}
          onKeyDown={e => {
            if (e.key === 'Enter') confirmEdit()
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
            {chat.skills?.length > 0 && (
              <span className="chat-skill-inline">
                <SkillIcon size={12} />
                {chat.skills.length}
              </span>
            )}
          </div>
          <span className="chat-count">{chat.messages?.length || 0}</span>
          <div className="chat-actions">
            <button
              className="btn-icon glass-shimmer"
              title="Переименовать"
              aria-label="Переименовать"
              onClick={startEdit}
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
  )
}

function FolderSection({
  folder,
  chats,
  activeChatId,
  editingFolderId,
  folderEditValue,
  setFolderEditValue,
  setEditingFolderId,
  editingChatId,
  chatEditValue,
  setChatEditValue,
  setEditingChatId,
  onSelect,
  onAddChat,
  onRenameFolder,
  onDeleteFolder,
  onDeleteChat,
  onRenameChat,
}) {
  function confirmFolderEdit() {
    if (folderEditValue.trim()) onRenameFolder(folder.id, folderEditValue.trim())
    setEditingFolderId(null)
  }

  return (
    <section className="folder-group">
      <div className="folder-row">
        <div className="folder-label">
          <FolderIcon size={15} />
          {editingFolderId === folder.id ? (
            <input
              className="rename-input folder-rename-input"
              value={folderEditValue}
              autoFocus
              onChange={e => setFolderEditValue(e.target.value)}
              onBlur={confirmFolderEdit}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmFolderEdit()
                if (e.key === 'Escape') setEditingFolderId(null)
              }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="folder-name">{folder.name}</span>
          )}
          <span className="folder-badge">{chats.length}</span>
        </div>
        <div className="folder-actions">
          <button
            className="btn-icon glass-shimmer"
            type="button"
            title="Новый проект в папке"
            aria-label="Новый проект в папке"
            onClick={() => onAddChat({ folderId: folder.id })}
          >
            <PlusIcon size={13} />
          </button>
          <button
            className="btn-icon glass-shimmer"
            type="button"
            title="Переименовать папку"
            aria-label="Переименовать папку"
            onClick={() => {
              setEditingFolderId(folder.id)
              setFolderEditValue(folder.name)
            }}
          >
            <EditIcon size={13} />
          </button>
          <button
            className="btn-icon btn-delete glass-shimmer"
            type="button"
            title="Удалить папку"
            aria-label="Удалить папку"
            onClick={() => onDeleteFolder(folder.id)}
          >
            <TrashIcon size={13} />
          </button>
        </div>
      </div>

      <ul className="chat-list chat-list-nested">
        {chats.map(chat => (
          <ChatItem
            key={chat.id}
            chat={chat}
            activeChatId={activeChatId}
            editingId={editingChatId}
            editValue={chatEditValue}
            setEditValue={setChatEditValue}
            setEditingId={setEditingChatId}
            onSelect={onSelect}
            onDelete={onDeleteChat}
            onRename={onRenameChat}
          />
        ))}
      </ul>
    </section>
  )
}

export default function Sidebar({
  folders,
  chats,
  activeChatId,
  onHide,
  onSelect,
  onAdd,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder,
  onDelete,
  onRename,
  user,
  avatarUrl,
  onProfileClick,
}) {
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [editingFolderId, setEditingFolderId] = useState(null)
  const [folderEditValue, setFolderEditValue] = useState('')
  const [search, setSearch] = useState('')

  const { filteredFolders, looseChats } = useMemo(() => {
    const query = search.trim().toLowerCase()
    const visibleChats = query
      ? chats.filter(chat => chatMatchesSearch(chat, query))
      : chats

    const folderMap = folders
      .map(folder => ({
        ...folder,
        chats: visibleChats.filter(chat => String(chat.folderId) === String(folder.id)),
      }))
      .filter(folder => folder.chats.length > 0 || (!query && folders.length > 0))

    return {
      filteredFolders: folderMap,
      looseChats: visibleChats.filter(chat => !chat.folderId),
    }
  }, [chats, folders, search])

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-header-meta">
          <span className="sidebar-title">Workspace</span>
          <div className="sidebar-subtitle">Projects and skills</div>
        </div>
        <div className="sidebar-header-actions">
          <button className="btn-new glass-shimmer" onClick={() => onAdd({})} title="Новый проект" aria-label="Новый проект">
            <PlusIcon size={17} />
          </button>
          <button className="btn-new glass-shimmer btn-folder-add" onClick={() => onAddFolder()} title="Новая папка" aria-label="Новая папка">
            <FolderIcon size={16} />
          </button>
          <button
            className="btn-new glass-shimmer sidebar-toggle"
            type="button"
            onClick={onHide}
            title="Скрыть боковую панель"
            aria-label="Скрыть боковую панель"
          >
            <PanelLeftCloseIcon size={16} />
          </button>
        </div>
      </div>

      <label className="sidebar-search">
        <SearchIcon size={15} />
        <input
          type="search"
          placeholder="Найти проект, сообщение или аннотацию"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </label>

      <div className="sidebar-section-row">
        <span className="sidebar-section-title">Проекты</span>
        <span className="sidebar-section-count">{chats.length}</span>
      </div>

      <div className="sidebar-tree">
        {looseChats.length > 0 && (
          <ul className="chat-list chat-list-loose">
            {looseChats.map(chat => (
              <ChatItem
                key={chat.id}
                chat={chat}
                activeChatId={activeChatId}
                editingId={editingId}
                editValue={editValue}
                setEditValue={setEditValue}
                setEditingId={setEditingId}
                onSelect={onSelect}
                onDelete={onDelete}
                onRename={onRename}
              />
            ))}
          </ul>
        )}

        {filteredFolders.map(folder => (
          <FolderSection
            key={folder.id}
            folder={folder}
            chats={folder.chats}
            activeChatId={activeChatId}
            editingFolderId={editingFolderId}
            folderEditValue={folderEditValue}
            setFolderEditValue={setFolderEditValue}
            setEditingFolderId={setEditingFolderId}
            editingChatId={editingId}
            chatEditValue={editValue}
            setChatEditValue={setEditValue}
            setEditingChatId={setEditingId}
            onSelect={onSelect}
            onAddChat={onAdd}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
            onDeleteChat={onDelete}
            onRenameChat={onRename}
          />
        ))}

        {filteredFolders.length === 0 && looseChats.length === 0 && (
          <div className="sidebar-empty">Ничего не найдено. Попробуйте другой запрос.</div>
        )}
      </div>

      <div className="sidebar-user-area">
        <SidebarProfileButton user={user} avatarUrl={avatarUrl} onClick={onProfileClick} />
      </div>
    </aside>
  )
}
