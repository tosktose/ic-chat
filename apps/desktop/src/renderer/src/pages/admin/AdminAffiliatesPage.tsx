import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Copy, HandCoins, Link2, Pause, Play, RefreshCw, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Badge, Card } from '@/components/ui/misc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Page } from '@/components/layout/Page'
import { StatCard, StatGrid } from '@/components/ui/stats'
import { adminError, deleteAffiliate, listAffiliateReferrals, listAffiliateSummaries, markAffiliateCommissionsPaid, setAffiliate, type AffiliateReferral, type AffiliateSummary } from '@/lib/admin-api'
import { brl } from '@/lib/utils'
import { getSiteUrl } from '@/lib/site-url'

export function AdminAffiliatesPage() {
  const [affiliates, setAffiliates] = useState<AffiliateSummary[]>([])
  const [referrals, setReferrals] = useState<AffiliateReferral[]>([])
  const [rates, setRates] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const [summaryRows, referralRows] = await Promise.all([listAffiliateSummaries(), listAffiliateReferrals()])
      setAffiliates(summaryRows)
      setReferrals(referralRows)
      setRates(Object.fromEntries(summaryRows.map((row) => [row.user_id, String(row.commission_rate)])))
      setSelected((ids) => ids.filter((id) => referralRows.some((row) => row.commission_id === id && row.commission_status === 'pending')))
    } catch (cause) {
      setError(adminError(cause))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const pendingIds = useMemo(() => referrals.filter((row) => row.commission_id && row.commission_status === 'pending').map((row) => row.commission_id!), [referrals])
  const totalPaid = affiliates.reduce((sum, row) => sum + row.commission_paid, 0)
  const totalPending = affiliates.reduce((sum, row) => sum + row.commission_pending, 0)
  const totalReferred = affiliates.reduce((sum, row) => sum + row.referrals, 0)

  const copyLink = async (code: string) => {
    const url = `${getSiteUrl()}/?ref=${encodeURIComponent(code)}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copiado', { description: url })
    } catch {
      toast.error('Não foi possível copiar o link', { description: url })
    }
  }

  const saveRate = async (affiliate: AffiliateSummary) => {
    const rate = Number(rates[affiliate.user_id])
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      toast.error('Informe uma comissão entre 0% e 100%.')
      return
    }
    setBusy(true)
    try {
      await setAffiliate(affiliate.user_id, affiliate.active, rate)
      toast.success('Comissão atualizada', { description: `${affiliate.email} · ${rate}% para novos pagamentos` })
      await load()
    } catch (cause) {
      toast.error('Não foi possível salvar a comissão', { description: adminError(cause) })
    } finally { setBusy(false) }
  }

  const toggleAffiliate = async (affiliate: AffiliateSummary) => {
    setBusy(true)
    try {
      await setAffiliate(affiliate.user_id, !affiliate.active, affiliate.commission_rate)
      toast.success(affiliate.active ? 'Afiliado pausado' : 'Afiliado reativado', {
        description: affiliate.active ? 'Novas indicações pelo link estão pausadas.' : 'O link voltou a aceitar novas indicações.'
      })
      await load()
    } catch (cause) {
      toast.error('Não foi possível atualizar o afiliado', { description: adminError(cause) })
    } finally { setBusy(false) }
  }

  const markPaid = async () => {
    if (!selected.length) return
    setBusy(true)
    try {
      const count = await markAffiliateCommissionsPaid(selected)
      setSelected([])
      toast.success(`${count} comissão(ões) marcada(s) como paga(s)`, { description: 'Registre essa ação depois de realizar o repasse fora do IC Chat.' })
      await load()
    } catch (cause) {
      toast.error('Não foi possível atualizar os repasses', { description: adminError(cause) })
    } finally { setBusy(false) }
  }

  const removeAffiliate = async (affiliate: AffiliateSummary) => {
    if (!window.confirm(`Excluir o vínculo de afiliado de ${affiliate.display_name || affiliate.email}? O link será desativado; indicações e comissões existentes serão preservadas no histórico.`)) return
    setBusy(true)
    try {
      await deleteAffiliate(affiliate.user_id)
      toast.success('Cadastro de afiliado excluído', { description: 'O histórico financeiro foi preservado.' })
      await load()
    } catch (cause) {
      toast.error('Não foi possível excluir o afiliado', { description: adminError(cause) })
    } finally { setBusy(false) }
  }

  const toggleSelected = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])

  return (
    <Page wide title="Afiliados" description="Ative parceiros, configure a comissão e acompanhe as empresas e assinaturas indicadas." actions={<Button variant="outline" onClick={() => void load()} disabled={loading || busy}><RefreshCw /> Atualizar</Button>}>
      {error && <div role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{error}</div>}

      <StatGrid className="mb-5">
        <StatCard icon={<Users />} label="Afiliados" value={String(affiliates.filter((row) => row.active).length)} hint={`${affiliates.length} cadastrados`} />
        <StatCard icon={<Link2 />} label="Empresas indicadas" value={String(totalReferred)} hint="cadastros atribuídos aos links" />
        <StatCard icon={<HandCoins />} label="Comissões pendentes" value={brl.format(totalPending)} hint="aguardando repasse manual" tone={totalPending ? 'warning' : 'default'} />
        <StatCard icon={<Check />} label="Comissões pagas" value={brl.format(totalPaid)} hint="repasses registrados" tone="success" />
      </StatGrid>

      <Card className="mb-5 overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-semibold">Parceiros cadastrados</h3>
          <p className="mt-0.5 text-xs text-muted">A ativação também pode ser feita diretamente na lista de Usuários. A alteração da taxa vale para próximos pagamentos.</p>
        </div>
        {loading ? <p className="p-5 text-sm text-muted">Carregando afiliados…</p> : affiliates.length === 0 ? <p className="p-5 text-sm text-muted">Nenhum afiliado ativado. Escolha uma pessoa na página Usuários para começar.</p> : (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead><tr className="border-b border-border bg-surface-2/50 text-left text-xs text-muted">
                <th className="px-5 py-3">Afiliado</th><th className="px-3 py-3">Link individual</th><th className="px-3 py-3 text-right">Indicações</th><th className="px-3 py-3 text-right">Assinaturas ativas</th><th className="px-3 py-3">Comissão</th><th className="px-5 py-3 text-right">Acesso</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {affiliates.map((affiliate) => <tr key={affiliate.user_id} className="hover:bg-surface-2/40">
                  <td className="px-5 py-3"><p className="font-medium">{affiliate.display_name || affiliate.email}</p><p className="text-xs text-muted">{affiliate.email}</p></td>
                  <td className="px-3 py-3"><Button variant="outline" size="sm" onClick={() => void copyLink(affiliate.referral_code)}><Copy /> Copiar link</Button></td>
                  <td className="px-3 py-3 text-right tabular-nums">{affiliate.referrals}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{affiliate.active_subscriptions}</td>
                  <td className="px-3 py-3"><div className="flex items-center gap-2"><Input aria-label={`Percentual de comissão de ${affiliate.email}`} type="number" min="0" max="100" step="0.5" className="w-24" value={rates[affiliate.user_id] ?? ''} onChange={(event) => setRates((current) => ({ ...current, [affiliate.user_id]: event.target.value }))} /><span className="text-muted">%</span><Button size="sm" variant="outline" disabled={busy || Number(rates[affiliate.user_id]) === affiliate.commission_rate} onClick={() => void saveRate(affiliate)}>Salvar</Button></div></td>
                  <td className="px-5 py-3 text-right"><div className="flex justify-end gap-2"><Button variant={affiliate.active ? 'outline' : 'soft'} size="sm" disabled={busy} onClick={() => void toggleAffiliate(affiliate)}>{affiliate.active ? <><Pause /> Pausar</> : <><Play /> Reativar</>}</Button><Button variant="outline" size="sm" disabled={busy} aria-label={`Excluir afiliado ${affiliate.email}`} onClick={() => void removeAffiliate(affiliate)}><Trash2 /> Excluir</Button></div></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h3 className="font-semibold">Empresas indicadas e pagamentos</h3><p className="mt-0.5 text-xs text-muted">Cada linha de comissão corresponde a um pagamento aprovado de assinatura.</p></div>
          <Button disabled={busy || !selected.length} onClick={() => void markPaid()}><Check /> Marcar selecionadas como pagas ({selected.length})</Button>
        </div>
        {loading ? <p className="p-5 text-sm text-muted">Carregando indicações…</p> : referrals.length === 0 ? <p className="p-5 text-sm text-muted">As empresas cadastradas pelos links dos afiliados aparecerão aqui.</p> : (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead><tr className="border-b border-border bg-surface-2/50 text-left text-xs text-muted">
                <th className="w-10 px-3 py-3"><input aria-label="Selecionar comissões pendentes" type="checkbox" checked={pendingIds.length > 0 && pendingIds.every((id) => selected.includes(id))} onChange={(event) => setSelected(event.target.checked ? pendingIds : [])} /></th>
                <th className="px-3 py-3">Empresa / responsável</th><th className="px-3 py-3">Afiliado</th><th className="px-3 py-3">Plano / situação</th><th className="px-3 py-3">Indicada em</th><th className="px-3 py-3 text-right">Pagamento</th><th className="px-3 py-3 text-right">Comissão deste pagamento</th><th className="px-5 py-3">Repasse</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {referrals.map((row, index) => <tr key={`${row.commission_id ?? row.tenant_id}-${index}`}>
                  <td className="px-3 py-3">{row.commission_id && row.commission_status === 'pending' && <input aria-label={`Selecionar comissão de ${row.tenant_name}`} type="checkbox" checked={selected.includes(row.commission_id)} onChange={() => toggleSelected(row.commission_id!)} />}</td>
                  <td className="px-3 py-3"><p className="font-medium">{row.tenant_name}</p><p className="text-xs text-muted">{row.owner_email || 'E-mail indisponível'}</p></td>
                  <td className="px-3 py-3">{row.affiliate_email}</td>
                  <td className="px-3 py-3"><p>{row.plan ? row.plan.charAt(0).toUpperCase() + row.plan.slice(1) : '—'}</p><p className="text-xs text-muted">{row.subscription_status || 'sem assinatura'}</p></td>
                  <td className="px-3 py-3 whitespace-nowrap text-muted">{new Date(row.referred_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{row.commission_id ? brl.format(row.payment_amount) : '—'}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{row.commission_id ? brl.format(row.commission_amount) : '—'}</td>
                  <td className="px-5 py-3">{row.commission_status === 'pending' ? <Badge tone="warning">Pendente</Badge> : row.commission_status === 'paid' ? <Badge tone="success">Pago</Badge> : row.commission_status === 'reversed' ? <Badge tone="danger">Estornado</Badge> : <Badge>Sem pagamento</Badge>}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-3 text-xs text-muted">Os valores de comissão são registrados depois da confirmação do Mercado Pago. O repasse financeiro é feito fora do sistema; marque como pago somente depois de transferir o valor.</p>
    </Page>
  )
}
