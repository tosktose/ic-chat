import { useCallback, useEffect, useState } from 'react'
import { Coins, Loader2, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge, Card, CardHeader, Progress } from '@/components/ui/misc'
import { myAiSummary, type AiPack, type AiSummary } from '@/lib/admin-api'
import { startPackCheckout } from '@/lib/billing'
import { supabase } from '@/lib/supabase'
import { brl, cn } from '@/lib/utils'

const nf = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const dt = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const kind = { compra: 'Compra de pacote', bonus: 'Bônus', ajuste: 'Ajuste', uso: 'Uso da IA' } as const

/** Saldo de créditos da empresa, extrato e compra de pacote avulso (versão web). */
export function AiCreditsCard() {
  const [s, setS] = useState<AiSummary | null>(null)
  const [packs, setPacks] = useState<AiPack[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    try {
      setS(await myAiSummary())
      if (supabase) {
        const { data } = await supabase.schema('ic_chat').from('ai_credit_packs').select('*').eq('active', true).order('sort')
        setPacks((data ?? []).map((p) => ({ ...p, credits: Number(p.credits), price: Number(p.price) })) as AiPack[])
      }
      setError('')
    } catch (e) {
      setError(/does not exist|Could not find|PGRST/i.test(e instanceof Error ? e.message : String(e)) ? 'Os créditos de IA ainda não foram ativados neste ambiente.' : 'Não foi possível carregar seus créditos agora.')
    }
  }, [])
  useEffect(() => { void load() }, [load])

  const buy = async (id: string) => {
    setBusy(id)
    const r = await startPackCheckout(id)
    if (r.url) { window.location.assign(r.url); return }
    setBusy('')
    toast.error('Não foi possível iniciar a compra', { description: r.error })
  }

  if (error) return <Card className="p-5 text-sm text-muted">{error}</Card>
  if (!s) return <Card className="grid place-items-center p-8"><Loader2 className="size-5 animate-spin text-muted" aria-label="Carregando créditos" /></Card>

  const pct = s.included ? Math.min(100, (s.plan_used / s.included) * 100) : 100
  const empty = s.available <= 0
  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-2"><Coins className="size-4" /> Créditos de IA</span>}
        description="Cada resposta da IA usa créditos. O plano inclui uma quantidade por mês; se acabar, compre um pacote."
        action={<Badge tone={empty ? 'danger' : s.available < s.included * 0.2 ? 'warning' : 'success'}>{empty ? 'Sem créditos' : `${nf.format(s.available)} disponíveis`}</Badge>}
      />
      <div className="grid gap-4 px-5 pb-5 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <div className="flex items-baseline justify-between text-[13px]"><span className="font-medium">Incluídos no plano (mês)</span><span className="tabular-nums text-muted">{nf.format(s.plan_used)} de {nf.format(s.included)} usados</span></div>
          <Progress value={pct} className="mt-2" />
          <p className="mt-2 text-xs text-muted">Saldo avulso (pacotes comprados e bônus): <b className="text-foreground">{nf.format(Math.max(0, s.pack_balance))}</b> créditos · não vence. 1 crédito ≈ {nf.format(s.tokens_per_credit)} tokens.</p>
        </div>
        <div className="rounded-xl bg-surface-2 p-3 text-center"><p className="text-xs text-muted">Usados neste mês</p><p className="text-2xl font-bold tabular-nums">{nf.format(s.used_month)}</p></div>
      </div>

      {packs.length > 0 && (
        <div className="border-t border-border px-5 py-4">
          <p className="mb-2 text-[13px] font-semibold">Comprar mais créditos</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {packs.map((p) => (
              <Button key={p.id} variant={empty ? 'primary' : 'outline'} className="h-auto flex-col items-start gap-0.5 py-2.5 text-left" disabled={!!busy} onClick={() => buy(p.id)}>
                <span className="flex items-center gap-1.5 text-[13px]">{busy === p.id ? <Loader2 className="animate-spin" /> : <ShoppingCart />} {p.name}</span>
                <span className="text-xs font-normal opacity-80">{nf.format(p.credits)} créditos · {brl.format(p.price)}</span>
              </Button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted">Pagamento pelo Mercado Pago (Pix ou cartão). Os créditos entram assim que o pagamento é aprovado.</p>
        </div>
      )}

      {(s.ledger?.length ?? 0) > 0 && (
        <details className="border-t border-border px-5 py-3">
          <summary className="cursor-pointer text-[13px] font-semibold">Extrato (últimos movimentos)</summary>
          <ul className="mt-2 divide-y divide-border">
            {s.ledger!.slice(0, 12).map((i, k) => (
              <li key={k} className="flex items-center gap-3 py-2 text-[13px]">
                <span className="w-32 shrink-0 text-muted">{kind[i.kind]}</span>
                <span className="min-w-0 flex-1 truncate text-muted">{i.note ?? (i.kind === 'uso' ? `${nf.format(i.tokens)} tokens` : '')}</span>
                <b className={cn('tabular-nums', i.kind === 'uso' ? 'text-danger' : 'text-success')}>{i.kind === 'uso' ? '−' : i.credits >= 0 ? '+' : ''}{nf.format(i.credits)}</b>
                <span className="w-24 text-right text-xs text-muted">{dt(i.created_at)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  )
}
