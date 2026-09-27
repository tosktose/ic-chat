import { useEffect, useMemo, useState } from 'react'
import { Check, Clock, Mail, Pencil, Plus, Search, Trash2, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Avatar, Badge, Card, CardHeader, EmptyState, Switch } from '@/components/ui/misc'
import { Dialog } from '@/components/ui/overlay'
import { PRO_COLORS, useCompany, type ProColor, type ProfessionalItem, type QuickReply } from '@/lib/company'
import { brl, cn } from '@/lib/utils'
import type { Service } from '@/data/mock'

const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}min` : ''}` : `${m} min`)

/** Confirmação de exclusão reutilizada pelas listas */
function ConfirmDelete({ open, title, description, onCancel, onConfirm }: { open: boolean; title: string; description: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !v && onCancel()}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button variant="danger" onClick={onConfirm}><Trash2 /> Excluir</Button>
        </>
      }
    >
      <span />
    </Dialog>
  )
}

/* ================================================================== */
/* Profissionais                                                        */
/* ================================================================== */
export function ProfessionalsTab() {
  const { professionals, services, removeProfessional } = useCompany()
  const [editing, setEditing] = useState<ProfessionalItem | 'new' | null>(null)
  const [deleting, setDeleting] = useState<ProfessionalItem | null>(null)

  return (
    <Card>
      <CardHeader
        title="Profissionais"
        description="Quem aparece na agenda e quais serviços cada um faz"
        action={<Button size="sm" onClick={() => setEditing('new')}><Plus /> Adicionar</Button>}
      />
      {professionals.length === 0 ? (
        <EmptyState icon={<Plus />} title="Nenhum profissional" description="Cadastre quem atende para montar a agenda." />
      ) : (
        <div className="grid gap-2 px-5 pb-5 sm:grid-cols-2">
          {professionals.map((p) => (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => setEditing(p)}
              onKeyDown={(e) => e.key === 'Enter' && setEditing(p)}
              className={cn('flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary/40', !p.active && 'opacity-60')}
            >
              <div className="relative">
                <Avatar name={p.name} size={42} />
                <span className={cn('absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full ring-2 ring-surface', PRO_COLORS[p.colorKey].dot)} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-[13.5px] font-semibold">{p.name}</p>
                  {!p.active && <Badge>Inativo</Badge>}
                </div>
                <p className="truncate text-xs text-muted">{p.specialty}</p>
                <p className="truncate text-[11px] text-subtle">
                  {p.serviceIds.length ? `${p.serviceIds.length} de ${services.length} serviços` : 'Todos os serviços'}
                  {p.commission ? ` · comissão ${p.commission}%` : ''}
                </p>
              </div>
              <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon-sm" aria-label={`Editar ${p.name}`} onClick={() => setEditing(p)}><Pencil /></Button>
                <Button variant="ghost" size="icon-sm" className="hover:text-danger" aria-label={`Excluir ${p.name}`} onClick={() => setDeleting(p)}><Trash2 /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ProfessionalDialog item={editing} onClose={() => setEditing(null)} />
      <ConfirmDelete
        open={Boolean(deleting)}
        title="Excluir profissional?"
        description={`${deleting?.name ?? ''} sai da agenda. Os horários já marcados continuam no histórico.`}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) removeProfessional(deleting.id)
          toast.success('Profissional excluído')
          setDeleting(null)
        }}
      />
    </Card>
  )
}

function ProfessionalDialog({ item, onClose }: { item: ProfessionalItem | 'new' | null; onClose: () => void }) {
  const { services, saveProfessional } = useCompany()
  const empty: ProfessionalItem = { id: '', name: '', specialty: '', color: '', dot: '', colorKey: 'blue', serviceIds: [], active: true, commission: 40 }
  const [f, setF] = useState<ProfessionalItem>(empty)
  useEffect(() => {
    if (item) setF(item === 'new' ? { ...empty, id: crypto.randomUUID() } : item)
  }, [item])
  const set = <K extends keyof ProfessionalItem>(k: K, v: ProfessionalItem[K]) => setF((x) => ({ ...x, [k]: v }))
  const allServices = f.serviceIds.length === 0

  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={(v) => !v && onClose()}
      title={item === 'new' ? 'Novo profissional' : 'Editar profissional'}
      className="md:max-w-xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!f.name.trim()}
            onClick={() => {
              saveProfessional({ ...f, name: f.name.trim() })
              toast.success(item === 'new' ? 'Profissional adicionado' : 'Profissional atualizado', { description: 'Já aparece na agenda.' })
              onClose()
            }}
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome"><Input autoFocus value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Nome do profissional" /></Field>
        <Field label="Especialidade"><Input value={f.specialty} onChange={(e) => set('specialty', e.target.value)} placeholder="Ex.: Cortes e coloração" /></Field>
        <Field label="E-mail (Google Agenda)" hint="Para sincronizar a agenda dele"><Input icon={<Mail />} type="email" value={f.email ?? ''} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Comissão (%)"><Input type="number" min={0} max={100} value={f.commission ?? 0} onChange={(e) => set('commission', Number(e.target.value))} /></Field>
        <Field label="Cor na agenda" className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PRO_COLORS) as ProColor[]).map((c) => (
              <button
                key={c}
                onClick={() => set('colorKey', c)}
                aria-label={PRO_COLORS[c].label}
                className={cn('flex size-8 items-center justify-center rounded-full ring-offset-2 ring-offset-surface', PRO_COLORS[c].dot, f.colorKey === c && 'ring-2 ring-primary')}
              >
                {f.colorKey === c && <Check className="size-4 text-white" />}
              </button>
            ))}
          </div>
        </Field>
        <div className="sm:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-medium">Serviços que faz</p>
            <label className="flex items-center gap-2 text-xs text-muted">
              Todos
              <Switch checked={allServices} onCheckedChange={(v) => set('serviceIds', v ? [] : services.map((s) => s.id))} />
            </label>
          </div>
          {!allServices && (
            <div className="flex flex-wrap gap-1.5">
              {services.map((s) => {
                const on = f.serviceIds.includes(s.id)
                return (
                  <button
                    key={s.id}
                    onClick={() => set('serviceIds', on ? f.serviceIds.filter((x) => x !== s.id) : [...f.serviceIds, s.id])}
                    className={cn('flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[13px]', on ? 'border-primary bg-primary-soft text-primary' : 'border-border text-muted')}
                  >
                    {on && <Check className="size-3.5" />} {s.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <label className="flex items-center justify-between rounded-xl border border-border p-3 sm:col-span-2">
          <div>
            <p className="text-[13.5px] font-medium">Ativo na agenda</p>
            <p className="text-xs text-muted">Desligue em férias ou afastamento</p>
          </div>
          <Switch checked={f.active} onCheckedChange={(v) => set('active', v)} />
        </label>
      </div>
    </Dialog>
  )
}

/* ================================================================== */
/* Serviços                                                             */
/* ================================================================== */
export function ServicesTab() {
  const { services, professionals, removeService } = useCompany()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Service | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Service | null>(null)
  const list = useMemo(() => services.filter((s) => s.name.toLowerCase().includes(q.toLowerCase())), [services, q])
  const whoDoes = (id: string) => professionals.filter((p) => p.serviceIds.length === 0 || p.serviceIds.includes(id)).length

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Serviços"
        description="A IA usa esta tabela para informar preços e a agenda para calcular a duração"
        action={<Button size="sm" onClick={() => setEditing('new')}><Plus /> Novo serviço</Button>}
      />
      <div className="px-5 pb-3">
        <Input icon={<Search />} placeholder="Buscar serviço" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
      </div>
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full min-w-[520px] text-[13.5px]">
          <thead>
            <tr className="border-y border-border bg-surface-2/60 text-left text-[11px] font-semibold tracking-wider text-subtle uppercase">
              <th className="px-5 py-2.5">Serviço</th>
              <th className="px-3 py-2.5">Duração</th>
              <th className="px-3 py-2.5">Profissionais</th>
              <th className="px-3 py-2.5 text-right">Preço</th>
              <th className="w-24 px-3 py-2.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} onClick={() => setEditing(s)} className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-2/40">
                <td className="px-5 py-3 font-medium">{s.name}</td>
                <td className="px-3 py-3 text-muted"><span className="flex items-center gap-1.5 whitespace-nowrap"><Clock className="size-3.5" /> {fmtMin(s.minutes)}</span></td>
                <td className="px-3 py-3 text-muted">{whoDoes(s.id)}</td>
                <td className="px-3 py-3 text-right font-medium tabular-nums">{brl.format(s.price)}</td>
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-0.5">
                    <Button variant="ghost" size="icon-sm" aria-label={`Editar ${s.name}`} onClick={() => setEditing(s)}><Pencil /></Button>
                    <Button variant="ghost" size="icon-sm" className="hover:text-danger" aria-label={`Excluir ${s.name}`} onClick={() => setDeleting(s)}><Trash2 /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-muted">Nenhum serviço encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <ServiceDialog item={editing} onClose={() => setEditing(null)} />
      <ConfirmDelete
        open={Boolean(deleting)}
        title="Excluir serviço?"
        description={`“${deleting?.name ?? ''}” deixa de aparecer para agendamento e para a IA.`}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) removeService(deleting.id)
          toast.success('Serviço excluído')
          setDeleting(null)
        }}
      />
    </Card>
  )
}

function ServiceDialog({ item, onClose }: { item: Service | 'new' | null; onClose: () => void }) {
  const { saveService } = useCompany()
  const [f, setF] = useState<Service>({ id: '', name: '', minutes: 60, price: 0 })
  useEffect(() => {
    if (item) setF(item === 'new' ? { id: crypto.randomUUID(), name: '', minutes: 60, price: 0 } : item)
  }, [item])
  const valid = f.name.trim() && f.minutes >= 5 && f.price >= 0
  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={(v) => !v && onClose()}
      title={item === 'new' ? 'Novo serviço' : 'Editar serviço'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!valid}
            onClick={() => {
              saveService({ ...f, name: f.name.trim() })
              toast.success(item === 'new' ? 'Serviço criado' : 'Serviço atualizado')
              onClose()
            }}
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" className="sm:col-span-2"><Input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex.: Corte feminino" /></Field>
        <Field label="Duração (minutos)" hint={fmtMin(f.minutes || 0)}>
          <Input type="number" min={5} step={5} value={f.minutes} onChange={(e) => setF({ ...f, minutes: Number(e.target.value) })} />
        </Field>
        <Field label="Preço (R$)" hint={brl.format(f.price || 0)}>
          <Input type="number" min={0} step={5} value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} />
        </Field>
      </div>
    </Dialog>
  )
}

