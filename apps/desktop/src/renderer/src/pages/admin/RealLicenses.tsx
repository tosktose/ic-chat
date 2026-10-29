import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarPlus, Copy, KeyRound, Loader2, PauseCircle, PlayCircle, Plus, ShieldX } from 'lucide-react'
import { toast } from 'sonner'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/input'
import { Badge, Card, Segmented } from '@/components/ui/misc'
import { Dialog } from '@/components/ui/overlay'
import {
  adminError, extendLicense, generateLicense, listLicenses, listTenants, setLicenseStatus,
  type AdminLicense, type AdminTenant, type LicenseKind
} from '@/lib/admin-api'

type View = AdminLicense & { shown: 'ativa' | 'suspensa' | 'revogada' | 'vencida' }
const tone = { ativa: 'success', suspensa: 'warning', revogada: 'danger', vencida: 'warning' } as const
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—')
const ago = (iso?: string | null) => {
  if (!iso) return 'nunca'
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  return m < 1 ? 'agora' : m < 60 ? `há ${m} min` : m < 1440 ? `há ${Math.round(m / 60)} h` : `há ${Math.round(m / 1440)} d`
}

/** Licenças reais: gravadas no Supabase (só o hash da chave). Renovar, suspender (inadimplência) e revogar bloqueiam o app na próxima validação. */
export function RealLicenses() {
  const [rows, setRows] = useState<AdminLicense[] | null>(null)
  const [tenants, setTenants] = useState<AdminTenant[]>([])
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'todas' | View['shown']>('todas')
  const [open, setOpen] = useState(false)
  const [tenant, setTenant] = useState('')
  const [kind, setKind] = useState<LicenseKind>('mensal')
  const [devices, setDevices] = useState(3)
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<{ key: string; expires_at: string; tenant: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const [l, t] = await Promise.all([listLicenses(), listTenants()])
      setRows(l)
      setTenants(t)
      setError('')
    } catch (e) {
      setError(adminError(e))
      setRows([])
    }
  }, [])
  useEffect(() => { void load() }, [load])

  const list = useMemo<View[]>(
    () => (rows ?? []).map((r) => ({ ...r, shown: r.status === 'ativa' && new Date(r.expires_at) <= new Date() ? 'vencida' : r.status })),
    [rows]
  )
  const visible = list.filter((r) => filter === 'todas' || r.shown === filter)

  const act = async (fn: () => Promise<void>, ok: string) => {
    try { await fn(); toast.success(ok); await load() } catch (e) { toast.error('Não foi possível concluir', { description: adminError(e) }) }
  }

  const generate = async () => {
    setBusy(true)
    try {
      const r = await generateLicense(tenant, kind, devices)
      setCreated({ key: r.key, expires_at: r.expires_at, tenant: tenants.find((t) => t.id === tenant)?.name ?? '' })
      setOpen(false)
      await load()
    } catch (e) {
      toast.error('Não foi possível gerar a chave', { description: adminError(e) })
    } finally { setBusy(false) }
  }

  return (
    <Page wide title="Licenças" description="Chaves que liberam o aplicativo instalado. Se a empresa não pagar, suspenda ou revogue: o app bloqueia na próxima verificação (no máximo 12 horas)." actions={<Button onClick={() => setOpen(true)}><Plus /> Gerar chave</Button>}>
      {error && <div className="mb-4 rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{error}</div>}
      <Card className="overflow-hidden">
        <div className="p-4">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'todas', label: 'Todas', count: list.length },
              { value: 'ativa', label: 'Ativas' },
              { value: 'suspensa', label: 'Suspensas' },
              { value: 'vencida', label: 'Vencidas' },
              { value: 'revogada', label: 'Revogadas' }
            ]}
          />
        </div>
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[900px] text-[13px]">
            <thead>
              <tr className="border-y border-border bg-surface-2/60 text-left text-[11px] font-semibold tracking-wider text-subtle uppercase">
                <th className="px-5 py-2.5">Chave</th><th className="px-3 py-2.5">Empresa</th><th className="px-3 py-2.5">Tipo</th>
                <th className="px-3 py-2.5">Validade</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Computadores</th>
                <th className="px-3 py-2.5">Última validação</th><th className="w-36 px-3 py-2.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows === null && <tr><td colSpan={8} className="px-5 py-10 text-center text-muted"><Loader2 className="mx-auto size-5 animate-spin" /></td></tr>}
              {rows !== null && visible.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-muted">Nenhuma chave {filter === 'todas' ? 'gerada ainda. Clique em “Gerar chave”.' : 'neste filtro.'}</td></tr>
              )}
              {visible.map((k) => (
                <tr key={k.id} className="border-b border-border last:border-0 hover:bg-surface-2/40">
                  <td className="px-5 py-3 font-mono font-semibold whitespace-nowrap">{k.key_prefix}-•••••-•••••</td>
                  <td className="px-3 py-3 whitespace-nowrap">{k.tenant_name}</td>
                  <td className="px-3 py-3 capitalize">{k.kind}</td>
                  <td className="px-3 py-3 tabular-nums">{fmt(k.expires_at)}</td>
                  <td className="px-3 py-3"><Badge tone={tone[k.shown]}>{k.shown}</Badge></td>
                  <td className="px-3 py-3 tabular-nums">{k.devices} / {k.max_devices}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-muted">{ago(k.last_validated_at)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button variant="ghost" size="icon-sm" aria-label="Renovar por 30 dias" title="Renovar +30 dias (após pagamento)" onClick={() => act(() => extendLicense(k.id, 30), 'Licença renovada por 30 dias')}><CalendarPlus /></Button>
                      {k.status === 'suspensa'
                        ? <Button variant="ghost" size="icon-sm" aria-label="Reativar" title="Reativar" onClick={() => act(() => setLicenseStatus(k.id, 'ativa'), 'Licença reativada')}><PlayCircle /></Button>
                        : <Button variant="ghost" size="icon-sm" aria-label="Suspender" title="Suspender (inadimplência)" disabled={k.status === 'revogada'} onClick={() => act(() => setLicenseStatus(k.id, 'suspensa'), 'Licença suspensa: o app será bloqueado')}><PauseCircle /></Button>}
                      <Button variant="ghost" size="icon-sm" className="hover:text-danger" aria-label="Revogar" title="Revogar definitivamente" disabled={k.status === 'revogada'} onClick={() => { if (window.confirm(`Revogar a chave de ${k.tenant_name}? O app será bloqueado.`)) void act(() => setLicenseStatus(k.id, 'revogada'), 'Chave revogada') }}><ShieldX /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Gerar chave de licença"
        description="A chave nova substitui a ativa da empresa. Ela será mostrada uma única vez."
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button disabled={!tenant || busy} onClick={generate}><KeyRound /> {busy ? 'Gerando…' : 'Gerar chave'}</Button></>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Empresa" className="sm:col-span-2">
            <Select value={tenant} onChange={(e) => setTenant(e.target.value)}>
              <option value="">Escolha a empresa</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
          <Field label="Tipo">
            <Select value={kind} onChange={(e) => setKind(e.target.value as LicenseKind)}>
              <option value="mensal">Mensal · 30 dias</option><option value="trimestral">Trimestral · 90 dias</option><option value="anual">Anual · 365 dias</option><option value="teste">Teste · 7 dias</option>
            </Select>
          </Field>
          <Field label="Computadores permitidos"><Input type="number" min={1} max={500} value={devices} onChange={(e) => setDevices(Math.max(1, Number(e.target.value) || 1))} /></Field>
        </div>
      </Dialog>

      <Dialog
        open={!!created}
        onOpenChange={(v) => { if (!v) setCreated(null) }}
        title="Chave gerada"
        description={`Para ${created?.tenant}. Copie agora: por segurança ela não será exibida novamente.`}
        footer={<Button onClick={() => setCreated(null)}>Já copiei</Button>}
      >
        <div className="rounded-xl border border-dashed border-border-strong bg-surface-2 p-4 text-center">
          <code className="block font-mono text-lg font-bold tracking-wider break-all select-all">{created?.key}</code>
          <p className="mt-1 text-xs text-muted">Válida até {fmt(created?.expires_at)}</p>
          <Button className="mt-3" variant="outline" onClick={() => { void navigator.clipboard?.writeText(created?.key ?? ''); toast.success('Chave copiada') }}><Copy /> Copiar chave</Button>
        </div>
      </Dialog>
    </Page>
  )
}
