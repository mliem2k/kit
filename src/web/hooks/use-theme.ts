import { useCallback, useEffect, useState } from 'react'

function readInitialTheme() {
  if (typeof document === 'undefined') return 'light'
  const attr = document.documentElement.getAttribute('data-theme')
  return attr === 'dark' ? 'dark' : 'light'
}

/**
 * Builds the theme hook for an app. The storage key is per app (`bms-theme`,
 * `rms-theme`) so two apps on one origin during development do not share a
 * preference.
 */
export function createUseTheme(storageKey: string) {
  return function useTheme() {
    const [theme, setTheme] = useState(readInitialTheme)

    useEffect(() => {
      document.documentElement.setAttribute('data-theme', theme)
      localStorage.setItem(storageKey, theme)
    }, [theme])

    const toggleTheme = useCallback(() => {
      setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
    }, [])

    return { theme, toggleTheme }
  }
}
