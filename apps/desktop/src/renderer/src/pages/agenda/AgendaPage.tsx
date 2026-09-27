import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { Bot, CalendarPlus, ChevronLeft, ChevronRight, Clock, Link2, UserRound } from 'lucide-react'
import { GoogleSyncButton } from '@/components/GoogleCalendarDialog'
import { addDays, HISTORY } from '@/data/history'
import { toast } from 'sonner'
import { GoogleIcon } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { Avatar, Badge, Segmented } from '@/components/ui/misc'
import { Dialog } from '@/components/ui/overlay'
import { useMediaQuery } from '@/lib/use-media'
import { brl, cn } from '@/lib/utils'
import { contactById, services as seedServices, TODAY, type Appointment } from '@/data/mock'
import { formatLongDate, toMinutes, useCompany, weekdayOf, type ProfessionalItem } from '@/lib/company'
import { useAppState } from '@/lib/app-state'

const HOUR_PX = 72
const HISTORY_SERVICES = Object.fromEntries(seedServices.map((sv) => [sv.id, sv]))

const statusMeta: Record<Appointment['status'], { label: string; tone: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' }> = {
  agendado: { label: 'Agendado', tone: 'neutral' },
  confirmado: { label: 'Confirmado', tone: 'primary' },
  em_atendimento: { label: 'Em atendimento', tone: 'warning' },
  concluido: { label: 'Concluído', tone: 'success' },
  faltou: { label: 'Faltou', tone: 'danger' }
}

const originIcon = { ia: Bot, manual: UserRound, link: Link2 }
const originLabel = { ia: 'Agendado pela IA', manual: 'Agendado pela equipe', link: 'Agendado pelo link' }

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function AgendaPage() {
  const [params, setParams] = useSearchParams()
  const isMdUp = useMediaQuery('(min-width: 768px)')
  const [view, setView] = useState<'dia' | 'lista'>('dia')
  const [hiddenPros, setHiddenPros] = useState<string[]>([])
  const [openAppt, setOpenAppt] = useState<Appointment | null>(null)
  const { appointments: all, openNewAppointment } = useAppState()
  const { professionals: allPros, info } = useCompany()
  const professionals = allPros.filter((p) => p.active)
  const selectedPros = professionals.map((p) => p.id).filter((id) => !hiddenPros.includes(id))
  const [day, setDay] = useState(TODAY)
  const today = info.hours[weekdayOf(day)]
  // Dias passados mostram o histórico; hoje e dias futuros, os agendamentos marcados
  const appointments =
    day < TODAY
      ? HISTORY.appts
          .filter((a) => a.date === day)
          .map((a): Appointment => {
            const svc = HISTORY_SERVICES[a.serviceId]
            const [h, m] = a.time.split(':').map(Number)
            const end = h * 60 + m + (svc?.minutes ?? 60)
            return {
              id: a.id,
              contactId: a.contactId,
              professionalId: a.professionalId,
              service: svc?.name ?? 'Serviço',
              start: a.time,
              end: `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`,
              status: a.status === 'cancelado' ? 'faltou' : a.status,
              price: a.price,
              origin: a.origin,
              date: a.date
            }
          })
      : all.filter((a) => (a.date ?? TODAY) === day)

  // Atalho da busca rápida: /agenda?novo=1 abre a janela de agendamento
  useEffect(() => {
    if (params.get('novo') !== '1') return
    openNewAppointment()
    const n = new URLSearchParams(params)
    n.delete('novo')
    setParams(n, { replace: true })
  }, [params, setParams, openNewAppointment])

  const effectiveView = isMdUp ? view : 'lista'
  const pros = professionals.filter((p) => selectedPros.includes(p.id))
  const dayAppts = appointments.filter((a) => selectedPros.includes(a.professionalId))
  const revenue = dayAppts.filter((a) => a.status !== 'faltou').reduce((s, a) => s + a.price, 0)

  const togglePro = (id: string) =>
    setHiddenPros((h) => (h.includes(id) ? h.filter((x) => x !== id) : selectedPros.length > 1 ? [...h, id] : h))

  return (
    <div className="flex h-full flex-col">
      {/* Barra de ferramentas */}
      <div className="flex flex-col gap-3 border-b border-border bg-surface px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center">
            <Button variant="ghost" size="icon-sm" aria-label="Dia anterior" onClick={() => setDay((d) => addDays(d, -1))}>
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDay(TODAY)} disabled={day === TODAY}>Hoje</Button>
            <Button variant="ghost" size="icon-sm" aria-label="Próximo dia" onClick={() => setDay((d) => addDays(d, 1))}>
              <ChevronRight />
            </Button>
          </div>
          <div className="mr-auto">
            <p className="text-[15px] leading-tight font-semibold">
              {formatLongDate(day)}
              {day === TODAY && <span className="ml-2 text-xs font-medium text-primary">Hoje</span>}
            </p>
            <p className="text-xs text-muted">
              {dayAppts.length} agendamentos · {brl.format(revenue)} previstos
            </p>
          </div>
          <GoogleSyncButton />
          <Segmented
            className="hidden md:inline-flex"
            value={view}
            onChange={setView}
            options={[
              { value: 'dia', label: 'Dia' },
              { value: 'lista', label: 'Lista' }
            ]}
          />
          <Button onClick={() => openNewAppointment()}>
            <CalendarPlus /> <span className="hidden sm:inline">Novo agendamento</span>
          </Button>
        </div>

        {/* Filtro por profissional */}
        <div className="scroll-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
          {professionals.map((p) => {
            const on = selectedPros.includes(p.id)
            return (
              <button
                key={p.id}
                onClick={() => togglePro(p.id)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-[13px] font-medium transition-colors',
                  on ? 'border-border-strong bg-surface text-foreground' : 'border-transparent bg-surface-2 text-subtle'
                )}
              >
                <Avatar name={p.name} size={24} />
                {p.name.split(' ')[0]}
                <span className={cn('size-2 rounded-full', on ? p.dot : 'bg-subtle/50')} />
              </button>
            )
          })}
        </div>
      </div>

      {effectiveView === 'dia' ? (
        today.open ? (
          <DayGrid pros={pros} appointments={appointments} onOpen={setOpenAppt} hours={today} showNow={day === TODAY} />
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-center">
            <div>
              <p className="text-lg font-semibold">Fechado hoje</p>
              <p className="mt-1 text-sm text-muted">Ajuste os dias e horários em Configurações → Empresa.</p>
            </div>
          </div>
        )
      ) : (
        <ListView appts={dayAppts} onOpen={setOpenAppt} />
      )}

      <AppointmentDialog appt={openAppt} onClose={() => setOpenAppt(null)} />
    </div>
  )
}

