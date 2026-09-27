import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

/** Sincronização com o Google Agenda (configuração do gerente). */
export type SyncDirection = 'duas-vias' | 'para-google' | 'do-google'

export interface ProCalendar {
  email: string
  calendarName: string
  status: 'conectado' | 'erro'
  lastSync: number
}

export interface GoogleConfig {
  direction: SyncDirection
  /** Eventos pessoais do Google viram bloqueio de horário no IC Chat */
  blockPersonal: boolean
  /** Título do evento criado no Google */
  eventTitle: 'cliente-servico' | 'servico' | 'reservado'
  /** Incluir telefone do cliente na descrição do evento */
  includePhone: boolean
  /** Lembrete do Google (minutos antes; 0 = sem lembrete) */
  reminderMin: number
  calendars: Record<string, ProCalendar>
}

const DEFAULT: GoogleConfig = {
  direction: 'duas-vias',
  blockPersonal: true,
  eventTitle: 'cliente-servico',
  includePhone: false,
  reminderMin: 30,
  calendars: {
    p1: { email: 'ana.souza@gmail.com', calendarName: 'Agenda principal', status: 'conectado', lastSync: Date.now() - 2 * 60_000 },
    p2: { email: 'bruno.lima@gmail.com', calendarName: 'Agenda principal', status: 'conectado', lastSync: Date.now() - 2 * 60_000 },
    p3: { email: 'carla.mendes@gmail.com', calendarName: 'Salão', status: 'conectado', lastSync: Date.now() - 2 * 60_000 }
  }
}

interface Ctx {
  config: GoogleConfig
  setConfig: (p: Partial<GoogleConfig>) => void
  connect: (proId: string, email: string) => void
  disconnect: (proId: string) => void
  syncNow: () => void
  connectedCount: number
  lastSync?: number
}

const GoogleCtx = createContext<Ctx | null>(null)
const KEY = 'icchat.google.v1'

export function GoogleProvider({ children }: { children: ReactNode }) {
  const [config, setState] = useState<GoogleConfig>(() => {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT
    } catch {
      return DEFAULT
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(config))
    } catch {
      /* ignore */
    }
  }, [config])

  const value = useMemo<Ctx>(() => {
    const cals = Object.values(config.calendars)
    return {
      config,
      setConfig: (p) => setState((c) => ({ ...c, ...p })),
      connect: (proId, email) =>
        setState((c) => ({
          ...c,
          calendars: { ...c.calendars, [proId]: { email, calendarName: 'Agenda principal', status: 'conectado', lastSync: Date.now() } }
        })),
      disconnect: (proId) =>
        setState((c) => {
          const next = { ...c.calendars }
          delete next[proId]
          return { ...c, calendars: next }
        }),
      syncNow: () =>
        setState((c) => ({
          ...c,
          calendars: Object.fromEntries(Object.entries(c.calendars).map(([k, v]) => [k, { ...v, lastSync: Date.now(), status: 'conectado' as const }]))
        })),
      connectedCount: cals.filter((c) => c.status === 'conectado').length,
      lastSync: cals.length ? Math.max(...cals.map((c) => c.lastSync)) : undefined
    }
  }, [config])

  return <GoogleCtx.Provider value={value}>{children}</GoogleCtx.Provider>
}

export function useGoogle(): Ctx {
  const ctx = useContext(GoogleCtx)
  if (!ctx) throw new Error('useGoogle fora do GoogleProvider')
  return ctx
}
