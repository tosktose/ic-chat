import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemePref = 'light' | 'dark' | 'system'
export type Density = 'comfortable' | 'compact'

interface ThemeCtx {
  theme: ThemePref
  resolved: 'light' | 'dark'
  setTheme: (t: ThemePref) => void
  density: Density
  setDensity: (d: Density) => void
}

const Ctx = createContext<ThemeCtx | null>(null)

function read<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T) || fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* armazenamento indisponível */
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePref>(() => read('icchat.theme', 'system'))
  const [density, setDensityState] = useState<Density>(() => read('icchat.density', 'comfortable'))
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolved === 'dark')
    root.dataset.density = density
    window.icchat?.setTitleBarTheme(resolved)
  }, [resolved, density])

  return (
    <Ctx.Provider
      value={{
        theme,
        resolved,
        density,
        setTheme: (t) => {
          setThemeState(t)
          write('icchat.theme', t)
        },
        setDensity: (d) => {
          setDensityState(d)
          write('icchat.density', d)
        }
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTheme fora do ThemeProvider')
  return ctx
}
