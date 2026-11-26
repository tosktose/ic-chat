import { Check, ExternalLink, Megaphone } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Badge, Card } from '@/components/ui/misc'
import { useData } from '@/lib/data'

const DRAFT_KEY = 'icchat.broadcast.draft'
const SENT_KEY = 'icchat.broadcast.sent'

const readJson = <T,>(key: string, fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(key) ?? '') as T } catch { return fallback }
}
const writeJson = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* sem armazenamento */ }
}

function link(phone: string, text: string) {
  let digits = phone.replace(/\D/g, '')
  if (digits && !digits.startsWith('55')) digits = `55${digits}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

/** Disparo para vários contatos: monta a lista, personaliza com {nome} e abre cada conversa pronta para enviar.
 *  Um clique por contato mantém o envio sob o seu controle e protege o número contra bloqueio do WhatsApp. */
export function BroadcastPage() {
  const { contacts, version } = useData()
  const [tag, setTag] = useState('')
  const [text, setText] = useState(() => readJson<string>(DRAFT_KEY, 'Olá, {nome}! Tudo bem? Temos uma novidade para você. Quer saber mais?'))
  const [sent, setSent] = useState<string[]>(() => readJson<string[]>(SENT_KEY, []))

  const tags = useMemo(() => [...new Set(contacts.flatMap((c) => c.tags))].sort(), [contacts, version])
  const audience = useMemo(() => contacts.filter((c) => c.phone.replace(/\D/g, '').length >= 10 && (!tag || c.tags.includes(tag))), [contacts, version, tag])
  const pending = audience.filter((c) => !sent.includes(c.id))

  const personal = (name: string) => text.replaceAll('{nome}', name.split(' ')[0])
  const edit = (v: string) => { setText(v); writeJson(DRAFT_KEY, v) }
  const mark = (id: string) => setSent((s) => { const next = [...new Set([...s, id])]; writeJson(SENT_KEY, next); return next })
  const reset = () => { setSent([]); writeJson(SENT_KEY, []) }

  return (
    <Page title="Disparos" description="Mande uma mensagem para vários contatos de uma vez, com o nome de cada um.">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card className="space-y-3 p-4">
          <label className="block text-[13px] font-semibold" htmlFor="bc-tag">Para quem enviar</label>
          <select id="bc-tag" value={tag} onChange={(e) => setTag(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm">
            <option value="">Todos os contatos ({contacts.length})</option>
            {tags.map((t) => <option key={t} value={t}>Etiqueta: {t}</option>)}
          </select>
          <label className="block text-[13px] font-semibold" htmlFor="bc-text">Mensagem</label>
          <textarea id="bc-text" value={text} onChange={(e) => edit(e.target.value)} rows={6} maxLength={1000} className="w-full resize-none rounded-lg border border-border bg-surface p-3 text-sm outline-none focus:border-primary" />
          <p className="text-[12px] text-subtle">Use <code className="rounded bg-surface-2 px-1">{'{nome}'}</code> para colocar o primeiro nome de cada contato. Prévia: <span className="text-muted">{personal('Maria Silva')}</span></p>
          <div className="rounded-lg bg-warning-soft p-3 text-[12.5px] leading-5 text-warning">Envie aos poucos e só para quem já conversou com você: disparos em massa podem levar o WhatsApp a bloquear o número.</div>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Megaphone className="size-4 text-primary" />
            <h3 className="text-sm font-bold">Lista de envio</h3>
            <Badge tone="primary">{pending.length} para enviar</Badge>
            <Badge tone="success">{audience.length - pending.length} enviados</Badge>
            {sent.length > 0 && <Button size="sm" variant="ghost" className="ml-auto" onClick={reset}>Recomeçar lista</Button>}
          </div>
          {audience.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Nenhum contato com WhatsApp nesta seleção.</p>
          ) : (
            <ul className="scroll-thin max-h-[26rem] space-y-1.5 overflow-y-auto">
              {audience.map((c) => {
                const done = sent.includes(c.id)
                return (
                  <li key={c.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{c.name}</p><p className="truncate text-[12px] text-muted">{c.phone}</p></div>
                    {done ? (
                      <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-success"><Check className="size-4" /> Enviado</span>
                    ) : (
                      <a href={link(c.phone, personal(c.name))} target="_blank" rel="noreferrer" onClick={() => mark(c.id)} aria-label={`Enviar para ${c.name}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-success px-3 text-[13px] font-medium text-white hover:opacity-90">
                        Enviar <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>
    </Page>
  )
}
