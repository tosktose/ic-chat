import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { BellRing, Check, CheckCheck, MessageCircle, RotateCcw, Settings2, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Badge, Card, CardHeader, EmptyState } from '@/components/ui/misc'
import { useAppState } from '@/lib/app-state'
import { formatLongDate, useCompany } from '@/lib/company'
import { useData } from '@/lib/data'
import { todayISO, useSendToContact } from '@/lib/outbox'
import { confirmationStats, dueReminders, reminderText, startOf, type DueReminder } from '@/lib/reminders'
import { reminderLabel } from '@/pages/agenda/AgendaPage'
import type { Appointment } from '@/data/mock'

/** Lembretes de horário: fila para enviar agora, próximos horários e quem confirmou */
export function RemindersPage() {
  const { appointments, appointmentLog, updateAppointment } = useAppState()
  const { automations, info, professionalById } = useCompany()
  const { contacts } = useData()
  const { connected, send } = useSendToContact()
  const navigate = useNavigate()
  const settings = automations.reminders
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])
  const today = todayISO(now)
  const contactOf = (id: string) => contacts.find((c) => c.id === id)

  const due = useMemo(() => dueReminders(appointments, settings, now, today), [appointments, settings, now, today])
  const upcoming = useMemo(() => {
    const limit = now.getTime() + 7 * 86_400_000
    return appointments
      .filter((a) => (a.status === 'agendado' || a.status === 'confirmado') && a.contactId)
      .map((a) => ({ a, at: startOf(a, today).getTime() }))
      .filter((x) => x.at > now.getTime() && x.at <= limit)
      .sort((x, y) => x.at - y.at)
  }, [appointments, now, today])
  const stats = useMemo(() => confirmationStats(appointmentLog), [appointmentLog])
  const auto = connected && settings.autoSend

  const textFor = (r: DueReminder) => {
    const c = contactOf(r.appointment.contactId)
    return reminderText(r, settings, { clientName: c?.name ?? '', professional: professionalById(r.appointment.professionalId)?.name, company: info.name, now })
  }
  const markSent = (r: DueReminder) => updateAppointment(r.appointment.id, { reminders: { ...r.appointment.reminders, [r.kind]: Date.now() } })
  const sendOne = async (r: DueReminder) => {
    try {
      const how = await send(r.appointment.contactId, textFor(r))
      markSent(r)
      toast.success(how === 'app' ? 'Lembrete enviado' : 'WhatsApp aberto com o lembrete')
    } catch (e) {
      toast.error('Não foi possível enviar', { description: (e as Error).message })
    }
  }

  const dayOf = (a: Appointment) => (a.date && a.date !== today ? formatLongDate(a.date) : 'Hoje')

  return (
    <Page
      title="Lembretes e confirmações"
      description="O cliente recebe o lembrete no WhatsApp e responde 1 para confirmar ou 2 para remarcar."
      actions={<Button variant="outline" size="sm" onClick={() => navigate('/config?tab=automacoes')}><Settings2 /> Ajustar mensagens</Button>}
    >
      {!settings.enabled ? (
        <Card className="p-6">
          <EmptyState
            icon={<BellRing />}
            title="Lembretes desligados"
            description="Ligue os lembretes para reduzir as faltas. O cliente recebe a mensagem 24h e 2h antes do horário."
            action={<Button onClick={() => navigate('/config?tab=automacoes')}>Ligar lembretes</Button>}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          <div className={auto ? 'flex items-center gap-3 rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-[13.5px] text-success' : 'flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 text-[13.5px] text-muted'}>
            <Zap className="size-4 shrink-0" />
            <p className="flex-1">
              {auto
                ? 'Envio automático ligado: os lembretes saem sozinhos pelo WhatsApp conectado neste computador.'
                : connected
                  ? 'WhatsApp conectado. O envio automático está desligado: use o botão Enviar de cada cliente.'
                  : 'Envio com um clique: ao clicar em Enviar, o WhatsApp abre com a mensagem pronta. No app instalado com o WhatsApp conectado, os lembretes saem sozinhos.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Lembretes enviados" value={stats.reminded} />
            <Stat label="Confirmaram" value={stats.confirmed} tone="text-success" />
            <Stat label="Pediram para remarcar" value={stats.rescheduled} tone="text-warning" />
            <Stat label="Taxa de resposta" value={`${stats.replyRate}%`} />
          </div>

          <Card className="overflow-hidden">
            <CardHeader title="Para enviar agora" description={due.length ? `${due.length} lembrete${due.length > 1 ? 's' : ''} no horário de sair` : 'Nenhum lembrete pendente agora'} />
            {due.length > 0 && (
              <ul className="divide-y divide-border border-t border-border" data-testid="due-list">
                {due.map((r) => {
                  const c = contactOf(r.appointment.contactId)
                  return (
                    <li key={`${r.appointment.id}-${r.kind}`} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{c?.name ?? 'Cliente'}</p>
                        <p className="truncate text-[13px] text-muted">{r.appointment.service} · {dayOf(r.appointment)} às {r.appointment.start}</p>
                      </div>
                      <Badge tone="primary">{r.kind === '24h' ? 'Lembrete 24h' : 'Lembrete 2h'}</Badge>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => { markSent(r); toast.success('Marcado como enviado') }} aria-label="Marcar como enviado"><Check /></Button>
                        <Button size="sm" disabled={!c?.phone} onClick={() => void sendOne(r)}><MessageCircle /> Enviar</Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="Próximos 7 dias" description="Situação do lembrete e da resposta de cada cliente" />
            {upcoming.length === 0 ? (
              <p className="border-t border-border px-5 py-6 text-center text-sm text-muted">Nenhum horário marcado nos próximos 7 dias.</p>
            ) : (
              <ul className="divide-y divide-border border-t border-border">
                {upcoming.map(({ a }) => {
                  const c = contactOf(a.contactId)
                  const r = reminderLabel(a)
                  return (
                    <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <div className="w-24 shrink-0 text-[13px]">
                        <p className="font-semibold tabular-nums">{a.start}</p>
                        <p className="truncate text-muted">{dayOf(a)}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{c?.name ?? 'Cliente'}</p>
                        <p className="truncate text-[13px] text-muted">{a.service}{professionalById(a.professionalId) ? ` · ${professionalById(a.professionalId)!.name}` : ''}</p>
                      </div>
                      <Badge tone={r.tone}>{r.text}</Badge>
                      {a.reply !== 'confirmar' && (
                        <Button size="sm" variant="ghost" onClick={() => { updateAppointment(a.id, { reply: 'confirmar', status: 'confirmado' }); toast.success('Horário confirmado') }}><CheckCheck /> Confirmou</Button>
                      )}
                      {a.reply === 'remarcar' && (
                        <Button size="sm" variant="ghost" onClick={() => navigate('/agenda')}><RotateCcw /> Remarcar</Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>
      )}
    </Page>
  )
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tone ?? ''}`}>{value}</p>
    </Card>
  )
}
