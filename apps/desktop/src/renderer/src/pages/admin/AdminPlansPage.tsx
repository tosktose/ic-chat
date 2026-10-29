import { useEffect, useState } from 'react'
import { Check, Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { Badge, Card, Switch } from '@/components/ui/misc'
import { Dialog } from '@/components/ui/overlay'
import { useSaas, type PlanDef } from '@/lib/saas'
import { brl, cn } from '@/lib/utils'
import type { Plan } from '@/data/saas'
import { isWebApp } from '@/lib/supabase'

export function AdminPlansPage() {
  const { plans, tenants } = useSaas()
  const [editing, setEditing] = useState<PlanDef | 'new' | null>(null)

  return (
    <Page
      title="Planos"
      description="O que cada plano libera. Mudanças valem para novas chaves e renovações."
      actions={isWebApp ? undefined : <Button onClick={() => setEditing('new')}><Plus /> Novo plano</Button>}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((p) => {
          const clients = tenants.filter((t) => t.plan === p.name).length
          return (
            <Card key={p.name} className={cn('flex flex-col p-5', p.highlight && 'ring-2 ring-primary')}>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold">{p.name}</p>
                {p.highlight && <Badge tone="primary">Mais vendido</Badge>}
                <Button variant="ghost" size="icon-sm" className="ml-auto" aria-label={`Editar plano ${p.name}`} onClick={() => setEditing(p)}>
                  <Pencil />
                </Button>
              </div>
              <p className="mt-3">
                <span className="text-3xl font-bold tracking-tight">{brl.format(p.price)}</span>
                <span className="text-sm text-muted"> /mês</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge>{p.mode}</Badge>
                <Badge>{p.pcs ? `${p.pcs} PCs` : 'PCs ilimitados'}</Badge>
                <Badge>{p.users ? `${p.users} usuários` : 'Usuários ilimitados'}</Badge>
              </div>
              <ul className="mt-4 flex flex-1 flex-col gap-2 text-[13.5px]">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" /> {f}
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-border pt-3 text-xs text-muted">
                {clients} {clients === 1 ? 'empresa usa' : 'empresas usam'} este plano
              </p>
            </Card>
          )
        })}
      </div>

      <Card className="mt-4 p-5">
        <p className="font-semibold">Regras gerais das licenças</p>
        <div className="mt-3 grid gap-3 text-[13.5px] sm:grid-cols-3">
          {[
            ['Teste grátis', '7 dias'],
            ['Carência após vencer', '3 dias'],
            ['Funcionamento sem internet', '7 dias']
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-surface-2 p-3">
              <p className="text-xs text-muted">{l}</p>
              <p className="mt-0.5 text-lg font-bold">{v}</p>
            </div>
          ))}
        </div>
      </Card>

      <PlanDialog item={editing} onClose={() => setEditing(null)} />
    </Page>
  )
}

function PlanDialog({ item, onClose }: { item: PlanDef | 'new' | null; onClose: () => void }) {
  const { savePlan, plans } = useSaas()
  const empty: PlanDef = { name: '' as Plan, price: 0, mode: 'Local (SQLite)', pcs: 3, users: 3, features: [] }
  const [f, setF] = useState<PlanDef>(empty)
  const [features, setFeatures] = useState('')
  useEffect(() => {
    if (!item) return
    const base = item === 'new' ? empty : item
    setF(base)
    setFeatures(base.features.join('\n'))
  }, [item])
  const original = item && item !== 'new' ? item.name : undefined
  const taken = plans.some((p) => p.name.toLowerCase() === f.name.trim().toLowerCase() && p.name !== original)
  const valid = f.name.trim() && f.price >= 0 && !taken

  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={(v) => !v && onClose()}
      title={item === 'new' ? 'Novo plano' : `Editar plano ${original}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!valid}
            onClick={() => {
              savePlan({ ...f, name: f.name.trim() as Plan, features: features.split('\n').map((x) => x.trim()).filter(Boolean) }, original)
              toast.success('Plano salvo', { description: f.name })
              onClose()
            }}
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" hint={taken ? <span className="text-danger">Já existe um plano com esse nome</span> : undefined}>
          <Input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value as Plan })} />
        </Field>
        <Field label="Preço mensal (R$)"><Input type="number" min={0} value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} /></Field>
        <Field label="Modalidade">
          <Select value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })}>
            <option>Local (SQLite)</option>
            <option>Local ou Nuvem</option>
            <option>Nuvem (Supabase)</option>
          </Select>
        </Field>
        <Field label="Limite de PCs" hint="0 = ilimitado">
          <Input type="number" min={0} value={f.pcs ?? 0} onChange={(e) => setF({ ...f, pcs: Number(e.target.value) || null })} />
        </Field>
        <Field label="Limite de usuários" hint="0 = ilimitado">
          <Input type="number" min={0} value={f.users ?? 0} onChange={(e) => setF({ ...f, users: Number(e.target.value) || null })} />
        </Field>
        <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
          <span className="text-[13.5px] font-medium">Destacar como “Mais vendido”</span>
          <Switch checked={Boolean(f.highlight)} onCheckedChange={(v) => setF({ ...f, highlight: v })} />
        </label>
        <Field label="Recursos (um por linha)" className="sm:col-span-2">
          <Textarea className="min-h-28" value={features} onChange={(e) => setFeatures(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  )
}
