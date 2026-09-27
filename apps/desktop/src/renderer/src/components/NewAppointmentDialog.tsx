import { useEffect, useMemo, useState } from 'react'
import { CalendarPlus, CircleAlert, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/misc'
import { Dialog } from '@/components/ui/overlay'
import { useAppState } from '@/lib/app-state'
import { useNotifications } from '@/lib/notifications'
import { brl, cn } from '@/lib/utils'
import { contactById, contacts, TODAY } from '@/data/mock'
import { toMinutes, useCompany, weekdayOf, WEEKDAYS } from '@/lib/company'


const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/**
 * Janela única de "Novo agendamento". Abre pela Agenda, pela conversa ("Agendar horário")
 * ou pela busca rápida. Sugere horários livres do profissional e bloqueia conflitos.
 */
export function NewAppointmentDialog() {
  const { apptDialog, closeNewAppointment, appointments, addAppointment } = useAppState()
  const { notify } = useNotifications()
  const [contactId, setContactId] = useState(contacts[0].id)
  const { services, professionals: allPros, info } = useCompany()
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '')
  const [proId, setProId] = useState(allPros[0]?.id ?? '')
  const [date, setDate] = useState(TODAY)
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')
  const [sendConfirmation, setSendConfirmation] = useState(true)

  // Ao abrir, já preenche com o cliente da conversa e o profissional preferido dele
  useEffect(() => {
    if (!apptDialog.open) return
    const c = apptDialog.contactId ? contactById(apptDialog.contactId) : contacts[0]
    setContactId(c.id)
    setProId(c.favoriteProfessional ?? allPros[0]?.id ?? '')
    setServiceId(services[0]?.id ?? '')
    setDate(TODAY)
    setTime('')
    setNotes('')
  }, [apptDialog.open, apptDialog.contactId])

  const service = services.find((s) => s.id === serviceId) ?? { id: '', name: 'Serviço', minutes: 60, price: 0 }
  // Só profissionais ativos que fazem o serviço escolhido (Configurações → Profissionais)
  const professionals = allPros.filter((p) => p.active && (p.serviceIds.length === 0 || p.serviceIds.includes(serviceId)))
  useEffect(() => {
    if (professionals.length && !professionals.some((p) => p.id === proId)) setProId(professionals[0].id)
  }, [professionals, proId])
  // Funcionamento do dia escolhido (Configurações → Empresa)
  const day = info.hours[weekdayOf(date)]
  const OPEN_MIN = toMinutes(day.start)
  const CLOSE_MIN = toMinutes(day.end)
  const LUNCH = day.lunchStart && day.lunchEnd ? ([toMinutes(day.lunchStart), toMinutes(day.lunchEnd)] as const) : ([0, 0] as const)
  const busy = useMemo(
    () =>
      appointments
        .filter((a) => a.professionalId === proId && (a.date ?? TODAY) === date && a.status !== 'faltou')
        .map((a) => [toMin(a.start), toMin(a.end)] as const),
    [appointments, proId, date]
  )

  const overlaps = (start: number, end: number) =>
    busy.some(([s, e]) => start < e && end > s) || (start < LUNCH[1] && end > LUNCH[0])

  const freeSlots = useMemo(() => {
    const out: string[] = []
    if (!day.open) return out
    for (let m = OPEN_MIN; m + service.minutes <= CLOSE_MIN; m += 30) {
      if (!overlaps(m, m + service.minutes)) out.push(toHHMM(m))
    }
    return out
  }, [busy, service.minutes, day.open, OPEN_MIN, CLOSE_MIN, LUNCH[0], LUNCH[1]])

  const start = time ? toMin(time) : null
  const end = start !== null ? start + service.minutes : null
  const conflict = start !== null && end !== null && (!day.open || overlaps(start, end) || start < OPEN_MIN || end > CLOSE_MIN)

  const save = () => {
    if (start === null || end === null || conflict || !proId || !serviceId) return
    addAppointment({
      contactId,
      professionalId: proId,
      service: service.name,
      start: toHHMM(start),
      end: toHHMM(end),
      status: 'agendado',
      price: service.price,
      origin: 'manual',
      date,
      notes: notes || undefined
    })
    const c = contactById(contactId)
    const pro = allPros.find((p) => p.id === proId) ?? { name: 'profissional' }
    closeNewAppointment()
    notify({
      kind: 'agenda',
      title: 'Horário agendado',
      body: `${c.name} · ${service.name} com ${pro.name.split(' ')[0]} às ${toHHMM(start)}${sendConfirmation ? ' · confirmação enviada por WhatsApp' : ''}`,
      link: '/agenda'
    })
  }

  return (
    <Dialog
      open={apptDialog.open}
      onOpenChange={(v) => !v && closeNewAppointment()}
      title="Novo agendamento"
      description="O horário vai para a agenda e para o Google Agenda do profissional."
      footer={
        <>
          <Button variant="outline" onClick={closeNewAppointment}>Cancelar</Button>
          <Button onClick={save} disabled={!time || conflict}>
            <CalendarPlus /> Agendar
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cliente" className="sm:col-span-2">
          <Select value={contactId} onChange={(e) => setContactId(e.target.value)}>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Serviço">
          <Select value={serviceId} onChange={(e) => { setServiceId(e.target.value); setTime('') }}>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.minutes >= 60 ? `${s.minutes / 60}h` : `${s.minutes}min`} · {brl.format(s.price)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Profissional">
          <Select value={proId} onChange={(e) => { setProId(e.target.value); setTime('') }}>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Data">
          <Input type="date" value={date} min={TODAY} onChange={(e) => { setDate(e.target.value); setTime('') }} />
        </Field>
        <Field label="Horário">
          <Input type="time" step={1800} value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>

        <div className="sm:col-span-2">
          <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium">
            <Clock className="size-4 text-muted" /> Horários livres
          </p>
          {freeSlots.length ? (
            <div className="flex flex-wrap gap-1.5">
              {freeSlots.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTime(t)}
                  className={cn(
                    'h-8 rounded-lg border px-2.5 text-[13px] font-medium tabular-nums transition-colors',
                    time === t ? 'border-primary bg-primary text-white' : 'border-border hover:border-primary hover:text-primary'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-muted">
              {day.open ? 'Sem horários livres neste dia para este serviço.' : `Fechado às ${WEEKDAYS[weekdayOf(date)].toLowerCase()}s. Escolha outra data.`}
            </p>
          )}
          {conflict && (
            <p className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-danger">
              <CircleAlert className="size-4" /> Esse horário conflita com outro atendimento, o almoço ou o expediente.
            </p>
          )}
        </div>

        <Field label="Observações" className="sm:col-span-2">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: trazer foto de referência" className="min-h-16" />
        </Field>
        <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 sm:col-span-2">
          <div>
            <p className="text-[13.5px] font-medium">Enviar confirmação por WhatsApp</p>
            <p className="text-xs text-muted">E lembrete automático 24h antes</p>
          </div>
          <Switch checked={sendConfirmation} onCheckedChange={setSendConfirmation} />
        </label>
        {start !== null && !conflict && (
          <div className="flex items-center justify-between rounded-xl bg-primary-soft px-4 py-3 text-[13.5px] text-primary sm:col-span-2">
            <span>
              <b>{toHHMM(start)}–{toHHMM(end!)}</b> · {service.name}
            </span>
            <b>{brl.format(service.price)}</b>
          </div>
        )}
      </div>
    </Dialog>
  )
}
