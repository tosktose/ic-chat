// Histórico de demonstração (últimos 60 dias) para a página de Relatórios.
// Gerado de forma determinística: os mesmos dados a cada abertura. No sistema real
// estes registros vêm do banco (Core), já filtrados pelo tenant.
import type { ChannelKind } from '@/components/brand'
import { contacts, services, TODAY } from './mock'

export type ApptStatus = 'agendado' | 'concluido' | 'faltou' | 'cancelado'
export type ApptOrigin = 'ia' | 'manual' | 'link'

export interface ApptRecord {
  id: string
  date: string // AAAA-MM-DD
  time: string
  contactId: string
  professionalId: string
  serviceId: string
  /** Nome do serviço (agendamentos reais guardam o nome) */
  serviceName?: string
  price: number
  status: ApptStatus
  origin: ApptOrigin
}

export interface ChatRecord {
  id: string
  date: string
  time: string
  contactId: string
  channel: ChannelKind
  /** 'ia' quando a IA resolveu sozinha; 'fila' quando ninguém respondeu; senão o id do analista */
  handledBy: string
  /** null quando ainda não houve resposta */
  firstResponseSec: number | null
  resolved: boolean
  booked: boolean
}

// Gerador pseudoaleatório com semente (mulberry32)
function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export function dateFromIso(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export function addDays(s: string, n: number): string {
  const d = dateFromIso(s)
  d.setDate(d.getDate() + n)
  return iso(d)
}

const PROS = ['p1', 'p2', 'p3', 'p4']
// Serviços mais comuns de cada profissional de exemplo
const PRO_SERVICES: Record<string, string[]> = {
  p1: ['s1', 's4', 's5', 's3'],
  p2: ['s2', 's8', 's9'],
  p3: ['s6', 's3', 's1'],
  p4: ['s7', 's3']
}
const ANALYSTS = ['u2', 'u3', 'u5']
const CHANNELS: ChannelKind[] = ['whatsapp', 'whatsapp', 'whatsapp', 'whatsapp_official', 'instagram', 'messenger', 'tiktok']

function build(): { appts: ApptRecord[]; chats: ChatRecord[] } {
  const r = rng(20260927)
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]
  const people = contacts.length ? contacts : [{ id: 'c1' }]
  const appts: ApptRecord[] = []
  const chats: ChatRecord[] = []
  for (let back = 59; back >= 0; back--) {
    const date = addDays(TODAY, -back)
    const wd = dateFromIso(date).getDay()
    if (wd === 1) continue // segunda fechado
    const busy = wd === 5 || wd === 6 ? 1.35 : 1
    // Agendamentos
    const nAppt = Math.round((7 + r() * 7) * busy)
    for (let i = 0; i < nAppt; i++) {
      const pro = pick(PROS)
      const sid = pick(PRO_SERVICES[pro])
      const svc = services.find((s) => s.id === sid)!
      const hour = 9 + Math.floor(r() * 9)
      const x = r()
      appts.push({
        id: `a-${date}-${i}`,
        date,
        time: `${String(hour).padStart(2, '0')}:${r() > 0.5 ? '30' : '00'}`,
        contactId: pick(people).id,
        professionalId: pro,
        serviceId: sid,
        price: svc.price,
        status: back === 0 && hour >= 12 ? 'concluido' : x < 0.06 ? 'faltou' : x < 0.1 ? 'cancelado' : 'concluido',
        origin: r() < 0.45 ? 'ia' : r() < 0.72 ? 'manual' : 'link'
      })
    }
    // Conversas
    const nChat = Math.round((22 + r() * 22) * busy)
    for (let i = 0; i < nChat; i++) {
      const ai = r() < 0.52
      chats.push({
        id: `c-${date}-${i}`,
        date,
        time: `${String(8 + Math.floor(r() * 13)).padStart(2, '0')}:${String(Math.floor(r() * 60)).padStart(2, '0')}`,
        contactId: pick(people).id,
        channel: pick(CHANNELS),
        handledBy: ai ? 'ia' : pick(ANALYSTS),
        firstResponseSec: ai ? 3 + Math.floor(r() * 12) : 40 + Math.floor(r() * 260),
        resolved: r() < 0.9,
        booked: r() < 0.32
      })
    }
  }
  appts.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
  chats.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
  return { appts, chats }
}

let cache: ReturnType<typeof build> | null = null
/** Histórico de exemplo, montado só quando alguma tela pede (demonstração no navegador) */
export function demoHistory() {
  cache ??= build()
  return cache
}
