import { Check, MessageCircle, Plus, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Badge, Card } from '@/components/ui/misc'
import { useData } from '@/lib/data'
import { isWebApp, supabase } from '@/lib/supabase'
import { useTenantId } from '@/lib/tenant'

interface Charge {
  id: string
  customer_name: string
  customer_phone: string
  description: string
  amount: number
  due_date: string | null
  method: string
  pay_link: string | null
  status: 'pendente' | 'pago' | 'cancelado'
}

const money = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const METHODS: Record<string, string> = { pix: 'Pix', boleto: 'Boleto', cartao: 'Cartão', dinheiro: 'Dinheiro', outro: 'Outro' }
const day = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : 'sem data')
const today = () => new Date().toISOString().slice(0, 10)

function whatsappLink(c: Charge) {
  let phone = c.customer_phone.replace(/\D/g, '')
  if (phone && !phone.startsWith('55')) phone = `55${phone}`
  const parts = [`Olá, ${c.customer_name.split(' ')[0]}! Passando para lembrar da cobrança${c.description ? ` de ${c.description}` : ''}: ${money(c.amount)}${c.due_date ? `, com vencimento em ${day(c.due_date)}` : ''}.`]
  if (c.pay_link) parts.push(`Pague por aqui (${METHODS[c.method] ?? 'Pix'}): ${c.pay_link}`)
  return `https://wa.me/${phone}?text=${encodeURIComponent(parts.join('\n'))}`
}

