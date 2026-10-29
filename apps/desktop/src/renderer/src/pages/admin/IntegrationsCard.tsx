import { useEffect, useState } from 'react'
import { Bot, CalendarDays, Check, Mail, Plug, Wallet, Workflow } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge, Card, CardHeader } from '@/components/ui/misc'
import { adminError, listIntegrations, setIntegration, type IntegrationState } from '@/lib/admin-api'

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
    blurb: 'Confirmação de conta, parabéns por ativar e aviso de acesso expirando saem pelo IC Chat, sem mexer no Supabase compartilhado. Crie a chave em resend.com e verifique seu domínio.',
    fields: [
      { key: 'resend_api_key', label: 'Chave da API do Resend', hint: 'Começa com re_.', placeholder: 're_…', secret: true },
      { key: 'email_from', label: 'Remetente', hint: 'Ex.: IC Chat <nao-responda@icchat.com.br> (o domínio precisa estar verificado no Resend).', placeholder: 'IC Chat <nao-responda@seudominio.com.br>' }
    ]
  },
  {
    title: 'Inteligência artificial (OpenRouter)', icon: Bot,
    blurb: 'A IA que atende os clientes. Crie a chave em openrouter.ai/keys e escolha um modelo barato em openrouter.ai/models.',
    fields: [
      { key: 'openrouter_api_key', label: 'Chave da API', hint: 'Começa com sk-or-. Fica guardada só no servidor.', placeholder: 'sk-or-v1-…', secret: true },
      { key: 'openrouter_model', label: 'Modelo', hint: 'Copie o nome do modelo, ex.: google/gemini-2.0-flash-001', placeholder: 'provedor/modelo' }
    ]
  },
  {
    title: 'WhatsApp (Evolution API)', icon: Plug,
    blurb: 'Servidor que conecta o número de WhatsApp por QR Code. Preencha quando o servidor estiver no ar.',
    fields: [
      { key: 'evolution_url', label: 'Endereço do servidor', hint: 'Ex.: https://evolution.seudominio.com.br', placeholder: 'https://…' },
      { key: 'evolution_instance', label: 'Nome da instância dos avisos', hint: 'Instância da Evolution API usada para enviar os avisos do sistema por WhatsApp.', placeholder: 'icchat-avisos' },
      { key: 'evolution_api_key', label: 'Chave global (apikey)', hint: 'A chave definida no servidor da Evolution API.', placeholder: 'chave', secret: true }
    ]
  },
  {
    title: 'Automações (n8n)', icon: Workflow,
    blurb: 'Fluxos automáticos, como lembretes e disparos. Preencha quando o n8n estiver no ar.',
    fields: [
      { key: 'n8n_url', label: 'Endereço do n8n', hint: 'Ex.: https://n8n.seudominio.com.br', placeholder: 'https://…' },
      { key: 'n8n_api_key', label: 'Chave da API do n8n', hint: 'Em n8n: Configurações → API.', placeholder: 'chave', secret: true }
    ]
  },
  {
    title: 'Google Agenda', icon: CalendarDays,
    blurb: 'Permite que cada usuário conecte a própria agenda. Crie um "ID do cliente OAuth" no Google Cloud (API Google Calendar ativada).',
    fields: [
      { key: 'google_client_id', label: 'ID do cliente OAuth', hint: 'Termina em .apps.googleusercontent.com', placeholder: '000000-xxxx.apps.googleusercontent.com' },
      { key: 'google_client_secret', label: 'Chave secreta do cliente', hint: 'Mostrada uma vez no Google Cloud.', placeholder: 'GOCSPX-…', secret: true }
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
        {filled ? <Badge tone="success"><Check className="size-3" /> Preenchido</Badge> : <Badge>Vazio</Badge>}
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
          </div>
        </Card>
      ))}
    </>
  )
}
