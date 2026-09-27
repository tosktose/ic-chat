import { useMemo, useState, type ReactNode } from 'react'
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  FileDown,
  FileSpreadsheet,
  Filter,
  Headset,
  Loader2,
  MessagesSquare,
  Scissors,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { channelLabel, type ChannelKind } from '@/components/brand'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/input'
import { Card, Segmented } from '@/components/ui/misc'
import { useAppState } from '@/lib/app-state'
import { useCompany } from '@/lib/company'
import { brl as fmtBrl } from '@/lib/report/base'
import { exportCsv } from '@/lib/report/csv'
import { exportPdf } from '@/lib/report/export-pdf'
import { buildTableReport, type CellValue, type ReportColumn } from '@/lib/report/table-report'
import { cn } from '@/lib/utils'
import { addDays, dateFromIso, HISTORY, type ApptOrigin, type ApptStatus } from '@/data/history'
import { contactById, services as seedServices, TODAY, users } from '@/data/mock'

type Kind = 'agendamentos' | 'conversas' | 'profissionais' | 'analistas'
type Preset = 'hoje' | '7d' | '15d' | '30d' | 'mes' | 'custom'

const KINDS: { value: Kind; label: string; icon: ReactNode; description: string }[] = [
  { value: 'agendamentos', label: 'Agendamentos', icon: <CalendarCheck className="size-4" />, description: 'Cada atendimento da agenda' },
  { value: 'conversas', label: 'Conversas', icon: <MessagesSquare className="size-4" />, description: 'Atendimento no chat, por canal e responsável' },
  { value: 'profissionais', label: 'Profissionais', icon: <Scissors className="size-4" />, description: 'Produção, faturamento e comissão' },
  { value: 'analistas', label: 'Analistas', icon: <Headset className="size-4" />, description: 'Conversas, tempo de resposta e conversão' }
]

const STATUS: Record<ApptStatus, { label: string; cls: string; pdf: string }> = {
  concluido: { label: 'Concluído', cls: 'bg-success-soft text-success', pdf: 't-good' },
  faltou: { label: 'Faltou', cls: 'bg-danger-soft text-danger', pdf: 't-bad' },
  cancelado: { label: 'Cancelado', cls: 'bg-surface-3 text-muted', pdf: 't-neutral' }
}
const ORIGIN: Record<ApptOrigin, string> = { ia: 'Assistente IA', manual: 'Equipe', link: 'Link de agendamento' }

const fmtDate = (iso: string) => iso.split('-').reverse().join('/')
const fmtSec = (s: number) => (s < 60 ? `${Math.round(s)}s` : `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, '0')}s`)
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—')
const PAGE = 25

interface Built {
  columns: ReportColumn[]
  /** Linhas para tela e PDF */
  rows: { key: string; cells: Record<string, { text: string; node?: ReactNode; pdf?: string }> }[]
  kpis: { label: string; value: string; sub?: string }[]
  chart?: { title: string; data: { label: string; value: number }[]; money?: boolean }
  totals?: Record<string, string | undefined>
}

