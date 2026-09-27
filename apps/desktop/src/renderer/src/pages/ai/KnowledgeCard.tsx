import { useEffect, useRef, useState } from 'react'
import { BookOpen, FileText, MessageCircleQuestion, Pencil, Plus, Tag, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Badge, Card, CardHeader, Segmented } from '@/components/ui/misc'
import { Dialog } from '@/components/ui/overlay'
import { useCompany } from '@/lib/company'

type Kind = 'texto' | 'faq' | 'arquivo'
interface Item {
  id: string
  kind: Kind
  title: string
  content: string
  fileName?: string
  fileSize?: string
}

const KEY = 'icchat.ai.knowledge.v1'
const SEED: Item[] = [
  { id: 'k1', kind: 'faq', title: 'Aceitam cartão e Pix?', content: 'Sim! Aceitamos Pix, cartões de crédito e débito. Parcelamos acima de R$ 300 em até 3x sem juros.' },
  { id: 'k2', kind: 'texto', title: 'Política de atraso e cancelamento', content: 'Toleramos até 15 minutos de atraso. Cancelamentos devem ser feitos com 4 horas de antecedência.' },
  { id: 'k3', kind: 'texto', title: 'Estacionamento', content: 'Temos estacionamento conveniado na rua de trás, com 1 hora grátis para clientes.' }
]

function load(): Item[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : SEED
  } catch {
    return SEED
  }
}

const ICON = { texto: BookOpen, faq: MessageCircleQuestion, arquivo: FileText }
const LABEL = { texto: 'Texto', faq: 'Pergunta e resposta', arquivo: 'Arquivo' }

/** Base de conhecimento da IA: o que ela sabe sobre o negócio (além do cadastro de serviços) */
export function KnowledgeCard() {
  const { services, hoursText, info } = useCompany()
  const [items, setItems] = useState<Item[]>(load)
  const [editing, setEditing] = useState<Item | 'new' | null>(null)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items))
    } catch {
      /* arquivo grande demais para o armazenamento local */
    }
  }, [items])

  return (
    <Card>
      <CardHeader
        title="Base de conhecimento"
        description="O que a IA sabe sobre o seu negócio"
        action={<Button variant="outline" size="sm" onClick={() => setEditing('new')}><Plus /> Adicionar</Button>}
      />
      <div className="flex flex-col gap-2 px-5 pb-5">
        {/* Automáticos: vêm das Configurações */}
        <Row icon={Tag} title="Serviços e preços" meta={`${services.length} serviços · atualizado automaticamente pelo cadastro`} auto />
        <Row icon={BookOpen} title="Endereço e funcionamento" meta={`${info.address || 'Sem endereço'} · ${hoursText}`} auto />
        {items.map((k) => (
          <Row
            key={k.id}
            icon={ICON[k.kind]}
            title={k.title}
            meta={k.kind === 'arquivo' ? `${LABEL[k.kind]} · ${k.fileName} · ${k.fileSize}` : `${LABEL[k.kind]} · ${k.content.slice(0, 70)}${k.content.length > 70 ? '…' : ''}`}
            onEdit={() => setEditing(k)}
            onRemove={() => {
              setItems((l) => l.filter((x) => x.id !== k.id))
              toast.success('Removido da base de conhecimento', { description: k.title })
            }}
          />
        ))}
      </div>
      <KnowledgeDialog
        item={editing}
        onClose={() => setEditing(null)}
        onSave={(it) => {
          setItems((l) => (l.some((x) => x.id === it.id) ? l.map((x) => (x.id === it.id ? it : x)) : [...l, it]))
          toast.success('Base de conhecimento atualizada', { description: 'A IA já usa esta informação nas respostas.' })
        }}
      />
    </Card>
  )
}

function Row({ icon: Icon, title, meta, auto, onEdit, onRemove }: { icon: typeof Tag; title: string; meta: string; auto?: boolean; onEdit?: () => void; onRemove?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium">{title}</p>
        <p className="truncate text-xs text-muted">{meta}</p>
      </div>
      {auto ? (
        <Badge tone="success">Automático</Badge>
      ) : (
        <div className="flex gap-0.5">
          <Button variant="ghost" size="icon-sm" aria-label={`Editar ${title}`} onClick={onEdit}><Pencil /></Button>
          <Button variant="ghost" size="icon-sm" className="hover:text-danger" aria-label={`Remover ${title}`} onClick={onRemove}><Trash2 /></Button>
        </div>
      )}
    </div>
  )
}

function KnowledgeDialog({ item, onClose, onSave }: { item: Item | 'new' | null; onClose: () => void; onSave: (i: Item) => void }) {
  const [f, setF] = useState<Item>({ id: '', kind: 'faq', title: '', content: '' })
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (item) setF(item === 'new' ? { id: crypto.randomUUID(), kind: 'faq', title: '', content: '' } : item)
  }, [item])
  const valid = f.title.trim() && (f.kind === 'arquivo' ? f.fileName : f.content.trim())

  const pickFile = async (file?: File) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return toast.error('O arquivo deve ter até 5 MB')
    // Texto é lido aqui; PDF/Word são lidos pelo Core ao enviar para a IA
    const content = /\.(txt|md|csv)$/i.test(file.name) ? await file.text() : ''
    setF((x) => ({
      ...x,
      fileName: file.name,
      fileSize: file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`,
      content,
      title: x.title || file.name.replace(/\.[^.]+$/, '')
    }))
  }

  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={(v) => !v && onClose()}
      title={item === 'new' ? 'Adicionar à base de conhecimento' : 'Editar conhecimento'}
      description="Escreva como explicaria para uma recepcionista nova."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!valid}
            onClick={() => {
              onSave({ ...f, title: f.title.trim(), content: f.content.trim() })
              onClose()
            }}
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Segmented
          className="w-full"
          value={f.kind}
          onChange={(k) => setF({ ...f, kind: k })}
          options={[
            { value: 'faq', label: 'Pergunta e resposta' },
            { value: 'texto', label: 'Texto' },
            { value: 'arquivo', label: 'Arquivo' }
          ]}
        />
        <Field label={f.kind === 'faq' ? 'Pergunta do cliente' : 'Título'}>
          <Input autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder={f.kind === 'faq' ? 'Ex.: Vocês fazem progressiva?' : 'Ex.: Política de cancelamento'} />
        </Field>
        {f.kind === 'arquivo' ? (
          <>
            <input ref={fileRef} type="file" accept=".pdf,.txt,.md,.doc,.docx,.csv" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
            <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border-strong p-5 hover:border-primary hover:bg-primary-soft/40">
              <Upload className="size-6 text-primary" />
              <span className="text-[13.5px] font-medium">{f.fileName ?? 'Escolher arquivo (PDF, Word ou texto)'}</span>
              {f.fileSize && <span className="text-xs text-muted">{f.fileSize}</span>}
            </button>
          </>
        ) : (
          <Field label={f.kind === 'faq' ? 'Resposta' : 'Conteúdo'}>
            <Textarea className="min-h-32" value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} />
          </Field>
        )}
      </div>
    </Dialog>
  )
}
