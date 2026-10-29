import { useCallback, useEffect, useState } from 'react'
import { Copy, HandCoins, Link2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Badge, Card } from '@/components/ui/misc'
import { StatCard, StatGrid } from '@/components/ui/stats'
import { adminError, getMyAffiliateDashboard, getMyAffiliateReferrals, type MyAffiliateDashboard, type MyAffiliateReferral } from '@/lib/admin-api'
import { brl } from '@/lib/utils'
import { getSiteUrl } from '@/lib/site-url'

export function MyAffiliatesPage() {
  const [dashboard, setDashboard] = useState<MyAffiliateDashboard | null>(null)
  const [referrals, setReferrals] = useState<MyAffiliateReferral[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const [summary, rows] = await Promise.all([getMyAffiliateDashboard(), getMyAffiliateReferrals()])
      setDashboard(summary)
      setReferrals(rows)
    } catch (cause) {
      setError(adminError(cause))
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const referralLink = dashboard ? `${getSiteUrl()}/?ref=${encodeURIComponent(dashboard.referral_code)}` : ''
  const copy = async () => {
    try { await navigator.clipboard.writeText(referralLink); toast.success('Seu link foi copiado') }
    catch { toast.error('Não foi possível copiar. Copie o link exibido na tela.') }
  }

  return (
    <Page wide title="Programa de afiliados" description="Acompanhe os cadastros e as assinaturas que vieram pelo seu link." actions={dashboard && <Button onClick={() => void copy()}><Copy /> Copiar meu link</Button>}>
      {loading && <p className="mb-4 text-sm text-muted">Carregando seu painel…</p>}
      {error && !loading && <div role="alert" className="mb-4 rounded-lg border border-warning/30 bg-warning-soft p-4 text-sm">{error}</div>}
      {dashboard && <>
        <Card className="mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Link2 className="size-5" /></div>
          <div className="min-w-0 flex-1"><p className="text-xs text-muted">Seu link de indicação</p><p className="truncate font-mono text-sm">{referralLink}</p></div>
          <Badge tone="primary">{dashboard.commission_rate}% por pagamento aprovado</Badge>
          <Button variant="outline" size="sm" onClick={() => void copy()}><Copy /> Copiar</Button>
        </Card>

        <StatGrid className="mb-5">
          <StatCard icon={<Users />} label="Empresas indicadas" value={String(dashboard.referrals)} hint="cadastros feitos pelo seu link" />
          <StatCard icon={<Link2 />} label="Assinaturas ativas" value={String(dashboard.active_subscriptions)} hint="empresas com plano ativo" />
          <StatCard icon={<HandCoins />} label="Comissão pendente" value={brl.format(dashboard.commission_pending)} hint="aguardando repasse" tone={dashboard.commission_pending ? 'warning' : 'default'} />
          <StatCard icon={<HandCoins />} label="Comissão já paga" value={brl.format(dashboard.commission_paid)} hint="repasses registrados" tone="success" />
        </StatGrid>

        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-4"><h3 className="font-semibold">Minhas indicações</h3><p className="mt-0.5 text-xs text-muted">Comissões são calculadas quando o pagamento da assinatura é confirmado.</p></div>
          {referrals.length === 0 ? <p className="p-5 text-sm text-muted">Ainda não há cadastros associados ao seu link. Compartilhe o link acima para começar.</p> : (
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead><tr className="border-b border-border bg-surface-2/50 text-left text-xs text-muted"><th className="px-5 py-3">Empresa</th><th className="px-3 py-3">Plano</th><th className="px-3 py-3">Situação</th><th className="px-3 py-3">Cadastro</th><th className="px-3 py-3 text-right">Pagamentos</th><th className="px-5 py-3 text-right">Comissão</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {referrals.map((row) => <tr key={row.tenant_id}>
                    <td className="px-5 py-3 font-medium">{row.tenant_name}</td>
                    <td className="px-3 py-3">{row.plan ? row.plan.charAt(0).toUpperCase() + row.plan.slice(1) : '—'}</td>
                    <td className="px-3 py-3"><Badge tone={row.subscription_status === 'active' ? 'success' : row.subscription_status === 'trialing' ? 'primary' : 'neutral'}>{row.subscription_status || '—'}</Badge></td>
                    <td className="px-3 py-3 whitespace-nowrap text-muted">{new Date(row.referred_at).toLocaleDateString('pt-BR')}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{brl.format(row.paid_revenue)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{brl.format(row.commission_pending + row.commission_paid)}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <p className="mt-3 text-xs text-muted">O painel mostra somente empresas e pagamentos atribuídos ao seu usuário. O repasse é realizado pela equipe do IC Chat.</p>
      </>}
    </Page>
  )
}
