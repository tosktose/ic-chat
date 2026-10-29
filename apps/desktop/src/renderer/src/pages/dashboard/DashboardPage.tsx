import { useMemo, useState, type ReactNode } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownRight, ArrowUpRight, Bot, CalendarCheck, Clock, Download, MessagesSquare, UserX } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Avatar, Card, CardHeader, Progress, Segmented } from '@/components/ui/misc'
import { useAppState } from '@/lib/app-state'
import { brl, cn } from '@/lib/utils'
import { useTeam } from '@/lib/team'
import { useCompany } from '@/lib/company'
import { useData } from '@/lib/data'
import { avgFirstResponse, daysOf, deltaPct, fmtSec, inRange, lastDays, useRecords } from '@/lib/metrics'
import { useNavigate } from 'react-router'

type Period = 'semana' | 'quinzena' | 'mes'
const DAYS: Record<Period, number> = { semana: 7, quinzena: 15, mes: 30 }
const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function DashboardPage() {
  const { resolveUser } = useAppState()
  const users = useTeam()
  const { professionals } = useCompany()
  const [period, setPeriod] = useState<Period>('semana')
  const navigate = useNavigate()
  const { appts, chats } = useRecords()
  const { conversations, deals } = useData()

  // Indicadores do período e comparação com o período anterior de mesmo tamanho
  const d = useMemo(() => {
    const { cur, prev } = lastDays(DAYS[period])
    const cChats = chats.filter((c) => inRange(c.date, cur))
    const pChats = chats.filter((c) => inRange(c.date, prev))
    const cAppts = appts.filter((a) => inRange(a.date, cur))
    const pAppts = appts.filter((a) => inRange(a.date, prev))
    const done = (l: typeof appts) => l.filter((a) => a.status === 'concluido')
    const noShow = (l: typeof appts) => {
      const base = l.filter((a) => a.status === 'concluido' || a.status === 'faltou').length
      return base ? (l.filter((a) => a.status === 'faltou').length / base) * 100 : null
    }
    const frt = avgFirstResponse(cChats)
    const pFrt = avgFirstResponse(pChats)
    const ns = noShow(cAppts)
    const pNs = noShow(pAppts)
    const booked = cAppts.filter((a) => a.status !== 'cancelado')
    const origin = (o: string) => booked.filter((a) => a.origin === o).length
    return {
      conv: cChats.length,
      convDelta: deltaPct(cChats.length, pChats.length),
      frt,
      frtDelta: frt !== null && pFrt !== null ? deltaPct(frt, pFrt) : null,
      done: done(cAppts).length,
      doneDelta: deltaPct(done(cAppts).length, done(pAppts).length),
      noShow: ns,
      noShowDelta: ns !== null && pNs !== null ? Math.round((ns - pNs) * 10) / 10 : null,
      daily: daysOf(cur).map((day) => ({
        d: period === 'semana' ? WD[new Date(day + 'T12:00').getDay()] : day.slice(8, 10) + '/' + day.slice(5, 7),
        v: cChats.filter((c) => c.date === day).length
      })),
      doneList: done(cAppts),
      originTotal: booked.length,
      origins: [origin('ia'), origin('manual'), origin('link')]
    }
  }, [appts, chats, period])

  const proRows = professionals
    .filter((p) => p.active)
    .map((p) => {
      const mine = d.doneList.filter((a) => a.professionalId === p.id)
      return { ...p, clients: mine.length, revenue: mine.reduce((s, a) => s + a.price, 0) }
    })
    .sort((a, b) => b.clients - a.clients || b.revenue - a.revenue)
  const maxClients = Math.max(1, ...proRows.map((p) => p.clients))
  const totalRevenue = proRows.reduce((s, p) => s + p.revenue, 0)

  // Agora: conversas abertas por responsável e fila
  const open = conversations.filter((c) => c.status !== 'resolvida')
  const aiNow = open.filter((c) => c.status === 'ia').length
  const queue = open.filter((c) => !c.assignee && c.status !== 'ia')
  const waitingLong = queue.filter((c) => {
    const lastIn = [...c.messages].reverse().find((m) => m.from === 'contact')
    return lastIn?.at ? Date.now() - lastIn.at > 5 * 60_000 : false
  }).length
  const pct = (n: number) => (d.originTotal ? `${Math.round((n / d.originTotal) * 100)}%` : '0%')

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
          <Button variant="outline" size="md" onClick={() => navigate('/relatorios')} tooltip="Relatórios com filtros, em PDF ou Excel">
            <Download /> <span className="hidden sm:inline">Relatórios</span>
          </Button>
        </>
      }
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi icon={<MessagesSquare />} label="Conversas" value={d.conv.toLocaleString('pt-BR')} delta={d.convDelta} tip="Atendimentos no chat. Um novo começa quando o cliente escreve depois de 8h sem conversa." />
        <Kpi icon={<Clock />} label="Tempo da 1ª resposta" value={fmtSec(d.frt)} delta={d.frtDelta} lowerIsBetter tip="Da primeira mensagem do cliente até a primeira resposta (equipe ou IA)." />
        <Kpi icon={<CalendarCheck />} label="Atendimentos concluídos" value={d.done.toLocaleString('pt-BR')} delta={d.doneDelta} tip="Horários da agenda já realizados (os que passaram sem falta marcada contam como realizados)." />
        <Kpi
          icon={<UserX />}
          label="Taxa de faltas"
          value={d.noShow === null ? '—' : `${(Math.round(d.noShow * 10) / 10).toLocaleString('pt-BR')}%`}
          delta={d.noShowDelta}
          points
          lowerIsBetter
          tip="Faltas sobre os horários que já passaram."
        />
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Pipeline comercial e origem dos leads"
          description="Negócios cadastrados no funil. A origem desconhecida fica visível para orientar a coleta de dados."
          action={<Button variant="outline" size="sm" onClick={() => navigate('/funil')}>Abrir funil</Button>}
        />
        <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl bg-primary-soft/50 p-4">
            <p className="text-xs font-medium text-muted">Valor em aberto</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{brl.format(deals.filter((deal) => deal.etapa !== 'ganho' && deal.etapa !== 'perdido').reduce((sum, deal) => sum + deal.valor, 0))}</p>
            <p className="mt-1 text-xs text-muted">{deals.filter((deal) => deal.etapa !== 'ganho' && deal.etapa !== 'perdido').length} oportunidades ativas</p>
          </div>
          {(['WhatsApp', 'Instagram', 'Indicação', 'Site', 'Desconhecida'] as const).map((origin) => {
            const count = deals.filter((deal) => deal.origem === origin).length
            return <div key={origin} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <span className="text-sm">{origin === 'Desconhecida' ? 'Origem desconhecida' : origin}</span>
              <span className="text-lg font-semibold tabular-nums">{count}</span>
            </div>
          })}
        </div>
      </Card>

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
                <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} width={40} allowDecimals={false} />
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
                <p className="text-xs text-muted">{aiNow ? `Respondendo ${aiNow} ${aiNow === 1 ? 'conversa' : 'conversas'}` : 'Nenhuma conversa agora'}</p>
              </div>
              <span className={cn('text-lg font-bold', !aiNow && 'text-subtle')}>{aiNow}</span>
            </div>
            {users
              .map(resolveUser)
              .filter((u) => u.role === 'analista')
              .map((u) => {
                const n = open.filter((c) => c.assignee === u.id).length
                return (
                  <div key={u.id} className="flex items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-surface-2">
                    <Avatar name={u.name} size={36} presence={u.presence} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium">{u.name}</p>
                      <p className="text-xs text-muted">{u.presence === 'online' ? 'Disponível' : u.presence === 'away' ? 'Ausente' : 'Offline'}</p>
                    </div>
                    <span className={cn('text-lg font-bold', n === 0 && 'text-subtle')}>{n}</span>
                  </div>
                )
              })}
            <p className="mt-2 px-2.5 text-xs text-muted">
              {queue.length === 0 ? (
                'Fila vazia'
              ) : (
                <>
                  <b className={waitingLong ? 'text-warning' : 'text-foreground'}>
                    {queue.length} {queue.length === 1 ? 'conversa' : 'conversas'}
                  </b>{' '}
                  na fila{waitingLong > 0 && ` · ${waitingLong} esperando há mais de 5 min`}
                </>
              )}
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
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} allowDecimals={false} />
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
                    <td className="px-5 py-3 text-right text-muted tabular-nums">{p.clients ? brl.format(p.revenue / p.clients) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Origem dos agendamentos */}
      <Card className="mt-4">
        <CardHeader
          title="De onde vêm os agendamentos"
          description={`Quanto a IA está agendando sozinha · ${d.originTotal} ${d.originTotal === 1 ? 'agendamento' : 'agendamentos'} no período`}
        />
        <div className="px-5 pb-5">
          <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-surface-3">
            <span className="h-full bg-chart-1" style={{ width: pct(d.origins[0]) }} />
            <span className="h-full bg-chart-2" style={{ width: pct(d.origins[1]) }} />
            <span className="h-full bg-chart-3" style={{ width: pct(d.origins[2]) }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
            {[
              ['bg-chart-1', 'Assistente IA', pct(d.origins[0])],
              ['bg-chart-2', 'Equipe (manual)', pct(d.origins[1])],
              ['bg-chart-3', 'Link de agendamento', pct(d.origins[2])]
            ].map(([c, l, v]) => (
              <span key={l} className="flex items-center gap-2">
                <span className={cn('size-2.5 rounded-sm', c)} /> {l} <b className="font-semibold">{v}</b>
              </span>
            ))}
          </div>
        </div>
      </Card>
    </Page>
  )
}