/** Cobranças do cliente final: registre, mande o lembrete pelo WhatsApp e marque como pago. */
export function ChargesPage() {
  const tenantId = useTenantId()
  const { contacts } = useData()
  const [list, setList] = useState<Charge[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<'pendente' | 'pago' | 'todas'>('pendente')

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    const { data, error } = await supabase.schema('ic_chat').from('charges').select('*').order('due_date', { ascending: true, nullsFirst: false })
    if (error) toast.error('Não foi possível carregar as cobranças')
    setList(((data ?? []) as Charge[]).map((c) => ({ ...c, amount: Number(c.amount) })))
    setLoading(false)
  }, [])
  useEffect(() => { void load() }, [load])

  const shown = useMemo(() => list.filter((c) => (filter === 'todas' ? c.status !== 'cancelado' : c.status === filter)), [list, filter])
  const pending = list.filter((c) => c.status === 'pendente')
  const overdue = pending.filter((c) => c.due_date && c.due_date < today())
  const received = list.filter((c) => c.status === 'pago').reduce((s, c) => s + c.amount, 0)

  const setStatus = async (c: Charge, status: Charge['status']) => {
    if (!supabase) return
    const { error } = await supabase.schema('ic_chat').from('charges').update({ status, paid_at: status === 'pago' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', c.id)
    if (error) toast.error('Não foi possível atualizar')
    else { toast.success(status === 'pago' ? 'Cobrança marcada como paga' : 'Cobrança cancelada'); void load() }
  }

  const create = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!supabase || !tenantId) return
    const f = new FormData(e.currentTarget)
    const amount = Number(String(f.get('amount')).replace(/\./g, '').replace(',', '.'))
    if (!(amount > 0)) { toast.error('Informe um valor maior que zero'); return }
    const { error } = await supabase.schema('ic_chat').from('charges').insert({
      tenant_id: tenantId,
      customer_name: String(f.get('name')).trim(),
      customer_phone: String(f.get('phone') ?? '').trim(),
      description: String(f.get('description') ?? '').trim(),
      amount,
      due_date: String(f.get('due') ?? '') || null,
      method: String(f.get('method')),
      pay_link: String(f.get('link') ?? '').trim() || null
    })
    if (error) { toast.error('Não foi possível criar a cobrança'); return }
    toast.success('Cobrança criada')
    setOpen(false)
    void load()
  }

  const field = 'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary'

  if (!isWebApp) return <Page title="Cobranças" description="Disponível na versão online do IC Chat."><Card className="p-6 text-sm text-muted">Entre pelo site para registrar e acompanhar cobranças.</Card></Page>

  return (
    <Page title="Cobranças" description="Registre o que seus clientes devem, lembre pelo WhatsApp e acompanhe o que já entrou." actions={<Button onClick={() => setOpen(true)}><Plus /> Nova cobrança</Button>}>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-[12px] text-muted">A receber</p><p className="mt-1 text-xl font-bold tabular-nums">{money(pending.reduce((s, c) => s + c.amount, 0))}</p><p className="text-[12px] text-subtle">{pending.length} em aberto</p></Card>
        <Card className="p-4"><p className="text-[12px] text-muted">Atrasadas</p><p className="mt-1 text-xl font-bold tabular-nums text-danger">{overdue.length}</p><p className="text-[12px] text-subtle">{money(overdue.reduce((s, c) => s + c.amount, 0))}</p></Card>
        <Card className="p-4"><p className="text-[12px] text-muted">Recebido</p><p className="mt-1 text-xl font-bold tabular-nums text-success">{money(received)}</p><p className="text-[12px] text-subtle">total já pago</p></Card>
      </div>

      <div className="mb-3 flex gap-1.5" role="tablist" aria-label="Filtrar cobranças">
        {(['pendente', 'pago', 'todas'] as const).map((k) => (
          <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)} className={`h-8 rounded-full px-4 text-[13px] font-medium ${filter === k ? 'bg-primary text-white' : 'bg-surface-2 text-muted hover:text-foreground'}`}>
            {k === 'pendente' ? 'Em aberto' : k === 'pago' ? 'Pagas' : 'Todas'}
          </button>
        ))}
      </div>

      {loading ? <p className="py-10 text-center text-sm text-muted">Carregando…</p> : shown.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">Nenhuma cobrança aqui. Clique em “Nova cobrança” para começar.</Card>
      ) : (
        <div className="space-y-2">
          {shown.map((c) => {
            const late = c.status === 'pendente' && c.due_date && c.due_date < today()
            return (
              <Card key={c.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{c.customer_name}</p>
                  <p className="truncate text-[12.5px] text-muted">{c.description || 'Sem descrição'} · {METHODS[c.method]} · vence {day(c.due_date)}</p>
                </div>
                <p className="text-base font-bold tabular-nums">{money(c.amount)}</p>
                <Badge tone={c.status === 'pago' ? 'success' : late ? 'danger' : 'warning'}>{c.status === 'pago' ? 'Paga' : late ? 'Atrasada' : c.status === 'cancelado' ? 'Cancelada' : 'Em aberto'}</Badge>
                {c.status === 'pendente' && (
                  <div className="flex gap-1.5">
                    {c.customer_phone && <a href={whatsappLink(c)} target="_blank" rel="noreferrer" aria-label={`Cobrar ${c.customer_name} no WhatsApp`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-success px-3 text-[13px] font-medium text-white hover:opacity-90"><MessageCircle className="size-4" /> Cobrar</a>}
                    <Button size="sm" variant="outline" onClick={() => void setStatus(c, 'pago')}><Check /> Recebi</Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Cancelar cobrança" onClick={() => void setStatus(c, 'cancelado')}><Trash2 /></Button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Nova cobrança">
          <form onSubmit={create} className="w-full max-w-md space-y-3 rounded-2xl border border-border bg-surface p-5 shadow-(--shadow-pop)">
            <div className="flex items-center justify-between"><h3 className="text-base font-bold">Nova cobrança</h3><button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="rounded-md p-1 text-subtle hover:text-foreground"><X className="size-4" /></button></div>
            <select aria-label="Escolher um contato" className={field} defaultValue="" onChange={(e) => { const c = contacts.find((x) => x.id === e.target.value); const form = e.currentTarget.form!; if (c) { (form.elements.namedItem('name') as HTMLInputElement).value = c.name; (form.elements.namedItem('phone') as HTMLInputElement).value = c.phone } }}>
              <option value="">Escolher um contato (opcional)</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input name="name" required placeholder="Nome do cliente" aria-label="Nome do cliente" className={field} />
            <input name="phone" placeholder="WhatsApp com DDD" aria-label="WhatsApp do cliente" className={field} />
            <input name="description" placeholder="Pelo quê? Ex.: corte + escova" aria-label="Descrição" className={field} />
            <div className="grid grid-cols-2 gap-3">
              <input name="amount" required placeholder="Valor (R$)" inputMode="decimal" aria-label="Valor" className={field} />
              <input name="due" type="date" aria-label="Vencimento" className={field} />
            </div>
            <select name="method" aria-label="Forma de pagamento" className={field} defaultValue="pix">{Object.entries(METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <input name="link" placeholder="Link de pagamento ou chave Pix (opcional)" aria-label="Link de pagamento ou chave Pix" className={field} />
            <div className="flex justify-end gap-2 pt-1"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit">Criar cobrança</Button></div>
          </form>
        </div>
      )}
    </Page>
  )
}
