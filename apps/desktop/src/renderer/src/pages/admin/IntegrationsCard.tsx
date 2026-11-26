import { useEffect, useState } from 'react'
import { Bot, Check, Mail, Plug, Wallet, Workflow } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge, Card, CardHeader } from '@/components/ui/misc'
import { adminError, listIntegrations, noticeWhatsApp, setIntegration, type IntegrationState, type NoticeWaState } from '@/lib/admin-api'

interface FieldDef { key: string; label: string; hint: string; placeholder: string; secret?: boolean }
interface Group { title: string; icon: typeof Bot; blurb: string; fields: FieldDef[] }

const GROUPS: Group[] = [
  {
    title: 'Cobrança (Mercado Pago)', icon: Wallet,
    blurb: 'Quem assina ou compra créditos paga pelo Mercado Pago. As chaves ficam só no servidor. Use primeiro as chaves de TESTE; depois troque pelas de produção.',
    fields: [
      { key: 'mp_access_token', label: 'Access Token', hint: 'Mercado Pago → Suas integrações → Credenciais. Começa com APP_USR- ou TEST-.', placeholder: 'APP_USR-…', secret: true },
      { key: 'mp_public_key', label: 'Public Key (opcional)', hint: 'Chave pública da mesma aplicação. Só é usada se o checkout passar a ser dentro do site.', placeholder: 'APP_USR-…' },
      { key: 'mp_webhook_secret', label: 'Assinatura secreta do webhook', hint: 'Mercado Pago → Webhooks. Endereço do aviso: …supabase.co/functions/v1/mp-webhook, evento "Pagamentos".', placeholder: 'chave secreta', secret: true }
    ]
  },
  {
    title: 'E-mails do sistema (Resend)', icon: Mail,
    blurb: 'Parabéns por ativar e avisos de acesso expirando saem pelo IC Chat. Vazio aqui = usa o RESEND_API_KEY que já está nos Secrets do Supabase, com o remetente nao-responda@icchat.com.br (o domínio precisa estar verificado no Resend).',
    fields: [
      { key: 'resend_api_key', label: 'Chave da API do Resend', hint: 'Começa com re_.', placeholder: 're_…', secret: true },
      { key: 'email_from', label: 'Remetente', hint: 'Ex.: IC Chat <nao-responda@icchat.com.br> (o domínio precisa estar verificado no Resend).', placeholder: 'IC Chat <nao-responda@seudominio.com.br>' }
    ]
  },
  {
    title: 'Inteligência artificial (OpenRouter)', icon: Bot,
    blurb: 'A IA que atende os clientes. Crie a chave em openrouter.ai/keys. O sistema usa só modelos gratuitos.',
    fields: [
      { key: 'openrouter_api_key', label: 'Chave da API', hint: 'Começa com sk-or-. Fica guardada só no servidor.', placeholder: 'sk-or-v1-…', secret: true },
      { key: 'openrouter_model', label: 'Modelo (só gratuitos)', hint: 'Só modelos grátis, terminados em :free. Vazio = o OpenRouter escolhe um grátis sozinho (openrouter/free). Modelo pago é ignorado.', placeholder: 'openrouter/free' }
    ]
  },
  {
    title: 'WhatsApp dos avisos do sistema (Evolution API, opcional)', icon: Plug,
    blurb: 'Não é o WhatsApp dos clientes: cada cliente conecta o próprio número pelo QR Code dentro do app. Aqui fica só o número do IC Chat que manda avisos (teste acabando, plano vencendo). Vazio = os avisos saem só por e-mail.',
    fields: [
      { key: 'evolution_url', label: 'Endereço do servidor', hint: 'Ex.: https://evolution.seudominio.com.br', placeholder: 'https://…' },
      { key: 'evolution_instance', label: 'Nome da instância dos avisos', hint: 'Qualquer nome, ex.: icchat. Depois use o botão abaixo para criar a instância e escanear o QR.', placeholder: 'icchat-avisos' },
      { key: 'evolution_api_key', label: 'Chave global (apikey)', hint: 'A chave definida no servidor da Evolution API.', placeholder: 'chave', secret: true }
    ]
  },
  {
    title: 'Automações (n8n)', icon: Workflow,
    blurb: 'Reservado para fluxos futuros: hoje nenhuma parte do sistema usa estes campos. Pode deixar como está.',
    fields: [
      { key: 'n8n_url', label: 'Endereço do n8n', hint: 'Ex.: https://n8n.seudominio.com.br', placeholder: 'https://…' },
      { key: 'n8n_api_key', label: 'Chave da API do n8n', hint: 'Em n8n: Configurações → API.', placeholder: 'chave', secret: true }
    ]
  }
]