export function ReportsPage() {
  const { me, resolveUser } = useAppState()
  const { info, professionals, services, professionalById } = useCompany()
  const [kind, setKind] = useState<Kind>('agendamentos')
  const [preset, setPreset] = useState<Preset>('30d')
  const [custom, setCustom] = useState({ from: addDays(TODAY, -29), to: TODAY })
  const [f, setF] = useState({ pro: '', service: '', status: '', origin: '', channel: '', handler: '' })
  const [page, setPage] = useState(0)
  const [busy, setBusy] = useState<'pdf' | 'csv' | null>(null)

  const range = useMemo(() => {
    switch (preset) {
      case 'hoje':
        return { from: TODAY, to: TODAY }
      case '7d':
        return { from: addDays(TODAY, -6), to: TODAY }
      case '15d':
        return { from: addDays(TODAY, -14), to: TODAY }
      case '30d':
        return { from: addDays(TODAY, -29), to: TODAY }
      case 'mes':
        return { from: TODAY.slice(0, 8) + '01', to: TODAY }
      default:
        return custom
    }
  }, [preset, custom])
  const periodLabel = range.from === range.to ? fmtDate(range.from) : `${fmtDate(range.from)} a ${fmtDate(range.to)}`

  const serviceName = (id: string) => services.find((s) => s.id === id)?.name ?? seedServices.find((s) => s.id === id)?.name ?? 'Serviço'
  const proName = (id: string) => professionalById(id)?.name ?? 'Profissional removido'
  const handlerName = (id: string) => (id === 'ia' ? 'Assistente IA' : resolveUser(users.find((u) => u.id === id))?.name ?? 'Analista')
  const analysts = users.filter((u) => u.role === 'analista').map(resolveUser)

  const set = (k: keyof typeof f, v: string) => {
    setF((x) => ({ ...x, [k]: v }))
    setPage(0)
  }
  const clearFilters = () => {
    setF({ pro: '', service: '', status: '', origin: '', channel: '', handler: '' })
    setPage(0)
  }

  // ------------------------------------------------------------ dados filtrados
  const appts = useMemo(
    () =>
      HISTORY.appts.filter(
        (a) =>
          a.date >= range.from &&
          a.date <= range.to &&
          (!f.pro || a.professionalId === f.pro) &&
          (!f.service || a.serviceId === f.service) &&
          (!f.status || a.status === f.status) &&
          (!f.origin || a.origin === f.origin)
      ),
    [range, f]
  )
  const chats = useMemo(
    () =>
      HISTORY.chats.filter(
        (c) =>
          c.date >= range.from &&
          c.date <= range.to &&
          (!f.channel || c.channel === f.channel) &&
          (!f.handler || c.handledBy === f.handler) &&
          (!f.status || (f.status === 'resolvida' ? c.resolved : !c.resolved))
      ),
    [range, f]
  )

  const perDay = <T extends { date: string }>(list: T[], value: (x: T) => number) => {
    const days: { label: string; value: number }[] = []
    const n = Math.round((dateFromIso(range.to).getTime() - dateFromIso(range.from).getTime()) / 86400000) + 1
    for (let i = 0; i < n; i++) {
      const d = addDays(range.from, i)
      days.push({ label: d.slice(8, 10) + '/' + d.slice(5, 7), value: list.filter((x) => x.date === d).reduce((s, x) => s + value(x), 0) })
    }
    return days
  }

  // ------------------------------------------------------------ relatórios
  const built = useMemo<Built>(() => {
    const badge = (text: string, cls: string, pdfCls: string) => ({
      text,
      node: <span className={cn('inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold whitespace-nowrap', cls)}>{text}</span>,
      pdf: `<span class="tag ${pdfCls}">${text}</span>`
    })

    if (kind === 'agendamentos') {
      const done = appts.filter((a) => a.status === 'concluido')
      const revenue = done.reduce((s, a) => s + a.price, 0)
      return {
        columns: [
          { key: 'date', label: 'Data' },
          { key: 'time', label: 'Hora' },
          { key: 'client', label: 'Cliente' },
          { key: 'service', label: 'Serviço' },
          { key: 'pro', label: 'Profissional' },
          { key: 'origin', label: 'Origem' },
          { key: 'status', label: 'Status' },
          { key: 'price', label: 'Valor', align: 'right' }
        ],
        rows: appts.map((a) => ({
          key: a.id,
          cells: {
            date: { text: fmtDate(a.date) },
            time: { text: a.time },
            client: { text: contactById(a.contactId).name },
            service: { text: serviceName(a.serviceId) },
            pro: { text: proName(a.professionalId) },
            origin: { text: ORIGIN[a.origin] },
            status: badge(STATUS[a.status].label, STATUS[a.status].cls, STATUS[a.status].pdf),
            price: { text: fmtBrl(a.price) }
          }
        })),
        kpis: [
          { label: 'Agendamentos', value: appts.length.toLocaleString('pt-BR') },
          { label: 'Concluídos', value: done.length.toLocaleString('pt-BR'), sub: pct(done.length, appts.length) + ' do total' },
          { label: 'Faltas', value: appts.filter((a) => a.status === 'faltou').length.toLocaleString('pt-BR'), sub: pct(appts.filter((a) => a.status === 'faltou').length, appts.length) + ' do total' },
          { label: 'Faturamento', value: fmtBrl(revenue), sub: `Ticket médio ${done.length ? fmtBrl(revenue / done.length) : '—'}` }
        ],
        chart: { title: 'Faturamento por dia (concluídos)', data: perDay(done, (a) => a.price), money: true },
        totals: { date: 'Total', price: fmtBrl(appts.reduce((s, a) => s + (a.status === 'concluido' ? a.price : 0), 0)) }
      }
    }

    if (kind === 'conversas') {
      const ai = chats.filter((c) => c.handledBy === 'ia')
      const avg = chats.length ? chats.reduce((s, c) => s + c.firstResponseSec, 0) / chats.length : 0
      return {
        columns: [
          { key: 'date', label: 'Data' },
          { key: 'time', label: 'Hora' },
          { key: 'client', label: 'Cliente' },
          { key: 'channel', label: 'Canal' },
          { key: 'handler', label: 'Atendido por' },
          { key: 'frt', label: '1ª resposta', align: 'right' },
          { key: 'booked', label: 'Agendou' },
          { key: 'status', label: 'Situação' }
        ],
        rows: chats.map((c) => ({
          key: c.id,
          cells: {
            date: { text: fmtDate(c.date) },
            time: { text: c.time },
            client: { text: contactById(c.contactId).name },
            channel: { text: channelLabel(c.channel) },
            handler: { text: handlerName(c.handledBy) },
            frt: { text: fmtSec(c.firstResponseSec) },
            booked: c.booked ? badge('Sim', 'bg-primary-soft text-primary', 't-info') : { text: 'Não' },
            status: c.resolved ? badge('Resolvida', 'bg-success-soft text-success', 't-good') : badge('Em aberto', 'bg-warning-soft text-warning', 't-warn')
          }
        })),
        kpis: [
          { label: 'Conversas', value: chats.length.toLocaleString('pt-BR') },
          { label: 'Resolvidas pela IA', value: pct(ai.length, chats.length), sub: `${ai.length.toLocaleString('pt-BR')} conversas` },
          { label: 'Tempo médio 1ª resposta', value: fmtSec(avg) },
          { label: 'Viraram agendamento', value: pct(chats.filter((c) => c.booked).length, chats.length), sub: `${chats.filter((c) => c.booked).length.toLocaleString('pt-BR')} conversas` }
        ],
        chart: { title: 'Conversas por dia', data: perDay(chats, () => 1) }
      }
    }

    if (kind === 'profissionais') {
      const list = professionals
        .filter((p) => !f.pro || p.id === f.pro)
        .map((p) => {
          const mine = appts.filter((a) => a.professionalId === p.id)
          const done = mine.filter((a) => a.status === 'concluido')
          const revenue = done.reduce((s, a) => s + a.price, 0)
          return { p, total: mine.length, done: done.length, noShow: mine.filter((a) => a.status === 'faltou').length, revenue, commission: (revenue * (p.commission ?? 0)) / 100 }
        })
        .sort((a, b) => b.revenue - a.revenue)
      const totalRevenue = list.reduce((s, x) => s + x.revenue, 0)
      const maxRev = Math.max(1, ...list.map((x) => x.revenue))
      return {
        columns: [
          { key: 'pro', label: 'Profissional' },
          { key: 'total', label: 'Agendamentos', align: 'right' },
          { key: 'done', label: 'Atendidos', align: 'right' },
          { key: 'noShow', label: 'Faltas', align: 'right' },
          { key: 'revenue', label: 'Faturamento', align: 'right' },
          { key: 'ticket', label: 'Ticket médio', align: 'right' },
          { key: 'commission', label: 'Comissão', align: 'right' }
        ],
        rows: list.map((x) => ({
          key: x.p.id,
          cells: {
            pro: { text: x.p.name },
            total: { text: String(x.total) },
            done: { text: String(x.done) },
            noShow: { text: String(x.noShow) },
            revenue: {
              text: fmtBrl(x.revenue),
              node: (
                <span className="inline-flex items-center gap-2">
                  {fmtBrl(x.revenue)}
                  <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-surface-3 lg:inline-block">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${(x.revenue / maxRev) * 100}%` }} />
                  </span>
                </span>
              ),
              pdf: `${fmtBrl(x.revenue)}<span class="bar"><i style="width:${(x.revenue / maxRev) * 100}%"></i></span>`
            },
            ticket: { text: x.done ? fmtBrl(x.revenue / x.done) : '—' },
            commission: { text: `${fmtBrl(x.commission)} (${x.p.commission ?? 0}%)` }
          }
        })),
        kpis: [
          { label: 'Profissionais', value: String(list.length) },
          { label: 'Atendimentos', value: list.reduce((s, x) => s + x.done, 0).toLocaleString('pt-BR') },
          { label: 'Faturamento', value: fmtBrl(totalRevenue) },
          { label: 'Comissões', value: fmtBrl(list.reduce((s, x) => s + x.commission, 0)) }
        ],
        chart: { title: 'Faturamento por profissional', data: list.map((x) => ({ label: x.p.name.split(' ')[0], value: x.revenue })), money: true },
        totals: {
          pro: 'Total',
          total: String(list.reduce((s, x) => s + x.total, 0)),
          done: String(list.reduce((s, x) => s + x.done, 0)),
          noShow: String(list.reduce((s, x) => s + x.noShow, 0)),
          revenue: fmtBrl(totalRevenue),
          commission: fmtBrl(list.reduce((s, x) => s + x.commission, 0))
        }
      }
    }

    // analistas
    const handlers = ['ia', ...analysts.map((a) => a.id)].filter((h) => !f.handler || h === f.handler)
    const list = handlers.map((h) => {
      const mine = chats.filter((c) => c.handledBy === h)
      const avg = mine.length ? mine.reduce((s, c) => s + c.firstResponseSec, 0) / mine.length : 0
      return { h, total: mine.length, avg, booked: mine.filter((c) => c.booked).length, resolved: mine.filter((c) => c.resolved).length }
    })
    return {
      columns: [
        { key: 'who', label: 'Responsável' },
        { key: 'total', label: 'Conversas', align: 'right' },
        { key: 'avg', label: '1ª resposta (média)', align: 'right' },
        { key: 'resolved', label: 'Resolvidas', align: 'right' },
        { key: 'booked', label: 'Agendamentos', align: 'right' },
        { key: 'conv', label: 'Conversão', align: 'right' }
      ],
      rows: list.map((x) => ({
        key: x.h,
        cells: {
          who: { text: handlerName(x.h) },
          total: { text: String(x.total) },
          avg: { text: fmtSec(x.avg) },
          resolved: { text: `${x.resolved} (${pct(x.resolved, x.total)})` },
          booked: { text: String(x.booked) },
          conv: { text: pct(x.booked, x.total) }
        }
      })),
      kpis: [
        { label: 'Conversas', value: list.reduce((s, x) => s + x.total, 0).toLocaleString('pt-BR') },
        { label: 'Pela IA', value: pct(list.find((x) => x.h === 'ia')?.total ?? 0, list.reduce((s, x) => s + x.total, 0)) },
        { label: 'Agendamentos gerados', value: list.reduce((s, x) => s + x.booked, 0).toLocaleString('pt-BR') },
        { label: 'Conversão geral', value: pct(list.reduce((s, x) => s + x.booked, 0), list.reduce((s, x) => s + x.total, 0)) }
      ],
      chart: { title: 'Conversas por responsável', data: list.map((x) => ({ label: handlerName(x.h).split(' ')[0], value: x.total })) },
      totals: { who: 'Total', total: String(list.reduce((s, x) => s + x.total, 0)), booked: String(list.reduce((s, x) => s + x.booked, 0)) }
    }
  }, [kind, appts, chats, professionals, services, f.pro, f.handler])

  // ------------------------------------------------------------ filtros ativos (texto)
  const activeFilters = useMemo(() => {
    const out: { key: keyof typeof f; label: string; value: string }[] = []
    if (f.pro) out.push({ key: 'pro', label: 'Profissional', value: proName(f.pro) })
    if (f.service) out.push({ key: 'service', label: 'Serviço', value: serviceName(f.service) })
    if (f.origin) out.push({ key: 'origin', label: 'Origem', value: ORIGIN[f.origin as ApptOrigin] })
    if (f.status) out.push({ key: 'status', label: 'Status', value: STATUS[f.status as ApptStatus]?.label ?? (f.status === 'resolvida' ? 'Resolvidas' : 'Em aberto') })
    if (f.channel) out.push({ key: 'channel', label: 'Canal', value: channelLabel(f.channel as ChannelKind) })
    if (f.handler) out.push({ key: 'handler', label: 'Atendido por', value: handlerName(f.handler) })
    return out
  }, [f, professionals, services])

  const kindLabel = KINDS.find((k) => k.value === kind)!.label
  const fileBase = `relatorio-${kind}-${range.from}-a-${range.to}`

  const doPdf = async () => {
    setBusy('pdf')
    const html = buildTableReport({
      title: `Relatório de ${kindLabel.toLowerCase()}`,
      subtitle: KINDS.find((k) => k.value === kind)!.description,
      company: info.name,
      logo: info.logo,
      author: me.name,
      periodLabel,
      filters: activeFilters.map(({ label, value }) => ({ label, value })),
      kpis: built.kpis,
      chart: built.chart,
      columns: built.columns,
      rows: built.rows.map((r) =>
        Object.fromEntries(Object.entries(r.cells).map(([k, c]) => [k, c.pdf ? ({ html: c.pdf } as CellValue) : c.text]))
      ),
      totals: built.totals
    })
    const res = await exportPdf(html, `${fileBase}.pdf`)
    setBusy(null)
    if (res.ok) toast.success('PDF gerado', { description: res.path ?? 'Escolha “Salvar como PDF” na janela de impressão.' })
    else if (!res.canceled) toast.error('Não foi possível gerar o PDF', { description: res.error })
  }

  const doCsv = async () => {
    setBusy('csv')
    const res = await exportCsv(built.columns, built.rows.map((r) => Object.fromEntries(Object.entries(r.cells).map(([k, c]) => [k, c.text]))), `${fileBase}.csv`)
    setBusy(null)
    if (res.ok) toast.success('Planilha gerada', { description: 'path' in res && res.path ? res.path : 'Abre direto no Excel.' })
    else if (!('canceled' in res && res.canceled)) toast.error('Não foi possível gerar a planilha')
  }

  const pages = Math.max(1, Math.ceil(built.rows.length / PAGE))
  const visible = built.rows.slice(page * PAGE, page * PAGE + PAGE)

  return (
    <Page
      wide
      title="Relatórios"
      description="Filtre os dados e exporte exatamente o que você está vendo."
      actions={
        <>
          <Button variant="outline" onClick={doCsv} disabled={busy !== null} tooltip="Planilha para abrir no Excel">
            {busy === 'csv' ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />} Excel
          </Button>
          <Button onClick={doPdf} disabled={busy !== null} tooltip="Documento A4 com layout da marca">
            {busy === 'pdf' ? <Loader2 className="animate-spin" /> : <FileDown />} PDF
          </Button>
        </>
      }
    >
      {/* Tipo de relatório */}
      <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {KINDS.map((k) => (
          <button
            key={k.value}
            onClick={() => {
              setKind(k.value)
              clearFilters()
            }}
            className={cn(
              'flex items-start gap-3 rounded-xl border p-3 text-left transition-colors',
              kind === k.value ? 'border-primary bg-primary-soft/60' : 'border-border bg-surface hover:border-border-strong'
            )}
          >
            <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', kind === k.value ? 'bg-primary text-white' : 'bg-surface-2 text-muted')}>{k.icon}</span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-semibold">{k.label}</span>
              <span className="block truncate text-[11.5px] text-muted">{k.description}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
            <div className="min-w-0">
              <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium"><Filter className="size-4 text-muted" /> Período</p>
              <div className="scroll-thin overflow-x-auto">
                <Segmented
                  value={preset}
                  onChange={(v) => {
                    setPreset(v)
                    setPage(0)
                  }}
                  options={[
                    { value: 'hoje', label: 'Hoje' },
                    { value: '7d', label: '7 dias' },
                    { value: '15d', label: '15 dias' },
                    { value: '30d', label: '30 dias' },
                    { value: 'mes', label: 'Este mês' },
                    { value: 'custom', label: 'Personalizado' }
                  ]}
                />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <Field label="De">
                <Input type="date" value={range.from} max={range.to} onChange={(e) => { setPreset('custom'); setCustom({ from: e.target.value, to: range.to }); setPage(0) }} />
              </Field>
              <Field label="Até">
                <Input type="date" value={range.to} min={range.from} max={TODAY} onChange={(e) => { setPreset('custom'); setCustom({ from: range.from, to: e.target.value }); setPage(0) }} />
              </Field>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(kind === 'agendamentos' || kind === 'profissionais') && (
              <Field label="Profissional">
                <Select value={f.pro} onChange={(e) => set('pro', e.target.value)}>
                  <option value="">Todos</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </Field>
            )}
            {(kind === 'agendamentos' || kind === 'profissionais') && (
              <Field label="Serviço">
                <Select value={f.service} onChange={(e) => set('service', e.target.value)}>
                  <option value="">Todos</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </Field>
            )}
            {kind === 'agendamentos' && (
              <>
                <Field label="Status">
                  <Select value={f.status} onChange={(e) => set('status', e.target.value)}>
                    <option value="">Todos</option>
                    {(Object.keys(STATUS) as ApptStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS[s].label}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Origem">
                  <Select value={f.origin} onChange={(e) => set('origin', e.target.value)}>
                    <option value="">Todas</option>
                    {(Object.keys(ORIGIN) as ApptOrigin[]).map((o) => (
                      <option key={o} value={o}>{ORIGIN[o]}</option>
                    ))}
                  </Select>
                </Field>
              </>
            )}
            {(kind === 'conversas' || kind === 'analistas') && (
              <Field label="Atendido por">
                <Select value={f.handler} onChange={(e) => set('handler', e.target.value)}>
                  <option value="">Todos</option>
                  <option value="ia">Assistente IA</option>
                  {analysts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </Select>
              </Field>
            )}
            {kind === 'conversas' && (
              <>
                <Field label="Canal">
                  <Select value={f.channel} onChange={(e) => set('channel', e.target.value)}>
                    <option value="">Todos</option>
                    {(['whatsapp', 'whatsapp_official', 'instagram', 'messenger', 'tiktok'] as ChannelKind[]).map((c) => (
                      <option key={c} value={c}>{channelLabel(c)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Situação">
                  <Select value={f.status} onChange={(e) => set('status', e.target.value)}>
                    <option value="">Todas</option>
                    <option value="resolvida">Resolvidas</option>
                    <option value="aberta">Em aberto</option>
                  </Select>
                </Field>
              </>
            )}
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {activeFilters.map((a) => (
                <span key={a.key} className="inline-flex h-7 items-center gap-1.5 rounded-full bg-primary-soft pr-1 pl-3 text-xs font-medium text-primary">
                  <span className="text-primary/70">{a.label}:</span> {a.value}
                  <button onClick={() => set(a.key, '')} className="rounded-full p-1 hover:bg-primary/10" aria-label={`Remover filtro ${a.label}`}>
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <button onClick={clearFilters} className="ml-1 text-xs font-medium text-muted hover:text-foreground hover:underline">Limpar filtros</button>
            </div>
          )}
        </div>
      </Card>

      {/* Resumo */}
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {built.kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <p className="text-[12px] font-medium text-muted">{k.label}</p>
            <p className="mt-1.5 text-xl font-bold tracking-tight tabular-nums md:text-2xl">{k.value}</p>
            {k.sub && <p className="mt-0.5 text-xs text-subtle">{k.sub}</p>}
          </Card>
        ))}
      </div>

      {/* Tabela */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-3">
          <p className="text-[14px] font-semibold">
            {kindLabel} <span className="font-normal text-muted">· {built.rows.length.toLocaleString('pt-BR')} {built.rows.length === 1 ? 'registro' : 'registros'} · {periodLabel}</span>
          </p>
        </div>
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead>
              <tr className="border-y border-border bg-surface-2/60 text-left text-[11px] font-semibold tracking-wider text-subtle uppercase">
                {built.columns.map((c) => (
                  <th key={c.key} className={cn('px-4 py-2.5 whitespace-nowrap', c.align === 'right' && 'text-right')}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.key} className="border-b border-border last:border-0 hover:bg-surface-2/40">
                  {built.columns.map((c) => (
                    <td key={c.key} className={cn('px-4 py-2.5 whitespace-nowrap', c.align === 'right' && 'text-right tabular-nums')}>
                      {r.cells[c.key]?.node ?? r.cells[c.key]?.text}
                    </td>
                  ))}
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={built.columns.length} className="px-4 py-10 text-center text-muted">Nenhum registro para os filtros escolhidos.</td></tr>
              )}
            </tbody>
            {built.totals && visible.length > 0 && (
              <tfoot>
                <tr className="border-t border-border bg-surface-2/60 font-semibold">
                  {built.columns.map((c) => (
                    <td key={c.key} className={cn('px-4 py-2.5 whitespace-nowrap', c.align === 'right' && 'text-right tabular-nums')}>{built.totals![c.key] ?? ''}</td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-2.5 text-[13px] text-muted">
            <span>
              {page * PAGE + 1}–{Math.min(built.rows.length, (page + 1) * PAGE)} de {built.rows.length.toLocaleString('pt-BR')}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" aria-label="Página anterior" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft /></Button>
              <span className="px-2 tabular-nums">{page + 1} / {pages}</span>
              <Button variant="ghost" size="icon-sm" aria-label="Próxima página" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}><ChevronRight /></Button>
            </div>
          </div>
        )}
      </Card>
    </Page>
  )
}
