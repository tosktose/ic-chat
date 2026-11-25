import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { BellRing, Copy, Lightbulb, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/misc'
import { useAppState } from '@/lib/app-state'
import { useCompany } from '@/lib/company'
import { useData } from '@/lib/data'
import { todayISO, waLink } from '@/lib/outbox'
import { confirmationStats } from '@/lib/reminders'
import { summaryText, weeklySummary } from '@/lib/weekly'
import { winbackQueue } from '@/lib/winback'
import { brl } from '@/lib/utils'

const dm = (iso: string) => iso.split('-').reverse().slice(0, 2).join('/')

/** Resumo da semana fechada com 3 sugestões; dá para mandar no WhatsApp do dono */
export function WeeklySummaryCard() {
  const { appointmentLog, myPhone } = useAppState()
  const { contacts } = useData()
  const { automations, info } = useCompany()
  const navigate = useNavigate()
  const today = todayISO()
  const summary = useMemo(() => {
    const lapsed = winbackQueue(contacts, appointmentLog, automations.winback, { today, company: info.name }).length
    return weeklySummary(appointmentLog, contacts, today, lapsed)
  }, [appointmentLog, contacts, automations.winback, today, info.name])
  const reminders = useMemo(() => confirmationStats(appointmentLog), [appointmentLog])
  const text = summaryText(summary, info.name)
  const ownerPhone = myPhone || info.phone
  const c = summary.current

  const copy = () => void navigator.clipboard.writeText(text).then(() => toast.success('Resumo copiado'), () => toast.error('Não foi possível copiar'))

  return (
    <Card className="mt-4" data-testid="weekly-summary">
      <CardHeader
        title="Resumo da semana"
        description={`${dm(summary.from)} a ${dm(summary.to)}, comparado com a semana anterior`}
        action={
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" onClick={copy} aria-label="Copiar resumo"><Copy /></Button>
            <Button
              size="sm"
              disabled={!ownerPhone}
              tooltip={ownerPhone ? 'Abre o WhatsApp com o resumo' : 'Cadastre seu celular em Meu perfil'}
              onClick={() => window.open(waLink(ownerPhone!, text), '_blank', 'noopener')}
            >
              <MessageCircle /> <span className="hidden sm:inline">Mandar no meu WhatsApp</span>
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 px-5 pb-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Mini label="Atendimentos" value={c.done} prev={summary.previous.done} />
          <Mini label="Faturamento" value={brl.format(c.revenue)} />
          <Mini label="Clientes novos" value={c.newClients} prev={summary.previous.newClients} />
          <Mini label="Faltas" value={`${c.noShow} (${summary.noShowRate}%)`} />
          <Mini label="Cancelados" value={c.canceled} />
          <Mini label="Confirmados no lembrete" value={c.confirmed} />
        </div>
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold"><Lightbulb className="size-4 text-warning" /> 3 sugestões para esta semana</p>
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-[13.5px] text-muted">
            {summary.tips.map((t) => <li key={t}>{t}</li>)}
          </ol>
          {reminders.reminded > 0 && (
            <button onClick={() => navigate('/lembretes')} className="mt-1 flex items-center gap-2 self-start rounded-lg bg-success-soft px-3 py-1.5 text-[12.5px] font-medium text-success">
              <BellRing className="size-3.5" /> {reminders.confirmed} confirmaram pelo lembrete · {reminders.replyRate}% responderam
            </button>
          )}
        </div>
      </div>
    </Card>
  )
}

function Mini({ label, value, prev }: { label: string; value: number | string; prev?: number }) {
  const diff = typeof value === 'number' && prev !== undefined ? value - prev : null
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="text-[11.5px] text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums">{value}</p>
      {diff !== null && diff !== 0 && <p className={diff > 0 ? 'text-[11.5px] text-success' : 'text-[11.5px] text-danger'}>{diff > 0 ? `+${diff}` : diff} vs anterior</p>}
    </div>
  )
}
