import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Badge, Card, CardHeader } from '@/components/ui/misc'
import { Dialog } from '@/components/ui/overlay'
import { useAppState, type LicenseState } from '@/lib/app-state'
import { LICENSE_KEY_RE, reasonText } from '@/lib/license'
import { isWebApp } from '@/lib/supabase'

const stateLabel: Record<LicenseState, string> = {
  ativa: 'Ativa',
  teste: 'Teste grátis',
  vencendo: 'Vencendo',
  carencia: 'Em carência',
  restrito: 'Bloqueada'
}

export function LicenseTab() {
  const { license, activateLicense, deactivateLicense } = useAppState()
  const [keyOpen, setKeyOpen] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [busy, setBusy] = useState(false)
  const keyOk = LICENSE_KEY_RE.test(newKey.trim().toUpperCase())

  if (isWebApp) {
    return (
      <Card>
        <CardHeader title="Assinatura" description="Na versão online o acesso é liberado pela assinatura da sua empresa." />
        <p className="px-5 pb-5 text-sm text-muted">
          Para o aplicativo instalado no computador, a chave de licença é gerada pela equipe IC Chat depois da contratação e informada na primeira abertura do app.
        </p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden">
        <div className="brand-gradient flex flex-col gap-4 p-5 text-white sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="text-sm text-white/75">Plano</p>
            <p className="text-2xl font-bold">IC Chat {license.plan}</p>
            <Badge className="mt-2 bg-white/20 text-white">{stateLabel[license.state]}</Badge>
          </div>
          {license.expiresAt && (
            <div className="rounded-xl bg-white/12 px-4 py-3 backdrop-blur">
              <p className="text-xs text-white/75">{license.daysLeft >= 0 ? 'Válida até' : 'Venceu em'}</p>
              <p className="text-lg font-bold">{license.expiresAt}</p>
              <p className="text-xs text-white/75">{license.daysLeft >= 0 ? `${license.daysLeft} dias restantes` : `há ${Math.abs(license.daysLeft)} dias`}</p>
            </div>
          )}
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Chave de licença">
            <Input readOnly value={license.key ? `${license.key.slice(0, 10)}-•••••-•••••` : 'Nenhuma chave informada'} className="font-mono tracking-wider" />
          </Field>
          <div className="flex flex-col gap-1.5">
            <p className="text-[13px] font-medium">Computadores permitidos</p>
            <p className="flex h-9 items-center text-sm font-semibold tabular-nums">{license.pcsMax ?? '—'}</p>
          </div>
          <p className="text-xs text-muted sm:col-span-2">
            Última verificação com o servidor de licenças: {license.lastCheck || '—'}. O sistema confere a licença ao abrir e a cada 12 horas, e funciona até 7 dias sem internet.
            {license.reason && license.reason !== 'ok' && <b className="mt-1 block text-danger">{reasonText[license.reason]}</b>}
          </p>
        </div>
        <div className="flex flex-col gap-2 border-t border-border px-5 py-3 sm:flex-row sm:justify-end">
          {license.key && <Button variant="ghost" onClick={() => { deactivateLicense(); toast.success('Chave removida deste computador') }}>Remover chave</Button>}
          <Button variant="outline" onClick={() => setKeyOpen(true)}><KeyRound /> {license.key ? 'Inserir nova chave' : 'Ativar com uma chave'}</Button>
          <Button onClick={() => window.open('https://wa.me/5511900000000?text=' + encodeURIComponent('Olá! Quero renovar a licença do IC Chat.'), '_blank')}>
            Falar com o suporte para renovar
          </Button>
        </div>
      </Card>

      <Dialog
        open={keyOpen}
        onOpenChange={setKeyOpen}
        title="Inserir chave de licença"
        description="Cole a chave recebida por WhatsApp ou e-mail. Ela é validada no servidor de licenças."
        footer={
          <>
            <Button variant="outline" onClick={() => setKeyOpen(false)}>Cancelar</Button>
            <Button
              disabled={!keyOk || busy}
              onClick={async () => {
                setBusy(true)
                const r = await activateLicense(newKey)
                setBusy(false)
                if (r.valid) {
                  setKeyOpen(false)
                  setNewKey('')
                  toast.success('Licença ativada', { description: r.tenantName ? `Empresa: ${r.tenantName}` : undefined })
                } else toast.error('Não foi possível ativar', { description: reasonText[r.reason] })
              }}
            >
              <KeyRound /> {busy ? 'Validando…' : 'Ativar'}
            </Button>
          </>
        }
      >
        <Field label="Chave" hint={newKey && !keyOk ? <span className="text-danger">Formato esperado: ICCH-XXXXX-XXXXX-XXXXX-XXXXX</span> : 'Formato: ICCH-XXXXX-XXXXX-XXXXX-XXXXX'}>
          <Input autoFocus value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="ICCH-XXXXX-XXXXX-XXXXX-XXXXX" className="font-mono tracking-wider uppercase" />
        </Field>
      </Dialog>
    </div>
  )
}
