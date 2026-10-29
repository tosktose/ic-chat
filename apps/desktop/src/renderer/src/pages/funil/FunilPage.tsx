import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import { AlertTriangle, Plus, TrendingUp } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Avatar, Badge, Segmented } from '@/components/ui/misc'
import { StatCard, StatGrid } from '@/components/ui/stats'
import { cn } from '@/lib/utils'
import { useTeam, useUserById } from '@/lib/team'
import { useAppState } from '@/lib/app-state'
import { useData } from '@/lib/data'
import { Dialog } from '@/components/ui/overlay'
import { Field, Input, Select } from '@/components/ui/input'
import {
  ETAPAS,
  brl,
  estaParado,
  previsao,
  totalDaEtapa,
  type EtapaFunil,
  type Negocio,
  type OrigemNegocio
} from '@/data/funil'

/* ------------------------------------------------------------------ */
/* Cartão do negócio                                                    */
/* ------------------------------------------------------------------ */
function Cartao({ n, arrastando }: { n: Negocio; arrastando?: boolean }) {
  const { contactById } = useData()
  const contato = contactById(n.contactId)
  const userById = useUserById()
  const dono = userById(n.donoId)
  const parado = estaParado(n)
  return (
    <article
      className={cn(
        'rounded-lg border border-border bg-surface p-3 shadow-soft transition-colors',
        !arrastando && 'hover:border-border-strong',
        arrastando && 'rotate-2 cursor-grabbing'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{contato?.name ?? 'Contato'}</p>
        <span className="shrink-0 text-sm font-bold tabular-nums">{brl.format(n.valor)}</span>
      </div>
      <p className="mt-0.5 truncate text-xs text-muted">{n.titulo}</p>

      {n.proximaAcao && (
        <p className="mt-2 truncate text-xs text-muted">
          <span className="text-subtle">Próxima: </span>
          {n.proximaAcao}
        </p>
      )}
      {n.motivoPerda && <p className="mt-2 truncate text-xs text-danger">Perdido: {n.motivoPerda}</p>}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {dono && <Avatar name={dono.name} size={20} />}
          <span className="truncate text-[11px] text-subtle">{n.origem}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {parado && (
            <Badge tone="warning" title={`Parado há ${n.diasNaEtapa} dias nesta etapa`}>
              <AlertTriangle /> {n.diasNaEtapa}d
            </Badge>
          )}
          {n.etapa !== 'ganho' && n.etapa !== 'perdido' && (
            <span className="text-[11px] tabular-nums text-subtle">{n.probabilidade}%</span>
          )}
        </div>
      </div>
    </article>
  )
}

function CartaoArrastavel({ n }: { n: Negocio }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: n.id })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn('cursor-grab touch-none', isDragging && 'opacity-40')}
    >
      <Cartao n={n} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Coluna da etapa                                                      */
/* ------------------------------------------------------------------ */
function Coluna({
  etapa,
  label,
  accent,
  lista
}: {
  etapa: EtapaFunil
  label: string
  accent: string
  lista: Negocio[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa })
  const total = lista.reduce((s, n) => s + n.valor, 0)
  return (
    <section className="flex w-72 shrink-0 flex-col">
      <header className="mb-1 flex items-center gap-2 px-1">
        <span className={cn('size-2 shrink-0 rounded-full', accent)} />
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{label}</h3>
        <span className="shrink-0 text-xs tabular-nums text-subtle">{lista.length}</span>
      </header>
      <p className="mb-2 px-1 text-xs font-medium tabular-nums text-muted">{brl.format(total)}</p>
      <div
        ref={setNodeRef}
        className={cn(
          'scroll-thin flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto rounded-xl border border-dashed p-2 transition-colors',
          isOver ? 'border-primary bg-primary-soft' : 'border-border bg-surface-2'
        )}
      >
        {lista.map((n) => (
          <CartaoArrastavel key={n.id} n={n} />
        ))}
        {!lista.length && <p className="px-1 py-6 text-center text-xs text-subtle">Nenhum negócio aqui</p>}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Página                                                               */
/* ------------------------------------------------------------------ */
export function FunilPage() {
  const { deals: lista, contacts, updateDeal } = useData()
  const [dono, setDono] = useState('todos')
  const team = useTeam()
  const [arrastando, setArrastando] = useState<Negocio | null>(null)
  const [novoAberto, setNovoAberto] = useState(false)
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 6 } })
  )

  const visiveis = useMemo(
    () => (dono === 'todos' ? lista : lista.filter((n) => n.donoId === dono)),
    [lista, dono]
  )

  const emAberto = visiveis.filter((n) => n.etapa !== 'ganho' && n.etapa !== 'perdido')
  const ganhos = totalDaEtapa(visiveis, 'ganho')
  const parados = visiveis.filter(estaParado).length

  function aoSoltar(e: DragEndEvent) {
    setArrastando(null)
    const destino = e.over?.id as EtapaFunil | undefined
    if (!destino) return
    const moved = lista.find((n) => n.id === e.active.id)
    if (!moved) return
    updateDeal(moved.id, {
      etapa: destino,
      diasNaEtapa: 0,
      probabilidade: destino === 'ganho' ? 100 : destino === 'perdido' ? 0 : moved.probabilidade
    })
  }

  return (
    <Page
      wide
      title="Funil de vendas"
      description="Arraste o negócio entre as etapas. A previsão considera a chance de fechamento de cada um."
      actions={
        <>
          <Segmented
            value={dono}
            onChange={setDono}
            options={[
              { value: 'todos', label: 'Todos' },
              ...team.filter((u) => u.role !== 'superadmin').slice(0, 4).map((u) => ({ value: u.id, label: u.name.split(' ')[0] }))
            ]}
          />
          <Button onClick={() => setNovoAberto(true)} disabled={!contacts.length}>
            <Plus /> Novo negócio
          </Button>
        </>
      }
    >
      <StatGrid className="mb-5">
        <StatCard
          label="Em aberto"
          value={brl.format(emAberto.reduce((s, n) => s + n.valor, 0))}
          hint={`${emAberto.length} negócios no funil`}
          trend={[7.2, 8.1, 7.9, 9.4, 10.6, 11.2, 11.9]}
        />
        <StatCard
          icon={<TrendingUp />}
          label="Previsão ponderada"
          value={brl.format(previsao(visiveis))}
          hint="Pela chance de cada negócio"
          tone="primary"
          trend={[4.1, 4.6, 5.2, 5.0, 6.1, 6.4, 6.9]}
        />
        <StatCard
          label="Ganho no período"
          value={brl.format(ganhos)}
          hint={`${visiveis.filter((n) => n.etapa === 'ganho').length} fechados`}
          tone="success"
          trend={[0.3, 0.5, 0.5, 0.9, 1.0, 1.2, 1.3]}
        />
        <StatCard
          label="Parados"
          value={parados}
          hint="Passaram do prazo da etapa"
          tone={parados ? 'warning' : 'default'}
        />
      </StatGrid>

      <DndContext
        sensors={sensores}
        onDragStart={(e) => setArrastando(visiveis.find((n) => n.id === e.active.id) ?? null)}
        onDragCancel={() => setArrastando(null)}
        onDragEnd={aoSoltar}
      >
        <div className="scroll-thin flex h-[calc(100vh-22rem)] min-h-96 gap-3 overflow-x-auto pb-2">
          {ETAPAS.map((e) => (
            <Coluna
              key={e.id}
              etapa={e.id}
              label={e.label}
              accent={e.accent}
              lista={visiveis.filter((n) => n.etapa === e.id)}
            />
          ))}
        </div>
        <DragOverlay>{arrastando && <Cartao n={arrastando} arrastando />}</DragOverlay>
      </DndContext>
      <NovoNegocioDialog open={novoAberto} onClose={() => setNovoAberto(false)} />
    </Page>
  )
}

function NovoNegocioDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { contacts, addDeal } = useData()
  const [contactId, setContactId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [valor, setValor] = useState('')
  const [origem, setOrigem] = useState<OrigemNegocio>('Desconhecida')
  const [campanha, setCampanha] = useState('')
  const users = useTeam()
  const { me } = useAppState()
  const [donoId, setDonoId] = useState(me.id)
  const [etapa, setEtapa] = useState<EtapaFunil>('novo')
  const [proximaAcao, setProximaAcao] = useState('')
  const amount = Number(valor.replace(',', '.'))
  const valid = contactId && titulo.trim() && Number.isFinite(amount) && amount > 0
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()} title="Novo negócio" description="Registre a oportunidade e sua origem para acompanhar o funil e a atribuição." footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button disabled={!valid} onClick={() => {
      addDeal({ contactId, titulo: titulo.trim(), valor: amount, etapa, probabilidade: etapa === 'ganho' ? 100 : etapa === 'perdido' ? 0 : 25, donoId, origem, campanha: campanha.trim() || undefined, proximaAcao: proximaAcao.trim() || undefined })
      setContactId(''); setTitulo(''); setValor(''); setOrigem('Desconhecida'); setCampanha(''); setProximaAcao(''); setEtapa('novo'); onClose()
    }}>Salvar negócio</Button></>}>
      <div className="flex flex-col gap-4">
        <Field label="Contato"><Select value={contactId} onChange={(e) => setContactId(e.target.value)}><option value="">Selecione um contato</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.phone || 'sem telefone'}</option>)}</Select></Field>
        <Field label="Nome da oportunidade"><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Plano mensal de serviços" maxLength={120} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor (R$)"><Input type="number" min="0.01" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" /></Field>
          <Field label="Etapa"><Select value={etapa} onChange={(e) => setEtapa(e.target.value as EtapaFunil)}>{ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}</Select></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Origem do lead"><Select value={origem} onChange={(e) => setOrigem(e.target.value as OrigemNegocio)}>{(['Desconhecida', 'WhatsApp', 'Instagram', 'Indicação', 'Site'] as OrigemNegocio[]).map((o) => <option key={o}>{o}</option>)}</Select></Field>
          <Field label="Responsável"><Select value={donoId} onChange={(e) => setDonoId(e.target.value)}>{users.filter((u) => u.role !== 'superadmin').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field>
        </div>
        <Field label="Campanha (opcional)" hint="Preencha quando souber qual campanha gerou o contato."><Input value={campanha} onChange={(e) => setCampanha(e.target.value)} placeholder="Ex.: Instagram · Outubro" maxLength={100} /></Field>
        <Field label="Próxima ação (opcional)"><Input value={proximaAcao} onChange={(e) => setProximaAcao(e.target.value)} placeholder="Ex.: Enviar proposta até sexta" maxLength={160} /></Field>
        {!contacts.length && <p className="text-sm text-warning">Cadastre um contato antes de criar o negócio.</p>}
      </div>
    </Dialog>
  )
}
