import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { THEMES, THEME_ORDER } from '../design/themes'
import type { ThemeName, ThemeTokens } from '../design/themes'

const STORAGE_KEY = 'mynotes_theme'

interface ThemeContextValue {
  theme: ThemeName
  tokens: ThemeTokens
  setTheme: (theme: ThemeName) => void
  cycleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

function temaValido(valor: string | null): valor is ThemeName {
  return valor === 'pastel' || valor === 'colormode' || valor === 'darkmode'
}

function lerTemaSalvo(): ThemeName {
  const salvo = localStorage.getItem(STORAGE_KEY)
  return temaValido(salvo) ? salvo : 'pastel'
}

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeName>(lerTemaSalvo)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const cycleTheme = useCallback(() => {
    setTheme(atual => {
      const indiceAtual = THEME_ORDER.indexOf(atual)
      return THEME_ORDER[(indiceAtual + 1) % THEME_ORDER.length]
    })
  }, [])

  const tokens = useMemo(() => THEMES[theme], [theme])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, tokens, setTheme, cycleTheme }),
    [theme, tokens, cycleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
