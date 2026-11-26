import { useEffect, useState } from 'react'
import { Mail } from 'lucide-react'
import { toast } from 'sonner'
import { WhatsAppIcon } from '@/components/brand'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Card, CardHeader } from '@/components/ui/misc'
import { adminError, loadSettings, saveSettings, type PublicSettings } from '@/lib/admin-api'
import { isWebApp } from '@/lib/supabase'
import { IntegrationsCard } from './IntegrationsCard'

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

        {isWebApp && <IntegrationsCard />}

      </div>
    </Page>
  )
}