function Kpi({
  icon,
  label,
  value,
  delta,
  lowerIsBetter,
  points,
  tip
}: {
  icon: ReactNode
  label: string
  value: string
  delta: number | null
  lowerIsBetter?: boolean
  /** variação em pontos percentuais (taxas) em vez de % */
  points?: boolean
  tip?: string
}) {
  const good = lowerIsBetter ? (delta ?? 0) < 0 : (delta ?? 0) > 0
  const Arrow = (delta ?? 0) > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <Card className="p-4" title={tip}>
      <div className="flex items-center gap-2 text-[12.5px] font-medium text-muted [&_svg]:size-4">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums md:text-[28px]">{value}</p>
      {delta === null ? (
        <p className="mt-1 text-xs text-subtle">Sem base para comparar</p>
      ) : delta === 0 ? (
        <p className="mt-1 text-xs text-muted">Igual ao período anterior</p>
      ) : (
        <p className={cn('mt-1 flex items-center gap-0.5 text-xs font-semibold', good ? 'text-success' : 'text-danger')}>
          <Arrow className="size-3.5" />
          {Math.abs(delta).toLocaleString('pt-BR')}
          {points ? ' p.p.' : '%'}
          <span className="ml-1 hidden font-normal text-muted sm:inline">vs período anterior</span>
        </p>
      )}
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
