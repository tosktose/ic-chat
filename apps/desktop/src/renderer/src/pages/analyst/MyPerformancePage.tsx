import { useState, type ReactNode } from 'react'
import { CalendarCheck, Clock, MessagesSquare, Star } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { DemoDataNotice } from '@/components/DemoDataNotice'
import { Card, CardHeader, Progress, Segmented } from '@/components/ui/misc'
import { useAppState } from '@/lib/app-state'

type Period = 'hoje' | 'semana' | 'mes'

const DATA: Record<Period, { chats: number; frt: string; booked: number; rating: string; goal: number }> = {
  hoje: { chats: 14, frt: '1m 48s', booked: 5, rating: '4,9', goal: 70 },
  semana: { chats: 86, frt: '2m 05s', booked: 27, rating: '4,8', goal: 62 },
  mes: { chats: 341, frt: '2m 12s', booked: 104, rating: '4,8', goal: 81 }
}

/** Painel do analista: só os números dele, sem dados da equipe. */
export function MyPerformancePage() {
  const { me } = useAppState()
  const [period, setPeriod] = useState<Period>('semana')
  const d = DATA[period]

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
      <DemoDataNotice />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat icon={<MessagesSquare />} label="Conversas atendidas" value={String(d.chats)} />
        <Stat icon={<Clock />} label="Tempo da 1ª resposta" value={d.frt} />
        <Stat icon={<CalendarCheck />} label="Horários agendados" value={String(d.booked)} />
        <Stat icon={<Star />} label="Avaliação dos clientes" value={d.rating} />
      </div>

      <Card className="mt-4">
        <CardHeader title="Meta de agendamentos" description="Definida pelo gerente" />
        <div className="px-5 pb-5">
          <div className="flex items-center justify-between text-[13.5px]">
            <span className="text-muted">{d.goal}% da meta</span>
            <span className="font-semibold">{d.booked} agendamentos</span>
          </div>
          <Progress value={d.goal} className="mt-2 h-2" tone={d.goal >= 80 ? 'success' : 'primary'} />
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
