import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isWebApp } from '@/lib/supabase'
import {
  company as seedCompany,
  professionals as seedProfessionals,
  quickReplies as seedReplies,
  services as seedServices,
  type Professional,
  type Service
} from '@/data/mock'

/* ------------------------------------------------------------------ */
/* Cores dos profissionais na agenda                                     */
/* ------------------------------------------------------------------ */
export type ProColor = 'blue' | 'emerald' | 'violet' | 'amber' | 'rose' | 'cyan' | 'orange' | 'fuchsia'

export const PRO_COLORS: Record<ProColor, { block: string; dot: string; label: string }> = {
  blue: { block: 'bg-blue-500/12 border-blue-500 text-blue-700 dark:text-blue-300', dot: 'bg-blue-500', label: 'Azul' },
  emerald: { block: 'bg-emerald-500/12 border-emerald-500 text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', label: 'Verde' },
  violet: { block: 'bg-violet-500/12 border-violet-500 text-violet-700 dark:text-violet-300', dot: 'bg-violet-500', label: 'Roxo' },
  amber: { block: 'bg-amber-500/14 border-amber-500 text-amber-700 dark:text-amber-300', dot: 'bg-amber-500', label: 'Amarelo' },
  rose: { block: 'bg-rose-500/12 border-rose-500 text-rose-700 dark:text-rose-300', dot: 'bg-rose-500', label: 'Vermelho' },
  cyan: { block: 'bg-cyan-500/12 border-cyan-500 text-cyan-700 dark:text-cyan-300', dot: 'bg-cyan-500', label: 'Ciano' },
  orange: { block: 'bg-orange-500/12 border-orange-500 text-orange-700 dark:text-orange-300', dot: 'bg-orange-500', label: 'Laranja' },
  fuchsia: { block: 'bg-fuchsia-500/12 border-fuchsia-500 text-fuchsia-700 dark:text-fuchsia-300', dot: 'bg-fuchsia-500', label: 'Rosa' }
}

export interface ProfessionalItem extends Professional {
  colorKey: ProColor
  /** Serviços que o profissional faz (vazio = todos) */
  serviceIds: string[]
  active: boolean
  email?: string
  commission?: number
}

export interface QuickReply {
  id: string
  shortcut: string
  text: string
}

export interface DayHours {
  open: boolean
  start: string
  end: string
  lunchStart?: string
  lunchEnd?: string
}

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const

/** Dia da semana (0 = domingo) de uma data AAAA-MM-DD, sem erro de fuso */
export function weekdayOf(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

/** "Domingo, 27 de setembro" */
export function formatLongDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const txt = new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}

export const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

export interface CompanyInfo {
  name: string
  segment: string
  document: string
  phone: string
  email: string
  address: string
  instagram: string
  logo?: string
  /** 0 = domingo … 6 = sábado */
  hours: DayHours[]
}

interface Store {
  info: CompanyInfo
  professionals: ProfessionalItem[]
  services: Service[]
  quickReplies: QuickReply[]
}

const workday = (): DayHours => ({ open: true, start: '09:00', end: '20:00', lunchStart: '12:00', lunchEnd: '13:00' })

const SEED: Store = {
  info: {
    name: seedCompany.name,
    segment: 'salao',
    document: '',
    phone: '(11) 98765-4321',
    email: 'contato@studiobella.com.br',
    address: 'Rua das Flores, 123 — Centro, São Paulo/SP',
    instagram: '@studiobella',
    hours: [
      { open: true, start: '09:00', end: '19:00', lunchStart: '12:00', lunchEnd: '13:00' },
      { open: false, start: '09:00', end: '18:00' },
      workday(),
      workday(),
      workday(),
      workday(),
      { open: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:00' }
    ]
  },
  professionals: seedProfessionals.map((p, i) => ({
    ...p,
    colorKey: (['blue', 'emerald', 'violet', 'amber'] as ProColor[])[i % 4],
    serviceIds: [],
    active: true,
    commission: 40
  })),
  services: seedServices,
  quickReplies: seedReplies.map((r, i) => ({ id: `qr${i}`, ...r }))
}

const KEY = 'icchat.company.v1'

const EMPTY_STORE: Store = {
  info: { name: '', segment: 'outro', document: '', phone: '', email: '', address: '', instagram: '', hours: Array.from({ length: 7 }, () => ({ open: false, start: '09:00', end: '18:00' })) },
  professionals: [],
  services: [],
  quickReplies: []
}

function load(): Store {
  if (isWebApp) return EMPTY_STORE
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return SEED
    const s = JSON.parse(raw) as Partial<Store>
    return { ...SEED, ...s, info: { ...SEED.info, ...s.info } }
  } catch {
    return SEED
  }
}

