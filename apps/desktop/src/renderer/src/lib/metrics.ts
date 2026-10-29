// Indicadores reais: transforma conversas e agendamentos em registros para o
// Painel do gerente, Relatórios e Meu desempenho.
// No navegador (demonstração) usa o histórico de exemplo; no app instalado, os dados do banco.
import { useMemo } from 'react'
import { addDays, dateFromIso, demoHistory, type ApptRecord, type ChatRecord } from '@/data/history'
import { TODAY, type Appointment, type Conversation, type Message } from '@/data/mock'
import { useAppState } from '@/lib/app-state'
import { useCompany } from '@/lib/company'
import { APP_MODE, useData } from '@/lib/data'
import { isWebApp } from '@/lib/supabase'

/** Sem mensagens por este tempo, a próxima mensagem do cliente abre um novo atendimento */
const SESSION_GAP_MS = 8 * 60 * 60 * 1000

export const isoDay = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const hhmm = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

const isReply = (m: Message) => (m.from === 'agent' || m.from === 'ai') && m.kind !== 'note' && m.kind !== 'system'

/**
 * Uma conversa (um contato num canal) vira um ou mais atendimentos:
 * um novo começa quando o cliente escreve depois de 8h de silêncio.
 */
export function chatRecords(conversations: Conversation[], appointments: Appointment[]): ChatRecord[] {
  const out: ChatRecord[] = []
  for (const conv of conversations) {
    const msgs = conv.messages.filter((m) => typeof m.at === 'number' && m.kind !== 'system' && m.kind !== 'note').sort((a, b) => a.at! - b.at!)
    if (!msgs.length) continue
    // Divide em sessões
    const sessions: Message[][] = []
    let cur: Message[] = []
    let last = 0
    for (const m of msgs) {
      if (cur.length && m.from === 'contact' && m.at! - last > SESSION_GAP_MS) {
        sessions.push(cur)
        cur = []
      }
      cur.push(m)
      last = m.at!
    }
    sessions.push(cur)

    sessions.forEach((s, i) => {
      const start = s[0].at!
      const end = sessions[i + 1]?.[0].at ?? Infinity
      const firstIn = s.find((m) => m.from === 'contact')
      const reply = firstIn ? s.find((m) => isReply(m) && m.at! >= firstIn.at!) : s.find(isReply)
      const humans = s.filter((m) => m.from === 'agent' && m.kind !== 'note')
      // Quem atendeu: o primeiro da equipe que respondeu; só IA → 'ia'; ninguém → responsável ou fila
      const human = humans.find((m) => m.by)?.by ?? (humans.length ? conv.assignee : undefined)
      const handledBy = human ?? (s.some((m) => m.from === 'ai') ? 'ia' : conv.assignee ?? 'fila')
      const last = i === sessions.length - 1
      out.push({
        id: `${conv.id}:${start}`,
        date: isoDay(start),
        time: hhmm(start),
        contactId: conv.contactId,
        channel: conv.channel,
        handledBy,
        firstResponseSec: firstIn && reply ? Math.max(0, Math.round((reply.at! - firstIn.at!) / 1000)) : null,
        resolved: !last || conv.status === 'resolvida',
        booked: appointments.some((a) => a.contactId === conv.contactId && typeof a.createdAt === 'number' && a.createdAt >= start && a.createdAt < end)
      })
    })
  }
  return out.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
}

/** Agendamento → registro. Horário que já passou e não foi marcado como falta conta como realizado. */
export function apptRecords(appointments: Appointment[], serviceIdByName: (name: string) => string | undefined, now = new Date()): ApptRecord[] {
  const today = isoDay(now.getTime())
  const nowMin = now.getHours() * 60 + now.getMinutes()
  return appointments
    .map((a): ApptRecord => {
      const date = a.date ?? TODAY
      const passed = date < today || (date === today && toMin(a.end) <= nowMin)
      const status: ApptRecord['status'] =
        a.status === 'cancelado' ? 'cancelado' : a.status === 'faltou' ? 'faltou' : a.status === 'concluido' || passed ? 'concluido' : 'agendado'
      return {
        id: a.id,
        date,
        time: a.start,
        contactId: a.contactId,
        professionalId: a.professionalId,
        serviceId: serviceIdByName(a.service) ?? '',
        serviceName: a.service,
        price: a.price,
        status,
        origin: a.origin
      }
    })
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
}

/** Registros para as telas de números (reais no app, exemplo no navegador) */
export function useRecords(): { appts: ApptRecord[]; chats: ChatRecord[]; demo: boolean } {
  const { conversations, version } = useData()
  const { appointmentLog } = useAppState()
  const { services } = useCompany()
  return useMemo(() => {
    if (!APP_MODE && !isWebApp) return { ...demoHistory(), demo: true }
    const byName = (n: string) => services.find((s) => s.name === n)?.id
    return { appts: apptRecords(appointmentLog, byName), chats: chatRecords(conversations, appointmentLog), demo: false }
    // version muda a cada alteração de conversa/mensagem
  }, [conversations, version, appointmentLog, services])
}

/* ---------------- períodos e formatação ---------------- */

export interface Range {
  from: string
  to: string
}
/** Últimos N dias até hoje e o período anterior de mesmo tamanho */
export function lastDays(n: number): { cur: Range; prev: Range } {
  return { cur: { from: addDays(TODAY, -(n - 1)), to: TODAY }, prev: { from: addDays(TODAY, -(2 * n - 1)), to: addDays(TODAY, -n) } }
}
export const inRange = (date: string, r: Range) => date >= r.from && date <= r.to
export const daysOf = (r: Range) => {
  const n = Math.round((dateFromIso(r.to).getTime() - dateFromIso(r.from).getTime()) / 86400000) + 1
  return Array.from({ length: n }, (_, i) => addDays(r.from, i))
}

/** Média dos tempos de 1ª resposta (ignora quem ainda não foi respondido) */
export function avgFirstResponse(chats: ChatRecord[]): number | null {
  const v = chats.map((c) => c.firstResponseSec).filter((x): x is number => x !== null)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

export const fmtSec = (s: number | null) =>
  s === null ? '—' : s < 60 ? `${Math.round(s)}s` : s < 3600 ? `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, '0')}s` : `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`

/** Variação percentual; null quando não há base de comparação */
export const deltaPct = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null)

/**
 * Visitas e gasto do cliente: o que veio cadastrado (histórico anterior ao IC Chat)
 * + os horários realizados na agenda.
 */
export function useContactStats(): (c: { id: string; visits: number; spent: number }) => { visits: number; spent: number } {
  const { appts, demo } = useRecords()
  return useMemo(() => {
    const done = new Map<string, { visits: number; spent: number }>()
    if (!demo) {
      for (const a of appts) {
        if (a.status !== 'concluido') continue
        const s = done.get(a.contactId) ?? { visits: 0, spent: 0 }
        s.visits++
        s.spent += a.price
        done.set(a.contactId, s)
      }
    }
    return (c) => {
      const s = done.get(c.id)
      return { visits: (c.visits || 0) + (s?.visits ?? 0), spent: (c.spent || 0) + (s?.spent ?? 0) }
    }
  }, [appts, demo])
}
