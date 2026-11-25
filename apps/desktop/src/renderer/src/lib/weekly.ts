/**
 * Resumo da semana para o dono: números dos últimos 7 dias comparados com os 7 anteriores,
 * mais três sugestões práticas. Regras puras, testadas sozinhas.
 */
import type { Appointment, Contact } from '@/data/mock'

export interface WeekNumbers {
  appointments: number
  done: number
  noShow: number
  canceled: number
  revenue: number
  newClients: number
  confirmed: number
}

export interface WeeklySummary {
  from: string
  to: string
  current: WeekNumbers
  previous: WeekNumbers
  noShowRate: number
  tips: string[]
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (isoDate: string, n: number) => {
  const [y, m, d] = isoDate.split('-').map(Number)
  return iso(new Date(y, m - 1, d + n))
}

function numbers(appts: Appointment[], contacts: Contact[], from: string, to: string, firstVisit: Map<string, string>): WeekNumbers {
  const inRange = appts.filter((a) => a.date && a.date >= from && a.date <= to)
  const done = inRange.filter((a) => a.status === 'concluido')
  const newClients = contacts.filter((c) => {
    const first = firstVisit.get(c.id)
    return first !== undefined && first >= from && first <= to
  }).length
  return {
    appointments: inRange.filter((a) => a.status !== 'cancelado').length,
    done: done.length,
    noShow: inRange.filter((a) => a.status === 'faltou').length,
    canceled: inRange.filter((a) => a.status === 'cancelado').length,
    revenue: done.reduce((s, a) => s + (Number(a.price) || 0), 0),
    newClients,
    confirmed: inRange.filter((a) => a.reply === 'confirmar').length
  }
}

/** Resumo dos 7 dias que terminam ontem (a semana fechada) */
export function weeklySummary(appointments: Appointment[], contacts: Contact[], today: string, lapsedCount = 0): WeeklySummary {
  const to = addDays(today, -1)
  const from = addDays(today, -7)
  const prevTo = addDays(today, -8)
  const prevFrom = addDays(today, -14)
  const firstVisit = new Map<string, string>()
  for (const a of appointments) {
    if (!a.contactId || !a.date || a.status === 'cancelado') continue
    const cur = firstVisit.get(a.contactId)
    if (!cur || a.date < cur) firstVisit.set(a.contactId, a.date)
  }
  const current = numbers(appointments, contacts, from, to, firstVisit)
  const previous = numbers(appointments, contacts, prevFrom, prevTo, firstVisit)
  const base = current.done + current.noShow
  const noShowRate = base ? Math.round((current.noShow / base) * 100) : 0

  const tips: string[] = []
  if (noShowRate >= 10) tips.push(`${noShowRate}% de faltas na semana. Ligue os lembretes de 24h e 2h e peça sinal por PIX nos serviços mais longos.`)
  if (lapsedCount > 0) tips.push(`${lapsedCount} cliente${lapsedCount > 1 ? 's' : ''} para chamar de volta em "Clientes de volta". Uma mensagem hoje enche a agenda da semana que vem.`)
  if (current.revenue < previous.revenue && previous.revenue > 0) {
    const drop = Math.round(((previous.revenue - current.revenue) / previous.revenue) * 100)
    tips.push(`Faturamento ${drop}% menor que na semana anterior. Divulgue o link de agendamento no Instagram e no status do WhatsApp.`)
  }
  if (current.newClients === 0) tips.push('Nenhum cliente novo na semana. Coloque o link de agendamento na bio do Instagram.')
  if (current.done > previous.done && previous.done > 0) tips.push(`${current.done - previous.done} atendimentos a mais que na semana anterior. Mantenha o ritmo dos lembretes.`)
  if (tips.length < 3) tips.push('Peça uma avaliação no Google para quem foi atendido esta semana.')
  if (tips.length < 3) tips.push('Revise os horários vagos dos próximos dias e ofereça para a lista de clientes.')
  return { from, to, current, previous, noShowRate, tips: tips.slice(0, 3) }
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const delta = (a: number, b: number) => (a === b ? '=' : a > b ? `↑ ${a - b}` : `↓ ${b - a}`)
const dm = (isoDate: string) => isoDate.split('-').reverse().slice(0, 2).join('/')

/** Texto para mandar no WhatsApp do dono */
export function summaryText(s: WeeklySummary, company?: string): string {
  const c = s.current
  const p = s.previous
  return [
    `*Resumo da semana${company ? ` · ${company}` : ''}* (${dm(s.from)} a ${dm(s.to)})`,
    '',
    `✅ Atendimentos: ${c.done} (${delta(c.done, p.done)})`,
    `💰 Faturamento: ${brl(c.revenue)}`,
    `🙋 Clientes novos: ${c.newClients}`,
    `📵 Faltas: ${c.noShow} (${s.noShowRate}%)`,
    `👍 Confirmados pelo lembrete: ${c.confirmed}`,
    '',
    '*3 sugestões*',
    ...s.tips.map((t, i) => `${i + 1}. ${t}`)
  ].join('\n')
}
