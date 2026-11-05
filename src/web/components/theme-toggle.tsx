import { Moon, Sun } from 'lucide-react'
import { Button } from '../ui/button'

/**
 * Builds the sun/moon toggle around the app's own `useTheme` (each app creates
 * one with `createUseTheme(storageKey)`).
 */
export function createThemeToggle(useTheme: () => { theme: string; toggleTheme: () => void }) {
  return function ThemeToggle() {
    const { theme, toggleTheme } = useTheme()

    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    )
  }
}
