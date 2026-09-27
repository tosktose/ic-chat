import { useMemo, useState } from 'react'
import { Bot, ListFilter, Search, SquarePen } from 'lucide-react'
import { ChannelBadge, channelLabel, type ChannelKind } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, Segmented } from '@/components/ui/misc'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from '@/components/ui/overlay'
import { cn } from '@/lib/utils'
import { useAppState } from '@/lib/app-state'
import { contactById, type Conversation, type ConversationStatus } from '@/data/mock'

type Tab = 'minhas' | 'fila' | 'todas'

export const statusMeta: Record<ConversationStatus, { label: string; cls: string }> = {
  nova: { label: 'Nova', cls: 'bg-primary-soft text-primary' },
  ia: { label: 'IA atendendo', cls: 'bg-violet-500/12 text-violet-600 dark:text-violet-300' },
  aguardando: { label: 'Aguardando cliente', cls: 'bg-surface-3 text-muted' },
  humano: { label: 'Precisa de humano', cls: 'bg-warning-soft text-warning' },
  resolvida: { label: 'Resolvida', cls: 'bg-success-soft text-success' }
}

export function ConversationList({
  selectedId,
  onSelect,
  conversations,
  className
}: {
  selectedId?: string
  onSelect: (id: string) => void
  conversations: Conversation[]
  className?: string
}) {
  const { role, me } = useAppState()
  const isAnalyst = role === 'analista'
  const [tab, setTab] = useState<Tab>(isAnalyst ? 'minhas' : 'todas')
  const [q, setQ] = useState('')
  const [channel, setChannel] = useState<ChannelKind | 'all'>('all')

  const counts = {
    minhas: conversations.filter((c) => c.assignee === me.id && c.status !== 'resolvida').length,
    fila: conversations.filter((c) => !c.assignee && c.status !== 'resolvida').length,
    todas: conversations.length
  }

  const list = useMemo(() => {
    return conversations.filter((c) => {
      if (tab === 'minhas' && c.assignee !== me.id) return false
      if (tab === 'fila' && c.assignee) return false
      if (channel !== 'all' && c.channel !== channel) return false
      if (q) {
        const contact = contactById(c.contactId)
        if (!(contact.name + c.lastMessage).toLowerCase().includes(q.toLowerCase())) return false
      }
      return true
    })
  }, [tab, q, channel, conversations, me.id])

  return (
    <section className={cn('flex min-h-0 flex-col border-r border-border bg-surface', className)}>
      <div className="flex flex-col gap-3 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <Input icon={<Search />} placeholder="Buscar conversa" value={q} onChange={(e) => setQ(e.target.value)} />
          <Menu>
            <MenuTrigger asChild>
              <Button variant={channel === 'all' ? 'outline' : 'soft'} size="icon" aria-label="Filtrar por canal">
                <ListFilter />
              </Button>
            </MenuTrigger>
            <MenuContent>
              <MenuLabel>Canal</MenuLabel>
              <MenuItem onSelect={() => setChannel('all')}>Todos os canais</MenuItem>
              {(['whatsapp', 'whatsapp_official', 'instagram', 'messenger', 'tiktok'] as ChannelKind[]).map((k) => (
                <MenuItem key={k} onSelect={() => setChannel(k)} icon={<ChannelBadge kind={k} size={18} className="ring-0" />}>
                  {channelLabel(k)}
                </MenuItem>
              ))}
            </MenuContent>
          </Menu>
          <Button size="icon" aria-label="Nova conversa">
            <SquarePen />
          </Button>
        </div>
        <Segmented
          value={tab}
          onChange={setTab}
          className="w-full"
          options={[
            { value: 'minhas', label: 'Minhas', count: counts.minhas },
            { value: 'fila', label: 'Fila', count: counts.fila },
            // Só o gerente vê todas as conversas da equipe
            ...(isAnalyst ? [] : [{ value: 'todas' as const, label: 'Todas', count: counts.todas }])
          ]}
        />
      </div>

      <div className="scroll-thin flex-1 overflow-y-auto px-2 pb-2">
        {list.length === 0 && <p className="px-4 py-10 text-center text-sm text-muted">Nenhuma conversa aqui 🎉</p>}
        {list.map((c) => (
          <ConversationRow key={c.id} conv={c} active={c.id === selectedId} onClick={() => onSelect(c.id)} />
        ))}
      </div>
    </section>
  )
}

function ConversationRow({ conv, active, onClick }: { conv: Conversation; active: boolean; onClick: () => void }) {
  const contact = contactById(conv.contactId)
  const status = statusMeta[conv.status]
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors',
        active ? 'bg-primary-soft' : 'hover:bg-surface-2'
      )}
    >
      <Avatar name={contact.name} size={44} badge={<ChannelBadge kind={conv.channel} size={18} />} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className={cn('flex-1 truncate text-[14px]', conv.unread ? 'font-semibold' : 'font-medium')}>{contact.name}</p>
          <span className={cn('shrink-0 text-[11px]', conv.unread ? 'font-semibold text-primary' : 'text-subtle')}>{conv.lastTime}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <p className={cn('flex-1 truncate text-[13px]', conv.unread ? 'text-foreground' : 'text-muted')}>{conv.lastMessage}</p>
          {conv.unread > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-white">
              {conv.unread}
            </span>
          )}
        </div>
        <div className="mt-2 flex min-w-0 items-center gap-1.5 overflow-hidden">
          <span className={cn('inline-flex h-5 items-center gap-1 rounded-full px-2 text-[10.5px] font-semibold whitespace-nowrap shrink-0', status.cls)}>
            {conv.status === 'ia' && <Bot className="size-3" />}
            {status.label}
          </span>
          {conv.tags.slice(0, 1).map((t) => (
            <span key={t} className="inline-flex h-5 min-w-0 items-center truncate rounded-full border border-border px-2 text-[10.5px] whitespace-nowrap text-muted">
              {t}
            </span>
          ))}
        </div>
      </div>
    </button>
  )
}
