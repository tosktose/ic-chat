import { describe, expect, it } from 'vitest'
import type { Appointment } from '@/data/mock'
import { awaitingReply, confirmationStats, DEFAULT_REMINDERS, dueReminders, fillTemplate, parseReply, reminderText, whenLabel } from '@/lib/reminders'

const TODAY = '2026-11-25'
const now = new Date(2026, 10, 25, 10, 0) // 25/11/2026 10:00
const appt = (p: Partial<Appointment>): Appointment => ({ id: p.id ?? 'a1', contactId: 'c1', professionalId: 'p1', service: 'Corte', start: '15:00', end: '16:00', status: 'agendado', price: 80, origin: 'manual', date: TODAY, ...p })

describe('Lembretes: quem lembrar e quando', () => {
  it('amanhã às 09:00 (23h antes) recebe o lembrete de 24h', () => {
    const due = dueReminders([appt({ date: '2026-11-26', start: '09:00' })], DEFAULT_REMINDERS, now, TODAY)
    expect(due.map((d) => d.kind)).toEqual(['24h'])
  })
  it('hoje às 11:30 (1h30 antes) recebe só o de 2h', () => {
    const due = dueReminders([appt({ start: '11:30' })], DEFAULT_REMINDERS, now, TODAY)
    expect(due.map((d) => d.kind)).toEqual(['2h'])
  })
  it('daqui a 3 dias ainda não recebe nada', () => {
    expect(dueReminders([appt({ date: '2026-11-28' })], DEFAULT_REMINDERS, now, TODAY)).toEqual([])
  })
  it('lembrete já enviado não sai de novo', () => {
    expect(dueReminders([appt({ reminders: { '24h': now.getTime() - 1000 } })], DEFAULT_REMINDERS, now, TODAY)).toEqual([])
    expect(dueReminders([appt({ start: '11:00', reminders: { '2h': 1 } })], DEFAULT_REMINDERS, now, TODAY)).toEqual([])
  })
  it('horário que já passou, cancelado, faltou ou concluído não recebe', () => {
    const list = [appt({ id: 'x', start: '09:00' }), appt({ id: 'y', status: 'cancelado' }), appt({ id: 'z', status: 'faltou' }), appt({ id: 'w', status: 'concluido' })]
    expect(dueReminders(list, DEFAULT_REMINDERS, now, TODAY)).toEqual([])
  })
  it('quem pediu para remarcar não recebe o de 2h', () => {
    expect(dueReminders([appt({ start: '11:00', reply: 'remarcar', reminders: { '24h': 1 } })], DEFAULT_REMINDERS, now, TODAY)).toEqual([])
  })
  it('sem cliente vinculado não há para quem mandar', () => {
    expect(dueReminders([appt({ contactId: '' })], DEFAULT_REMINDERS, now, TODAY)).toEqual([])
  })
  it('agendado agora há pouco para daqui a 5h espera (não lembra logo em seguida)', () => {
    expect(dueReminders([appt({ createdAt: now.getTime() - 5 * 60_000 })], DEFAULT_REMINDERS, now, TODAY)).toEqual([])
  })
  it('desligado ou com um dos lembretes desligado respeita a escolha', () => {
    expect(dueReminders([appt({})], { ...DEFAULT_REMINDERS, enabled: false }, now, TODAY)).toEqual([])
    expect(dueReminders([appt({})], { ...DEFAULT_REMINDERS, before24h: false }, now, TODAY)).toEqual([])
  })
  it('ordena pelo horário mais próximo', () => {
    const due = dueReminders([appt({ id: 'b', start: '18:00' }), appt({ id: 'a', start: '11:00' })], DEFAULT_REMINDERS, now, TODAY)
    expect(due.map((d) => d.appointment.id)).toEqual(['a', 'b'])
  })
})

describe('Lembretes: texto', () => {
  it('preenche nome, serviço, quando, hora, profissional e empresa', () => {
    const [r] = dueReminders([appt({ date: '2026-11-26', start: '09:00' })], DEFAULT_REMINDERS, now, TODAY)
    const text = reminderText(r, DEFAULT_REMINDERS, { clientName: 'Maria Souza', professional: 'Ana', company: 'Studio X', now })
    expect(text).toContain('Olá, Maria!')
    expect(text).toContain('Corte amanhã às 09:00 com Ana, na Studio X')
    expect(text).toContain('*1*')
  })
  it('deixa a variável desconhecida como está e não deixa espaço sobrando', () => {
    expect(fillTemplate('Oi {nome}  {xyz}', { nome: 'Ana' })).toBe('Oi Ana {xyz}')
  })
  it('descreve o dia em português', () => {
    expect(whenLabel(new Date(2026, 10, 25, 15), now)).toBe('hoje')
    expect(whenLabel(new Date(2026, 10, 26, 9), now)).toBe('amanhã')
    expect(whenLabel(new Date(2026, 10, 27, 9), now)).toMatch(/^na sexta-feira \(27\/11\)$/)
  })
})

describe('Lembretes: resposta do cliente', () => {
  it('entende confirmações', () => {
    for (const t of ['1', ' Sim ', 'confirmo', 'OK!', '*1*', 'confirmado.']) expect(parseReply(t)).toBe('confirmar')
  })
  it('entende pedido de remarcar', () => {
    for (const t of ['2', 'não posso', 'Remarcar', 'cancelar']) expect(parseReply(t)).toBe('remarcar')
  })
  it('frase longa ou dúvida fica para a equipe', () => {
    for (const t of ['1 hora mais tarde dá?', 'qual o endereço mesmo?', '', undefined, '12']) expect(parseReply(t)).toBeNull()
  })
  it('acha o agendamento que espera resposta do contato', () => {
    const list = [appt({ id: 'a', reminders: { '24h': now.getTime() - 3600_000 } }), appt({ id: 'b', contactId: 'c2', reminders: { '24h': now.getTime() } })]
    expect(awaitingReply(list, 'c1', now, TODAY)?.id).toBe('a')
    expect(awaitingReply(list, 'c3', now, TODAY)).toBeUndefined()
    expect(awaitingReply([appt({ reminders: { '24h': now.getTime() - 30 * 3600_000 } })], 'c1', now, TODAY)).toBeUndefined()
    expect(awaitingReply([appt({ reply: 'confirmar', reminders: { '24h': now.getTime() } })], 'c1', now, TODAY)).toBeUndefined()
  })
  it('conta lembrados, confirmados e faltas', () => {
    const s = confirmationStats([
      appt({ id: '1', reminders: { '24h': 1 }, reply: 'confirmar', status: 'concluido' }),
      appt({ id: '2', reminders: { '24h': 1 }, status: 'faltou' }),
      appt({ id: '3', reminders: { '2h': 1 }, reply: 'remarcar' }),
      appt({ id: '4' })
    ])
    expect(s).toEqual({ reminded: 3, confirmed: 1, rescheduled: 1, showed: 1, noShow: 1, replyRate: 67 })
  })
})
