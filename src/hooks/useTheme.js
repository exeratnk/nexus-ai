import { useEffect, useState } from 'react'

const STORAGE_KEY = 'chatai_theme'
const DARK = 'dark'
const LIGHT = 'light'

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return DARK
    return localStorage.getItem(STORAGE_KEY) || DARK
  })

  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.classList.toggle('theme-dark', theme === DARK)
    root.classList.toggle('theme-light', theme === LIGHT)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => (prev === DARK ? LIGHT : DARK))

  return { theme, toggleTheme, isDark: theme === DARK }
}
