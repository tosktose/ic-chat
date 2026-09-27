import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { GEventDTO } from '../../../preload/index.d'
import type { Appointment } from '@/data/mock'

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

// No navegador (demonstração) começa com 3 agendas conectadas; no app instalado, nenhuma
const DEMO_CALENDARS: Record<string, ProCalendar> = {
  p1: { email: 'ana.souza@gmail.com', calendarName: 'Agenda principal', status: 'conectado', lastSync: Date.now() - 2 * 60_000 },
  p2: { email: 'bruno.lima@gmail.com', calendarName: 'Agenda principal', status: 'conectado', lastSync: Date.now() - 2 * 60_000 },
  p3: { email: 'carla.mendes@gmail.com', calendarName: 'Salão', status: 'conectado', lastSync: Date.now() - 2 * 60_000 }
}

const DEFAULT: GoogleConfig = {
  direction: 'duas-vias',
  blockPersonal: true,
  eventTitle: 'cliente-servico',
  includePhone: false,
  reminderMin: 30,
  calendars: {}
}

interface Ctx {
  /** true no app instalado: login e eventos reais do Google */
  real: boolean
  hasCredentials: boolean
  clientId: string
  saveCredentials: (id: string, secret: string) => Promise<void>
  config: GoogleConfig
  setConfig: (p: Partial<GoogleConfig>) => void
  /** Conecta a agenda do profissional (abre o navegador no app instalado) */
  connect: (proId: string, email?: string) => Promise<string>
  disconnect: (proId: string) => Promise<void>
  syncNow: (date: string) => Promise<void>
  connectedCount: number
  lastSync?: number
  /** Compromissos do Google de um profissional num dia (já carregados) */
  busy: (proId: string, date: string) => GEventDTO[]
  loadDay: (date: string, force?: boolean) => Promise<void>
  /** Cria o evento do agendamento no Google (se a regra permitir). Devolve o id do evento. */
  pushAppointment: (a: Appointment, info: { clientName: string; clientPhone?: string }) => Promise<string | undefined>
  removeAppointment: (a: Appointment) => Promise<void>
}

const GoogleCtx = createContext<Ctx | null>(null)
const KEY = 'icchat.google.v1'

