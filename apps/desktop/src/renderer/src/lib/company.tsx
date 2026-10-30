import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isSuperAdmin, useAuth } from '@/lib/auth'
import { isWebApp, supabase } from '@/lib/supabase'
import type { Professional, Service } from '@/data/mock'

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
  /** Quando o segmento é "outro": o que a pessoa escreveu (a IA usa esse texto) */
  segmentCustom?: string
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

const KEY = 'icchat.company.v1'

const defaultHours = (): DayHours[] =>
  Array.from({ length: 7 }, (_, i) => ({ open: i >= 1 && i <= 5, start: '09:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:00' }))

const EMPTY_STORE: Store = {
  info: { name: '', segment: 'outro', document: '', phone: '', email: '', address: '', instagram: '', hours: defaultHours() },
  professionals: [],
  services: [],
  quickReplies: []
}

function load(): Store {
  if (isWebApp) return EMPTY_STORE
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY_STORE
    const s = JSON.parse(raw) as Partial<Store>
    // Remove os dados de demonstração que versões antigas gravaram como se fossem da empresa.
    if (s.info?.name === 'Studio Bella' && (s.info.email === 'contato@studiobella.com.br' || s.info.instagram === '@studiobella')) {
      localStorage.removeItem(KEY)
      return EMPTY_STORE
    }
    return {
      ...EMPTY_STORE,
      ...s,
      info: { ...EMPTY_STORE.info, ...s.info },
      professionals: s.professionals ?? [],
      services: s.services ?? [],
      quickReplies: s.quickReplies ?? []
    }
  } catch {
    return EMPTY_STORE
  }
}

/** Nome do segmento para exibir e para a IA: o texto livre quando é "Outro". */
export function segmentName(info: Pick<CompanyInfo, 'segment' | 'segmentCustom'>): string {
  if (info.segment === 'outro') return info.segmentCustom?.trim() ?? ''
  return SEGMENTS[info.segment] ?? info.segment
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
  const { session } = useAuth()
  const [tenantId, setTenantId] = useState<string>()
  const [hydrated, setHydrated] = useState(!isWebApp)

  // Busca as configurações reais da empresa para web e desktop quando há sessão autenticada.
  useEffect(() => {
    if (!supabase || !session) { setHydrated(!isWebApp); return }
    let alive = true
    void (async () => {
      try {
        if (isSuperAdmin(session)) { setHydrated(true); return }
        const api = supabase.schema('ic_chat')
        const { data: member } = await api.from('tenant_members').select('tenant_id, tenants(name)').eq('user_id', session.user.id).maybeSingle()
        if (!alive) return
        if (!member) {
          const accountCompany = String(session.user.user_metadata?.company_name ?? '')
          setStore({ ...EMPTY_STORE, info: { ...EMPTY_STORE.info, name: accountCompany } })
          setHydrated(true)
          return
        }
        const id = String(member.tenant_id)
        const t = Array.isArray(member.tenants) ? member.tenants[0] : member.tenants
        const { data: row } = await api.from('company_settings').select('data').eq('tenant_id', id).maybeSingle()
        if (!alive) return
        const saved = (row?.data ?? {}) as Partial<Store>
        setTenantId(id)
        setStore((cur) => {
          const info = { ...EMPTY_STORE.info, ...saved.info }
          return {
            info: { ...info, name: info.name || t?.name || cur.info.name },
            professionals: saved.professionals ?? [],
            services: saved.services ?? [],
            quickReplies: saved.quickReplies ?? []
          }
        })
      } catch (e) {
        console.error('IC Chat settings:', e)
      } finally {
        if (alive) setHydrated(true)
      }
    })()
    return () => { alive = false }
  }, [session?.user.id])

  // Web: grava no banco (espera 800 ms sem novas alterações)
  useEffect(() => {
    if (!isWebApp || !supabase || !tenantId || !hydrated) return
    const t = window.setTimeout(() => {
      void supabase!.schema('ic_chat').from('company_settings').upsert({ tenant_id: tenantId, data: store, updated_at: new Date().toISOString() }, { onConflict: 'tenant_id' })
        .then(({ error }) => { if (error) console.error('IC Chat settings:', error.message) })
    }, 800)
    return () => clearTimeout(t)
  }, [store, tenantId, hydrated])

  useEffect(() => {
    if (isWebApp) return
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
      segmentLabel: segmentName(store.info) || SEGMENTS.outro,
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
      resetAll: () => setStore(EMPTY_STORE)
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
