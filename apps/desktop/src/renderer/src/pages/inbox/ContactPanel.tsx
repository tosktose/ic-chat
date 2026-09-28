import { useState } from 'react'
import { useContactStats } from '@/lib/metrics'
import type { ReactNode } from 'react'
import { CalendarPlus, Cake, Clock, Mail, PanelRightClose, Phone, Plus, Scissors, StickyNote, X } from 'lucide-react'
import { toast } from 'sonner'
import { ChannelBadge, channelLabel } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { Avatar, Badge, Tooltip } from '@/components/ui/misc'
import { ruleList, TagChip, TagPicker } from '@/components/tags'
import { useAppState } from '@/lib/app-state'
import { useNotifications } from '@/lib/notifications'
import { useTags } from '@/lib/tags'
import { brl, cn, formatPhone } from '@/lib/utils'
import { TODAY, type Conversation } from '@/data/mock'
import { useData } from '@/lib/data'
import { Select, Textarea } from '@/components/ui/input'
import { useCompany } from '@/lib/company'

export function ContactPanel({
  conv,
  onClose,
  onCollapse,
  className
}: {
  conv: Conversation
  /** Fecha a gaveta (telas menores) */
  onClose?: () => void
  /** Recolhe o painel fixo (telas grandes) */
  onCollapse?: () => void
  className?: string
}) {
  const stats = useContactStats()
  const { appointments, openNewAppointment, role } = useAppState()
  const { professionalById, professionals } = useCompany()
  const { contactById, updateContact } = useData()
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesDraft, setNotesDraft] = useState('')
  const { tagsOf, toggleContactTag } = useTags()
  const { notify } = useNotifications()
  const contact = contactById(conv.contactId)
  const tags = tagsOf(contact.id)
  const fav = professionalById(contact.favoriteProfessional)
  const next = appointments
    .filter((a) => a.contactId === contact.id && a.status !== 'concluido' && a.status !== 'faltou')
    .sort((a, b) => ((a.date ?? TODAY) + a.start).localeCompare((b.date ?? TODAY) + b.start))[0]
  const nextPro = professionalById(next?.professionalId)

  const st = stats(contact)
  return (
    <aside className={cn('scroll-thin flex flex-col overflow-y-auto bg-surface', className)}>
      <div className="relative flex flex-col items-center px-5 pt-6 pb-5 text-center">
        {onClose && (
          <Tooltip content="Fechar" shortcut="Esc" side="left">
            <button onClick={onClose} className="absolute top-3 right-3 rounded-md p-1.5 text-muted hover:bg-surface-2" aria-label="Fechar">
              <X className="size-4" />
            </button>
          </Tooltip>
        )}
        {onCollapse && (
          <Tooltip content="Recolher painel" side="left">
            <button onClick={onCollapse} className="absolute top-3 right-3 rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-foreground" aria-label="Recolher painel">
              <PanelRightClose className="size-4" />
            </button>
          </Tooltip>
        )}
        <Avatar name={contact.name} size={76} badge={<ChannelBadge kind={conv.channel} size={24} />} />
        <h3 className="mt-3 text-[17px] font-semibold">{contact.name}</h3>
        <p className="text-[13px] text-muted">{contact.since ? `Cliente desde ${contact.since} · ` : ''}{channelLabel(conv.channel)}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {tags.map((t) => (
            <TagChip key={t.id} tag={t} size="md" onRemove={() => toggleContactTag(contact.id, t.id)} />
          ))}
          <TagPicker
            contactId={contact.id}
            onApplied={(t) => {
              const rules = ruleList(t.rules)
              if (t.rules.notifyManager && role !== 'gerente') {
                notify({ kind: 'alerta', title: `Etiqueta “${t.name}” aplicada`, body: `${contact.name} · o gerente foi avisado.`, link: `/inbox?c=${conv.id}` })
              } else if (t.rules.notifyManager) {
                notify({ kind: 'alerta', title: `Etiqueta “${t.name}” aplicada`, body: contact.name, link: `/inbox?c=${conv.id}` })
              }
              if (rules.length) toast(`Etiqueta “${t.name}” aplicada`, { description: rules.map((r) => r.text).join(' · ') })
            }}
          >
            <button className="inline-flex h-6 items-center gap-0.5 rounded-full border border-dashed border-border-strong px-2.5 text-xs text-muted hover:border-primary hover:text-primary">
              <Plus className="size-3" /> etiqueta
            </button>
          </TagPicker>
        </div>
        <Button className="mt-4 w-full" onClick={() => openNewAppointment(contact.id)}>
          <CalendarPlus /> Agendar horário
        </Button>
      </div>

      <div className="grid grid-cols-3 border-y border-border text-center">
        {[
          ['Visitas', st.visits],
          ['Gasto total', brl.format(st.spent).replace(',00', '')],
          ['Ticket médio', st.visits ? brl.format(st.spent / st.visits).replace(',00', '') : '—']
        ].map(([label, value], i) => (
          <div key={String(label)} className={cn('px-2 py-3', i < 2 && 'border-r border-border')}>
            <p className="text-[15px] font-semibold">{value}</p>
            <p className="text-[11px] text-muted">{label}</p>
          </div>
        ))}
      </div>

      <Section title="Contato">
        <Row icon={<Phone />} label={formatPhone(contact.phone)} />
        {contact.email && <Row icon={<Mail />} label={contact.email} />}
        {contact.birthday && <Row icon={<Cake />} label={`Aniversário ${contact.birthday}`} />}
      </Section>

      <Section title="Próximo horário">
        {next ? (
          <div className="rounded-xl border border-border p-3">
            <div className="flex items-center gap-2">
              <span className={cn('size-2 rounded-full', nextPro?.dot)} />
              <p className="flex-1 text-[13.5px] font-semibold">{next.service}</p>
              <Badge tone={next.status === 'confirmado' ? 'success' : 'neutral'}>
                {next.status === 'confirmado' ? 'Confirmado' : next.status === 'em_atendimento' ? 'Em atendimento' : 'Agendado'}
              </Badge>
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-muted">
              <Clock className="size-3.5" />{' '}
              {(next.date ?? TODAY) === TODAY ? 'Hoje' : (next.date ?? TODAY).split('-').reverse().join('/')}, {next.start}–{next.end}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-muted">
              <Scissors className="size-3.5" /> {nextPro?.name}
            </p>
          </div>
        ) : (
          <p className="text-[13px] text-muted">Nenhum horário marcado.</p>
        )}
      </Section>

      <Section title="Profissional preferido">
        <div className="flex items-center gap-2">
          <Scissors className="size-4 shrink-0 text-subtle" />
          <Select
            aria-label="Profissional preferido"
            value={contact.favoriteProfessional ?? ''}
            onChange={(e) => {
              const id = e.target.value || undefined
              updateContact(contact.id, { favoriteProfessional: id })
              toast.success(id ? `Direcionado para ${professionalById(id)?.name}` : 'Preferência removida', {
                description: id ? 'Novos agendamentos e a IA vão sugerir este profissional primeiro.' : undefined
              })
            }}
            className="h-8 text-[13px]"
          >
            <option value="">Sem preferência</option>
            {professionals.filter((p) => p.active).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </div>
        <p className="text-[11.5px] text-muted">
          {fav ? `Novos agendamentos e a IA sugerem ${fav.name.split(' ')[0]} primeiro.` : 'Escolha para direcionar os próximos atendimentos.'}
        </p>
      </Section>

      <Section title="Observações">
        {editingNotes ? (
          <div className="flex flex-col gap-2">
            <Textarea autoFocus className="min-h-20 text-[13px]" value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} placeholder="Ex.: alergia, preferências de horário" />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditingNotes(false)}>Cancelar</Button>
              <Button
                size="sm"
                onClick={() => {
                  updateContact(contact.id, { notes: notesDraft.trim() || undefined })
                  setEditingNotes(false)
                  toast.success('Observações salvas')
                }}
              >
                Salvar
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setNotesDraft(contact.notes ?? '')
              setEditingNotes(true)
            }}
            className={cn(
              'flex w-full gap-2 rounded-xl border p-3 text-left text-[13px] leading-relaxed',
              contact.notes ? 'border-note-border bg-note' : 'border-dashed border-border-strong text-muted hover:border-primary hover:text-primary'
            )}
          >
            <StickyNote className="mt-0.5 size-4 shrink-0 text-warning" />
            {contact.notes ?? 'Adicionar observação'}
          </button>
        )}
      </Section>
    </aside>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-border px-5 py-4">
      <p className="mb-2.5 text-[11px] font-semibold tracking-wider text-subtle uppercase">{title}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

function Row({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[13px] [&_svg]:size-4 [&_svg]:text-subtle">
      {icon}
      <span className="truncate">{label}</span>
    </div>
  )
}
