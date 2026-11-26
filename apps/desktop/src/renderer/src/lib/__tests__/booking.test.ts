import { describe, expect, it } from 'vitest'
import { bookingSlots, openDays, prosFor, type BookingHours, type BookingInfo } from '@/lib/booking'

const week: BookingHours[] = Array.from({ length: 7 }, (_, i) => ({ open: i >= 1 && i <= 5, start: '09:00', end: '12:00', lunchStart: '10:00', lunchEnd: '10:30' }))
// 2026-11-30 é segunda-feira
const monday = '2026-11-30'
const sunday = new Date(2026, 10, 29, 8, 0)

describe('agendamento online', () => {
  it('lista só dias abertos dentro do prazo', () => {
    const days = openDays({ hours: week, daysAhead: 7 }, sunday)
    expect(days[0]).toBe(monday)
    expect(days).toHaveLength(5)
  })

  it('respeita almoço e horários ocupados', () => {
    const busy = [{ professional_id: 'p1', day: monday, start_time: '11:00', end_time: '11:30' }]
    expect(bookingSlots(monday, 30, week, busy, 'p1', sunday)).toEqual(['09:00', '09:30', '10:30', '11:30'])
    // ocupado de outro profissional não conta
    expect(bookingSlots(monday, 30, week, busy, 'p2', sunday)).toContain('11:00')
  })

  it('serviço longo só cabe onde não cruza o almoço nem o fechamento', () => {
    expect(bookingSlots(monday, 60, week, [], 'p1', sunday)).toEqual(['09:00', '10:30', '11:00'])
  })

  it('hoje exige 1 hora de antecedência e dia fechado não tem horário', () => {
    const now = new Date(2026, 10, 30, 9, 10)
    expect(bookingSlots(monday, 30, week, [], 'p1', now)).toEqual(['10:30', '11:00', '11:30'])
    expect(bookingSlots('2026-11-29', 30, week, [], 'p1', sunday)).toEqual([])
    expect(bookingSlots('2026-11-20', 30, week, [], 'p1', sunday)).toEqual([])
  })

  it('profissional sem lista de serviços faz todos', () => {
    const info = { professionals: [{ id: 'a', name: 'A', specialty: '', serviceIds: [] }, { id: 'b', name: 'B', specialty: '', serviceIds: ['s2'] }] } as unknown as BookingInfo
    expect(prosFor(info, 's1').map((p) => p.id)).toEqual(['a'])
    expect(prosFor(info, 's2').map((p) => p.id)).toEqual(['a', 'b'])
  })
})