export const SEGMENTS: Record<string, string> = {
  salao: 'Salão de beleza',
  barbearia: 'Barbearia',
  estetica: 'Clínica de estética',
  clinica: 'Clínica / consultório',
  petshop: 'Pet shop',
  outro: 'Outro'
}

interface Ctx extends Store {
  segmentLabel: string
  /** Horário de funcionamento em texto (usado pela IA e nas mensagens) */
  hoursText: string
  updateInfo: (p: Partial<CompanyInfo>) => void
  professionalById: (id?: string) => ProfessionalItem | undefined
  saveProfessional: (p: ProfessionalItem) => void
  removeProfessional: (id: string) => void
  saveService: (s: Service) => void
  removeService: (id: string) => void
  saveQuickReply: (r: QuickReply) => void
  removeQuickReply: (id: string) => void
  resetAll: () => void
}

const CompanyCtx = createContext<Ctx | null>(null)

/** Transforma o quadro de horários em texto curto: "Ter a Sex 9h–20h · Sáb 8h–18h" */
export function describeHours(hours: DayHours[]): string {
  const fmt = (t: string) => t.replace(':00', 'h').replace(':', 'h')
  const short = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const groups: { from: number; to: number; key: string }[] = []
  hours.forEach((h, i) => {
    if (!h.open) return
    const key = `${h.start}-${h.end}`
    const last = groups[groups.length - 1]
    if (last && last.key === key && last.to === i - 1) last.to = i
    else groups.push({ from: i, to: i, key })
  })
  if (!groups.length) return 'Fechado'
  return groups
    .map((g) => {
      const [s, e] = g.key.split('-')
      const days = g.from === g.to ? short[g.from] : `${short[g.from]} a ${short[g.to]}`
      return `${days} ${fmt(s)}–${fmt(e)}`
    })
    .join(' · ')
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(store))
    } catch {
      /* sem espaço (ex.: logo muito grande): mantém na sessão */
    }
  }, [store])

  const professionalById = useCallback((id?: string) => store.professionals.find((p) => p.id === id), [store.professionals])

  const upsert = <T extends { id: string }>(list: T[], item: T) =>
    list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]

  const value = useMemo<Ctx>(
    () => ({
      ...store,
      segmentLabel: SEGMENTS[store.info.segment] ?? store.info.segment,
      hoursText: describeHours(store.info.hours),
      updateInfo: (p) => setStore((s) => ({ ...s, info: { ...s.info, ...p } })),
      professionalById,
      saveProfessional: (p) =>
        setStore((s) => ({
          ...s,
          professionals: upsert(s.professionals, { ...p, color: PRO_COLORS[p.colorKey].block, dot: PRO_COLORS[p.colorKey].dot })
        })),
      removeProfessional: (id) => setStore((s) => ({ ...s, professionals: s.professionals.filter((p) => p.id !== id) })),
      saveService: (sv) => setStore((s) => ({ ...s, services: upsert(s.services, sv) })),
      removeService: (id) =>
        setStore((s) => ({
          ...s,
          services: s.services.filter((x) => x.id !== id),
          professionals: s.professionals.map((p) => ({ ...p, serviceIds: p.serviceIds.filter((x) => x !== id) }))
        })),
      saveQuickReply: (r) => setStore((s) => ({ ...s, quickReplies: upsert(s.quickReplies, r) })),
      removeQuickReply: (id) => setStore((s) => ({ ...s, quickReplies: s.quickReplies.filter((r) => r.id !== id) })),
      resetAll: () => setStore(SEED)
    }),
    [store, professionalById]
  )

  return <CompanyCtx.Provider value={value}>{children}</CompanyCtx.Provider>
}

export function useCompany(): Ctx {
  const ctx = useContext(CompanyCtx)
  if (!ctx) throw new Error('useCompany fora do CompanyProvider')
  return ctx
}
