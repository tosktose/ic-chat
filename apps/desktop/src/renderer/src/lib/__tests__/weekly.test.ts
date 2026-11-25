import { describe, expect, it } from 'vitest'
import type { Appointment, Contact } from '@/data/mock'
import { summaryText, weeklySummary } from '@/lib/weekly'

const TODAY = '2026-11-25' // semana fechada: 18/11 a 24/11
const a = (id: string, date: string, status: Appointment['status'], price = 100, contactId = 'c' + id, extra: Partial<Appointment> = {}): Appointment =>
  ({ id, contactId, professionalId: 'p', service: 'Corte', start: '10:00', end: '11:00', status, price, origin: 'manual', date, ...extra })
const contacts: Contact[] = ['1', '2', '3', '4', '5', 'old'].map((i) => ({ id: 'c' + i, name: 'C' + i, phone: '', tags: [], since: '', visits: 0, spent: 0 }))

describe('Resumo da semana', () => {
  const appts = [
    a('1', '2026-11-18', 'concluido', 100, 'c1', { reply: 'confirmar' }),
    a('2', '2026-11-20', 'concluido', 150),
    a('3', '2026-11-22', 'faltou'),
    a('4', '2026-11-24', 'cancelado'),
    a('5', '2026-11-25', 'concluido', 999), // hoje: fora da semana fechada
    a('6', '2026-11-12', 'concluido', 400, 'cold'),
    a('7', '2026-11-01', 'concluido', 50, 'cold')
  ]
  const s = weeklySummary(appts, contacts, TODAY, 2)

  it('conta só os 7 dias fechados (até ontem)', () => {
    expect(s.from).toBe('2026-11-18')
    expect(s.to).toBe('2026-11-24')
    expect(s.current).toEqual({ appointments: 3, done: 2, noShow: 1, canceled: 1, revenue: 250, newClients: 3, confirmed: 1 })
  })
  it('compara com a semana anterior', () => {
    expect(s.previous.done).toBe(1)
    expect(s.previous.revenue).toBe(400)
  })
  it('calcula a taxa de faltas e dá 3 sugestões, começando pelas faltas', () => {
    expect(s.noShowRate).toBe(33)
    expect(s.tips).toHaveLength(3)
    expect(s.tips[0]).toMatch(/33% de faltas/)
    expect(s.tips[1]).toMatch(/2 clientes para chamar de volta/)
  })
  it('texto pronto para o WhatsApp', () => {
    const t = summaryText(s, 'Studio X')
    expect(t).toContain('*Resumo da semana · Studio X* (18/11 a 24/11)')
    expect(t).toContain('Atendimentos: 2 (↑ 1)')
    expect(t).toMatch(/Faturamento: R\$\s?250,00/)
  })
  it('semana vazia não quebra e ainda sugere algo', () => {
    const e = weeklySummary([], [], TODAY)
    expect(e.noShowRate).toBe(0)
    expect(e.tips.length).toBe(3)
  })
})
