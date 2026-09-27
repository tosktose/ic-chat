import { useState, type ReactNode } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownRight, ArrowUpRight, Bot, CalendarCheck, Clock, Download, MessagesSquare, UserX } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Avatar, Card, CardHeader, Progress, Segmented } from '@/components/ui/misc'
import { useAppState } from '@/lib/app-state'
import { brl, cn } from '@/lib/utils'
import { professionals, users } from '@/data/mock'
import { DASHBOARD_DATA as DATA, type Period } from '@/data/dashboard'
import { ExportReportDialog } from './ExportReportDialog'

export function DashboardPage() {
  const { resolveUser } = useAppState()
  const [period, setPeriod] = useState<Period>('semana')
  const [exportOpen, setExportOpen] = useState(false)
  const d = DATA[period]
  const proRows = professionals
    .map((p, i) => ({ ...p, clients: d.pros[i], revenue: d.revenue[i] }))
    .sort((a, b) => b.clients - a.clients)
  const maxClients = Math.max(...proRows.map((p) => p.clients))
  const totalRevenue = d.revenue.reduce((a, b) => a + b, 0)

  return (
    <Page
      wide
      title="Painel do gerente"
      description="Quem está atendendo agora e como a equipe está performando."
      actions={
        <>
          <Segmented
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'semana', label: 'Semana' },
              { value: 'quinzena', label: 'Quinzena' },
              { value: 'mes', label: 'Mês' }
            ]}
          />
          <Button variant="outline" size="md" onClick={() => setExportOpen(true)} tooltip="Relatório em PDF">
            <Download /> <span className="hidden sm:inline">Exportar PDF</span>
          </Button>
        </>
      }
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi icon={<MessagesSquare />} label="Conversas" value={String(d.kpis.conv)} delta={d.kpis.convDelta} />
        <Kpi icon={<Clock />} label="Tempo da 1ª resposta" value={d.kpis.frt} delta={d.kpis.frtDelta} lowerIsBetter />
        <Kpi icon={<CalendarCheck />} label="Atendimentos concluídos" value={String(d.kpis.done)} delta={d.kpis.doneDelta} />
        <Kpi icon={<UserX />} label="Taxa de faltas" value={`${d.kpis.noShow.toLocaleString('pt-BR')}%`} delta={d.kpis.noShowDelta} lowerIsBetter />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        {/* Conversas por dia */}
        <Card className="xl:col-span-2">
          <CardHeader title="Conversas por dia" description="Todas as conversas recebidas, em todos os canais" />
          <div className="h-64 px-2 pb-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.daily} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="convFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="var(--chart-1)" stopOpacity={0.22} />
                    <stop offset="1" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
                <XAxis dataKey="d" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} width={40} />
                <Tooltip content={<ChartTip unit="conversas" />} cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="v" stroke="var(--chart-1)" strokeWidth={2} fill="url(#convFill)" activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Agora */}
        <Card>
          <CardHeader
            title="Atendendo agora"
            description="Equipe e IA em tempo real"
            action={
              <span className="flex items-center gap-1.5 text-xs font-medium text-success">
                <span className="size-2 animate-pulse rounded-full bg-success" /> ao vivo
              </span>
            }
          />
          <div className="flex flex-col gap-1 px-3 pb-4">
            <div className="flex items-center gap-3 rounded-xl bg-violet-500/8 px-2.5 py-2">
              <span className="flex size-9 items-center justify-center rounded-full bg-violet-500 text-white">
                <Bot className="size-5" />
              </span>
              <div className="flex-1">
                <p className="text-[13.5px] font-semibold">Assistente IA</p>
                <p className="text-xs text-muted">Respondendo 3 conversas</p>
              </div>
              <span className="text-lg font-bold">3</span>
            </div>
            {users
              .map(resolveUser)
              .filter((u) => u.role === 'analista')
              .map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-surface-2">
                  <Avatar name={u.name} size={36} presence={u.presence} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">{u.name}</p>
                    <p className="text-xs text-muted">
                      {u.presence === 'online' ? 'Disponível' : u.presence === 'away' ? 'Ausente' : 'Offline'}
                    </p>
                  </div>
                  <span className={cn('text-lg font-bold', u.activeChats === 0 && 'text-subtle')}>{u.activeChats}</span>
                </div>
              ))}
            <p className="mt-2 px-2.5 text-xs text-muted">
              <b className="text-warning">2 conversas</b> na fila esperando há mais de 5 min
            </p>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-5">
        {/* Clientes por profissional */}
        <Card className="xl:col-span-2">
          <CardHeader title="Clientes atendidos por profissional" description={`Agendamentos concluídos · ${period === 'mes' ? 'mês' : period}`} />
          <div className="h-64 px-2 pb-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={proRows} layout="vertical" margin={{ top: 0, right: 28, left: 8, bottom: 0 }} barCategoryGap={10}>
                <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 4" />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={96} tick={{ fill: 'var(--foreground)', fontSize: 12 }} tickFormatter={(n: string) => n.split(' ')[0]} />
                <Tooltip content={<ChartTip unit="clientes" nameKey="name" />} cursor={{ fill: 'var(--surface-2)' }} />
                <Bar dataKey="clients" fill="var(--chart-1)" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: 'var(--muted)', fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Ranking */}
        <Card className="overflow-hidden xl:col-span-3">
          <CardHeader title="Produção da equipe" description={`Faturamento total: ${brl.format(totalRevenue)}`} />
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[520px] text-[13px]">
              <thead>
                <tr className="border-y border-border bg-surface-2/60 text-left text-[11px] font-semibold tracking-wider text-subtle uppercase">
                  <th className="px-5 py-2.5">Profissional</th>
                  <th className="px-3 py-2.5">Clientes</th>
                  <th className="px-3 py-2.5 text-right">Faturamento</th>
                  <th className="px-5 py-2.5 text-right">Ticket médio</th>
                </tr>
              </thead>
              <tbody>
                {proRows.map((p, i) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-4 text-center text-xs font-bold text-subtle">{i + 1}</span>
                        <Avatar name={p.name} size={32} />
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-muted">{p.specialty}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 font-semibold tabular-nums">{p.clients}</span>
                        <Progress value={(p.clients / maxClients) * 100} className="w-24" />
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-medium tabular-nums">{brl.format(p.revenue)}</td>
                    <td className="px-5 py-3 text-right text-muted tabular-nums">{brl.format(p.revenue / p.clients)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Origem dos agendamentos */}
      <Card className="mt-4">
        <CardHeader title="De onde vêm os agendamentos" description="Quanto a IA está agendando sozinha" />
        <div className="px-5 pb-5">
          <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
            <span className="h-full bg-chart-1" style={{ width: '46%' }} />
            <span className="h-full bg-chart-2" style={{ width: '38%' }} />
            <span className="h-full bg-chart-3" style={{ width: '16%' }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
            {[
              ['bg-chart-1', 'Assistente IA', '46%'],
              ['bg-chart-2', 'Equipe (manual)', '38%'],
              ['bg-chart-3', 'Link de agendamento', '16%']
            ].map(([c, l, v]) => (
              <span key={l} className="flex items-center gap-2">
                <span className={cn('size-2.5 rounded-sm', c)} /> {l} <b className="font-semibold">{v}</b>
              </span>
            ))}
          </div>
        </div>
      </Card>
      <ExportReportDialog open={exportOpen} onOpenChange={setExportOpen} initialPeriod={period} />
    </Page>
  )
}

function Kpi({ icon, label, value, delta, lowerIsBetter }: { icon: ReactNode; label: string; value: string; delta: number; lowerIsBetter?: boolean }) {
  const good = lowerIsBetter ? delta < 0 : delta > 0
  const Arrow = delta > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-[12.5px] font-medium text-muted [&_svg]:size-4">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums md:text-[28px]">{value}</p>
      <p className={cn('mt-1 flex items-center gap-0.5 text-xs font-semibold', good ? 'text-success' : 'text-danger')}>
        <Arrow className="size-3.5" />
        {Math.abs(delta).toLocaleString('pt-BR')}
        {Number.isInteger(delta) ? '%' : ' p.p.'}
        <span className="ml-1 hidden font-normal text-muted sm:inline">vs período anterior</span>
      </p>
    </Card>
  )
}

interface TipProps {
  active?: boolean
  payload?: { value: number; payload: Record<string, unknown> }[]
  label?: string
  unit: string
  nameKey?: string
}

function ChartTip({ active, payload, label, unit, nameKey }: TipProps) {
  if (!active || !payload?.length) return null
  const title = nameKey ? String(payload[0].payload[nameKey]) : label
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-(--shadow-pop)">
      <p className="font-semibold">{title}</p>
      <p className="mt-0.5 text-muted">
        <b className="text-foreground tabular-nums">{payload[0].value}</b> {unit}
      </p>
    </div>
  )
}
