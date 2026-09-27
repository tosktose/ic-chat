import { useEffect, useMemo, useRef, useState } from 'react'
import { FileSpreadsheet, MessageSquarePlus, Phone, Search, Upload, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { ChannelBadge, channelLabel, type ChannelKind } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { Avatar } from '@/components/ui/misc'
import { Dialog } from '@/components/ui/overlay'
import { useCompany } from '@/lib/company'
import { useData } from '@/lib/data'
import { cn, formatPhone } from '@/lib/utils'
import type { Contact } from '@/data/mock'

const digits = (s: string) => s.replace(/\D/g, '')
const validPhone = (s: string) => digits(s).replace(/^55/, '').length >= 10

/* ------------------------------------------------------------------ */
/* Novo contato                                                          */
/* ------------------------------------------------------------------ */
export function NewContactDialog({
  open,
  onOpenChange,
  initialPhone,
  onCreated
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initialPhone?: string
  onCreated?: (c: Contact) => void
}) {
  const { addContact, contacts } = useData()
  const { professionals } = useCompany()
  const empty = { name: '', phone: '', email: '', birthday: '', favoriteProfessional: '', notes: '' }
  const [f, setF] = useState(empty)
  useEffect(() => {
    if (open) setF({ ...empty, phone: initialPhone ?? '' })
  }, [open, initialPhone])
  const dup = f.phone && contacts.find((c) => digits(c.phone).endsWith(digits(f.phone).slice(-10)) && digits(f.phone).length >= 10)
  const valid = f.name.trim() && validPhone(f.phone) && !dup

  const save = () => {
    const d = digits(f.phone)
    const c = addContact({
      name: f.name.trim(),
      phone: d.startsWith('55') ? d : '55' + d,
      email: f.email || undefined,
      birthday: f.birthday ? f.birthday.split('-').reverse().slice(0, 2).join('/') : undefined,
      favoriteProfessional: f.favoriteProfessional || undefined,
      notes: f.notes || undefined,
      tags: []
    })
    toast.success('Contato cadastrado', { description: c.name })
    onOpenChange(false)
    onCreated?.(c)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Novo contato"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!valid} onClick={save}><UserPlus /> Cadastrar</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" className="sm:col-span-2"><Input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Nome do cliente" /></Field>
        <Field label="WhatsApp" hint={dup ? <span className="text-danger">Já cadastrado: {dup.name}</span> : 'Com DDD'}>
          <Input icon={<Phone />} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="(11) 90000-0000" />
        </Field>
        <Field label="E-mail (opcional)"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Aniversário (opcional)"><Input type="date" value={f.birthday} onChange={(e) => setF({ ...f, birthday: e.target.value })} /></Field>
        <Field label="Profissional preferido">
          <Select value={f.favoriteProfessional} onChange={(e) => setF({ ...f, favoriteProfessional: e.target.value })}>
            <option value="">Sem preferência</option>
            {professionals.filter((p) => p.active).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Observações" className="sm:col-span-2"><Textarea className="min-h-16" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Ex.: alergia, preferências de horário" /></Field>
      </div>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Importar contatos (CSV do Excel/Google Contatos)                      */
/* ------------------------------------------------------------------ */
function parseCsv(text: string): { name: string; phone: string; email?: string }[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return []
  const sep = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ';' : ','
  const split = (l: string) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''))
  const head = split(lines[0]).map((h) => h.toLowerCase())
  const col = (...names: string[]) => head.findIndex((h) => names.some((n) => h.includes(n)))
  let iName = col('nome', 'name')
  let iPhone = col('telefone', 'celular', 'whatsapp', 'phone', 'fone')
  const iMail = col('e-mail', 'email')
  const hasHeader = iName >= 0 || iPhone >= 0
  if (!hasHeader) {
    iName = 0
    iPhone = 1
  }
  return (hasHeader ? lines.slice(1) : lines).map((l) => {
    const c = split(l)
    return { name: c[iName] ?? '', phone: c[iPhone] ?? '', email: iMail >= 0 ? c[iMail] : undefined }
  })
}

export function ImportContactsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { importContacts } = useData()
  const [rows, setRows] = useState<{ name: string; phone: string; email?: string }[]>([])
  const [fileName, setFileName] = useState('')
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (open) {
      setRows([])
      setFileName('')
    }
  }, [open])
  const validRows = rows.filter((r) => r.name && validPhone(r.phone))

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Importar contatos"
      description="Planilha CSV (Excel ou Google Contatos) com as colunas Nome e Telefone. E-mail é opcional."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!validRows.length}
            onClick={() => {
              const r = importContacts(validRows)
              toast.success(`${r.added} contatos importados`, { description: r.skipped ? `${r.skipped} ignorados (já cadastrados ou sem telefone).` : undefined })
              onOpenChange(false)
            }}
          >
            <Upload /> Importar {validRows.length || ''}
          </Button>
        </>
      }
    >
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          setFileName(file.name)
          setRows(parseCsv(await file.text()))
          e.target.value = ''
        }}
      />
      <button
        onClick={() => input.current?.click()}
        className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border-strong p-6 text-center hover:border-primary hover:bg-primary-soft/40"
      >
        <FileSpreadsheet className="size-8 text-primary" />
        <span className="text-[13.5px] font-medium">{fileName || 'Escolher arquivo CSV'}</span>
        <span className="text-xs text-muted">Separador ; ou , — a primeira linha pode ter os nomes das colunas</span>
      </button>
      {rows.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[13px] text-muted">
            {validRows.length} de {rows.length} linhas válidas. Prévia:
          </p>
          <div className="scroll-thin max-h-48 overflow-y-auto rounded-xl border border-border">
            {rows.slice(0, 20).map((r, i) => {
              const ok = r.name && validPhone(r.phone)
              return (
                <div key={i} className={cn('flex items-center gap-3 border-b border-border px-3 py-2 text-[13px] last:border-0', !ok && 'text-danger')}>
                  <span className="flex-1 truncate">{r.name || '(sem nome)'}</span>
                  <span className="tabular-nums">{r.phone || '(sem telefone)'}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Nova conversa                                                         */
/* ------------------------------------------------------------------ */
export function NewConversationDialog({ open, onOpenChange, onOpen }: { open: boolean; onOpenChange: (v: boolean) => void; onOpen: (convId: string) => void }) {
  const { contacts, openConversation } = useData()
  const [q, setQ] = useState('')
  const [channel, setChannel] = useState<ChannelKind>('whatsapp')
  const [newOpen, setNewOpen] = useState(false)
  useEffect(() => {
    if (open) setQ('')
  }, [open])
  const list = useMemo(
    () => contacts.filter((c) => (c.name + digits(c.phone)).toLowerCase().includes(q.toLowerCase().replace(/[()\s-]/g, ''))).slice(0, 30),
    [contacts, q]
  )
  const go = (contactId: string) => {
    const id = openConversation(contactId, channel)
    onOpenChange(false)
    onOpen(id)
  }
  const looksPhone = validPhone(q) && !list.length

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange} title="Nova conversa" description="Escolha o cliente e o canal. A mensagem sai pelo número da empresa.">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Input autoFocus icon={<Search />} placeholder="Nome ou telefone" value={q} onChange={(e) => setQ(e.target.value)} />
            <Select value={channel} onChange={(e) => setChannel(e.target.value as ChannelKind)} className="w-44" aria-label="Canal">
              {(['whatsapp', 'whatsapp_official'] as ChannelKind[]).map((c) => (
                <option key={c} value={c}>{channelLabel(c)}</option>
              ))}
            </Select>
          </div>
          <div className="scroll-thin max-h-72 overflow-y-auto">
            {list.map((c) => (
              <button key={c.id} onClick={() => go(c.id)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-2">
                <Avatar name={c.name} size={34} badge={<ChannelBadge kind={channel} size={14} />} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium">{c.name}</p>
                  <p className="text-xs text-muted">{formatPhone(c.phone)}</p>
                </div>
                <MessageSquarePlus className="size-4 text-subtle" />
              </button>
            ))}
            {!list.length && (
              <div className="px-2 py-6 text-center">
                <p className="text-[13px] text-muted">Nenhum contato encontrado.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setNewOpen(true)}>
                  <UserPlus /> {looksPhone ? `Cadastrar ${q}` : 'Cadastrar novo contato'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </Dialog>
      <NewContactDialog open={newOpen} onOpenChange={setNewOpen} initialPhone={looksPhone ? q : ''} onCreated={(c) => go(c.id)} />
    </>
  )
}
