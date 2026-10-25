import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Bot,
  BookOpen,
  CalendarSearch,
  CheckCircle2,
  ExternalLink,
  Hand,
  KeyRound,
  Loader2,
  RotateCcw,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  Users
} from 'lucide-react'
import { toast } from 'sonner'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { Badge, Card, CardHeader, Progress, Segmented, Switch } from '@/components/ui/misc'
import { AI_PROVIDERS, useAi, waitingFor, type AiConfig } from '@/lib/ai'
import { useData } from '@/lib/data'
import { cn } from '@/lib/utils'
import { KnowledgeCard } from './KnowledgeCard'
import type { AiProviderId } from '../../../../preload/index.d'

export function AiPage() {
  const ai = useAi()
  const { config: cfg, update } = ai
  const [draft, setDraft] = useState({ name: cfg.name, instructions: cfg.instructions })
  const dirty = draft.name !== cfg.name || draft.instructions !== cfg.instructions
  const pct = cfg.monthlyLimit ? Math.min(100, (ai.usage.tokens / cfg.monthlyLimit) * 100) : 0

  const toggleEnabled = (v: boolean) => {
    if (v && !ai.keyInfo) return toast.error('Cadastre a chave de API antes de ligar a IA')
    update({ enabled: v })
    toast.success(v ? `${cfg.name} está atendendo` : 'IA pausada', { description: v ? 'Conversas novas do WhatsApp começam pela IA.' : 'As conversas novas vão direto para a fila da equipe.' })
  }

  return (
    <Page
      wide
      title="Assistente IA"
      description="A IA faz o primeiro atendimento com a sua própria chave e passa para a equipe pela fila da URA."
      actions={
        <>
          <label className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2 text-[13px] font-medium">
            <span className={cn('size-2 rounded-full', ai.active ? 'bg-success' : 'bg-subtle')} />
            {ai.active ? 'IA atendendo' : cfg.enabled ? 'Falta a chave' : 'IA pausada'}
            <Switch checked={cfg.enabled} onCheckedChange={toggleEnabled} aria-label="Ligar ou pausar a IA" />
          </label>
          <Button
            disabled={!dirty || !draft.name.trim()}
            onClick={() => {
              update({ name: draft.name.trim(), instructions: draft.instructions })
              toast.success('Personalidade salva')
            }}
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
        <div className="flex flex-col gap-4">
          <KeyCard />

          {/* Personalidade */}
          <Card>
            <CardHeader title="Personalidade" description="Como a IA se apresenta e conversa com seus clientes" />
            <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
              <Field label="Nome do assistente">
                <Input value={draft.name} maxLength={30} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
              </Field>
              <Field label="Tom de voz">
                <Segmented
                  className="w-full"
                  value={cfg.tone}
                  onChange={(tone) => update({ tone })}
                  options={[
                    { value: 'formal', label: 'Formal' },
                    { value: 'amigavel', label: 'Amigável' },
                    { value: 'descontraido', label: 'Descontraído' }
                  ]}
                />
              </Field>
              <Field label="Instruções" className="sm:col-span-2" hint="Escreva como se estivesse treinando uma recepcionista nova. Clique em Salvar no topo.">
                <Textarea className="min-h-32" maxLength={4000} value={draft.instructions} onChange={(e) => setDraft((d) => ({ ...d, instructions: e.target.value }))} />
              </Field>
              <ToggleRow title="Usar emojis" description="Deixa a conversa mais leve 😊" checked={cfg.emojis} onChange={(emojis) => update({ emojis })} />
              <Field label="Quando a IA atende">
                <Select value={cfg.schedule} onChange={(e) => update({ schedule: e.target.value as AiConfig['schedule'] })}>
                  <option value="sempre">Sempre (24 horas)</option>
                  <option value="fora">Só fora do horário de funcionamento</option>
                  <option value="fila">Quando não houver analista disponível</option>
                </Select>
              </Field>
            </div>
          </Card>

          <KnowledgeCard />

          {/* O que a IA pode fazer */}
          <Card>
            <CardHeader title="O que a IA pode fazer" description="A agenda, os serviços e os profissionais vêm do cadastro, sempre atualizados" />
            <div className="grid gap-2 px-5 pb-5 sm:grid-cols-2">
              {([
                ['agenda', CalendarSearch, 'Consultar horários livres'],
                ['agendar', CheckCircle2, 'Marcar horários sozinha'],
                ['precos', Tag, 'Informar preços'],
                ['historico', BookOpen, 'Ver histórico e observações do cliente']
              ] as const).map(([key, Icon, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3">
                  <Icon className="size-4 text-muted" />
                  <span className="flex-1 text-[13.5px] font-medium">{label}</span>
                  <Switch checked={cfg.tools[key]} onCheckedChange={(v) => update({ tools: { ...cfg.tools, [key]: v } })} />
                </label>
              ))}
            </div>
          </Card>

          {/* Regras de transferência */}
          <Card>
            <CardHeader title="Quando passar para a equipe" description="A IA avisa o cliente, transfere e a conversa entra na fila da URA" />
            <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
              {([
                ['pedido', 'Cliente pede um humano'],
                ['reclamacao', 'Reclamação ou irritação'],
                ['incerteza', 'IA não tem certeza da resposta'],
                ['foraAssunto', 'Assuntos fora do negócio']
              ] as const).map(([key, title]) => (
                <ToggleRow key={key} icon={<Hand />} title={title} checked={cfg.handoff[key]} onChange={(v) => update({ handoff: { ...cfg.handoff, [key]: v } })} />
              ))}
            </div>
          </Card>

          <UraCard />
        </div>

        {/* Pré-visualização */}
        <div className="xl:sticky xl:top-0 xl:self-start">
          <AiPreview />
          {cfg.monthlyLimit > 0 && (
            <Card className="mt-4 p-4">
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-medium">Uso deste mês</span>
                <span className="text-muted tabular-nums">
                  {(ai.usage.tokens / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil de {(cfg.monthlyLimit / 1000).toLocaleString('pt-BR')} mil tokens
                </span>
              </div>
              <Progress value={pct} className="mt-2" tone={pct >= 90 ? 'danger' : pct >= 70 ? 'warning' : 'primary'} />
              <p className="mt-2 text-xs text-muted">Ao atingir o limite, a IA passa as conversas para a equipe.</p>
            </Card>
          )}
        </div>
      </div>
    </Page>
  )
}

/* ---------------------------------------------------------------- chave de API */
function KeyCard() {
  const ai = useAi()
  const { config: cfg, update } = ai
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState<'save' | 'test' | null>(null)
  const p = AI_PROVIDERS[cfg.provider]

  const run = async (kind: 'save' | 'test', job: () => Promise<void>, ok: string) => {
    setBusy(kind)
    try {
      await job()
      toast.success(ok)
    } catch (e) {
      toast.error(kind === 'test' ? 'A chave não funcionou' : 'Não foi possível salvar a chave', { description: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <CardHeader
        title={p.local ? 'Provedor de IA' : 'Provedor e chave de API'}
        description={
          p.local
            ? 'A IA roda neste computador. Sem chave, sem mensalidade e sem enviar conversa para fora.'
            : 'A chave fica criptografada neste computador e nunca é exibida de novo.'
        }
        action={
          <a href={p.keyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">
            {p.local ? 'Baixar Ollama' : 'Criar chave'} <ExternalLink className="size-3.5" />
          </a>
        }
      />
      <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
        <Field label="Provedor">
          <Select
            value={cfg.provider}
            onChange={(e) => {
              const provider = e.target.value as AiProviderId
              update({ provider, model: AI_PROVIDERS[provider].models[0] })
            }}
          >
            {Object.entries(AI_PROVIDERS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Modelo" hint="O primeiro da lista é o mais indicado para atendimento.">
          <Select value={cfg.model} onChange={(e) => update({ model: e.target.value })}>
            {p.models.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </Field>

        {p.local ? (
          <OllamaPanel nota={p.nota} />
        ) : !ai.available ? (
          <p className="rounded-xl bg-surface-2 p-3.5 text-[13px] text-muted sm:col-span-2">A chave é cadastrada no app instalado (no navegador a IA é só demonstração).</p>
        ) : ai.keyInfo ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3.5 sm:col-span-2">
            <KeyRound className="size-4 text-muted" />
            <code className="text-[13px]">{ai.keyInfo.masked}</code>
            {ai.keyInfo.checkedAt ? (
              <Badge tone="success"><ShieldCheck className="size-3" /> Verificada</Badge>
            ) : (
              <Badge tone="warning">Não testada</Badge>
            )}
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => run('test', ai.testKey, 'Chave funcionando')}>
                {busy === 'test' ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Testar
              </Button>
              <Button variant="ghost" size="sm" className="text-danger" onClick={() => void ai.removeKey().then(() => { update({ enabled: false }); toast.success('Chave removida') })}>
                <Trash2 /> Remover
              </Button>
            </div>
          </div>
        ) : (
          <form
            className="flex gap-2 sm:col-span-2"
            onSubmit={(e) => {
              e.preventDefault()
              void run('save', async () => {
                await ai.saveKey(key)
                setKey('')
                await ai.testKey()
              }, 'Chave salva e testada')
            }}
          >
            <Input icon={<KeyRound />} type="password" autoComplete="off" placeholder={`Cole a chave (${p.keyHint})`} value={key} onChange={(e) => setKey(e.target.value)} />
            <Button type="submit" disabled={key.trim().length < 12 || busy !== null}>
              {busy ? <Loader2 className="animate-spin" /> : null} Salvar
            </Button>
          </form>
        )}

        <Field label="Limite mensal (mil tokens)" hint="0 = sem limite. Controla o custo com o provedor.">
          <Input
            type="number"
            min={0}
            step={100}
            value={Math.round(cfg.monthlyLimit / 1000)}
            onChange={(e) => update({ monthlyLimit: Math.max(0, Number(e.target.value) || 0) * 1000 })}
          />
        </Field>
      </div>
    </Card>
  )
}

/* ---------------------------------------------------------------- URA */
function UraCard() {
  const ai = useAi()
  const { contactById } = useData()
  const { config: cfg, update } = ai
  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-2"><Users className="size-4" /> Fila da URA</span>}
        description="Quem a IA transfere entra na fila e é encaminhado, por ordem de chegada, para o analista disponível há mais tempo livre."
        action={<Badge tone={ai.queue.length ? 'warning' : 'neutral'}>{ai.queue.length} na fila</Badge>}
      />
      <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
        <ToggleRow
          title="Encaminhar automaticamente"
          description="Desligado: a equipe pega da fila manualmente"
          checked={cfg.autoRoute}
          onChange={(autoRoute) => update({ autoRoute })}
        />
        <Field label="Máximo de conversas por analista" hint="Acima disso a pessoa não recebe novas da fila">
          <Input type="number" min={1} max={50} value={cfg.maxPerAnalyst} onChange={(e) => update({ maxPerAnalyst: Math.min(50, Math.max(1, Number(e.target.value) || 1)) })} />
        </Field>
        {ai.queue.length > 0 && (
          <ol className="flex flex-col gap-1.5 sm:col-span-2">
            {ai.queue.map((c, i) => (
              <li key={c.id} className="flex items-center gap-3 rounded-xl bg-warning-soft/60 px-3 py-2 text-[13px]">
                <span className="flex size-6 items-center justify-center rounded-full bg-warning text-[11px] font-bold text-white">{i + 1}</span>
                <span className="font-medium">{contactById(c.contactId).name}</span>
                <span className="truncate text-muted">{c.handoffReason}</span>
                <span className="ml-auto shrink-0 text-xs text-muted">{waitingFor(c)}</span>
              </li>
            ))}
          </ol>
        )}
        <p className="text-xs text-muted sm:col-span-2">
          Analistas recebem da fila quando estão como <b>Disponível</b> (menu do seu nome, no topo). O analista escolhido recebe notificação com som.
        </p>
      </div>
    </Card>
  )
}

function ToggleRow({ title, description, checked, onChange, icon }: { title: string; description?: string; checked: boolean; onChange: (v: boolean) => void; icon?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 [&_svg]:size-4 [&_svg]:text-muted">
      {icon}
      <div className="flex-1">
        <p className="text-[13.5px] font-medium">{title}</p>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

/* ---------------------------------------------------------------- teste */
function AiPreview() {
  const ai = useAi()
  const [msgs, setMsgs] = useState<{ role: 'user' | 'assistant' | 'info'; content: string }[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [msgs, busy])

  const send = async () => {
    const t = text.trim()
    if (!t || busy) return
    const next = [...msgs, { role: 'user' as const, content: t }]
    setMsgs(next)
    setText('')
    setBusy(true)
    try {
      const r = await ai.simulate(next.filter((m) => m.role !== 'info').map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })))
      const out: typeof msgs = []
      if (r.text) out.push({ role: 'assistant', content: r.text })
      if (r.booking) out.push({ role: 'info', content: `Marcaria: ${r.booking.service} com ${r.booking.pro} em ${r.booking.date.split('-').reverse().join('/')} às ${r.booking.time}` })
      if (r.handoff) out.push({ role: 'info', content: `Transferiria para a equipe (URA): ${r.handoff}` })
      setMsgs((m) => [...m, ...out])
    } catch (e) {
      setMsgs((m) => [...m, { role: 'info', content: e instanceof Error ? e.message : String(e) }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="flex h-[560px] flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-violet-500 text-white">
          <Bot className="size-5" />
        </span>
        <div className="flex-1">
          <p className="text-[14px] font-semibold">Testar {ai.config.name}</p>
          <p className="text-xs text-muted">Resposta real da IA · nada é enviado nem agendado</p>
        </div>
        {msgs.length > 0 ? (
          <Button variant="ghost" size="icon-sm" aria-label="Recomeçar teste" tooltip="Recomeçar" onClick={() => setMsgs([])}>
            <RotateCcw />
          </Button>
        ) : (
          <Sparkles className="size-4 text-violet-500" />
        )}
      </div>
      <div className="chat-pattern scroll-thin flex flex-1 flex-col gap-1.5 overflow-y-auto p-4">
        {msgs.length === 0 && <p className="m-auto max-w-[80%] text-center text-[13px] text-muted">Escreva como se fosse um cliente para ver como {ai.config.name} responde.</p>}
        {msgs.map((m, i) =>
          m.role === 'info' ? (
            <p key={i} className="mx-auto my-1 max-w-[90%] rounded-lg bg-surface/90 px-3 py-1 text-center text-xs text-muted shadow-sm">{m.content}</p>
          ) : (
            <div key={i} className={cn('flex', m.role === 'assistant' ? 'justify-end' : 'justify-start')}>
              <p className={cn('max-w-[85%] rounded-2xl px-3.5 py-2 text-[13.5px] whitespace-pre-wrap shadow-sm', m.role === 'assistant' ? 'rounded-br-md bg-bubble-out' : 'rounded-bl-md bg-bubble-in')}>{m.content}</p>
            </div>
          )
        )}
        {busy && <p className="ml-auto flex items-center gap-1.5 text-xs text-muted"><Loader2 className="size-3.5 animate-spin" /> {ai.config.name} está digitando…</p>}
        <div ref={end} />
      </div>
      <form
        className="flex gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <Input placeholder="Escreva como um cliente…" value={text} onChange={(e) => setText(e.target.value)} />
        <Button type="submit" size="icon" aria-label="Enviar" disabled={busy || !text.trim()}><SendHorizontal /></Button>
      </form>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Ollama: IA rodando na propria maquina                                */
/* ------------------------------------------------------------------ */
function OllamaPanel({ nota }: { nota?: string }) {
  const [estado, setEstado] = useState<{ running: boolean; models: { name: string; sizeGb: number }[] } | null>(null)
  const [checando, setChecando] = useState(false)

  const checar = useCallback(async () => {
    setChecando(true)
    try {
      const r = await window.icchat?.ai.localStatus()
      setEstado(r && 'data' in r ? r.data : { running: false, models: [] })
    } catch {
      setEstado({ running: false, models: [] })
    } finally {
      setChecando(false)
    }
  }, [])

  useEffect(() => {
    void checar()
  }, [checar])

  // No navegador nao existe processo principal: e so demonstracao.
  if (!window.icchat) {
    return (
      <p className="rounded-xl bg-surface-2 p-3.5 text-[13px] text-muted sm:col-span-2">
        {nota} A detecção do Ollama acontece no app instalado.
      </p>
    )
  }

  return (
    <div className="rounded-xl border border-border p-3.5 sm:col-span-2">
      <div className="flex flex-wrap items-center gap-3">
        {estado?.running ? (
          <Badge tone="success"><ShieldCheck className="size-3" /> Ollama ativo</Badge>
        ) : (
          <Badge tone="warning">Ollama não encontrado</Badge>
        )}
        <span className="text-[13px] text-muted">
          {estado?.running
            ? `${estado.models.length} modelo(s) neste computador`
            : 'Instale o Ollama e baixe um modelo para usar a IA sem custo.'}
        </span>
        <Button variant="outline" size="sm" className="ml-auto" disabled={checando} onClick={() => void checar()}>
          {checando ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Verificar
        </Button>
      </div>

      {estado?.running && estado.models.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {estado.models.map((m) => (
            <li key={m.name}>
              <Badge tone="neutral">{m.name} · {m.sizeGb} GB</Badge>
            </li>
          ))}
        </ul>
      )}

      {nota && <p className="mt-3 text-xs text-subtle">{nota}</p>}
    </div>
  )
}
