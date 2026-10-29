import { useState } from 'react'
import { useNavigate } from 'react-router'
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
import { Activity, Bot, CalendarCheck, CheckCircle2, Clock, Hand, Hourglass, Inbox, Plus, Sparkles } from 'lucide-react'
import { ChannelBadge } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { Avatar, Segmented, Tooltip } from '@/components/ui/misc'
import { Dialog, Sheet } from '@/components/ui/overlay'
import { Field, Input, Select } from '@/components/ui/input'
import { toast } from 'sonner'
import { TagChip } from '@/components/tags'
import { useTags } from '@/lib/tags'
import { cn } from '@/lib/utils'
import { contactById, kanban as demoCards, userById, type Conversation, type ConversationStatus, type KanbanCard, type KanbanStage } from '@/data/mock'
import { useData } from '@/lib/data'
import { isWebApp } from '@/lib/supabase'

// Etapa do Kanban a partir do status da conversa (e o caminho inverso ao arrastar)
const STAGE_OF: Record<ConversationStatus, KanbanStage> = { nova: 'nova', ia: 'ia', aguardando: 'aguardando', humano: 'humano', resolvida: 'concluido' }
const STATUS_OF: Record<KanbanStage, ConversationStatus> = { nova: 'nova', ia: 'ia', aguardando: 'aguardando', humano: 'humano', agendado: 'aguardando', concluido: 'resolvida' }

function toCard(conv: Conversation): KanbanCard {
  const demo = demoCards.find((k) => k.conversationId === conv.id)
  return {
    id: conv.id,
    conversationId: conv.id,
    stage: conv.kanbanStage ?? demo?.stage ?? STAGE_OF[conv.status],
    summary: demo?.summary ?? conv.lastMessage,
    since: conv.lastTime,
    aiSteps: demo?.aiSteps
  }
}

const STAGES: { id: KanbanStage; label: string; icon: typeof Bot; accent: string }[] = [
  { id: 'nova', label: 'Nova conversa', icon: Inbox, accent: 'bg-primary' },
  { id: 'ia', label: 'IA atendendo', icon: Bot, accent: 'bg-violet-500' },
  { id: 'aguardando', label: 'Aguardando cliente', icon: Hourglass, accent: 'bg-slate-400' },
  { id: 'humano', label: 'Precisa de humano', icon: Hand, accent: 'bg-warning' },
  { id: 'agendado', label: 'Agendado', icon: CalendarCheck, accent: 'bg-teal-500' },
  { id: 'concluido', label: 'Concluído', icon: CheckCircle2, accent: 'bg-success' }
]

const DEMO_FEED_ITEMS = [
  { time: '09:42', text: 'Respondeu Fernanda com o preço da escova', kind: 'reply' },
  { time: '09:41', text: 'Consultou tabela de preços (Escova)', kind: 'tool' },
  { time: '09:35', text: 'Transferiu Maria Silva para Luís (pediu humano)', kind: 'handoff' },
  { time: '09:01', text: 'Detectou reclamação de Gabriel e priorizou', kind: 'handoff' },
  { time: 'ontem', text: 'Criou agendamento: Camila · Hidratação qui 15h', kind: 'booking' },
  { time: 'ontem', text: 'Sincronizou evento no Google Agenda do Diego', kind: 'tool' }
]

// Na versão web só entra atividade real da IA (nada de exemplos)
const FEED: typeof DEMO_FEED_ITEMS = isWebApp ? [] : DEMO_FEED_ITEMS

export function KanbanPage() {
  // Um cartão por conversa (reais no app instalado, exemplos no navegador)
  const { conversations, updateConversation } = useData()
  const cards = conversations.map(toCard)
  const [filter, setFilter] = useState<'todos' | 'ia' | 'equipe'>('todos')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [feedOpen, setFeedOpen] = useState(false)
  const [newOpen, setNewOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  )

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const stage = e.over?.id as KanbanStage | undefined
    if (!stage) return
    updateConversation(String(e.active.id), { kanbanStage: stage, status: STATUS_OF[stage] })
  }

  const visible = cards.filter((c) => {
    const conv = conversations.find((v) => v.id === c.conversationId)
    if (!conv) return false
    if (filter === 'ia') return conv.aiEnabled
    if (filter === 'equipe') return !conv.aiEnabled
    return true
  })
  const active = cards.find((c) => c.id === activeId)

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-surface px-4 py-3 md:px-6">
          <div className="mr-auto">
            <p className="text-[15px] font-semibold">Funil de atendimento</p>
            <p className="text-xs text-muted">Os cartões andam sozinhos conforme a IA e a equipe trabalham. Arraste para mover.</p>
          </div>
          <Segmented
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'todos', label: 'Todos' },
              { value: 'ia', label: 'Com IA' },
              { value: 'equipe', label: 'Só equipe' }
            ]}
          />
          <Button size="sm" onClick={() => setNewOpen(true)}><Plus /> Novo cartão</Button>
          <Button variant="outline" size="sm" className="2xl:hidden" onClick={() => setFeedOpen(true)}>
            <Activity /> Atividade da IA
          </Button>
        </div>

        <DndContext sensors={sensors} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
          <div className="scroll-thin flex flex-1 snap-x snap-mandatory gap-3 overflow-x-auto p-4 md:snap-none md:px-6">
            {STAGES.map((s) => (
              <Column key={s.id} stage={s} cards={visible.filter((c) => c.stage === s.id)} />
            ))}
          </div>
          <DragOverlay>{active ? <CardView card={active} dragging /> : null}</DragOverlay>
        </DndContext>
      </div>

      <aside className="hidden w-[320px] shrink-0 flex-col border-l border-border bg-surface 2xl:flex">
        <AiFeed />
      </aside>
      <NewCardDialog open={newOpen} onOpenChange={setNewOpen} />
      <Sheet open={feedOpen} onOpenChange={setFeedOpen} title="Atividade da IA">
        <AiFeed />
      </Sheet>
    </div>
  )
}

