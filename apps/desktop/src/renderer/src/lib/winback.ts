/**
 * Clientes de volta: follow-up depois do atendimento e reativação de quem sumiu.
 * Regras puras para testar sozinhas. A tela decide como enviar (WhatsApp do app ou um clique por cliente).
 */
import type { Appointment, Contact } from '@/data/mock'
import { fillTemplate } from '@/lib/reminders'

export interface FollowupStep {
  /** Dias depois da última visita */
  days: number
  label: string
  template: string
}

export interface WinbackSettings {
  enabled: boolean
  steps: FollowupStep[]
  /** A partir de quantos dias sem voltar o cliente entra em "sumidos" */
  lapsedDays: number
  lapsedTemplate: string
}

export const DEFAULT_WINBACK: WinbackSettings = {
  enabled: true,
  steps: [
    { days: 7, label: 'Pós-atendimento', template: 'Oi, {nome}! Como ficou o seu {servico}? Sua opinião ajuda muito a {empresa}. 💙' },
    { days: 30, label: 'Hora de voltar', template: 'Oi, {nome}! Já faz um mês do seu {servico}. Quer que eu veja um horário para você esta semana?' }
  ],
  lapsedDays: 60,
  lapsedTemplate: 'Oi, {nome}! Sentimos sua falta aqui na {empresa}. Que tal marcar um horário? Responda esta mensagem que eu te ajudo.'
}

export interface WinbackItem {
  contact: Contact
  /** Etapa: dias do follow-up ou "sumido" */
  stage: string
  label: string
  lastVisit: string
  daysAway: number
  service: string
  text: string
}

const DAY = 86_400_000
const dayStart = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

/**
 * Quem deve receber mensagem hoje.
 * - Considera a última visita concluída de cada cliente.
 * - Quem tem horário marcado no futuro não recebe nada (já vai voltar).
 * - Cada etapa sai uma vez por visita: se o cliente voltou depois do envio, as etapas recomeçam.
 * - Só a etapa mais recente que ainda não saiu aparece (nunca duas mensagens de uma vez).
 */
export function winbackQueue(
  contacts: Contact[],
  appointments: Appointment[],
  settings: WinbackSettings,
  ctx: { today: string; company?: string }
): WinbackItem[] {
  if (!settings.enabled) return []
  const today = dayStart(ctx.today)
  const byContact = new Map<string, Appointment[]>()
  for (const a of appointments) {
    if (!a.contactId) continue
    const list = byContact.get(a.contactId) ?? []
    list.push(a)
    byContact.set(a.contactId, list)
  }
  const out: WinbackItem[] = []
  for (const c of contacts) {
    if (!c.phone || c.phone.replace(/\D/g, '').length < 10) continue
    const list = byContact.get(c.id) ?? []
    const future = list.some((a) => (a.date ?? ctx.today) >= ctx.today && (a.status === 'agendado' || a.status === 'confirmado'))
    if (future) continue
    const visits = list.filter((a) => a.status === 'concluido' && (a.date ?? ctx.today) <= ctx.today).sort((x, y) => (y.date ?? '').localeCompare(x.date ?? ''))
    const last = visits[0]
    if (!last) continue
    const lastDay = dayStart(last.date ?? ctx.today)
    const daysAway = Math.floor((today - lastDay) / DAY)
    const sent = c.followups ?? {}
    const sentAfterVisit = (key: string) => (sent[key] ?? 0) >= lastDay
    const vars = { nome: c.name.split(' ')[0] || c.name, servico: last.service, empresa: ctx.company || 'nossa empresa' }

    // Sumido tem prioridade sobre as etapas
    if (daysAway >= settings.lapsedDays) {
      if (!sentAfterVisit('sumido')) {
        out.push({ contact: c, stage: 'sumido', label: `Sumido há ${daysAway} dias`, lastVisit: last.date ?? ctx.today, daysAway, service: last.service, text: fillTemplate(settings.lapsedTemplate, vars) })
      }
      continue
    }
    const step = [...settings.steps].sort((a, b) => b.days - a.days).find((s) => daysAway >= s.days)
    if (!step) continue
    const key = String(step.days)
    if (sentAfterVisit(key)) continue
    out.push({ contact: c, stage: key, label: step.label, lastVisit: last.date ?? ctx.today, daysAway, service: last.service, text: fillTemplate(step.template, vars) })
  }
  return out.sort((a, b) => b.daysAway - a.daysAway)
}