function FieldRow({ f, state, onSaved }: { f: FieldDef; state?: IntegrationState; onSaved: () => void }) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const filled = Boolean(state)
  const save = async (v: string) => {
    setBusy(true)
    try {
      await setIntegration(f.key, v)
      toast.success(v ? 'Salvo no banco' : 'Campo limpo', { description: f.label })
      setValue('')
      onSaved()
    } catch (e) {
      toast.error('Não foi possível salvar', { description: adminError(e) })
    } finally { setBusy(false) }
  }
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label className="text-[13px] font-medium" htmlFor={`int-${f.key}`}>{f.label}</label>
        {filled ? <Badge tone="success"><Check className="size-3" /> Preenchido</Badge> : <Badge title="Nada gravado aqui. Se existir o Secret ICCHAT_… no Supabase, é ele que vale.">Vazio</Badge>}
      </div>
      <div className="mt-1.5 flex gap-2">
        <Input
          id={`int-${f.key}`}
          type={f.secret ? 'password' : 'text'}
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={filled ? (state?.preview ?? '') + (f.secret ? ' (digite para trocar)' : '') : f.placeholder}
        />
        <Button size="sm" disabled={busy || !value.trim()} onClick={() => void save(value)}>Gravar</Button>
        {filled && <Button size="sm" variant="outline" disabled={busy} onClick={() => { if (window.confirm(`Apagar "${f.label}"?`)) void save('') }}>Limpar</Button>}
      </div>
      <p className="mt-1 text-xs text-muted">{f.hint}</p>
    </div>
  )
}

const WA_LABEL: Record<string, string> = { open: 'Conectado', connecting: 'Aguardando leitura do QR', close: 'Desconectado', nao_existe: 'Instância ainda não criada' }

/** Conecta o número do IC Chat que manda os avisos: cria a instância na Evolution e mostra o QR aqui mesmo. */
function NoticeWhatsApp({ ready }: { ready: boolean }) {
  const [wa, setWa] = useState<NoticeWaState | null>(null)
  const [busy, setBusy] = useState(false)
  const run = async (action: 'status' | 'connect' | 'logout') => {
    setBusy(true)
    try { setWa(await noticeWhatsApp(action)) } catch (e) { toast.error('Evolution não respondeu', { description: adminError(e) }) } finally { setBusy(false) }
  }
  useEffect(() => { if (ready) void run('status') }, [ready])
  // Enquanto o QR está na tela, confere a cada 4 s se já foi escaneado
  useEffect(() => {
    if (!wa?.qr || wa.state === 'open') return
    const t = window.setInterval(() => {
      noticeWhatsApp('status').then((s) => { if (s.state === 'open') { setWa(s); toast.success('WhatsApp dos avisos conectado') } }).catch(() => undefined)
    }, 4000)
    return () => window.clearInterval(t)
  }, [wa?.qr, wa?.state])
  if (!ready) return <p className="text-xs text-muted">Preencha os 3 campos acima para conectar o número dos avisos.</p>
  const connected = wa?.state === 'open'
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium">Número dos avisos</span>
        <Badge tone={connected ? 'success' : 'warning'}>{wa ? (WA_LABEL[wa.state] ?? wa.state) : 'Verificando…'}</Badge>
      </div>
      {wa?.error === 'nao_criou' && <p className="mt-2 text-xs text-danger">A Evolution não aceitou criar a instância. Confira o endereço e a chave global.</p>}
      {wa?.qr && !connected && (
        <div className="mt-3 flex flex-col items-center gap-2">
          <img src={wa.qr.startsWith('data:') ? wa.qr : `data:image/png;base64,${wa.qr}`} alt="QR Code do WhatsApp" className="size-56 rounded-lg bg-white p-2" />
          <p className="text-center text-xs text-muted">No celular do IC Chat: WhatsApp → Aparelhos conectados → Conectar aparelho.</p>
        </div>
      )}
      <div className="mt-3 flex gap-2">
        {!connected && <Button size="sm" disabled={busy} onClick={() => void run('connect')}>{wa?.qr ? 'Gerar novo QR' : 'Conectar e mostrar QR'}</Button>}
        {connected && <Button size="sm" variant="outline" disabled={busy} onClick={() => { if (window.confirm('Desconectar o número dos avisos?')) void run('logout') }}>Desconectar</Button>}
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void run('status')}>Atualizar</Button>
      </div>
    </div>
  )
}

/** Campos das integrações externas. Os valores secretos nunca voltam para a tela: só o final mascarado. */
export function IntegrationsCard() {
  const [state, setState] = useState<Record<string, IntegrationState>>({})
  const [error, setError] = useState('')
  const load = () => { listIntegrations().then(setState).catch((e) => setError(adminError(e))) }
  useEffect(load, [])
  return (
    <>
      {error && <div className="mb-4 rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger lg:col-span-2">Integrações: {error}</div>}
      {GROUPS.map((g) => (
        <Card key={g.title}>
          <CardHeader title={<span className="flex items-center gap-2"><g.icon className="size-4" /> {g.title}</span>} description={g.blurb} />
          <div className="flex flex-col gap-4 px-5 pb-5">
            {g.fields.map((f) => <FieldRow key={f.key} f={f} state={state[f.key]} onSaved={load} />)}
            {g.fields.some((f) => f.key === 'evolution_instance') && (
              <NoticeWhatsApp ready={['evolution_url', 'evolution_api_key', 'evolution_instance'].every((k) => state[k])} />
            )}
          </div>
        </Card>
      ))}
    </>
  )
}
