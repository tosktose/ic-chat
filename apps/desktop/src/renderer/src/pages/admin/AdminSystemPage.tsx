import { useEffect, useState } from 'react'
import { Globe, Mail, ShieldCheck, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { WhatsAppIcon } from '@/components/brand'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Badge, Card, CardHeader } from '@/components/ui/misc'
import { adminError, loadSettings, saveSettings, type PublicSettings } from '@/lib/admin-api'
import { isWebApp } from '@/lib/supabase'

const EMPTY: PublicSettings = { company_name: '', support_email: '', support_whatsapp: '', site_url: '' }

/** Configurações da plataforma, gravadas no Supabase (tabela platform_settings). */
export function AdminSystemPage() {
  const [saved, setSaved] = useState<PublicSettings>(EMPTY)
  const [form, setForm] = useState<PublicSettings>(EMPTY)
  const [loading, setLoading] = useState(isWebApp)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const dirty = JSON.stringify(saved) !== JSON.stringify(form)

  useEffect(() => {
    if (!isWebApp) return
    loadSettings()
      .then((s) => { setSaved(s); setForm(s) })
      .catch((e) => setError(adminError(e)))
      .finally(() => setLoading(false))
  }, [])

  const set = <K extends keyof PublicSettings>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (form.support_email && !/^\S+@\S+\.\S+$/.test(form.support_email)) return toast.error('E-mail de suporte inválido')
    if (form.site_url && !/^https:\/\/[^\s/]+\.[^\s]+$/.test(form.site_url)) return toast.error('O endereço do site deve começar com https://')
    setBusy(true)
    try {
      await saveSettings(form)
      setSaved(form)
      toast.success('Configurações salvas no banco')
    } catch (e) {
      toast.error('Não foi possível salvar', { description: adminError(e) })
    } finally { setBusy(false) }
  }

  return (
    <Page
      title="Configurações do sistema"
      description="Contato de suporte e endereço do site. Tudo é gravado no banco e usado pelo site e pelo aplicativo."
      actions={<Button onClick={save} disabled={!dirty || busy || loading}>{busy ? 'Salvando…' : 'Salvar'}</Button>}
    >
      {error && <div className="mb-4 rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{error}</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Mail className="size-4" /> Contato de suporte</span>} description="Aparece no site, na política de privacidade e na tela de bloqueio do aplicativo" />
          <div className="flex flex-col gap-4 px-5 pb-5">
            <Field label="Nome da empresa"><Input value={form.company_name} onChange={(e) => set('company_name', e.target.value)} disabled={loading} /></Field>
            <Field label="E-mail de suporte" hint="Também é o contato do encarregado de dados (LGPD)."><Input icon={<Mail />} type="email" value={form.support_email} onChange={(e) => set('support_email', e.target.value)} disabled={loading} /></Field>
            <Field label="WhatsApp de suporte" hint="Com DDD, só números (ex.: 11 91234-5678). Vazio = o botão de WhatsApp não aparece."><Input icon={<WhatsAppIcon />} value={form.support_whatsapp} onChange={(e) => set('support_whatsapp', e.target.value)} placeholder="(11) 90000-0000" disabled={loading} /></Field>
          </div>
        </Card>

        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Globe className="size-4" /> Endereço do site</span>} description="Usado nos links do mapa do site, e-mails e retorno do pagamento" />
          <div className="flex flex-col gap-4 px-5 pb-5">
            <Field label="Endereço (https://…)" hint="Hoje o site roda no endereço da Vercel. Quando comprar o domínio (ex.: icchat.com.br), troque aqui e na variável VITE_SITE_URL da Vercel.">
              <Input icon={<Globe />} value={form.site_url} onChange={(e) => set('site_url', e.target.value)} placeholder="https://icchat.com.br" disabled={loading} />
            </Field>
            <p className="rounded-xl bg-surface-2 p-3 text-xs leading-5 text-muted">Domínio próprio ainda não configurado? Sem problema: nada depende dele para funcionar.</p>
          </div>
        </Card>

        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><ShieldCheck className="size-4" /> Verificação de licenças</span>} action={<Badge tone="success">No Supabase</Badge>} />
          <div className="flex flex-col gap-2 px-5 pb-5 text-sm leading-6 text-muted">
            <p>Não existe servidor à parte: as licenças ficam gravadas no seu Supabase (só o código criptografado de cada chave) e o aplicativo confere pela função <code className="font-mono text-xs">validate_license</code>.</p>
            <ul className="list-disc pl-5">
              <li>O app confere a licença ao abrir e a cada 12 horas.</li>
              <li>Funciona até 7 dias sem internet; depois pede para conectar.</li>
              <li>Chave suspensa, revogada, vencida ou empresa com pagamento pendente: o app bloqueia.</li>
            </ul>
          </div>
        </Card>

        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Wallet className="size-4" /> Cobrança (Mercado Pago)</span>} />
          <div className="flex flex-col gap-2 px-5 pb-5 text-sm leading-6 text-muted">
            <p>A chave do Mercado Pago <b>nunca</b> fica nesta tela nem no site: ela é guardada nos <i>Secrets</i> do Supabase (Edge Functions).</p>
            <ul className="list-disc pl-5">
              <li>Secret <code className="font-mono text-xs">ICCHAT_MP_ACCESS_TOKEN</code>: Access Token do aplicativo do Mercado Pago do IC Chat.</li>
              <li>Secret <code className="font-mono text-xs">ICCHAT_MP_WEBHOOK_SECRET</code>: assinatura secreta do webhook.</li>
              <li>Webhook cadastrado no Mercado Pago: <code className="font-mono text-xs break-all">…supabase.co/functions/v1/mp-webhook</code></li>
            </ul>
          </div>
        </Card>
      </div>
    </Page>
  )
}