/* ================================================================== */
/* Respostas rápidas                                                    */
/* ================================================================== */
export function QuickRepliesTab() {
  const { quickReplies, removeQuickReply } = useCompany()
  const [editing, setEditing] = useState<QuickReply | 'new' | null>(null)
  return (
    <Card>
      <CardHeader
        title="Respostas rápidas"
        description="No chat, digite / e o atalho para inserir a mensagem"
        action={<Button size="sm" onClick={() => setEditing('new')}><Plus /> Nova</Button>}
      />
      <div className="flex flex-col">
        {quickReplies.map((r) => (
          <div key={r.id} role="button" tabIndex={0} onClick={() => setEditing(r)} className="flex cursor-pointer items-start gap-3 border-t border-border px-5 py-3 hover:bg-surface-2/40">
            <Badge tone="primary" size="md"><Zap /> {r.shortcut}</Badge>
            <p className="flex-1 text-[13.5px] text-muted">{r.text}</p>
            <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon-sm" aria-label={`Editar ${r.shortcut}`} onClick={() => setEditing(r)}><Pencil /></Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="hover:text-danger"
                aria-label={`Excluir ${r.shortcut}`}
                onClick={() => {
                  removeQuickReply(r.id)
                  toast.success('Resposta rápida excluída')
                }}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        ))}
        {quickReplies.length === 0 && <p className="border-t border-border px-5 py-8 text-center text-sm text-muted">Nenhuma resposta rápida.</p>}
      </div>
      <QuickReplyDialog item={editing} onClose={() => setEditing(null)} />
    </Card>
  )
}

