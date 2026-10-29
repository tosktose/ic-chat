import { AlertTriangle, Coins, TrendingUp, Zap } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Badge, Switch } from '@/components/ui/misc'
import { StatCard, StatGrid } from '@/components/ui/stats'
import { Button } from '@/components/ui/button'
import { brl, cn } from '@/lib/utils'
import { tenants } from '@/data/saas'
import { isWebApp } from '@/lib/supabase'
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
  if (isWebApp) {
    return (
      <Page title="Créditos de IA" description="Consumo de IA por empresa.">
        <div className="rounded-2xl border border-dashed border-border-strong bg-surface p-10 text-center">
          <Coins className="mx-auto size-8 text-subtle" />
          <h2 className="mt-3 text-lg font-semibold">Nenhum consumo de IA registrado</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">O consumo e o custo com o provedor passam a aparecer aqui quando o Assistente IA das empresas estiver ligado e gravando o uso no banco. Nada é estimado nem inventado.</p>
        </div>
      </Page>
    )
  }
  return <DemoCredits />
}

function DemoCredits() {
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
      <StatGrid className="mb-5">
        <StatCard
          icon={<Zap />}
          label="Consumo no mês"
          value={num.format(consumo)}
          hint={`créditos em ${saldos.length} empresas`}
          trend={[4100, 4900, 5600, 6200, 7100, 8000, 8793]}
        />
        <StatCard
          label="Custo com o provedor"
          value={brl.format(custoTotal)}
          hint={`${brl.format(PRECO.custoPorCredito)} por crédito`}
          tone="danger"
          trend={[36, 44, 50, 55, 63, 72, 79]}
        />
        <StatCard
          label="Receita de excedente"
          value={brl.format(receitaTotal)}
          hint={`${brl.format(PRECO.vendaPorCredito)} por crédito avulso`}
          trend={[12, 18, 24, 31, 40, 50, 59]}
        />
        <StatCard
          icon={<TrendingUp />}
          label="Margem"
          value={brl.format(margem)}
          hint={margem < 0 ? 'no prejuízo neste mês' : 'receita menos custo'}
          tone={margem >= 0 ? 'success' : 'danger'}
        />
      </StatGrid>

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
