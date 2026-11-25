import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useParams } from 'react-router'
import { ArrowLeft, CalendarCheck, CheckCircle2, Clock, Loader2, MapPin, UserRound } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { BOOKING_ERRORS, bookingSlots, openDays, prosFor, type BookingInfo, type BusyRow } from '@/lib/booking'
import { cn } from '@/lib/utils'

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return { wd: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), dm: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) }
}
const longDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}

/** Página pública de agendamento: o cliente escolhe serviço, profissional, dia e horário. */
export function BookingPage() {
  const { tenantId = '' } = useParams()
  const [info, setInfo] = useState<BookingInfo | null | undefined>(undefined)
  const [serviceId, setServiceId] = useState('')
  const [proId, setProId] = useState('')
  const [date, setDate] = useState('')
  const [start, setStart] = useState('')
  const [busy, setBusy] = useState<BusyRow[]>([])
  const [busyLoading, setBusyLoading] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState('')
  const [now] = useState(() => new Date())

  useEffect(() => {
    document.title = 'Agendar horário'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    if (!supabase || !/^[0-9a-f-]{36}$/i.test(tenantId)) { setInfo(null); return () => meta.remove() }
    void supabase.schema('ic_chat').rpc('booking_page_info', { p_tenant: tenantId }).then(({ data, error }) => {
      if (error || !data) return setInfo(null)
      const d = data as BookingInfo
      setInfo(d)
      if (d.name) document.title = `Agendar · ${d.name}`
    })
    return () => meta.remove()
  }, [tenantId])

  const days = useMemo(() => (info ? openDays({ hours: info.hours, daysAhead: Math.min(info.daysAhead, 31) }, now) : []), [info, now])
  const service = info?.services.find((s) => s.id === serviceId)
  const pros = useMemo(() => (info && serviceId ? prosFor(info, serviceId) : []), [info, serviceId])

  const loadBusy = async () => {
    if (!supabase || !days.length) return
    setBusyLoading(true)
    const { data } = await supabase.schema('ic_chat').rpc('booking_busy', { p_tenant: tenantId, p_from: days[0], p_to: days[days.length - 1] })
    setBusy((data ?? []) as BusyRow[])
    setBusyLoading(false)
  }
  useEffect(() => {
    if (proId) void loadBusy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proId, days.length])

  const slots = useMemo(
    () => (info && service && proId && date ? bookingSlots(date, service.minutes, info.hours, busy, proId, new Date()) : []),
    [info, service, proId, date, busy]
  )
  // Dias com pelo menos um horário livre (para não mostrar dia cheio)
  const availableDays = useMemo(
    () => (info && service && proId ? days.filter((d) => bookingSlots(d, service.minutes, info.hours, busy, proId, new Date()).length > 0) : []),
    [info, service, proId, days, busy]
  )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase || !service) return
    setState('sending')
    setError('')
    const { data, error: err } = await supabase.schema('ic_chat').rpc('book_appointment', {
      p_tenant: tenantId, p_service_id: serviceId, p_professional_id: proId, p_date: date, p_start: start, p_name: name, p_phone: phone
    })
    const r = data as { ok: boolean; error?: string } | null
    if (err || !r?.ok) {
      setState('idle')
      setError(BOOKING_ERRORS[r?.error ?? ''] ?? 'Não foi possível marcar agora. Tente de novo em instantes.')
      if (r?.error === 'ocupado') { setStart(''); void loadBusy() }
      return
    }
    setState('done')
  }

  const pro = pros.find((p) => p.id === proId)
  const step = !serviceId ? 1 : !proId ? 2 : !start ? 3 : 4
  const back = () => {
    setError('')
    if (step === 4) setStart('')
    else if (step === 3) { setProId(''); setDate('') }
    else if (step === 2) setServiceId('')
  }
  const field = 'h-12 w-full rounded-xl border border-border bg-surface px-4 text-[15px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'
  const option = (active: boolean) =>
    cn('w-full rounded-xl border px-4 py-3 text-left transition-colors', active ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:border-border-strong')

  return (
    <div className="min-h-dvh bg-surface-2 px-4 py-6 md:py-10">
      <main className="mx-auto w-full max-w-lg rounded-3xl border border-border bg-surface p-5 shadow-(--shadow-pop) md:p-7">
        {info === undefined ? (
          <div className="grid place-items-center py-16" role="status" aria-label="Carregando"><Loader2 className="size-6 animate-spin text-muted" /></div>
        ) : info === null ? (
          <div className="py-10 text-center">
            <CalendarCheck className="mx-auto size-10 text-subtle" />
            <h1 className="mt-3 text-lg font-bold">Agendamento indisponível</h1>
            <p className="mt-1 text-sm text-muted">Este link não está ativo no momento. Fale com a empresa pelo WhatsApp.</p>
          </div>
        ) : state === 'done' && service ? (
          <div className="py-6 text-center" data-testid="booking-done">
            <CheckCircle2 className="mx-auto size-12 text-success" />
            <h1 className="mt-4 text-xl font-bold">Horário marcado!</h1>
            <p className="mt-2 text-[15px]">{service.name} com {pro?.name}</p>
            <p className="text-[15px] font-semibold capitalize">{longDay(date)} às {start}</p>
            <p className="mt-3 text-sm text-muted">A {info.name} vai mandar a confirmação e um lembrete pelo WhatsApp.</p>
            {service.deposit > 0 && <p className="mt-3 rounded-xl bg-warning-soft p-3 text-sm text-warning">Este serviço pede sinal de {brl(service.deposit)} por PIX. A empresa vai enviar o código pelo WhatsApp.</p>}
          </div>
        ) : (
          <>
            <header className="mb-5">
              <p className="text-xs font-semibold tracking-wider text-primary uppercase">Agendar horário</p>
              <h1 className="mt-1 text-2xl font-bold">{info.name}</h1>
              {info.address && <p className="mt-1 flex items-center gap-1.5 text-sm text-muted"><MapPin className="size-3.5" /> {info.address}</p>}
              {info.note && <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm text-muted">{info.note}</p>}
            </header>

            {step > 1 && (
              <button type="button" onClick={back} className="mb-3 flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground">
                <ArrowLeft className="size-4" /> Voltar
              </button>
            )}

            {step === 1 && (
              <section aria-label="Escolha o serviço">
                <h2 className="mb-2 font-semibold">1. Qual serviço?</h2>
                {info.services.length === 0 ? (
                  <p className="text-sm text-muted">Nenhum serviço disponível para agendamento online.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {info.services.map((s) => (
                      <button key={s.id} type="button" className={option(false)} onClick={() => { setServiceId(s.id); const ps = prosFor(info, s.id); if (ps.length === 1) setProId(ps[0].id) }}>
                        <span className="flex items-center justify-between gap-3">
                          <span className="font-medium">{s.name}</span>
                          <span className="font-semibold tabular-nums">{s.price > 0 ? brl(s.price) : ''}</span>
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted"><Clock className="size-3.5" /> {s.minutes} min{s.deposit > 0 ? ` · sinal ${brl(s.deposit)}` : ''}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}

            {step === 2 && service && (
              <section aria-label="Escolha o profissional">
                <h2 className="mb-2 font-semibold">2. Com quem?</h2>
                {pros.length === 0 ? (
                  <p className="text-sm text-muted">Nenhum profissional disponível para este serviço.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {pros.map((p) => (
                      <button key={p.id} type="button" className={option(false)} onClick={() => setProId(p.id)}>
                        <span className="flex items-center gap-2 font-medium"><UserRound className="size-4 text-subtle" /> {p.name}</span>
                        {p.specialty && <span className="text-[13px] text-muted">{p.specialty}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}

            {step === 3 && service && (
              <section aria-label="Escolha o dia e o horário">
                <h2 className="mb-2 font-semibold">3. Quando?</h2>
                <p className="mb-3 text-sm text-muted">{service.name} com {pro?.name} · {service.minutes} min</p>
                {busyLoading ? (
                  <div className="grid place-items-center py-8"><Loader2 className="size-5 animate-spin text-muted" /></div>
                ) : availableDays.length === 0 ? (
                  <p className="text-sm text-muted">Sem horários livres nos próximos dias. Fale com a empresa pelo WhatsApp.</p>
                ) : (
                  <>
                    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" role="listbox" aria-label="Dias">
                      {availableDays.map((d) => {
                        const l = dayLabel(d)
                        return (
                          <button key={d} type="button" role="option" aria-selected={date === d} onClick={() => setDate(d)}
                            className={cn('flex w-16 shrink-0 flex-col items-center rounded-xl border py-2', date === d ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface')}>
                            <span className="text-xs capitalize">{l.wd}</span>
                            <span className="font-semibold tabular-nums">{l.dm}</span>
                          </button>
                        )
                      })}
                    </div>
                    {date && (
                      <div className="mt-3 grid grid-cols-4 gap-2" aria-label="Horários">
                        {slots.map((t) => (
                          <button key={t} type="button" onClick={() => setStart(t)} className="h-11 rounded-xl border border-border bg-surface font-medium tabular-nums hover:border-primary hover:text-primary">
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                    {!date && <p className="text-sm text-muted">Escolha um dia para ver os horários.</p>}
                  </>
                )}
              </section>
            )}

            {step === 4 && service && (
              <form onSubmit={submit} className="flex flex-col gap-3" aria-label="Seus dados">
                <h2 className="font-semibold">4. Seus dados</h2>
                <div className="rounded-xl bg-surface-2 p-3 text-sm">
                  <p className="font-semibold">{service.name} com {pro?.name}</p>
                  <p className="capitalize text-muted">{longDay(date)} às {start}{service.price > 0 ? ` · ${brl(service.price)}` : ''}</p>
                </div>
                <label className="text-sm font-medium" htmlFor="bk-name">Seu nome</label>
                <input id="bk-name" className={field} required minLength={2} maxLength={160} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                <label className="text-sm font-medium" htmlFor="bk-phone">WhatsApp com DDD</label>
                <input id="bk-phone" className={field} required inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} />
                {error && <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
                <button type="submit" disabled={state === 'sending' || name.trim().length < 2 || phone.replace(/\D/g, '').length < 10}
                  className="mt-1 flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-60">
                  {state === 'sending' ? <Loader2 className="size-5 animate-spin" /> : <CalendarCheck className="size-5" />} Confirmar horário
                </button>
                <p className="text-center text-xs text-muted">Seus dados são usados só para este agendamento.</p>
              </form>
            )}
            {error && step !== 4 && <p role="alert" className="mt-3 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
          </>
        )}
      </main>
      <p className="mt-4 text-center text-xs text-muted">Agendamento por <a href="/" className="font-medium hover:underline">IC Chat</a></p>
    </div>
  )
}
