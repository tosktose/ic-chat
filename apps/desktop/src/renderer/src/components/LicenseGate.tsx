import { KeyRound, LifeBuoy, Loader2, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import logo from '@/assets/logo-transparent.png'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { useAppState } from '@/lib/app-state'
import { LICENSE_KEY_RE, reasonText } from '@/lib/license'
import { isWebApp } from '@/lib/supabase'
import { usePublicSettings, whatsappLink } from '@/lib/platform'

/** Bloqueia o aplicativo instalado enquanto a licença não for válida (chave ausente, vencida, suspensa por falta de pagamento...). */
export function LicenseGate({ children }: { children: React.ReactNode }) {
  const { license, activateLicense, role } = useAppState()
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const contact = usePublicSettings()
  const wa = whatsappLink(contact.support_whatsapp, 'Olá! Preciso de ajuda com a licença do IC Chat.')
  const supportHref = wa || (contact.support_email ? `mailto:${contact.support_email}?subject=${encodeURIComponent('Licença do IC Chat')}` : '')

  if (isWebApp || role === 'superadmin') return <>{children}</>
  if (license.checking) {
    return <div className="grid h-full place-items-center bg-background"><Loader2 className="size-6 animate-spin text-primary" aria-label="Verificando licença" /></div>
  }
  if (license.state !== 'restrito') return <>{children}</>

  const ok = LICENSE_KEY_RE.test(key.trim().toUpperCase())
  const blockedReason = license.reason && license.reason !== 'nokey' ? reasonText[license.reason] : null
  return (
    <div className="grid h-full place-items-center overflow-y-auto bg-background p-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-8 shadow-xl">
        <img src={logo} alt="IC Chat" className="mx-auto h-12 w-auto rounded bg-white px-2" />
        <h1 className="mt-6 text-center text-xl font-bold">{blockedReason ? 'Acesso bloqueado' : 'Ative o IC Chat'}</h1>
        <p className="mt-2 text-center text-sm leading-6 text-muted">{blockedReason ?? reasonText.nokey}</p>
        {blockedReason && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-danger-soft p-3 text-xs text-danger">
            <ShieldAlert className="size-4 shrink-0" /> Seus dados continuam guardados. O acesso volta assim que a licença for regularizada.
          </div>
        )}
        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setError('')
            const r = await activateLicense(key)
            setBusy(false)
            if (r.valid) toast.success('Licença ativada', { description: r.tenantName })
            else setError(reasonText[r.reason])
          }}
        >
          <Field label="Chave de licença" hint={error ? <span className="text-danger">{error}</span> : 'Formato: ICCH-XXXXX-XXXXX-XXXXX-XXXXX'}>
            <Input autoFocus value={key} onChange={(e) => setKey(e.target.value)} placeholder="ICCH-XXXXX-XXXXX-XXXXX-XXXXX" className="font-mono tracking-wider uppercase" icon={<KeyRound />} />
          </Field>
          <Button type="submit" size="lg" disabled={!ok || busy}>{busy ? 'Validando…' : 'Ativar neste computador'}</Button>
        </form>
        {supportHref && (
          <a href={supportHref} target="_blank" rel="noreferrer" className="mt-5 flex items-center justify-center gap-2 text-sm text-muted hover:text-foreground">
            <LifeBuoy className="size-4" /> Falar com o suporte
          </a>
        )}
      </div>
    </div>
  )
}
