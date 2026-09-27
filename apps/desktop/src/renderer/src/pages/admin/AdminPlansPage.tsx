import { Check, Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Badge, Card } from '@/components/ui/misc'
import { brl, cn } from '@/lib/utils'

const PLANS = [
  {
    name: 'Start',
    price: 149,
    mode: 'Local (SQLite)',
    pcs: '3 PCs',
    users: '3 usuários',
    clients: 3,
    features: ['1 WhatsApp (QR Code)', 'Atendimento multiusuário', 'Agenda + Google Agenda', 'Lembretes automáticos']
  },
  {
    name: 'Pro',
    price: 299,
    mode: 'Local ou Nuvem',
    pcs: '10 PCs',
    users: '10 usuários',
    clients: 3,
    highlight: true,
    features: ['Tudo do Start', 'WhatsApp Oficial (API Meta)', 'Assistente IA (chave do cliente)', 'Kanban IA', 'Painel do gerente']
  },
  {
    name: 'Business',
    price: 599,
    mode: 'Nuvem (Supabase)',
    pcs: 'PCs ilimitados',
    users: 'Usuários ilimitados',
    clients: 1,
    features: ['Tudo do Pro', 'Instagram e Messenger', 'Várias unidades', 'API e webhooks', 'Suporte prioritário']
  }
]

export function AdminPlansPage() {
  return (
    <Page
      title="Planos"
      description="O que cada plano libera. Mudanças valem para novas chaves e renovações."
      actions={<Button><Plus /> Novo plano</Button>}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((p) => (
          <Card key={p.name} className={cn('flex flex-col p-5', p.highlight && 'ring-2 ring-primary')}>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold">{p.name}</p>
              {p.highlight && <Badge tone="primary">Mais vendido</Badge>}
              <Button variant="ghost" size="icon-sm" className="ml-auto" aria-label="Editar plano" onClick={() => toast('Edição de planos em breve')}>
                <Pencil />
              </Button>
            </div>
            <p className="mt-3">
              <span className="text-3xl font-bold tracking-tight">{brl.format(p.price)}</span>
              <span className="text-sm text-muted"> /mês</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge>{p.mode}</Badge>
              <Badge>{p.pcs}</Badge>
              <Badge>{p.users}</Badge>
            </div>
            <ul className="mt-4 flex flex-1 flex-col gap-2 text-[13.5px]">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" /> {f}
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-border pt-3 text-xs text-muted">
              {p.clients} {p.clients === 1 ? 'cliente usa' : 'clientes usam'} este plano
            </p>
          </Card>
        ))}
      </div>

      <Card className="mt-4 p-5">
        <p className="font-semibold">Regras gerais das licenças</p>
        <div className="mt-3 grid gap-3 text-[13.5px] sm:grid-cols-3">
          <Rule label="Teste grátis" value="7 dias" />
          <Rule label="Carência após vencer" value="3 dias" />
          <Rule label="Funcionamento sem internet" value="7 dias" />
        </div>
      </Card>
    </Page>
  )
}

function Rule({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-bold">{value}</p>
    </div>
  )
}