export function GoogleProvider({ children }: { children: ReactNode }) {
  const api = window.icchat?.gcal
  const [config, setState] = useState<GoogleConfig>(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) return { ...DEFAULT, ...JSON.parse(raw) }
    } catch {
      /* ignore */
    }
    return { ...DEFAULT, calendars: api ? {} : DEMO_CALENDARS }
  })
  const [creds, setCreds] = useState({ hasCredentials: false, clientId: '' })
  const [events, setEvents] = useState<Record<string, GEventDTO[]>>({})
  const loading = useRef(new Set<string>())
  const configRef = useRef(config)
  configRef.current = config

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(config))
    } catch {
      /* ignore */
    }
  }, [config])

  // App instalado: as contas conectadas de verdade são as que o serviço conhece
  useEffect(() => {
    if (!api) return
    void api.status().then((r) => {
      if (!r.ok) return
      setCreds({ hasCredentials: r.data.hasCredentials, clientId: r.data.clientId })
      setState((c) => ({
        ...c,
        calendars: Object.fromEntries(
          Object.entries(r.data.accounts).map(([proId, email]) => [
            proId,
            c.calendars[proId]?.email === email ? c.calendars[proId] : { email, calendarName: 'Agenda principal', status: 'conectado' as const, lastSync: Date.now() }
          ])
        )
      }))
    })
  }, [api])

  const loadDay = useCallback(
    async (date: string, force = false) => {
      const c = configRef.current
      if (!api || c.direction === 'para-google' || !c.blockPersonal) return
      await Promise.all(
        Object.keys(c.calendars).map(async (proId) => {
          const key = `${proId}|${date}`
          if ((!force && events[key]) || loading.current.has(key)) return
          loading.current.add(key)
          const r = await api.listDay(proId, date)
          loading.current.delete(key)
          if (r.ok) {
            setEvents((e) => ({ ...e, [key]: r.data.filter((ev) => !ev.fromIcChat) }))
            setState((s) => (s.calendars[proId] ? { ...s, calendars: { ...s.calendars, [proId]: { ...s.calendars[proId], lastSync: Date.now(), status: 'conectado' } } } : s))
          } else {
            setState((s) => (s.calendars[proId] ? { ...s, calendars: { ...s.calendars, [proId]: { ...s.calendars[proId], status: 'erro' } } } : s))
          }
        })
      )
    },
    [api, events]
  )

  const value = useMemo<Ctx>(() => {
    const cals = Object.values(config.calendars)
    const eventTitle = (a: Appointment, clientName: string) =>
      config.eventTitle === 'reservado' ? 'Reservado' : config.eventTitle === 'servico' ? a.service : `${clientName} · ${a.service}`
    return {
      real: Boolean(api),
      ...creds,
      saveCredentials: async (id, secret) => {
        if (!api) return
        const r = await api.setCredentials(id, secret)
        if (!r.ok) throw new Error(r.error)
        setCreds({ hasCredentials: r.data.hasCredentials, clientId: r.data.clientId })
      },
      config,
      setConfig: (p) => setState((c) => ({ ...c, ...p })),
      connect: async (proId, email) => {
        let finalEmail = email ?? 'conta Google'
        if (api) {
          const r = await api.connect(proId)
          if (!r.ok) throw new Error(r.error)
          finalEmail = r.data.email
        }
        setState((c) => ({ ...c, calendars: { ...c.calendars, [proId]: { email: finalEmail, calendarName: 'Agenda principal', status: 'conectado', lastSync: Date.now() } } }))
        return finalEmail
      },
      disconnect: async (proId) => {
        if (api) await api.disconnect(proId)
        setState((c) => {
          const next = { ...c.calendars }
          delete next[proId]
          return { ...c, calendars: next }
        })
      },
      syncNow: async (date) => {
        if (api) await loadDay(date, true)
        setState((c) => ({
          ...c,
          calendars: Object.fromEntries(Object.entries(c.calendars).map(([k, v]) => [k, { ...v, lastSync: Date.now() }]))
        }))
      },
      connectedCount: cals.filter((c) => c.status === 'conectado').length,
      lastSync: cals.length ? Math.max(...cals.map((c) => c.lastSync)) : undefined,
      busy: (proId, date) => events[`${proId}|${date}`] ?? [],
      loadDay,
      pushAppointment: async (a, info) => {
        if (!api || !config.calendars[a.professionalId] || config.direction === 'do-google') return undefined
        const r = await api.createEvent(a.professionalId, {
          summary: eventTitle(a, info.clientName),
          description: ['Agendado pelo IC Chat', config.includePhone && info.clientPhone ? `Telefone: ${info.clientPhone}` : '', a.notes ?? '']
            .filter(Boolean)
            .join('\n'),
          date: a.date ?? new Date().toISOString().slice(0, 10),
          start: a.start,
          end: a.end,
          reminderMin: config.reminderMin || undefined,
          icchatId: a.id
        })
        if (!r.ok) throw new Error(r.error)
        return r.data.id
      },
      removeAppointment: async (a) => {
        if (!api || !a.googleEventId || !config.calendars[a.professionalId]) return
        const r = await api.deleteEvent(a.professionalId, a.googleEventId)
        if (!r.ok) throw new Error(r.error)
      }
    }
  }, [api, config, creds, events, loadDay])

  return <GoogleCtx.Provider value={value}>{children}</GoogleCtx.Provider>
}

export function useGoogle(): Ctx {
  const ctx = useContext(GoogleCtx)
  if (!ctx) throw new Error('useGoogle fora do GoogleProvider')
  return ctx
}
