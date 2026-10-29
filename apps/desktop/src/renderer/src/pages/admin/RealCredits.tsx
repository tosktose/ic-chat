import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Coins, Gift, Info, Loader2, ReceiptText, Save, TrendingUp, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Badge, Card, CardHeader, Switch } from '@/components/ui/misc'
import { Dialog } from '@/components/ui/overlay'
import { StatCard, StatGrid } from '@/components/ui/stats'
import {
  AI_DEFAULTS, adminAiLedger, adminAiOverview, adminError, adminGrantCredits, listAiPacks, listPlanCredits, loadAiSettings, saveAiPack,
  saveAiSettings, setPlanCredits, type AiLedgerRow, type AiOverviewRow, type AiPack, type AiSettings
} from '@/lib/admin-api'
import { brl, cn } from '@/lib/utils'

const nf = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const dt = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const kindLabel: Record<AiLedgerRow['kind'], { label: string; tone: 'success' | 'primary' | 'warning' | 'neutral' }> = {
  compra: { label: 'Compra de pacote', tone: 'success' },
  bonus: { label: 'Bônus', tone: 'primary' },
  ajuste: { label: 'Ajuste', tone: 'warning' },
  uso: { label: 'Uso da IA', tone: 'neutral' }
}

function state(r: AiOverviewRow): { label: string; tone: 'success' | 'warning' | 'danger' } {
  if (r.available <= 0) return { label: 'Esgotado', tone: 'danger' }
  if (r.included > 0 && r.available < r.included * 0.2) return { label: 'Acabando', tone: 'warning' }
  return { label: 'Saudável', tone: 'success' }
}

