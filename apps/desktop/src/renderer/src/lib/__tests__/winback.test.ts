import { describe, expect, it } from 'vitest'
import type { Appointment, Contact } from '@/data/mock'
import { DEFAULT_WINBACK, winbackQueue } from '@/lib/winback'

const TODAY = '2026-11-25'
const contact = (p: Partial<Contact> = {}): Contact => ({ id: 'c1', name: 'Maria Souza', phone: '5511987654321', tags: [], since: '', visits: 0, spent: 0, ...p })
const visit = (date: string, p: Partial<Appointment> = {}): Appointment => ({ id: date, contactId: 'c1', professionalId: 'p', service: 'Corte', start: '10:00', end: '11:00', status: 'concluido', price: 80, origin: 'manual', date, ...p })
const run = (contacts: Contact[], appts: Appointment[]) => winbackQueue(contacts, appts, DEFAULT_WINBACK, { today: TODAY, company: 'Studio X' })

describe('Clientes de volta', () => {
  it('7 dias depois da visita: mensagem de pós-atendimento com nome e serviço', () => {
    const [item] = run([contact()], [visit('2026-11-18')])
    expect(item.stage).toBe('7')
    expect(item.text).toBe('Oi, Maria! Como ficou o seu Corte? Sua opinião ajuda muito a Studio X. 💙')
  })
  it('antes de 7 dias, nada', () => {
    expect(run([contact()], [visit('2026-11-20')])).toEqual([])
  })
  it('com 35 dias manda só a etapa de 30 (nunca duas de uma vez)', () => {
    const items = run([contact()], [visit('2026-10-21')])
    expect(items.map((i) => i.stage)).toEqual(['30'])
  })
  it('60 dias ou mais: entra em sumidos', () => {
    const [item] = run([contact()], [visit('2026-09-01')])
    expect(item.stage).toBe('sumido')
    expect(item.daysAway).toBe(85)
  })
  it('etapa já enviada depois da visita não volta', () => {
    expect(run([contact({ followups: { '7': new Date(2026, 10, 24).getTime() } })], [visit('2026-11-18')])).toEqual([])
  })
  it('se voltou depois do envio, as etapas recomeçam', () => {
    const items = run([contact({ followups: { '7': new Date(2026, 9, 1).getTime() } })], [visit('2026-09-20'), visit('2026-11-18')])
    expect(items.map((i) => i.stage)).toEqual(['7'])
  })
  it('quem já tem horário marcado não recebe', () => {
    expect(run([contact()], [visit('2026-11-18'), visit('2026-11-30', { status: 'agendado' })])).toEqual([])
  })
  it('sem visita concluída ou sem telefone, nada', () => {
    expect(run([contact()], [visit('2026-11-18', { status: 'faltou' })])).toEqual([])
    expect(run([contact({ phone: '' })], [visit('2026-11-18')])).toEqual([])
  })
  it('desligado não lista ninguém', () => {
    expect(winbackQueue([contact()], [visit('2026-11-18')], { ...DEFAULT_WINBACK, enabled: false }, { today: TODAY })).toEqual([])
  })
})
