import { useMemo, useState, type ReactNode } from 'react'
import { CalendarCheck, CheckCheck, Clock, MessagesSquare } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Card, CardHeader, Progress, Segmented } from '@/components/ui/misc'
import { useAppState } from '@/lib/app-state'
import { avgFirstResponse, fmtSec, inRange, lastDays, useRecords } from '@/lib/metrics'

type Period = 'hoje' | 'semana' | 'mes'
const DAYS: Record<Period, number> = { hoje: 1, semana: 7, mes: 30 }

/** Painel do analista: só os números dele, sem dados da equipe. */
export function MyPerformancePage() {
  const { me } = useAppState()
  const [period, setPeriod] = useState<Period>('semana')
  const { chats } = useRecords()

  const d = useMemo(() => {
    const { cur } = lastDays(DAYS[period])
    const mine = chats.filter((c) => c.handledBy === me.id && inRange(c.date, cur))
    const booked = mine.filter((c) => c.booked).length
    const resolved = mine.filter((c) => c.resolved).length
    return {
      chats: mine.length,
      frt: avgFirstResponse(mine),
      booked,
      resolved,
      conversion: mine.length ? Math.round((booked / mine.length) * 100) : 0,
      resolvedPct: mine.length ? Math.round((resolved / mine.length) * 100) : 0
    }
  }, [chats, me.id, period])

  return (
    <Page
      title="Meu desempenho"
      description={`Olá, ${me.name.split(' ')[0]}! Estes são os seus números de atendimento.`}
      actions={
        <Segmented
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'hoje', label: 'Hoje' },
            { value: 'semana', label: 'Semana' },
            { value: 'mes', label: 'Mês' }
          ]}
        />
      }
    >
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat icon={<MessagesSquare />} label="Conversas atendidas" value={d.chats.toLocaleString('pt-BR')} />
        <Stat icon={<Clock />} label="Tempo da 1ª resposta" value={fmtSec(d.frt)} />
        <Stat icon={<CalendarCheck />} label="Viraram agendamento" value={d.booked.toLocaleString('pt-BR')} />
        <Stat icon={<CheckCheck />} label="Resolvidas" value={d.chats ? `${d.resolvedPct}%` : '—'} />
      </div>

      <Card className="mt-4">
        <CardHeader title="Conversão em agendamento" description="Das conversas que você atendeu, quantas terminaram com horário marcado" />
        <div className="px-5 pb-5">
          <div className="flex items-center justify-between text-[13.5px]">
            <span className="text-muted">{d.chats ? `${d.conversion}% das conversas` : 'Nenhuma conversa no período'}</span>
            <span className="font-semibold">
              {d.booked} {d.booked === 1 ? 'agendamento' : 'agendamentos'}
            </span>
          </div>
          <Progress value={d.conversion} className="mt-2 h-2" tone={d.conversion >= 40 ? 'success' : 'primary'} />
        </div>
      </Card>
    </Page>
  )
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-[12.5px] font-medium text-muted [&_svg]:size-4">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
    </Card>
  )
}
