import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Popover } from 'radix-ui'
import { BellRing, BotOff, Check, Flame, Megaphone, Pencil, Plus, Search, Settings2, Timer, Trash2, UserRoundCheck, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { Switch, Tooltip } from '@/components/ui/misc'
import { Dialog } from '@/components/ui/overlay'
import { useAppState } from '@/lib/app-state'
import { EMPTY_RULES, TAG_COLORS, useTags, type Tag, type TagColor, type TagRules } from '@/lib/tags'
import { cn } from '@/lib/utils'
import { users } from '@/data/mock'

/* ------------------------------------------------------------------ */
/* Resumo das regras (ícones)                                            */
/* ------------------------------------------------------------------ */
export function ruleList(r: TagRules): { icon: ReactNode; text: string }[] {
  const out: { icon: ReactNode; text: string }[] = []
  if (r.priority) out.push({ icon: <Flame />, text: 'Prioridade no atendimento' })
  if (r.pauseAi) out.push({ icon: <BotOff />, text: 'IA não responde (vai para a equipe)' })
  if (r.assignTo) out.push({ icon: <UserRoundCheck />, text: `Direciona para ${users.find((u) => u.id === r.assignTo)?.name.split(' ')[0] ?? 'analista'}` })
  if (r.slaMinutes) out.push({ icon: <Timer />, text: `Responder em até ${r.slaMinutes} min` })
  if (r.notifyManager) out.push({ icon: <BellRing />, text: 'Avisa o gerente' })
  if (r.excludeCampaigns) out.push({ icon: <Megaphone />, text: 'Fora de campanhas' })
  return out
}

export function RuleIcons({ rules, className }: { rules: TagRules; className?: string }) {
  const list = ruleList(rules)
  if (!list.length) return <span className={cn('text-xs text-subtle', className)}>Só organização</span>
  return (
    <span className={cn('flex flex-wrap items-center gap-1', className)}>
      {list.map((r) => (
        <Tooltip key={r.text} content={r.text}>
          <span className="flex size-6 items-center justify-center rounded-md bg-surface-2 text-muted [&_svg]:size-3.5">{r.icon}</span>
        </Tooltip>
      ))}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Selo da etiqueta                                                      */
/* ------------------------------------------------------------------ */
export function TagChip({ tag, onRemove, size = 'sm', className }: { tag: Tag; onRemove?: () => void; size?: 'sm' | 'md'; className?: string }) {
  const rules = ruleList(tag.rules)
  return (
    <Tooltip
      content={tag.name}
      description={
        rules.length || tag.description ? (
          <span className="flex flex-col gap-0.5">
            {tag.description && <span>{tag.description}</span>}
            {rules.map((r) => (
              <span key={r.text}>• {r.text}</span>
            ))}
          </span>
        ) : undefined
      }
    >
      <span
        className={cn(
          'group/tag inline-flex max-w-full shrink-0 items-center gap-1 rounded-full font-medium whitespace-nowrap',
          size === 'sm' ? 'h-5 px-2 text-[11px]' : 'h-6 px-2.5 text-xs',
          TAG_COLORS[tag.color].chip,
          className
        )}
      >
        {tag.rules.priority && <Flame className="size-3 shrink-0" />}
        <span className="truncate">{tag.name}</span>
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="-mr-1 rounded-full p-0.5 opacity-60 hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10"
            aria-label={`Remover etiqueta ${tag.name}`}
          >
            <X className="size-3" />
          </button>
        )}
      </span>
    </Tooltip>
  )
}

/* ------------------------------------------------------------------ */
/* Seletor: aplica/remove etiquetas no cliente, cria e edita (gerente)   */
/* ------------------------------------------------------------------ */
export function TagPicker({
  contactId,
  onApplied,
  children
}: {
  contactId: string
  /** Chamado quando uma etiqueta é APLICADA (para executar as regras dela) */
  onApplied?: (tag: Tag) => void
  children: ReactNode
}) {
  const { tags, hasTag, toggleContactTag, createTag } = useTags()
  const { role } = useAppState()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Tag | null | 'new'>(null)
  const canManage = role === 'gerente'
  const list = tags.filter((t) => t.name.toLowerCase().includes(q.trim().toLowerCase()))
  const exact = tags.some((t) => t.name.toLowerCase() === q.trim().toLowerCase())

  const toggle = (t: Tag) => {
    const applied = toggleContactTag(contactId, t.id)
    if (applied) onApplied?.(t)
  }

  return (
    <>
      <Popover.Root open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQ('') }}>
        <Popover.Trigger asChild>{children}</Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="center"
            sideOffset={6}
            collisionPadding={8}
            className="z-50 w-72 animate-slide-up overflow-hidden rounded-xl border border-border bg-surface shadow-(--shadow-pop) outline-none"
          >
            <div className="border-b border-border p-2">
              <Input autoFocus icon={<Search />} placeholder="Buscar ou criar etiqueta" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="scroll-thin max-h-72 overflow-y-auto p-1">
              {list.map((t) => {
                const on = hasTag(contactId, t.id)
                return (
                  <div key={t.id} className="group flex items-center gap-1 rounded-lg hover:bg-surface-2">
                    <button onClick={() => toggle(t)} className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-left">
                      <span className={cn('flex size-4 shrink-0 items-center justify-center rounded border', on ? 'border-primary bg-primary text-white' : 'border-border-strong')}>
                        {on && <Check className="size-3" />}
                      </span>
                      <span className={cn('size-2.5 shrink-0 rounded-full', TAG_COLORS[t.color].dot)} />
                      <span className="flex-1 truncate text-[13px] font-medium">{t.name}</span>
                      {t.rules.priority && <Flame className="size-3.5 text-danger" />}
                    </button>
                    {canManage && (
                      <Button variant="ghost" size="icon-sm" className="mr-1 opacity-0 group-hover:opacity-100" aria-label={`Editar ${t.name}`} onClick={() => setEditing(t)}>
                        <Pencil />
                      </Button>
                    )}
                  </div>
                )
              })}
              {q.trim() && !exact && (
                <button
                  onClick={() => {
                    if (canManage) setEditing('new')
                    else {
                      const t = createTag({ name: q.trim(), color: 'blue', rules: { ...EMPTY_RULES } })
                      toggle(t)
                      setQ('')
                    }
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-primary hover:bg-primary-soft"
                >
                  <Plus className="size-4" /> Criar “{q.trim()}”
                </button>
              )}
              {!list.length && !q.trim() && <p className="px-3 py-6 text-center text-[13px] text-muted">Nenhuma etiqueta criada.</p>}
            </div>
            {canManage && (
              <button
                onClick={() => {
                  setOpen(false)
                  navigate('/config?tab=etiquetas')
                }}
                className="flex w-full items-center gap-2 border-t border-border px-3.5 py-2.5 text-[12.5px] font-medium text-muted hover:bg-surface-2 hover:text-foreground"
              >
                <Settings2 className="size-4" /> Gerenciar etiquetas e regras
              </button>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <TagEditorDialog
        tag={editing === 'new' ? null : editing}
        open={editing !== null}
        initialName={editing === 'new' ? q.trim() : undefined}
        onClose={() => setEditing(null)}
        onCreated={(t) => {
          toggle(t)
          setQ('')
        }}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Editor de etiqueta (nome, cor e REGRAS)                               */
/* ------------------------------------------------------------------ */
export function TagEditorDialog({
  tag,
  open,
  onClose,
  initialName,
  onCreated
}: {
  tag: Tag | null
  open: boolean
  onClose: () => void
  initialName?: string
  onCreated?: (t: Tag) => void
}) {
  const { createTag, updateTag, deleteTag, countOf } = useTags()
  const [name, setName] = useState('')
  const [color, setColor] = useState<TagColor>('blue')
  const [description, setDescription] = useState('')
  const [rules, setRules] = useState<TagRules>(EMPTY_RULES)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(tag?.name ?? initialName ?? '')
    setColor(tag?.color ?? 'blue')
    setDescription(tag?.description ?? '')
    setRules(tag?.rules ?? { ...EMPTY_RULES })
    setConfirmDelete(false)
  }, [open, tag, initialName])

  const set = <K extends keyof TagRules>(k: K, v: TagRules[K]) => setRules((r) => ({ ...r, [k]: v }))
  const preview: Tag = { id: 'preview', name: name || 'Etiqueta', color, description, rules }
  const count = tag ? countOf(tag.id) : 0

  const save = () => {
    if (!name.trim()) return
    if (tag) {
      updateTag({ ...tag, name: name.trim(), color, description: description || undefined, rules })
      toast.success('Etiqueta atualizada', { description: name })
    } else {
      const t = createTag({ name: name.trim(), color, description: description || undefined, rules })
      onCreated?.(t)
      toast.success('Etiqueta criada', { description: name })
    }
    onClose()
  }

  const row = (k: keyof TagRules, icon: ReactNode, title: string, desc: string) => (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted">
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium">{title}</p>
        <p className="text-xs text-muted">{desc}</p>
      </div>
      <Switch checked={Boolean(rules[k])} onCheckedChange={(v) => set(k, v as never)} />
    </label>
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={tag ? 'Editar etiqueta' : 'Nova etiqueta'}
      description="As regras fazem a etiqueta agir sozinha em toda conversa do cliente."
      className="md:max-w-xl"
      footer={
        confirmDelete ? (
          <>
            <p className="mr-auto self-center text-[13px] text-danger">
              Excluir “{tag?.name}”? Ela sai de {count} {count === 1 ? 'cliente' : 'clientes'}.
            </p>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Voltar</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (tag) deleteTag(tag.id)
                toast.success('Etiqueta excluída')
                onClose()
              }}
            >
              <Trash2 /> Excluir
            </Button>
          </>
        ) : (
          <>
            {tag && (
              <Button variant="ghost" className="mr-auto text-danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 /> Excluir
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={save} disabled={!name.trim()}>{tag ? 'Salvar' : 'Criar etiqueta'}</Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Field label="Nome">
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: VIP, Noiva, Reclamação" maxLength={24} />
          </Field>
          <Field label="Pré-visualização">
            <div className="flex h-9 items-center"><TagChip tag={preview} size="md" /></div>
          </Field>
        </div>
        <Field label="Cor">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TAG_COLORS) as TagColor[]).map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={TAG_COLORS[c].label}
                className={cn('flex size-8 items-center justify-center rounded-full ring-offset-2 ring-offset-surface transition', TAG_COLORS[c].dot, color === c && 'ring-2 ring-primary')}
              >
                {color === c && <Check className="size-4 text-white" />}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Descrição (opcional)">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Para que serve esta etiqueta" />
        </Field>

        <div>
          <p className="mb-2 text-[13px] font-semibold">O que esta etiqueta faz</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {row('priority', <Flame />, 'Prioridade', 'Conversa sobe para o topo, com destaque')}
            {row('pauseAi', <BotOff />, 'IA não responde', 'Vai direto para a equipe humana')}
            {row('notifyManager', <BellRing />, 'Avisar o gerente', 'Notifica quando aplicada')}
            {row('excludeCampaigns', <Megaphone />, 'Fora de campanhas', 'Não recebe promoções')}
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Direcionar conversa para">
              <Select value={rules.assignTo ?? ''} onChange={(e) => set('assignTo', e.target.value || undefined)}>
                <option value="">Ninguém (segue a fila)</option>
                {users.filter((u) => u.role === 'analista').map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Responder em até">
              <Select value={rules.slaMinutes ?? ''} onChange={(e) => set('slaMinutes', e.target.value ? Number(e.target.value) : undefined)}>
                <option value="">Sem prazo</option>
                {[5, 10, 15, 30, 60].map((m) => (
                  <option key={m} value={m}>{m} minutos</option>
                ))}
              </Select>
            </Field>
            <Field label="Aviso para o atendente" className="sm:col-span-2" hint="Aparece fixo no topo da conversa">
              <Textarea className="min-h-16" value={rules.alert ?? ''} onChange={(e) => set('alert', e.target.value || undefined)} placeholder="Ex.: Cliente com alergia a amônia" />
            </Field>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
