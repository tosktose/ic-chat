import { useState, type ReactNode } from 'react'
import {
  Bot,
  BookOpen,
  CalendarSearch,
  CheckCircle2,
  Eye,
  EyeOff,
  Hand,
  KeyRound,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  Tag,
} from 'lucide-react'
import { toast } from 'sonner'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { Card, CardHeader, Progress, Segmented, Switch } from '@/components/ui/misc'
import { cn } from '@/lib/utils'
import { KnowledgeCard } from './KnowledgeCard'

const PROVIDERS = {
  anthropic: { label: 'Anthropic (Claude)', models: ['claude-sonnet-5', 'claude-haiku-4-5', 'claude-opus-5-5'] },
  openai: { label: 'OpenAI (GPT)', models: ['gpt-5', 'gpt-5-mini'] },
  google: { label: 'Google (Gemini)', models: ['gemini-2.5-pro', 'gemini-2.5-flash'] },
  openrouter: { label: 'OpenRouter', models: ['auto'] }
} as const
type Provider = keyof typeof PROVIDERS

export function AiPage() {
  const [provider, setProvider] = useState<Provider>('anthropic')
  const [showKey, setShowKey] = useState(false)
  const [tone, setTone] = useState<'formal' | 'amigavel' | 'descontraido'>('amigavel')
  const [enabled, setEnabled] = useState(true)
  const [tools, setTools] = useState({ agenda: true, agendar: true, precos: true, historico: false })

  return (
    <Page
      wide
      title="Assistente IA"
      description="Configure a IA que atende seus clientes com a sua própria chave. Ela só fala sobre o seu negócio."
      actions={
        <>
          <label className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2 text-[13px] font-medium">
            <span className={cn('size-2 rounded-full', enabled ? 'bg-success' : 'bg-subtle')} />
            {enabled ? 'IA ativa' : 'IA pausada'}
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </label>
          <Button onClick={() => toast.success('Configurações da IA salvas')}>Salvar</Button>
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
        <div className="flex flex-col gap-4">
          {/* Provedor e chave */}
          <Card>
            <CardHeader title="Provedor e chave de API" description="A chave fica criptografada e nunca é exibida novamente depois de salva." />
            <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
              <Field label="Provedor">
                <Select value={provider} onChange={(e) => setProvider(e.target.value as Provider)}>
                  {Object.entries(PROVIDERS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Modelo">
                <Select>
                  {PROVIDERS[provider].models.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Chave de API" className="sm:col-span-2" hint={<span className="flex items-center gap-1"><ShieldCheck className="size-3.5 text-success" /> Chave válida · verificada há 2 dias</span>}>
                <Input
                  icon={<KeyRound />}
                  type={showKey ? 'text' : 'password'}
                  defaultValue="sk-ant-••••••••••••••••••••4f2a"
                  trailing={
                    <button type="button" onClick={() => setShowKey((s) => !s)} className="rounded p-1 hover:text-foreground" aria-label="Mostrar chave">
                      {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  }
                />
              </Field>
              <div className="rounded-xl bg-surface-2 p-3.5 sm:col-span-2">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-medium">Uso deste mês</span>
                  <span className="text-muted">412 mil de 1 milhão de tokens</span>
                </div>
                <Progress value={41} className="mt-2" />
                <p className="mt-2 text-xs text-muted">Limite mensal configurável para controlar custos. Ao atingir, a IA passa as conversas para a equipe.</p>
              </div>
            </div>
          </Card>

          {/* Personalidade */}
          <Card>
            <CardHeader title="Personalidade" description="Como a IA se apresenta e conversa com seus clientes" />
            <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
              <Field label="Nome do assistente">
                <Input defaultValue="Bella" />
              </Field>
              <Field label="Tom de voz">
                <Segmented
                  className="w-full"
                  value={tone}
                  onChange={setTone}
                  options={[
                    { value: 'formal', label: 'Formal' },
                    { value: 'amigavel', label: 'Amigável' },
                    { value: 'descontraido', label: 'Descontraído' }
                  ]}
                />
              </Field>
              <Field label="Instruções" className="sm:col-span-2" hint="Escreva como se estivesse treinando uma recepcionista nova.">
                <Textarea
                  className="min-h-32"
                  defaultValue={'Você é a Bella, recepcionista virtual do Studio Bella. Seja simpática e objetiva. Sempre ofereça até 3 horários livres. Nunca invente preços: consulte a tabela. Se o cliente reclamar ou pedir para falar com alguém, transfira para a equipe.'}
                />
              </Field>
              <ToggleRow title="Usar emojis" description="Deixa a conversa mais leve 😊" defaultOn />
              <ToggleRow title="Responder áudios" description="Transcreve e responde mensagens de voz" defaultOn />
            </div>
          </Card>

          {/* Base de conhecimento */}
          <KnowledgeCard />

          {/* O que a IA pode fazer */}
          <Card>
            <CardHeader title="O que a IA pode fazer" description="Ações que a IA executa sozinha" />
            <div className="grid gap-2 px-5 pb-5 sm:grid-cols-2">
              {([
                ['agenda', CalendarSearch, 'Consultar horários livres'],
                ['agendar', CheckCircle2, 'Criar, remarcar e cancelar horários'],
                ['precos', Tag, 'Informar preços e serviços'],
                ['historico', BookOpen, 'Ver histórico do cliente']
              ] as const).map(([key, Icon, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3">
                  <Icon className="size-4 text-muted" />
                  <span className="flex-1 text-[13.5px] font-medium">{label}</span>
                  <Switch checked={tools[key]} onCheckedChange={(v) => setTools((t) => ({ ...t, [key]: v }))} />
                </label>
              ))}
            </div>
          </Card>

          {/* Regras */}
          <Card>
            <CardHeader title="Quando passar para a equipe" description="A IA transfere a conversa e avisa o atendente" />
            <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
              <ToggleRow icon={<Hand />} title="Cliente pede um humano" defaultOn />
              <ToggleRow icon={<Hand />} title="Reclamação ou irritação" defaultOn />
              <ToggleRow icon={<Hand />} title="IA não tem certeza da resposta" defaultOn />
              <ToggleRow icon={<Hand />} title="Assuntos fora do salão" defaultOn />
              <Field label="Horário em que a IA atende" className="sm:col-span-2">
                <Select defaultValue="sempre">
                  <option value="sempre">Sempre (24 horas)</option>
                  <option value="fora">Só fora do horário de funcionamento</option>
                  <option value="fila">Quando não houver atendente disponível</option>
                </Select>
              </Field>
            </div>
          </Card>
        </div>

        {/* Pré-visualização */}
        <div className="xl:sticky xl:top-0 xl:self-start">
          <AiPreview />
        </div>
      </div>
    </Page>
  )
}

function ToggleRow({ title, description, defaultOn, icon }: { title: string; description?: string; defaultOn?: boolean; icon?: ReactNode }) {
  const [on, setOn] = useState(Boolean(defaultOn))
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 [&_svg]:size-4 [&_svg]:text-muted">
      {icon}
      <div className="flex-1">
        <p className="text-[13.5px] font-medium">{title}</p>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
      <Switch checked={on} onCheckedChange={setOn} />
    </label>
  )
}

function AiPreview() {
  const [msgs, setMsgs] = useState([
    { me: false, text: 'Oi! Quanto custa luzes e tem horário sábado?' },
    { me: true, text: 'Oi! 😊 Luzes a partir de R$ 380 com a Carla. Sábado tenho 9h30 ou 14h. Qual prefere?' }
  ])
  const [text, setText] = useState('')
  return (
    <Card className="flex h-[560px] flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-violet-500 text-white">
          <Bot className="size-5" />
        </span>
        <div className="flex-1">
          <p className="text-[14px] font-semibold">Testar a Bella</p>
          <p className="text-xs text-muted">Simulação — nada é enviado a clientes</p>
        </div>
        <Sparkles className="size-4 text-violet-500" />
      </div>
      <div className="chat-pattern scroll-thin flex flex-1 flex-col gap-1.5 overflow-y-auto p-4">
        {msgs.map((m, i) => (
          <div key={i} className={cn('flex', m.me ? 'justify-end' : 'justify-start')}>
            <p className={cn('max-w-[85%] rounded-2xl px-3.5 py-2 text-[13.5px] shadow-sm', m.me ? 'rounded-br-md bg-bubble-out' : 'rounded-bl-md bg-bubble-in')}>{m.text}</p>
          </div>
        ))}
      </div>
      <form
        className="flex gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim()) return
          setMsgs((m) => [...m, { me: false, text }, { me: true, text: 'Claro! Vou verificar para você 😊' }])
          setText('')
        }}
      >
        <Input placeholder="Escreva como um cliente…" value={text} onChange={(e) => setText(e.target.value)} />
        <Button type="submit" size="icon" aria-label="Enviar"><SendHorizontal /></Button>
      </form>
    </Card>
  )
}
