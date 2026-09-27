import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  ArrowLeft,
  ArrowRightLeft,
  Bot,
  CheckCircle2,
  EllipsisVertical,
  MessageSquare,
  PanelRight,
  PanelRightClose,
  PanelRightOpen,
  Tag,
  UserCheck
} from 'lucide-react'
import { ChannelBadge, channelLabel } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { Avatar, EmptyState, Switch, Tooltip } from '@/components/ui/misc'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Sheet } from '@/components/ui/overlay'
import { useAppState } from '@/lib/app-state'
import { useNotifications } from '@/lib/notifications'
import { TAG_COLORS, useTags } from '@/lib/tags'
import { useMediaQuery } from '@/lib/use-media'
import { cn } from '@/lib/utils'
import { contactById, conversations, userById, users, type Message } from '@/data/mock'
import { Composer } from './Composer'
import { ContactPanel } from './ContactPanel'
import { ConversationList, statusMeta } from './ConversationList'
import { MessageBubble } from './MessageBubble'

export function InboxPage() {
  const [params, setParams] = useSearchParams()
  const { role, me } = useAppState()
  const isMdUp = useMediaQuery('(min-width: 768px)')
  const wide = useMediaQuery('(min-width: 1280px)')
  // Analista só vê as conversas dele e a fila; gerente vê todas
  const visible = role === 'analista' ? conversations.filter((c) => !c.assignee || c.assignee === me.id) : conversations
  // No desktop já abre a primeira conversa; no celular começa pela lista
  const selectedId = params.get('c') ?? (isMdUp ? visible[0]?.id : undefined)
  const [panelOpen, setPanelOpenState] = useState(() => {
    try {
      return localStorage.getItem('icchat.contactPanel') !== 'closed'
    } catch {
      return true
    }
  })
  const setPanelOpen = (v: boolean) => {
    setPanelOpenState(v)
    try {
      localStorage.setItem('icchat.contactPanel', v ? 'open' : 'closed')
    } catch {
      /* ignore */
    }
  }
  const [sheetOpen, setSheetOpen] = useState(false)

  const select = (id?: string) => {
    const next = new URLSearchParams(params)
    if (id) next.set('c', id)
    else next.delete('c')
    setParams(next, { replace: true })
  }

  const conv = visible.find((c) => c.id === selectedId)
  const panelVisible = wide ? panelOpen : sheetOpen

  return (
    <div className="flex h-full">
      <ConversationList
        selectedId={selectedId}
        onSelect={select}
        conversations={visible}
        className={cn('w-full md:w-[320px] xl:w-[360px] md:flex', conv ? 'hidden' : 'flex')}
      />

      {conv ? (
        <ChatPane
          key={conv.id}
          convId={conv.id}
          onBack={() => select(undefined)}
          panelVisible={panelVisible}
          onTogglePanel={() => (wide ? setPanelOpen(!panelOpen) : setSheetOpen(true))}
        />
      ) : (
        <div className="chat-pattern hidden flex-1 items-center justify-center md:flex">
          <EmptyState icon={<MessageSquare />} title="Selecione uma conversa" description="Escolha uma conversa na lista ao lado para começar o atendimento." />
        </div>
      )}

      {conv && wide && panelOpen && (
        <ContactPanel conv={conv} onCollapse={() => setPanelOpen(false)} className="w-[320px] shrink-0 border-l border-border 2xl:w-[340px]" />
      )}
      {conv && !wide && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen} title="Dados do cliente">
          <ContactPanel conv={conv} onClose={() => setSheetOpen(false)} className="h-full" />
        </Sheet>
      )}
    </div>
  )
}

