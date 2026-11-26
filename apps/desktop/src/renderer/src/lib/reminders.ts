/**
 * Lembretes de horário e confirmação pelo WhatsApp.
 * Regras puras (sem tela, sem rede) para poderem ser testadas sozinhas:
 * - quem precisa de lembrete agora (24h e 2h antes);
 * - o texto do lembrete;
 * - o que a resposta do cliente significa ("1" confirma, "2" pede para remarcar).
 */
import type { Appointment } from '@/data/mock'

export type ReminderKind = '24h' | '2h'

export interface ReminderSettings {
  enabled: boolean
  before24h: boolean
  before2h: boolean
  template24h: string
  template2h: string
  /** Envia sozinho pelo WhatsApp conectado (app instalado). Desligado: fica na fila para um clique. */
  autoSend: boolean
}

export const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: true,
  before24h: true,
  before2h: true,
  template24h:
    'Olá, {nome}! Passando para lembrar do seu horário de {servico} {quando} às {hora} com {profissional}, na {empresa}.\n\nResponda *1* para confirmar ou *2* se precisar remarcar.',
  template2h: 'Oi, {nome}! Seu horário de {servico} é hoje às {hora}. Estamos te esperando na {empresa}. Se não puder vir, responda *2*.',
  autoSend: true
}

/** Status em que ainda faz sentido lembrar o cliente */
const REMINDABLE: Appointment['status'][] = ['agendado', 'confirmado']

/** Data e hora de início do agendamento no fuso do computador */
export function startOf(a: Pick<Appointment, 'date' | 'start'>, today: string): Date {
  const [y, m, d] = (a.date ?? today).split('-').map(Number)
  const [h, min] = a.start.split(':').map(Number)
  return new Date(y, m - 1, d, h, min || 0, 0, 0)
}

export interface DueReminder {
  appointment: Appointment
  kind: ReminderKind
  startsAt: Date
}

const HOUR = 3_600_000

/**
 * Lembretes que devem sair agora.
 * - 24h: quando faltam entre 2h e 24h (e o de 24h ainda não saiu). Agendamento marcado em cima da hora
 *   (menos de 2h) recebe só o de 2h.
 * - 2h: quando faltam até 2h, só para quem ainda não confirmou "remarcar".
 * Cada lembrete sai uma única vez: o envio fica gravado em appointment.reminders.
 */
export function dueReminders(appointments: Appointment[], settings: ReminderSettings, now: Date, today: string): DueReminder[] {
  if (!settings.enabled) return []
  const out: DueReminder[] = []
  for (const a of appointments) {
    if (!REMINDABLE.includes(a.status) || !a.contactId) continue
    if (a.reply === 'remarcar') continue
    const startsAt = startOf(a, today)
    const left = startsAt.getTime() - now.getTime()
    if (left <= 0) continue
    // Marcado há menos de 30 min: não lembra logo em seguida (a pessoa acabou de combinar)
    if (a.createdAt && now.getTime() - a.createdAt < 30 * 60_000 && left > 2 * HOUR) continue
    const sent = a.reminders ?? {}
    if (left <= 2 * HOUR) {
      if (settings.before2h && !sent['2h']) out.push({ appointment: a, kind: '2h', startsAt })
    } else if (left <= 24 * HOUR) {
      if (settings.before24h && !sent['24h']) out.push({ appointment: a, kind: '24h', startsAt })
    }
  }
  return out.sort((x, y) => x.startsAt.getTime() - y.startsAt.getTime())
}

/** "hoje", "amanhã" ou "na sexta-feira (27/11)" */
export function whenLabel(startsAt: Date, now: Date): string {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diff = Math.round((day(startsAt) - day(now)) / 86_400_000)
  if (diff === 0) return 'hoje'
  if (diff === 1) return 'amanhã'
  const wd = startsAt.toLocaleDateString('pt-BR', { weekday: 'long' })
  const dm = startsAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `na ${wd} (${dm})`
}