/** Cartão manual: o atendente cria o cliente (ou escolhe um existente) e já escolhe a etapa e se a IA atende. */
function NewCardDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { addContact, openConversation, updateConversation, findContactByPhone } = useData()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [stage, setStage] = useState<KanbanStage>('nova')
  const [ai, setAi] = useState(false)
  const digits = phone.replace(/\D/g, '')
  const existing = digits.length >= 8 ? findContactByPhone(phone) : undefined
  const valid = (existing || name.trim().length >= 2) && digits.length >= 10
  const reset = () => { setName(''); setPhone(''); setNote(''); setStage('nova'); setAi(false) }

  const save = () => {
    const contact = existing ?? addContact({ name: name.trim(), phone: digits.startsWith('55') ? digits : `55${digits}`, tags: [] })
    const id = openConversation(contact.id)
    updateConversation(id, { kanbanStage: stage, status: STATUS_OF[stage], aiEnabled: ai, ...(note.trim() ? { lastMessage: note.trim() } : {}) })
    toast.success('Cartão criado', { description: `${contact.name} · ${STAGES.find((s) => s.id === stage)?.label}` })
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Novo cartão"
      description="Crie um atendimento na mão, sem depender da IA."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!valid} onClick={save}><Plus /> Criar cartão</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="WhatsApp do cliente" hint={existing ? <span className="text-success">Cliente já cadastrado: {existing.name}</span> : 'Com DDD'}>
          <Input autoFocus value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 90000-0000" />
        </Field>
        <Field label="Nome">
          <Input value={existing ? existing.name : name} disabled={Boolean(existing)} onChange={(e) => setName(e.target.value)} placeholder="Nome do cliente" />
        </Field>
        <Field label="Etapa">
          <Select value={stage} onChange={(e) => setStage(e.target.value as KanbanStage)}>
            {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Select>
        </Field>
        <Field label="Quem atende">
          <Select value={ai ? 'ia' : 'equipe'} onChange={(e) => setAi(e.target.value === 'ia')}>
            <option value="equipe">Só a equipe</option>
            <option value="ia">IA atende</option>
          </Select>
        </Field>
        <Field label="Observação (opcional)" className="sm:col-span-2">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: pediu orçamento de escova progressiva" />
        </Field>
      </div>
    </Dialog>
  )
}

function Column({ stage, cards }: { stage: (typeof STAGES)[number]; cards: KanbanCard[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const Icon = stage.icon
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-[82vw] max-w-[300px] shrink-0 snap-center flex-col rounded-2xl bg-surface-2/70 transition-colors sm:w-[280px]',
        isOver && 'bg-primary-soft ring-2 ring-primary/40'
      )}
    >
      <div className="flex items-center gap-2 px-3.5 pt-3.5 pb-2.5">
        <span className={cn('size-2 rounded-full', stage.accent)} />
        <Icon className="size-4 text-muted" />
        <p className="flex-1 text-[13.5px] font-semibold">{stage.label}</p>
        <span className="rounded-full bg-surface px-2 text-xs leading-5 font-semibold text-muted">{cards.length}</span>
      </div>
      <div className="scroll-thin flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {cards.map((c) => (
          <DraggableCard key={c.id} card={c} />
        ))}
        {cards.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-border py-8 text-center text-xs text-subtle">Solte um cartão aqui</div>
        )}
      </div>
    </div>
  )
}

function DraggableCard({ card }: { card: KanbanCard }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={cn('touch-manipulation', isDragging && 'opacity-30')}>
      <CardView card={card} />
    </div>
  )
}

