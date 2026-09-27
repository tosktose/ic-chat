import { useState } from 'react'
import { Copy, KeyRound, Plus, RefreshCw, ShieldX } from 'lucide-react'
import { toast } from 'sonner'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/input'
import { Badge, Card, CardHeader, Segmented } from '@/components/ui/misc'
import { Dialog } from '@/components/ui/overlay'
import { licenseKeys, randomKey, tenantById, tenants, type LicenseKey } from '@/data/saas'

const tone: Record<LicenseKey['status'], 'success' | 'danger' | 'neutral' | 'warning'> = {
  ativa: 'success',
  revogada: 'danger',
  expirada: 'warning',
  substituída: 'neutral'
}

const API_TOKENS = [
  { id: 'a1', tenantId: 't3', name: 'Integração ERP', prefix: 'ict_live_9f2c', created: '12/08/2026', lastUse: 'há 3 min', scope: 'Contatos e agenda' },
  { id: 'a2', tenantId: 't2', name: 'Site — agendamento', prefix: 'ict_live_1b7a', created: '02/09/2026', lastUse: 'ontem', scope: 'Agenda' }
]

export function AdminLicensesPage() {
  const [filter, setFilter] = useState<'todas' | LicenseKey['status']>('todas')
  const [open, setOpen] = useState(false)
  const [key] = useState(randomKey)
  const list = licenseKeys.filter((k) => filter === 'todas' || k.status === filter)

  const copy = (k: string) => {
    void navigator.clipboard?.writeText(k)
    toast.success('Chave copiada')
  }

  return (
    <Page
      wide
      title="Licenças e tokens"
      description="Chaves assinadas que liberam o IC Chat em cada empresa, e tokens de API para integrações."
      actions={<Button onClick={() => setOpen(true)}><Plus /> Gerar chave</Button>}
    >
      <Card className="overflow-hidden">
        <div className="p-4">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'todas', label: 'Todas', count: licenseKeys.length },
              { value: 'ativa', label: 'Ativas' },
              { value: 'expirada', label: 'Expiradas' },
              { value: 'revogada', label: 'Revogadas' }
            ]}
          />
        </div>
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[820px] text-[13px]">
            <thead>
              <tr className="border-y border-border bg-surface-2/60 text-left text-[11px] font-semibold tracking-wider text-subtle uppercase">
                <th className="px-5 py-2.5">Chave</th>
                <th className="px-3 py-2.5">Empresa</th>
                <th className="px-3 py-2.5">Tipo</th>
                <th className="px-3 py-2.5">Emitida</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Última validação</th>
                <th className="w-32 px-3 py-2.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map((k) => (
                <tr key={k.key} className="border-b border-border last:border-0 hover:bg-surface-2/40">
                  <td className="px-5 py-3">
                    <span className="font-mono font-semibold whitespace-nowrap">{k.key}</span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">{tenantById(k.tenantId).name}</td>
                  <td className="px-3 py-3">{k.kind}</td>
                  <td className="px-3 py-3 tabular-nums">{k.issued}</td>
                  <td className="px-3 py-3"><Badge tone={tone[k.status]}>{k.status}</Badge></td>
                  <td className="px-3 py-3 whitespace-nowrap text-muted">{k.lastCheck}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button variant="ghost" size="icon-sm" aria-label="Copiar chave" onClick={() => copy(k.key)}><Copy /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Substituir por uma chave nova" onClick={() => toast.success('Chave substituída por uma nova')}><RefreshCw /></Button>
                      <Button variant="ghost" size="icon-sm" className="hover:text-danger" aria-label="Revogar chave" disabled={k.status === 'revogada'} onClick={() => toast.success('Chave revogada')}><ShieldX /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader
          title="Tokens de API"
          description="Para sistemas externos das empresas (site, ERP). O token completo aparece só uma vez, ao ser criado."
          action={<Button variant="outline" size="sm" onClick={() => toast.success('Token criado', { description: 'Copie agora: ele não será exibido de novo.' })}><KeyRound /> Novo token</Button>}
        />
        <div className="flex flex-col">
          {API_TOKENS.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium">{t.name} <span className="text-muted">· {tenantById(t.tenantId).name}</span></p>
                <p className="text-xs text-muted">
                  <code className="font-mono">{t.prefix}••••••••</code> · {t.scope} · criado {t.created} · usado {t.lastUse}
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" className="hover:text-danger" aria-label="Revogar token" onClick={() => toast.success('Token revogado')}><ShieldX /></Button>
            </div>
          ))}
        </div>
      </Card>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Gerar chave de licença"
        description="A chave nova substitui a atual da empresa e é enviada por WhatsApp e e-mail."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => { setOpen(false); toast.success('Chave gerada e enviada', { description: key }) }}><KeyRound /> Gerar e enviar</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Empresa" className="sm:col-span-2">
            <Select>
              {tenants.map((t) => (
                <option key={t.id}>{t.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tipo">
            <Select><option>Mensal</option><option>Trimestral</option><option>Anual</option><option>Teste · 7 dias</option></Select>
          </Field>
          <Field label="Válida até"><Input type="date" defaultValue="2026-10-27" /></Field>
          <div className="rounded-xl border border-dashed border-border-strong bg-surface-2 p-3 sm:col-span-2">
            <p className="text-xs text-muted">Pré-visualização</p>
            <code className="mt-1 block font-mono text-[15px] font-semibold tracking-wider">{key}</code>
          </div>
        </div>
      </Dialog>
    </Page>
  )
}