/** Troca {nome}, {servico}, {hora}, {quando}, {profissional}, {empresa}, {data}, {valor}, {pix} pelo valor */
export function fillTemplate(tpl: string, vars: Record<string, string | undefined>): string {
  return tpl
    .replace(/\{(\w+)\}/g, (all, k: string) => {
      const v = vars[k.toLowerCase()]
      return v === undefined ? all : v
    })
    .replace(/[ \t]+\n/g, '\n')
    .replace(/ {2,}/g, ' ')
    .trim()
}

export function reminderText(
  r: DueReminder,
  settings: ReminderSettings,
  ctx: { clientName: string; professional?: string; company?: string; now: Date }
): string {
  const tpl = r.kind === '24h' ? settings.template24h : settings.template2h
  return fillTemplate(tpl, {
    nome: ctx.clientName.split(' ')[0] || ctx.clientName,
    servico: r.appointment.service,
    hora: r.appointment.start,
    quando: whenLabel(r.startsAt, ctx.now),
    data: r.startsAt.toLocaleDateString('pt-BR'),
    profissional: ctx.professional || 'nossa equipe',
    empresa: ctx.company || 'nossa empresa'
  })
}

export type ReplyIntent = 'confirmar' | 'remarcar'

const CONFIRM = /^(1|sim|s|confirmo|confirmado|confirmada|confirmar|ok|okay|pode confirmar|estarei la|estarei lá|vou sim|combinado|beleza|blz|👍)[.!\s]*$/i
const RESCHEDULE = /^(2|nao|não|remarcar|desmarcar|cancelar|nao posso|não posso|nao vou|não vou|preciso remarcar|quero remarcar)[.!\s]*$/i

/**
 * Entende a resposta curta do cliente ao lembrete.
 * Só aceita respostas claras: frase longa ou dúvida fica para a equipe (devolve null).
 */
export function parseReply(text: string | undefined): ReplyIntent | null {
  const t = (text ?? '').trim().replace(/^\*|\*$/g, '')
  if (!t || t.length > 30) return null
  if (CONFIRM.test(t)) return 'confirmar'
  if (RESCHEDULE.test(t)) return 'remarcar'
  return null
}

/**
 * Último lembrete ainda sem resposta para o contato (para casar com a mensagem recebida).
 * Considera só lembretes enviados nas últimas 26 horas e agendamentos que ainda não passaram.
 */
export function awaitingReply(appointments: Appointment[], contactId: string, now: Date, today: string): Appointment | undefined {
  return appointments
    .filter((a) => a.contactId === contactId && REMINDABLE.includes(a.status) && !a.reply)
    .filter((a) => {
      const last = Math.max(a.reminders?.['24h'] ?? 0, a.reminders?.['2h'] ?? 0)
      return last > 0 && now.getTime() - last < 26 * HOUR && startOf(a, today).getTime() > now.getTime()
    })
    .sort((x, y) => startOf(x, today).getTime() - startOf(y, today).getTime())[0]
}

/** Quantas faltas os lembretes ajudaram a evitar: confirmados por resposta que compareceram */
export function confirmationStats(appointments: Appointment[]) {
  const reminded = appointments.filter((a) => a.reminders && (a.reminders['24h'] || a.reminders['2h']))
  const confirmed = reminded.filter((a) => a.reply === 'confirmar')
  const rescheduled = reminded.filter((a) => a.reply === 'remarcar')
  const showed = reminded.filter((a) => a.status === 'concluido')
  const noShow = reminded.filter((a) => a.status === 'faltou')
  return {
    reminded: reminded.length,
    confirmed: confirmed.length,
    rescheduled: rescheduled.length,
    showed: showed.length,
    noShow: noShow.length,
    /** % de quem recebeu lembrete e respondeu */
    replyRate: reminded.length ? Math.round(((confirmed.length + rescheduled.length) / reminded.length) * 100) : 0
  }
}
