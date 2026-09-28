// Horários livres da agenda (usado pela IA para oferecer e marcar horários)
import { TODAY, type Appointment } from '@/data/mock'
import { toMinutes, weekdayOf, type DayHours, type ProfessionalItem } from '@/lib/company'

export const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

interface SlotInput {
  date: string
  pro: ProfessionalItem
  minutes: number
  hours: DayHours[]
  appointments: Appointment[]
  /** Compromissos do Google do profissional nesse dia ([início, fim] em minutos) */
  extraBusy?: (readonly [number, number])[]
}

function busyOf({ date, pro, appointments, extraBusy = [] }: SlotInput) {
  return appointments
    .filter((a) => a.professionalId === pro.id && (a.date ?? TODAY) === date && a.status !== 'faltou' && a.status !== 'cancelado')
    .map((a) => [toMinutes(a.start), toMinutes(a.end)] as const)
    .concat(extraBusy)
}

/** Horários livres (de 30 em 30 min) em que o serviço cabe inteiro */
export function freeSlots(input: SlotInput): string[] {
  const day = input.hours[weekdayOf(input.date)]
  if (!day?.open || !input.pro.active) return []
  const open = toMinutes(day.start)
  const close = toMinutes(day.end)
  const lunch = day.lunchStart && day.lunchEnd ? [toMinutes(day.lunchStart), toMinutes(day.lunchEnd)] : null
  const busy = busyOf(input)
  const now = new Date()
  const nowMin = input.date === TODAY ? now.getHours() * 60 + now.getMinutes() : -1
  if (input.date < TODAY) return []
  const out: string[] = []
  for (let m = open; m + input.minutes <= close; m += 30) {
    const e = m + input.minutes
    if (m <= nowMin) continue
    if (lunch && m < lunch[1] && e > lunch[0]) continue
    if (busy.some(([s, b]) => m < b && e > s)) continue
    out.push(toHHMM(m))
  }
  return out
}

/** Confere se um horário específico está livre */
export function isFree(input: SlotInput, start: string): boolean {
  return freeSlots(input).includes(start)
}
