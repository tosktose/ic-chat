/**
 * Agendamento online (página pública): regras puras para calcular dias e horários livres.
 * O servidor confere tudo de novo ao marcar; aqui é só para mostrar ao cliente.
 */
export interface BookingHours {
  open: boolean
  start: string
  end: string
  lunchStart?: string
  lunchEnd?: string
}
export interface BookingService { id: string; name: string; minutes: number; price: number; deposit: number }
export interface BookingPro { id: string; name: string; specialty: string; serviceIds: string[] }
export interface BookingInfo {
  name: string
  address: string
  note: string
  daysAhead: number
  hours: BookingHours[]
  services: BookingService[]
  professionals: BookingPro[]
}
export interface BusyRow { professional_id: string; day: string; start_time: string; end_time: string }

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const weekday = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

/** Profissionais que fazem o serviço (lista vazia de serviços = faz todos) */
export function prosFor(info: BookingInfo, serviceId: string): BookingPro[] {
  return info.professionals.filter((p) => !p.serviceIds.length || p.serviceIds.includes(serviceId))
}

/** Próximos dias em que a empresa abre (até daysAhead) */
export function openDays(info: Pick<BookingInfo, 'hours' | 'daysAhead'>, now: Date): string[] {
  const out: string[] = []
  for (let i = 0; i <= info.daysAhead; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    if (info.hours[d.getDay()]?.open) out.push(isoDate(d))
  }
  return out
}

/**
 * Horários livres (de 30 em 30 min) para um profissional num dia.
 * Respeita expediente, almoço, horários ocupados e antecedência mínima de 1 hora.
 */
export function bookingSlots(
  date: string,
  minutes: number,
  hours: BookingHours[],
  busy: BusyRow[],
  professionalId: string,
  now: Date,
  leadMinutes = 60
): string[] {
  const day = hours[weekday(date)]
  if (!day?.open || minutes < 5) return []
  const today = isoDate(now)
  if (date < today) return []
  const minStart = date === today ? now.getHours() * 60 + now.getMinutes() + leadMinutes : -1
  const open = toMin(day.start)
  const close = toMin(day.end)
  const lunch = day.lunchStart && day.lunchEnd ? [toMin(day.lunchStart), toMin(day.lunchEnd)] : null
  const taken = busy.filter((b) => b.professional_id === professionalId && b.day === date).map((b) => [toMin(b.start_time), toMin(b.end_time)])
  const out: string[] = []
  for (let m = open; m + minutes <= close; m += 30) {
    const e = m + minutes
    if (m < minStart) continue
    if (lunch && m < lunch[1] && e > lunch[0]) continue
    if (taken.some(([s, b]) => m < b && e > s)) continue
    out.push(hhmm(m))
  }
  return out
}

/** Mensagem clara para cada recusa do servidor */
export const BOOKING_ERRORS: Record<string, string> = {
  indisponivel: 'O agendamento online desta empresa está desligado no momento.',
  dados: 'Confira seu nome e o celular com DDD.',
  horario: 'Horário inválido. Escolha outro.',
  servico: 'Este serviço ou profissional não está mais disponível. Atualize a página.',
  prazo: 'Este horário está fora do prazo de agendamento. Escolha outro.',
  fechado: 'A empresa não atende neste horário. Escolha outro.',
  ocupado: 'Alguém acabou de marcar este horário. Escolha outro.',
  limite: 'Você já fez várias marcações hoje. Fale com a empresa pelo WhatsApp.'
}