function CardView({ card, dragging }: { card: KanbanCard; dragging?: boolean }) {
  const navigate = useNavigate()
  const { conversations, updateConversation } = useData()
  const conv = conversations.find((v) => v.id === card.conversationId)!
  const contact = contactById(conv.contactId)
  const agent = userById(conv.assignee)
  const { tagsOf, rulesOf } = useTags()
  const tags = tagsOf(conv.contactId)
  return (
    <div
      onDoubleClick={() => navigate(`/inbox?c=${conv.id}`)}
      className={cn(
        'cursor-grab rounded-xl border border-border bg-surface p-3 shadow-(--shadow-soft) transition-shadow hover:shadow-md active:cursor-grabbing',
        dragging && 'rotate-2 shadow-(--shadow-pop)',
        card.stage !== 'concluido' && rulesOf(conv.contactId).priority && 'border-l-[3px] border-l-danger'
      )}
    >
      <div className="flex items-center gap-2.5">
        <Avatar name={contact.name} size={30} badge={<ChannelBadge kind={conv.channel} size={14} />} />
        <p className="flex-1 truncate text-[13.5px] font-semibold">{contact.name}</p>
        <span className="flex items-center gap-1 text-[11px] text-subtle">
          <Clock className="size-3" /> {card.since}
        </span>
      </div>
      <p className="mt-2 text-[12.5px] leading-snug text-muted">{card.summary}</p>

      {card.aiSteps && (
        <ol className="mt-2.5 flex flex-col gap-1 border-l-2 border-violet-500/30 pl-2.5">
          {card.aiSteps.map((s, i) => (
            <li key={i} className="flex items-center gap-1.5 text-[11.5px] text-muted">
              <Sparkles className="size-3 shrink-0 text-violet-500" /> {s}
            </li>
          ))}
        </ol>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex min-w-0 flex-wrap gap-1">
          {tags.slice(0, 2).map((t) => (
            <TagChip key={t.id} tag={t} />
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {agent ? (
            <Avatar name={agent.name} size={22} />
          ) : !conv.aiEnabled ? (
            <span className="text-[10.5px] text-subtle">sem responsável</span>
          ) : null}
          <Tooltip
            content={conv.aiEnabled ? 'Pausar a IA neste atendimento' : 'Deixar a IA atender'}
            description={conv.aiEnabled ? 'A IA para de responder este cliente e a equipe assume. Você pode religar quando quiser.' : 'A IA volta a responder este cliente automaticamente.'}
          >
            <button
              type="button"
              aria-label={conv.aiEnabled ? 'Pausar a IA' : 'Ligar a IA'}
              aria-pressed={conv.aiEnabled}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); updateConversation(conv.id, { aiEnabled: !conv.aiEnabled }); toast.success(conv.aiEnabled ? 'IA pausada neste atendimento' : 'IA ligada neste atendimento') }}
              className={cn(
                'flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold transition-colors',
                conv.aiEnabled ? 'bg-violet-500/12 text-violet-600 hover:bg-violet-500/20 dark:text-violet-300' : 'bg-surface-2 text-muted hover:bg-border'
              )}
            >
              <Bot className="size-3" /> {conv.aiEnabled ? 'IA ligada' : 'IA pausada'}
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}

function AiFeed() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-500 opacity-60" />
          <span className="relative inline-flex size-2.5 rounded-full bg-violet-500" />
        </span>
        <p className="font-semibold">Atividade da IA</p>
        <span className="ml-auto text-xs text-muted">ao vivo</span>
      </div>
      <div className="grid grid-cols-3 gap-2 border-b border-border p-4 text-center">
        {[
          [isWebApp ? '0' : '14', 'conversas hoje'],
          [isWebApp ? '0' : '6', 'agendou'],
          [isWebApp ? '0' : '2', 'transferiu']
        ].map(([v, l]) => (
          <div key={l} className="rounded-xl bg-surface-2 py-2.5">
            <p className="text-lg font-bold">{v}</p>
            <p className="text-[10.5px] text-muted">{l}</p>
          </div>
        ))}
      </div>
      <ol className="scroll-thin flex-1 overflow-y-auto p-4">
        {FEED.map((f, i) => (
          <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
            {i < FEED.length - 1 && <span className="absolute top-7 bottom-0 left-[13px] w-px bg-border" />}
            <span
              className={cn(
                'z-10 flex size-7 shrink-0 items-center justify-center rounded-full [&_svg]:size-3.5',
                f.kind === 'booking' && 'bg-teal-500/15 text-teal-600',
                f.kind === 'handoff' && 'bg-warning-soft text-warning',
                f.kind === 'reply' && 'bg-violet-500/12 text-violet-600',
                f.kind === 'tool' && 'bg-surface-2 text-muted'
              )}
            >
              {f.kind === 'booking' ? <CalendarCheck /> : f.kind === 'handoff' ? <Hand /> : f.kind === 'reply' ? <Bot /> : <Sparkles />}
            </span>
            <div className="pt-0.5">
              <p className="text-[13px] leading-snug">{f.text}</p>
              <p className="mt-0.5 text-[11px] text-subtle">{f.time}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
