import React from 'react'

function Icon({ children, size = 18, strokeWidth = 1.8 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

export function SparkIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 3.5 13.7 9l5.4 1.7-5.4 1.7L12 18l-1.7-5.6-5.4-1.7L10.3 9 12 3.5Z" />
      <path d="m18 15 .7 2.3L21 18l-2.3.7L18 21l-.7-2.3L15 18l2.3-.7L18 15Z" />
    </Icon>
  )
}

export function SearchIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16.2 16.2 3.3 3.3" />
    </Icon>
  )
}

export function PlusIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

export function MessageIcon(props) {
  return (
    <Icon {...props}>
      <path d="M5.5 6.5h13v8.8h-7.2L7.2 18v-2.7H5.5Z" />
      <path d="M8.5 10h7M8.5 12.8h4.4" />
    </Icon>
  )
}

export function FolderIcon(props) {
  return (
    <Icon {...props}>
      <path d="M3.8 7.5h5l1.6 1.8h9.8v7.9a2 2 0 0 1-2 2H5.8a2 2 0 0 1-2-2Z" />
      <path d="M3.8 7.8V6.7a1.9 1.9 0 0 1 1.9-1.9H10l1.6 1.8h6.6a1.9 1.9 0 0 1 1.9 1.9v.8" />
    </Icon>
  )
}

export function SkillIcon(props) {
  return (
    <Icon {...props}>
      <path d="m8 4.8 1.3 2.6 2.9.4-2.1 2 .5 2.8L8 11.3l-2.6 1.3.5-2.8-2.1-2 2.9-.4Z" />
      <path d="M15.5 13.2 17 16l3 .4-2.2 2 .5 2.8L15.5 20l-2.8 1.2.5-2.8-2.2-2 3-.4Z" />
    </Icon>
  )
}

export function EditIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4.7 18.8 6 14.2 15.8 4.4a2 2 0 0 1 2.8 2.8L8.8 17Z" />
      <path d="m14.5 5.7 3.8 3.8" />
    </Icon>
  )
}

export function TrashIcon(props) {
  return (
    <Icon {...props}>
      <path d="M5 7h14M9 7V5.4h6V7M8 10v8M12 10v8M16 10v8" />
      <path d="M7 7l.6 13h8.8L17 7" />
    </Icon>
  )
}

export function AttachIcon(props) {
  return (
    <Icon {...props}>
      <path d="m20 11.5-7.7 7.7a5 5 0 0 1-7.1-7.1l8-8a3.2 3.2 0 0 1 4.5 4.5l-8.1 8.1a1.6 1.6 0 0 1-2.3-2.3l7.5-7.5" />
    </Icon>
  )
}

export function MicIcon(props) {
  return (
    <Icon {...props}>
      <rect x="9" y="3.8" width="6" height="10" rx="3" />
      <path d="M5.8 11.8a6.2 6.2 0 0 0 12.4 0M12 18v2.2M8.8 20.2h6.4" />
    </Icon>
  )
}

export function SendIcon(props) {
  return (
    <Icon {...props}>
      <path d="M5 12h13M13 6l6 6-6 6" />
    </Icon>
  )
}

export function FocusIcon(props) {
  return (
    <Icon {...props}>
      <path d="M8 4H5.8A1.8 1.8 0 0 0 4 5.8V8M16 4h2.2A1.8 1.8 0 0 1 20 5.8V8M20 16v2.2a1.8 1.8 0 0 1-1.8 1.8H16M8 20H5.8A1.8 1.8 0 0 1 4 18.2V16" />
      <circle cx="12" cy="12" r="3.2" />
    </Icon>
  )
}

export function SunIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.8v2M12 19.2v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.8 12h2M19.2 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </Icon>
  )
}

export function MoonIcon(props) {
  return (
    <Icon {...props}>
      <path d="M20 14.4A7.7 7.7 0 0 1 9.6 4a8.2 8.2 0 1 0 10.4 10.4Z" />
    </Icon>
  )
}

export function SettingsIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Z" />
      <path d="m18.8 13.5.9 1.6-1.8 3.1-1.9-.1a8 8 0 0 1-1.4.8l-.9 1.7h-3.5l-.9-1.7a8 8 0 0 1-1.4-.8l-1.9.1-1.8-3.1.9-1.6a7.5 7.5 0 0 1 0-1.6l-.9-1.6L6 7.2l1.9.1c.4-.3.9-.6 1.4-.8l.9-1.7h3.5l.9 1.7c.5.2 1 .5 1.4.8l1.9-.1 1.8 3.1-.9 1.6c.1.5.1 1.1 0 1.6Z" />
    </Icon>
  )
}

export function LogoutIcon(props) {
  return (
    <Icon {...props}>
      <path d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10" />
      <path d="M15 8l4 4-4 4M19 12H9" />
    </Icon>
  )
}

export function PanelLeftCloseIcon(props) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M9 4.8v14.4" />
      <path d="m14.7 9.2-3 2.8 3 2.8" />
    </Icon>
  )
}

export function PanelLeftOpenIcon(props) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M9 4.8v14.4" />
      <path d="m12 9.2 3 2.8-3 2.8" />
    </Icon>
  )
}

export function CrownIcon(props) {
  return (
    <Icon {...props}>
      <path d="m4.5 8.2 4 3.4L12 5l3.5 6.6 4-3.4-1.7 9.1H6.2Z" />
      <path d="M6.4 20h11.2" />
    </Icon>
  )
}

export function BoltIcon(props) {
  return (
    <Icon {...props}>
      <path d="M13.4 2.8 5.6 13h5.7l-.8 8.2L18.4 11h-5.8Z" />
    </Icon>
  )
}

export function ShieldIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 3.5 19 6v5.3c0 4.3-2.8 7.4-7 9.2-4.2-1.8-7-4.9-7-9.2V6Z" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  )
}