/** Créditos de IA reais: configuração, pacotes, créditos por plano e saldo de cada empresa (tudo no Supabase). */
export function RealCredits() {
  const [rows, setRows] = useState<AiOverviewRow[] | null>(null)
  const [settings, setSettings] = useState<AiSettings>(AI_DEFAULTS)
  const [savedSettings, setSavedSettings] = useState<AiSettings>(AI_DEFAULTS)
  const [packs, setPacks] = useState<AiPack[]>([])
  const [plans, setPlans] = useState<{ id: string; name: string; ai_credits_month: number }[]>([])
  const [error, setError] = useState('')
  const [grant, setGrant] = useState<AiOverviewRow | null>(null)
  const [ledger, setLedger] = useState<{ row: AiOverviewRow; items: AiLedgerRow[] } | null>(null)

  const load = useCallback(async () => {
    try {
      const [o, s, p, pl] = await Promise.all([adminAiOverview(), loadAiSettings(), listAiPacks(), listPlanCredits()])
      setRows(o); setSettings(s); setSavedSettings(s); setPacks(p); setPlans(pl); setError('')
    } catch (e) {
      setError(adminError(e)); setRows([])
    }
  }, [])
  useEffect(() => { void load() }, [load])

  const cost = Number(settings.ai_cost_per_credit) || 0
  const price = Number(settings.ai_price_per_credit) || 0
  const marginUnit = price - cost
  const marginPct = price > 0 ? (marginUnit / price) * 100 : 0
  const dirty = JSON.stringify(settings) !== JSON.stringify(savedSettings)

  const totals = useMemo(() => {
    const r = rows ?? []
    return {
      used: r.reduce((s, x) => s + x.used_month, 0),
      cost: r.reduce((s, x) => s + x.cost_month, 0),
      sales: r.reduce((s, x) => s + x.bought_month, 0),
      empty: r.filter((x) => x.available <= 0).length
    }
  }, [rows])

  const act = async (fn: () => Promise<void>, ok: string) => {
    try { await fn(); toast.success(ok); await load() } catch (e) { toast.error('Não foi possível salvar', { description: adminError(e) }) }
  }

  return (
    <Page wide title="Créditos de IA" description="Defina quanto custa, quanto cada plano inclui, venda pacotes avulsos e acompanhe o saldo de cada empresa.">
      {error && <div className="mb-4 rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{error}</div>}

      <Card className="mb-5 border-primary/20 bg-primary-soft/40 p-5">
        <p className="flex items-center gap-2 text-sm font-semibold"><Info className="size-4 text-primary" /> Como funciona</p>
        <ol className="mt-2 grid gap-2 text-[13px] leading-6 text-muted md:grid-cols-4">
          <li><b className="text-foreground">1. Você define o preço.</b> 1 crédito = {settings.ai_tokens_per_credit} tokens. Você paga {brl.format(cost)} ao provedor e cobra {brl.format(price)}.</li>
          <li><b className="text-foreground">2. O plano inclui créditos</b> todo mês (abaixo). Vale para quem assina; quem está no teste recebe os “créditos de teste”.</li>
          <li><b className="text-foreground">3. Acabou? A empresa compra pacote</b> no Mercado Pago, ou você dá créditos de bônus. O saldo avulso não vence.</li>
          <li><b className="text-foreground">4. Cada resposta da IA debita</b> automaticamente e fica no extrato, com o custo real do provedor.</li>
        </ol>
      </Card>

      <StatGrid className="mb-5">
        <StatCard icon={<Zap />} label="Consumo no mês" value={nf.format(totals.used)} hint={`créditos em ${rows?.length ?? 0} empresas`} />
        <StatCard label="Custo com o provedor" value={brl.format(totals.cost)} hint={`${brl.format(cost)} por crédito (estimado)`} tone="danger" />
        <StatCard label="Vendas de pacotes no mês" value={brl.format(totals.sales)} hint="pagamentos aprovados" />
        <StatCard icon={<TrendingUp />} label="Resultado do mês" value={brl.format(totals.sales - totals.cost)} hint={totals.sales - totals.cost < 0 ? 'custo maior que as vendas avulsas' : 'vendas avulsas menos custo'} tone={totals.sales - totals.cost >= 0 ? 'success' : 'danger'} />
      </StatGrid>

      {totals.empty > 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-soft p-3.5">
          <AlertTriangle className="size-4 shrink-0 text-warning" />
          <p className="text-[13px]"><b>{totals.empty} empresa(s) sem crédito.</b> A IA delas para de responder até comprarem um pacote ou você dar créditos.</p>
        </div>
      )}

      <div className="mb-5 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Preço e conversão" description="Define quanto custa cada crédito" />
          <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
            <Field label="Tokens por crédito" hint="Entrada + saída somadas."><Input type="number" min={1} value={settings.ai_tokens_per_credit} onChange={(e) => setSettings({ ...settings, ai_tokens_per_credit: e.target.value })} /></Field>
            <Field label="Créditos de teste grátis" hint="Para quem está nos 7 dias de teste."><Input type="number" min={0} value={settings.ai_trial_credits} onChange={(e) => setSettings({ ...settings, ai_trial_credits: e.target.value })} /></Field>
            <Field label="Seu custo por crédito (R$)" hint="O que o provedor cobra de você."><Input type="number" min={0} step="0.001" value={settings.ai_cost_per_credit} onChange={(e) => setSettings({ ...settings, ai_cost_per_credit: e.target.value })} /></Field>
            <Field label="Preço de venda por crédito (R$)" hint="Referência para os pacotes avulsos."><Input type="number" min={0} step="0.001" value={settings.ai_price_per_credit} onChange={(e) => setSettings({ ...settings, ai_price_per_credit: e.target.value })} /></Field>
            <div className={cn('rounded-xl p-3 text-[13px] sm:col-span-2', marginUnit >= 0 ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>
              Margem por crédito: <b>{brl.format(marginUnit)}</b> ({nf.format(marginPct)}%). {marginUnit < 0 && 'Você estaria vendendo no prejuízo.'}
            </div>
          </div>
          <div className="flex justify-end border-t border-border px-5 py-3">
            <Button disabled={!dirty} onClick={() => act(() => saveAiSettings(settings).then(() => setSavedSettings(settings)), 'Configuração salva')}><Save /> Salvar</Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Créditos incluídos por plano" description="Quanto cada plano ganha por mês (zera todo mês)" />
          <div className="flex flex-col gap-3 px-5 pb-5">
            {plans.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <p className="w-24 text-sm font-semibold">{p.name}</p>
                <Input className="max-w-40" type="number" min={0} value={p.ai_credits_month} onChange={(e) => setPlans((all) => all.map((x) => (x.id === p.id ? { ...x, ai_credits_month: Number(e.target.value) } : x)))} />
                <span className="text-xs text-muted">≈ {nf.format((p.ai_credits_month * Number(settings.ai_tokens_per_credit || 0)) / 1000)} mil tokens</span>
                <Button className="ml-auto" size="sm" variant="outline" onClick={() => act(() => setPlanCredits(p.id, p.ai_credits_month), `Plano ${p.name} atualizado`)}>Salvar</Button>
              </div>
            ))}
            {plans.length === 0 && <p className="text-sm text-muted">Carregando planos…</p>}
          </div>
        </Card>
      </div>

      <Card className="mb-5">
        <CardHeader title="Pacotes avulsos à venda" description="O que a empresa pode comprar quando os créditos acabam" />
        <div className="flex flex-col divide-y divide-border">
          {packs.map((p) => {
            const per = p.credits ? p.price / p.credits : 0
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Input className="w-44" value={p.name} onChange={(e) => setPacks((all) => all.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))} />
                <Input className="w-28" type="number" min={1} value={p.credits} onChange={(e) => setPacks((all) => all.map((x) => (x.id === p.id ? { ...x, credits: Number(e.target.value) } : x)))} />
                <span className="text-xs text-muted">créditos por R$</span>
                <Input className="w-28" type="number" min={0} step="0.01" value={p.price} onChange={(e) => setPacks((all) => all.map((x) => (x.id === p.id ? { ...x, price: Number(e.target.value) } : x)))} />
                <span className={cn('text-xs', per < cost ? 'text-danger' : 'text-muted')}>{brl.format(per)} / crédito{per < cost ? ' · abaixo do custo!' : ''}</span>
                <label className="ml-auto flex items-center gap-2 text-xs text-muted">À venda <Switch checked={p.active} onCheckedChange={(v) => setPacks((all) => all.map((x) => (x.id === p.id ? { ...x, active: v } : x)))} /></label>
                <Button size="sm" variant="outline" onClick={() => act(() => saveAiPack(p), `${p.name} salvo`)}>Salvar</Button>
              </div>
            )
          })}
          <div className="px-5 py-3">
            <Button variant="ghost" size="sm" onClick={() => setPacks((all) => [...all, { id: `pack_${Date.now().toString(36)}`, name: 'Novo pacote', credits: 1000, price: Math.round(1000 * price * 100) / 100, active: false, sort: all.length + 1 }])}>+ Novo pacote</Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Saldo por empresa" description="Dê créditos de bônus ou confira o extrato de cada uma" />
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[860px] text-[13px]">
            <thead>
              <tr className="border-y border-border bg-surface-2/60 text-left text-[11px] font-semibold tracking-wider text-subtle uppercase">
                <th className="px-5 py-2.5">Empresa</th><th className="px-3 py-2.5">Situação</th>
                <th className="px-3 py-2.5 text-right">Incluído no plano</th><th className="px-3 py-2.5 text-right">Usado no mês</th>
                <th className="px-3 py-2.5 text-right">Saldo avulso</th><th className="px-3 py-2.5 text-right">Disponível</th>
                <th className="px-3 py-2.5 text-right">Custo</th><th className="w-28 px-3 py-2.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows === null && <tr><td colSpan={8} className="px-5 py-10 text-center text-muted"><Loader2 className="mx-auto size-5 animate-spin" /></td></tr>}
              {rows !== null && rows.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-muted">Nenhuma empresa ainda.</td></tr>}
              {(rows ?? []).map((r) => {
                const st = state(r)
                return (
                  <tr key={r.tenant_id} className="border-b border-border last:border-0 hover:bg-surface-2/40">
                    <td className="px-5 py-3"><p className="font-medium">{r.tenant_name}</p><p className="text-xs text-muted">{r.owner_email ?? '—'} · plano {r.plan}</p></td>
                    <td className="px-3 py-3"><Badge tone={st.tone}>{st.label}</Badge></td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted">{nf.format(r.included)}</td>
                    <td className="px-3 py-3 text-right font-medium tabular-nums">{nf.format(r.used_month)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{nf.format(r.pack_balance)}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">{nf.format(r.available)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted">{brl.format(r.cost_month)}</td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-0.5">
                        <Button variant="ghost" size="icon-sm" aria-label="Dar créditos" title="Dar créditos" onClick={() => setGrant(r)}><Gift /></Button>
                        <Button variant="ghost" size="icon-sm" aria-label="Ver extrato" title="Extrato" onClick={async () => { try { setLedger({ row: r, items: await adminAiLedger(r.tenant_id) }) } catch (e) { toast.error('Não foi possível abrir o extrato', { description: adminError(e) }) } }}><ReceiptText /></Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <GrantDialog row={grant} onClose={() => setGrant(null)} onDone={load} />
      <Dialog open={!!ledger} onOpenChange={(v) => !v && setLedger(null)} title={`Extrato · ${ledger?.row.tenant_name ?? ''}`} description="Últimos 100 movimentos" footer={<Button onClick={() => setLedger(null)}>Fechar</Button>}>
        <div className="max-h-[50vh] overflow-y-auto">
          {ledger?.items.length === 0 && <p className="py-6 text-center text-sm text-muted">Nenhum movimento ainda.</p>}
          <ul className="divide-y divide-border">
            {ledger?.items.map((i, k) => (
              <li key={k} className="flex items-center gap-3 py-2.5 text-[13px]">
                <Badge tone={kindLabel[i.kind].tone}>{kindLabel[i.kind].label}</Badge>
                <span className="min-w-0 flex-1 truncate text-muted">{i.note ?? (i.kind === 'uso' ? `${nf.format(i.tokens)} tokens · custo ${brl.format(i.provider_cost)}` : '')}</span>
                <b className={cn('tabular-nums', i.kind === 'uso' ? 'text-danger' : 'text-success')}>{i.kind === 'uso' ? '−' : i.credits >= 0 ? '+' : ''}{nf.format(i.credits)}</b>
                <span className="w-24 text-right text-xs text-muted">{dt(i.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      </Dialog>
    </Page>
  )
}

function GrantDialog({ row, onClose, onDone }: { row: AiOverviewRow | null; onClose: () => void; onDone: () => void }) {
  const [credits, setCredits] = useState('')
  const [note, setNote] = useState('')
  const [kind, setKind] = useState<'bonus' | 'ajuste'>('bonus')
  const [busy, setBusy] = useState(false)
  const n = Number(credits)
  const valid = Number.isFinite(n) && n !== 0 && (kind === 'ajuste' || n > 0)
  return (
    <Dialog
      open={!!row}
      onOpenChange={(v) => !v && onClose()}
      title={`Dar créditos · ${row?.tenant_name ?? ''}`}
      description="Os créditos entram no saldo avulso (não vencem) e ficam registrados no extrato."
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button disabled={!valid || busy} onClick={async () => {
        if (!row) return
        setBusy(true)
        try { await adminGrantCredits(row.tenant_id, n, kind, note); toast.success(`${n > 0 ? '+' : ''}${n} créditos para ${row.tenant_name}`); setCredits(''); setNote(''); onClose(); onDone() } catch (e) { toast.error('Não foi possível dar os créditos', { description: adminError(e) }) } finally { setBusy(false) }
      }}><Coins /> {busy ? 'Salvando…' : 'Confirmar'}</Button></>}
    >
      <div className="grid gap-4">
        <div className="flex gap-2">
          <Button type="button" size="sm" variant={kind === 'bonus' ? 'primary' : 'outline'} onClick={() => setKind('bonus')}>Bônus (cortesia)</Button>
          <Button type="button" size="sm" variant={kind === 'ajuste' ? 'primary' : 'outline'} onClick={() => setKind('ajuste')}>Ajuste (pode ser negativo)</Button>
        </div>
        <Field label="Quantidade de créditos" hint={kind === 'ajuste' ? 'Use número negativo para tirar créditos.' : 'Ex.: 500'}><Input autoFocus type="number" value={credits} onChange={(e) => setCredits(e.target.value)} /></Field>
        <Field label="Motivo (aparece no extrato)"><Textarea className="min-h-16" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: cortesia de boas-vindas" /></Field>
      </div>
    </Dialog>
  )
}
