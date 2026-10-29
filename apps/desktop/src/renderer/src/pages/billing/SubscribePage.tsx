import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Check, CheckCircle2, Clock, CreditCard, Loader2, ShieldCheck, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Badge, Card } from '@/components/ui/misc'
import { useAppState } from '@/lib/app-state'
import { startCheckout, PLAN_LIST, type PlanId } from '@/lib/billing'
import { isWebApp } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const stateText = {
  teste: (d: number) => `Teste grátis: ${Math.max(d, 0)} ${d === 1 ? 'dia' : 'dias'} restantes`,
  ativa: (d: number) => `Assinatura ativa · ${d} dias restantes`,
  vencendo: (d: number) => `Assinatura vence em ${Math.max(d, 0)} dias`,
  carencia: () => 'Assinatura vencida',
  restrito: () => 'Acesso suspenso por falta de pagamento'
} as const

/** Tela de contratação: o usuário escolhe o plano e paga no Mercado Pago (Pix ou cartão). */
export function SubscribePage() {
  const { license } = useAppState()
  const [busy, setBusy] = useState<PlanId | null>(null)

  if (!isWebApp) {
    return (
      <Page title="Assinatura" description="A contratação é feita na versão online.">
        <Card className="p-6 text-sm text-muted">Acesse o IC Chat pelo navegador para contratar ou renovar. A chave de licença do aplicativo é liberada depois da confirmação do pagamento.</Card>
      </Page>
    )
  }

  const pay = async (plan: PlanId) => {
    setBusy(plan)
    const r = await startCheckout(plan)
    if (r.url) { window.location.assign(r.url); return }
    setBusy(null)
    toast.error('Não foi possível iniciar o pagamento', { description: r.error })
  }

  const label = stateText[license.state](license.daysLeft)
  return (
    <Page title="Assinatura" description="Escolha o plano e pague com Pix ou cartão pelo Mercado Pago. A liberação é automática.">
      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <Badge tone={license.state === 'restrito' || license.state === 'carencia' ? 'danger' : license.state === 'teste' ? 'primary' : 'success'}>{license.plan}</Badge>
        <p className="text-sm font-medium">{label}</p>
        {license.expiresAt && <p className="text-xs text-muted">até {license.expiresAt}</p>}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {PLAN_LIST.map((p) => (
          <Card key={p.id} className={cn('flex flex-col p-6', p.recommended && 'ring-2 ring-primary')}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{p.name}</h3>
              {p.recommended && <Badge tone="primary">Mais escolhido</Badge>}
            </div>
            <p className="mt-1 min-h-10 text-sm text-muted">{p.summary}</p>
            <p className="mt-4"><span className="text-4xl font-bold tracking-tight">R$ {p.price}</span><span className="text-sm text-muted"> /30 dias</span></p>
            <Button className="mt-5" size="lg" variant={p.recommended ? 'primary' : 'outline'} disabled={busy !== null} onClick={() => pay(p.id)}>
              {busy === p.id ? <Loader2 className="animate-spin" /> : <CreditCard />} {busy === p.id ? 'Abrindo o pagamento…' : `Assinar ${p.name}`}
            </Button>
            <ul className="mt-5 flex flex-col gap-2.5 border-t border-border pt-5">
              {p.features.map((f) => <li key={f} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-success" />{f}</li>)}
            </ul>
          </Card>
        ))}
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted"><ShieldCheck className="size-4" /> Pagamento processado pelo Mercado Pago. O IC Chat não guarda dados do seu cartão.</p>
    </Page>
  )
}

/** Para onde o Mercado Pago devolve o cliente depois de pagar. */
export function CheckoutReturnPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const status = params.get('status') ?? params.get('collection_status') ?? ''
  const view =
    status === 'approved'
      ? { icon: <CheckCircle2 className="size-10 text-success" />, title: 'Pagamento aprovado!', text: 'Seu plano foi liberado. Se a tela ainda mostrar "teste", aguarde alguns segundos e atualize.' }
      : status === 'pending' || status === 'in_process'
        ? { icon: <Clock className="size-10 text-warning" />, title: 'Pagamento em análise', text: 'Assim que o Mercado Pago confirmar (Pix e boleto podem levar alguns minutos), o plano é liberado automaticamente.' }
        : { icon: <XCircle className="size-10 text-danger" />, title: 'Pagamento não concluído', text: 'Nenhum valor foi cobrado. Você pode tentar de novo quando quiser.' }
  return (
    <Page title="Assinatura" description="Retorno do pagamento">
      <Card className="mx-auto flex max-w-lg flex-col items-center gap-3 p-8 text-center">
        {view.icon}
        <h2 className="text-xl font-bold">{view.title}</h2>
        <p className="text-sm leading-6 text-muted">{view.text}</p>
        <div className="mt-2 flex gap-2">
          <Button onClick={() => window.location.assign('/dashboard')}>Ir para o painel</Button>
          {status !== 'approved' && <Button variant="outline" onClick={() => navigate('/assinar')}>Ver planos</Button>}
        </div>
      </Card>
    </Page>
  )
}
