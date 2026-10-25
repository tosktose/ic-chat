import { AlertTriangle, Coins, TrendingUp, Zap } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Badge, Switch } from '@/components/ui/misc'
import { Button } from '@/components/ui/button'
import { brl, cn } from '@/lib/utils'
import { tenants } from '@/data/saas'
import {
  CREDITO_EM_TOKENS,
  PRECO,
  custo,
  disponivel,
  estado,
  estadoCfg,
  excedente,
  receita,
  saldos
} from '@/data/creditos'

const num = new Intl.NumberFormat('pt-BR')

export function AdminCreditsPage() {
  const linhas = saldos
    .map((s) => ({ s, t: tenants.find((x) => x.id === s.tenantId) }))
    .filter((l) => l.t)
    .sort((a, b) => b.s.consumoMes - a.s.consumoMes)

  const consumo = saldos.reduce((x, s) => x + s.consumoMes, 0)
  const custoTotal = saldos.reduce((x, s) => x + custo(s), 0)
  const receitaTotal = saldos.reduce((x, s) => x + receita(s), 0)
  const margem = receitaTotal - custoTotal
  const esgotados = saldos.filter((s) => estado(s) === 'esgotado').length

  return (
    <Page
      wide
      title="Créditos de IA"
      description={`Você paga o provedor por token e revende em créditos. 1 crédito = ${num.format(CREDITO_EM_TOKENS)} tokens.`}
      actions={
        <Button variant="outline">
          <Coins /> Ajustar preços
        </Button>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
            <Zap className="size-3.5" /> Consumo no mês
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{num.format(consumo)}</p>
          <p className="mt-1 text-xs text-subtle">créditos em {saldos.length} empresas</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
          <p className="text-xs font-medium text-muted">Custo com o provedor</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-danger">{brl.format(custoTotal)}</p>
          <p className="mt-1 text-xs text-subtle">{brl.format(PRECO.custoPorCredito)} por crédito</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
          <p className="text-xs font-medium text-muted">Receita de excedente</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{brl.format(receitaTotal)}</p>
          <p className="mt-1 text-xs text-subtle">{brl.format(PRECO.vendaPorCredito)} por crédito avulso</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
            <TrendingUp className="size-3.5" /> Margem
          </p>
          <p className={cn('mt-1 text-2xl font-bold tabular-nums', margem >= 0 ? 'text-success' : 'text-danger')}>
            {brl.format(margem)}
          </p>
          <p className="mt-1 text-xs text-subtle">
            {margem < 0 ? 'no prejuízo neste mês' : 'receita menos custo'}
          </p>
        </div>
      </div>

      {esgotados > 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-soft p-3.5">
          <AlertTriangle className="size-4 shrink-0 text-warning" />
          <p className="text-[13px] text-foreground">
            <b>{esgotados} empresa(s) com crédito esgotado.</b> Sem auto-recarga, a IA delas para de
            responder e as conversas caem na fila da equipe.
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-semibold tracking-wide text-subtle uppercase">
                <th className="px-5 py-2.5">Empresa</th>
                <th className="px-3 py-2.5">Situação</th>
                <th className="px-3 py-2.5 text-right">Incluído</th>
                <th className="px-3 py-2.5 text-right">Consumido</th>
                <th className="px-3 py-2.5 text-right">Disponível</th>
                <th className="px-3 py-2.5 text-right">Excedente</th>
                <th className="px-3 py-2.5 text-right">Custo</th>
                <th className="px-3 py-2.5 text-right">Receita</th>
                <th className="px-3 py-2.5 text-center">Auto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {linhas.map(({ s, t }) => {
                const est = estadoCfg[estado(s)]
                const exc = excedente(s)
                const uso = s.incluidoNoPlano ? Math.min(100, (s.consumoMes / s.incluidoNoPlano) * 100) : 0
                return (
                  <tr key={s.tenantId} className="hover:bg-surface-2">
                    <td className="px-5 py-3">
                      <p className="font-medium">{t!.name}</p>
                      <div className="mt-1 h-1 w-28 overflow-hidden rounded-full bg-surface-3">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            uso >= 100 ? 'bg-danger' : uso >= 80 ? 'bg-warning' : 'bg-primary'
                          )}
                          style={{ width: `${uso}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={est.tone}>{est.label}</Badge>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted">{num.format(s.incluidoNoPlano)}</td>
                    <td className="px-3 py-3 text-right font-medium tabular-nums">{num.format(s.consumoMes)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{num.format(disponivel(s))}</td>
                    <td className={cn('px-3 py-3 text-right tabular-nums', exc > 0 && 'font-medium text-warning')}>
                      {exc > 0 ? num.format(exc) : '—'}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted">{brl.format(custo(s))}</td>
                    <td className="px-3 py-3 text-right font-medium tabular-nums">
                      {receita(s) > 0 ? brl.format(receita(s)) : '—'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Switch checked={s.autoRecarga} aria-label={`Auto-recarga de ${t!.name}`} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-subtle">
        O custo é estimativa pelo preço médio do provedor. Só o excedente ao plano é faturado — o que o
        plano inclui já está na mensalidade.
      </p>
    </Page>
  )
}