function ChatPane({
  convId,
  onBack,
  onTogglePanel,
  panelVisible
}: {
  convId: string
  onBack: () => void
  onTogglePanel: () => void
  panelVisible: boolean
}) {
  const conv = conversations.find((c) => c.id === convId)!
  const contact = contactById(conv.contactId)
  const { license, me, signature, myDisplayName, resolveUser } = useAppState()
  const { notify } = useNotifications()
  const { rulesOf } = useTags()
  const tagRules = rulesOf(conv.contactId)
  const [messages, setMessages] = useState<Message[]>(conv.messages)
  const [aiOn, setAiOn] = useState(conv.aiEnabled)
  const [assignee, setAssignee] = useState(conv.assignee)
  const endRef = useRef<HTMLDivElement>(null)
  const status = statusMeta[conv.status]
  const agent = resolveUser(userById(assignee))

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  // Regra "IA não responde": desliga a IA desta conversa enquanto a etiqueta existir
  useEffect(() => {
    if (tagRules.pauseAi) setAiOn(false)
  }, [tagRules.pauseAi])

  // Regra "Direcionar para": quando a etiqueta é aplicada, a conversa vai para o analista definido
  const lastAssignRule = useRef(tagRules.assignTo)
  useEffect(() => {
    const target = tagRules.assignTo
    if (target && target !== lastAssignRule.current && target !== assignee) {
      const u = resolveUser(userById(target))
      setAssignee(target)
      setMessages((m) => [...m, { id: crypto.randomUUID(), from: 'system', kind: 'system', text: `Etiqueta direcionou a conversa para ${u?.name.split(' ')[0]}`, time: now() }])
    }
    lastAssignRule.current = target
  }, [tagRules.assignTo])

  const now = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const firstName = (n: string) => n.split(' ')[0]

  // O WhatsApp é um só (da empresa); o que muda é quem responde. Fica registrado na conversa.
  const assignTo = (userId: string) => {
    const target = resolveUser(userById(userId))!
    const text =
      userId === me.id
        ? `${myDisplayName} assumiu o atendimento`
        : `${myDisplayName} transferiu para ${firstName(target.name)}`
    setAssignee(userId)
    setMessages((m) => [...m, { id: crypto.randomUUID(), from: 'system', kind: 'system', text, time: now() }])
    if (userId !== me.id) {
      notify({ kind: 'equipe', title: 'Conversa transferida', body: `${contact.name} agora está com ${firstName(target.name)}.`, link: `/inbox?c=${conv.id}` })
    }
  }

  const send = (text: string, note: boolean) => {
    // Quem responde sem ter assumido passa a ser o responsável
    if (!note && assignee !== me.id) assignTo(me.id)
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), from: 'agent', author: myDisplayName, kind: note ? 'note' : 'text', text, time: now(), status: 'sent' }
    ])
  }

  return (
    <section className="@container flex min-w-0 flex-1 flex-col">
      {/* Cabeçalho da conversa — se adapta à largura do próprio painel (container query) */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-surface px-2 md:px-4">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack} aria-label="Voltar para a lista">
          <ArrowLeft />
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button onClick={onTogglePanel} className="flex min-w-0 items-center gap-3 rounded-lg p-1 text-left hover:bg-surface-2 @lg:pr-3">
            <Avatar name={contact.name} size={40} badge={<ChannelBadge kind={conv.channel} size={17} />} />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">{contact.name}</p>
              <p className="truncate text-xs text-muted">
                {channelLabel(conv.channel)} · {agent ? `com ${agent.name.split(' ')[0]}` : 'sem responsável'}
              </p>
            </div>
          </button>
          <span
            className={cn(
              'hidden h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11.5px] font-semibold whitespace-nowrap @2xl:inline-flex',
              status.cls
            )}
          >
            {status.label}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Tooltip
            content={tagRules.pauseAi ? 'IA bloqueada por etiqueta' : aiOn ? 'IA respondendo nesta conversa' : 'IA pausada nesta conversa'}
            description={tagRules.pauseAi ? 'Uma etiqueta do cliente manda a conversa direto para a equipe' : undefined}
            side="bottom"
          >
            <label className="hidden cursor-pointer items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-[12.5px] font-medium whitespace-nowrap @md:flex">
              <Bot className={cn('size-4', aiOn ? 'text-violet-500' : 'text-subtle')} />
              <span className="hidden @3xl:inline">IA</span>
              <Switch checked={aiOn} onCheckedChange={(v) => !tagRules.pauseAi && setAiOn(v)} aria-label="IA nesta conversa" />
            </label>
          </Tooltip>

          {assignee !== me.id ? (
            <Button size="sm" onClick={() => assignTo(me.id)} className="hidden @md:inline-flex">
              <UserCheck /> Assumir
            </Button>
          ) : (
            <Button size="sm" variant="success" className="hidden @md:inline-flex">
              <CheckCircle2 /> Resolver
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="hidden md:inline-flex"
            onClick={onTogglePanel}
            aria-label={panelVisible ? 'Recolher dados do cliente' : 'Mostrar dados do cliente'}
            tooltipSide="bottom"
          >
            {panelVisible ? <PanelRightClose /> : <PanelRightOpen />}
          </Button>

          <Menu>
            <MenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Mais ações" tooltipSide="bottom">
                <EllipsisVertical />
              </Button>
            </MenuTrigger>
            <MenuContent>
              <div className="@md:hidden">
                <MenuItem icon={<UserCheck />} onSelect={() => assignTo(me.id)}>Assumir conversa</MenuItem>
                <MenuItem icon={<CheckCircle2 />}>Marcar como resolvida</MenuItem>
                <MenuItem icon={<Bot />} onSelect={() => setAiOn((v) => !v)}>{aiOn ? 'Pausar IA' : 'Ativar IA'}</MenuItem>
                <MenuSeparator />
              </div>
              <MenuLabel>Transferir para</MenuLabel>
              {users
                .filter((u) => u.id !== assignee && u.role === 'analista')
                .map((u) => (
                  <MenuItem key={u.id} icon={<ArrowRightLeft />} onSelect={() => assignTo(u.id)}>
                    {resolveUser(u).name}
                  </MenuItem>
                ))}
              <MenuSeparator />
              <MenuItem icon={<Tag />}>Adicionar etiqueta</MenuItem>
              <MenuItem icon={<PanelRight />} onSelect={onTogglePanel}>Dados do cliente</MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </header>

      {/* Avisos fixos das etiquetas do cliente */}
      {tagRules.alerts.length > 0 && (
        <div className="flex flex-col gap-1 border-b border-border bg-surface px-3 py-2 md:px-4">
          {tagRules.alerts.map((a) => (
            <div key={a.tag.id} className={cn('flex items-start gap-2 rounded-lg px-3 py-1.5 text-[12.5px] font-medium', TAG_COLORS[a.tag.color].chip)}>
              <span className="mt-[5px] size-1.5 shrink-0 rounded-full bg-current" />
              <span><b>{a.tag.name}:</b> {a.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Mensagens */}
      <div className="chat-pattern scroll-thin flex-1 overflow-y-auto px-3 py-4 md:px-8">
        <div className="mx-auto flex max-w-3xl flex-col">
          {messages.map((m) => (
            <div key={m.id}>
              {m.day && (
                <div className="my-3 flex justify-center">
                  <span className="rounded-lg bg-surface px-3 py-1 text-[11.5px] font-semibold text-muted shadow-sm">{m.day}</span>
                </div>
              )}
              <MessageBubble msg={m} />
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      <Composer
        disabled={license.state === 'restrito'}
        onSend={send}
        senderName={signature ? myDisplayName : undefined}
        companyNumber="(11) 98765-4321"
      />
    </section>
  )
}