function QuickReplyDialog({ item, onClose }: { item: QuickReply | 'new' | null; onClose: () => void }) {
  const { quickReplies, saveQuickReply } = useCompany()
  const [f, setF] = useState<QuickReply>({ id: '', shortcut: '/', text: '' })
  useEffect(() => {
    if (item) setF(item === 'new' ? { id: crypto.randomUUID(), shortcut: '/', text: '' } : item)
  }, [item])
  const shortcut = '/' + f.shortcut.replace(/^\/+/, '').replace(/\s+/g, '').toLowerCase()
  const taken = quickReplies.some((r) => r.shortcut === shortcut && r.id !== f.id)
  const valid = shortcut.length > 1 && f.text.trim() && !taken
  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={(v) => !v && onClose()}
      title={item === 'new' ? 'Nova resposta rápida' : 'Editar resposta rápida'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!valid}
            onClick={() => {
              saveQuickReply({ ...f, shortcut, text: f.text.trim() })
              toast.success('Resposta rápida salva', { description: `Use ${shortcut} no chat.` })
              onClose()
            }}
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Atalho" hint={taken ? <span className="text-danger">Este atalho já existe</span> : `No chat: digite ${shortcut}`}>
          <Input autoFocus value={f.shortcut} onChange={(e) => setF({ ...f, shortcut: e.target.value })} placeholder="/ola" />
        </Field>
        <Field label="Mensagem">
          <Textarea value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} placeholder="Texto que será inserido" />
        </Field>
      </div>
    </Dialog>
  )
}