function DayGrid({
  pros,
  appointments,
  onOpen,
  hours: day,
  showNow
}: {
  showNow: boolean
  pros: ProfessionalItem[]
  appointments: Appointment[]
  onOpen: (a: Appointment) => void
  hours: { start: string; end: string; lunchStart?: string; lunchEnd?: string }
}) {
  // A grade segue o horário de funcionamento do dia (Configurações → Empresa)
  const START_H = Math.floor(toMinutes(day.start) / 60)
  const END_H = Math.ceil(toMinutes(day.end) / 60)
  const hours = Array.from({ length: Math.max(1, END_H - START_H) }, (_, i) => START_H + i)
  const nowMin = 11 * 60 + 20 // hora "atual" da demonstração
  const nowTop = ((nowMin - START_H * 60) / 60) * HOUR_PX
  const lunch = day.lunchStart && day.lunchEnd ? [toMinutes(day.lunchStart), toMinutes(day.lunchEnd)] : null

  return (
    <div className="scroll-thin flex-1 overflow-auto">
      <div className="min-w-fit">
        {/* Cabeçalho das colunas */}
        <div className="sticky top-0 z-20 flex border-b border-border bg-surface/95 backdrop-blur">
          <div className="w-16 shrink-0" />
          {pros.map((p) => {
            const count = appointments.filter((a) => a.professionalId === p.id).length
            return (
              <div key={p.id} className="flex min-w-[220px] flex-1 items-center gap-2.5 border-l border-border px-3 py-2.5">
                <Avatar name={p.name} size={34} presence="online" />
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold">{p.name}</p>
                  <p className="truncate text-[11.5px] text-muted">{count} horários · {p.specialty}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="relative flex pt-3">
          {/* Horas */}
          <div className="w-16 shrink-0">
            {hours.map((h) => (
              <div key={h} className="relative text-right" style={{ height: HOUR_PX }}>
                <span className="absolute -top-2 right-2.5 text-[11px] font-medium text-subtle">{String(h).padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>

          {pros.map((p) => (
            <div key={p.id} className="relative min-w-[220px] flex-1 border-l border-border">
              {hours.map((h) => (
                <div key={h} className="border-b border-border/70" style={{ height: HOUR_PX }}>
                  <div className="h-1/2 border-b border-dashed border-border/50" />
                </div>
              ))}
              {/* Intervalo de almoço */}
              {lunch && (
                <div
                  className="absolute inset-x-0 flex items-center justify-center bg-[repeating-linear-gradient(135deg,var(--surface-2)_0_6px,transparent_6px_12px)] text-[11px] font-medium text-subtle"
                  style={{ top: ((lunch[0] - START_H * 60) / 60) * HOUR_PX, height: ((lunch[1] - lunch[0]) / 60) * HOUR_PX }}
                >
                  Almoço
                </div>
              )}
              {appointments
                .filter((a) => a.professionalId === p.id)
                .map((a) => {
                  const top = ((toMin(a.start) - START_H * 60) / 60) * HOUR_PX
                  const height = Math.max(34, ((toMin(a.end) - toMin(a.start)) / 60) * HOUR_PX - 4)
                  const c = contactById(a.contactId)
                  const OriginIcon = originIcon[a.origin]
                  return (
                    <button
                      key={a.id}
                      onClick={() => onOpen(a)}
                      className={cn(
                        'absolute inset-x-1.5 overflow-hidden rounded-lg border-l-[3px] px-2.5 py-1.5 text-left shadow-sm transition-transform hover:z-10 hover:scale-[1.01] hover:shadow-md',
                        p.color,
                        a.status === 'faltou' && 'opacity-55 line-through decoration-1',
                        a.status === 'concluido' && 'opacity-70'
                      )}
                      style={{ top: top + 2, height }}
                    >
                      <div className="flex items-center gap-1.5">
                        <p className="flex-1 truncate text-[12.5px] font-semibold text-foreground">{c.name}</p>
                        <OriginIcon className="size-3.5 shrink-0 opacity-70" />
                      </div>
                      {height > 44 && (
                        <p className="truncate text-[11.5px]">
                          {a.service} · {a.start}–{a.end}
                        </p>
                      )}
                      {height > 70 && (
                        <Badge tone={statusMeta[a.status].tone} className="mt-1.5">
                          {statusMeta[a.status].label}
                        </Badge>
                      )}
                    </button>
                  )
                })}
            </div>
          ))}

          {/* Linha "agora" */}
          {showNow && <div className="pointer-events-none absolute right-0 left-14 z-10 flex items-center" style={{ top: nowTop + 12 }}>
            <span className="size-2.5 rounded-full bg-danger" />
            <span className="h-0.5 flex-1 bg-danger" />
          </div>}
        </div>
      </div>
    </div>
  )
}

function ListView({ appts, onOpen }: { appts: Appointment[]; onOpen: (a: Appointment) => void }) {
  const { professionalById } = useCompany()
  const sorted = [...appts].sort((a, b) => toMin(a.start) - toMin(b.start))
  return (
    <div className="scroll-thin flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 p-4 md:p-6">
        {sorted.map((a) => {
          const c = contactById(a.contactId)
          const p = professionalById(a.professionalId)
          const OriginIcon = originIcon[a.origin]
          return (
            <button
              key={a.id}
              onClick={() => onOpen(a)}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left shadow-(--shadow-soft) transition-colors hover:border-border-strong"
            >
              <div className="w-14 shrink-0 text-center">
                <p className="text-[15px] font-bold tabular-nums">{a.start}</p>
                <p className="text-[11px] text-muted tabular-nums">{a.end}</p>
              </div>
              <span className={cn('w-1 self-stretch rounded-full', p?.dot ?? 'bg-subtle')} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold">{c.name}</p>
                <p className="truncate text-[12.5px] text-muted">
                  {a.service} · {p?.name ?? 'Profissional removido'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge tone={statusMeta[a.status].tone}>{statusMeta[a.status].label}</Badge>
                <OriginIcon className="size-3.5 text-subtle" />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}


function AppointmentDialog({ appt, onClose }: { appt: Appointment | null; onClose: () => void }) {
  const { professionalById } = useCompany()
  const { setAppointmentStatus, openNewAppointment } = useAppState()
  if (!appt) return null
  const act = (status: Appointment['status'] | 'cancelado', msg: string) => () => {
    setAppointmentStatus(appt.id, status)
    onClose()
    toast.success(msg)
  }
  const c = contactById(appt.contactId)
  const p = professionalById(appt.professionalId)!
  const OriginIcon = originIcon[appt.origin]
  return (
    <Dialog
      open={Boolean(appt)}
      onOpenChange={(v) => !v && onClose()}
      title={appt.service}
      footer={
        <>
          <Button variant="outline" className="text-danger" onClick={act('cancelado', 'Horário cancelado e cliente avisado')}>Cancelar horário</Button>
          <Button
            variant="outline"
            onClick={() => {
              setAppointmentStatus(appt.id, 'cancelado')
              onClose()
              openNewAppointment(appt.contactId)
            }}
          >
            Remarcar
          </Button>
          {appt.status !== 'concluido' && (
            <Button variant="success" onClick={act('concluido', 'Atendimento concluído')}>Concluir atendimento</Button>
          )}
        </>
      }
    >
      <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
        <Avatar name={c.name} size={44} />
        <div className="flex-1">
          <p className="font-semibold">{c.name}</p>
          <p className="text-[13px] text-muted">{c.visits} visitas · cliente desde {c.since}</p>
        </div>
        <Badge tone={statusMeta[appt.status].tone} size="md">{statusMeta[appt.status].label}</Badge>
      </div>
      <div className="mt-4 grid gap-3 text-[13.5px] sm:grid-cols-2">
        <Info icon={<Clock />} label="Horário" value={`Hoje, ${appt.start} – ${appt.end}`} />
        <Info icon={<UserRound />} label="Profissional" value={p.name} />
        <Info icon={<OriginIcon />} label="Origem" value={originLabel[appt.origin]} />
        <Info icon={<GoogleIcon />} label="Google Agenda" value="Sincronizado" />
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl border border-border p-3">
        <span className="text-[13px] text-muted">Valor</span>
        <span className="text-lg font-bold">{brl.format(appt.price)}</span>
      </div>
    </Dialog>
  )
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:text-subtle">
      {icon}
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
}
