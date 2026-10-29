import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { isWebApp } from '@/lib/supabase'
import { adminError, extendTenant, setTenantBlocked, setTenantHidden } from '@/lib/admin-api'
import { useNavigate } from 'react-router'
import {
  Ban,
  Building2,
  CalendarPlus,
  CircleDollarSign,
  Copy,
  FlaskConical,
  KeyRound,
  Laptop,
  Mail,
  Plus,
  RotateCcw,
  Search,
  Send,
  TimerReset,
  EyeOff,
  UserPlus
} from 'lucide-react'
import { toast } from 'sonner'
import { WhatsAppIcon } from '@/components/brand'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/input'
import { Avatar, Badge, Card, Segmented } from '@/components/ui/misc'
import { Dialog, Sheet } from '@/components/ui/overlay'
import { NewUserDialog, UserDetailView, UserQuickActions, type DetailUser } from '@/components/UserDetail'
import { brl, cn } from '@/lib/utils'
import { modalityCfg, randomKey, statusCfg, type Modality, type Tenant, type TenantUser } from '@/data/saas'
import { useSaas } from '@/lib/saas'
import { useNotifications } from '@/lib/notifications'
import type { LicenseKey, Plan } from '@/data/saas'

type Filter = 'todos' | 'atencao' | 'teste' | 'ativos'

export function AdminPage() {
  const { tenants, users: tenantUsers } = useSaas()
  const [filter, setFilter] = useState<Filter>('todos')
  const [q, setQ] = useState('')
  const [newOpen, setNewOpen] = useState<false | 'cliente' | 'teste'>(false)
  const [detail, setDetail] = useState<Tenant | null>(null)

  const list = useMemo(
    () =>
      tenants.filter((t) => {
        if (q && !(t.name + t.document + t.email).toLowerCase().includes(q.toLowerCase())) return false
        if (filter === 'atencao') return ['vencendo', 'carencia', 'restrito'].includes(t.status)
        if (filter === 'teste') return t.status === 'teste'
        if (filter === 'ativos') return t.status === 'ativa'
        return true
      }),
    [filter, q, tenants]
  )

  const mrr = tenants.filter((t) => t.status !== 'suspensa' && t.status !== 'restrito').reduce((s, t) => s + t.mrr, 0)
  const attention = tenants.filter((t) => ['vencendo', 'carencia', 'restrito'].includes(t.status)).length

  return (
    <Page
      wide
      title="Empresas"
      description="Cada empresa tem seus próprios usuários, WhatsApp e dados, isolados das demais."
      actions={
        <>
          <Button variant="outline" disabled={isWebApp} title={isWebApp ? 'As empresas entram sozinhas quando o cliente cria a conta no site' : undefined} onClick={() => setNewOpen('teste')}><FlaskConical /> Teste grátis (7 dias)</Button>
          <Button disabled={isWebApp} title={isWebApp ? 'As empresas entram sozinhas quando o cliente cria a conta no site' : undefined} onClick={() => setNewOpen('cliente')}><Plus /> Nova empresa</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat icon={<Building2 />} label="Empresas" value={String(tenants.length)} sub={`${tenants.filter((t) => t.online).length} online agora`} />
        <Stat icon={<CircleDollarSign />} label="Receita mensal (MRR)" value={brl.format(mrr)} sub={mrr > 0 ? 'mensalidades ativas' : 'sem mensalidades ativas'} />
        <Stat icon={<FlaskConical />} label="Em teste" value={String(tenants.filter((t) => t.status === 'teste').length)} sub={`${tenants.filter((t) => t.status === 'teste' && t.days <= 7).length} termina(m) em 7 dias`} />
        <Stat icon={<TimerReset />} label="Precisam de atenção" value={String(attention)} sub="vencendo, carência ou restrito" alert />
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <Segmented
            value={filter}
            onChange={setFilter}
            className="self-start"
            options={[
              { value: 'todos', label: 'Todas', count: tenants.length },
              { value: 'atencao', label: 'Atenção', count: attention },
              { value: 'teste', label: 'Teste' },
              { value: 'ativos', label: 'Ativas' }
            ]}
          />
          <div className="md:ml-auto md:w-72">
            <Input icon={<Search />} placeholder="Buscar por nome ou CNPJ" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        {/* Tabela (tablet/desktop) */}
        <div className="scroll-thin hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] text-[13px]">
            <thead>
              <tr className="border-y border-border bg-surface-2/60 text-left text-[11px] font-semibold tracking-wider text-subtle uppercase">
                <th className="px-5 py-2.5">Empresa</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Plano</th>
                <th className="px-3 py-2.5">Modalidade</th>
                <th className="px-3 py-2.5">Usuários</th>
                <th className="px-3 py-2.5">Vencimento</th>
                <th className="px-3 py-2.5">PCs</th>
                <th className="px-3 py-2.5 text-right">Mensalidade</th>
                <th className="w-40 px-3 py-2.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id} onClick={() => setDetail(t)} className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-2/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <TenantAvatar t={t} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{t.name}</p>
                        <p className="truncate text-xs text-muted">{isWebApp ? [t.email || 'sem e-mail', t.segment !== '—' ? t.segment : ''].filter(Boolean).join(' · ') : `${t.segment} · ${t.mode} · v${t.version}`}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3"><Badge tone={statusCfg[t.status].tone}>{statusCfg[t.status].label}</Badge></td>
                  <td className="px-3 py-3 font-medium">{t.plan}</td>
                  <td className="px-3 py-3">
                    <Badge tone={modalityCfg[t.modality].tone} title={modalityCfg[t.modality].hint}>
                      {modalityCfg[t.modality].label}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-muted tabular-nums">{tenantUsers.filter((u) => u.tenantId === t.id).length}</td>
                  <td className="px-3 py-3">
                    <p className="tabular-nums">{t.expires}</p>
                    <p className={cn('text-xs whitespace-nowrap', t.days < 0 ? 'text-danger' : t.days <= 7 ? 'text-warning' : 'text-muted')}>
                      {t.days < 0 ? `vencida há ${-t.days} d` : `${t.days} dias`}
                    </p>
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    <span className="flex items-center gap-1.5 whitespace-nowrap"><Laptop className="size-3.5 text-subtle" /> {t.pcs[0]}/{t.pcs[1] ?? '∞'}</span>
                  </td>
                  <td className="px-3 py-3 text-right font-medium tabular-nums">{t.mrr ? brl.format(t.mrr) : '—'}</td>
                  <td className="px-3 py-3"><TenantActions t={t} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cartões (celular) */}
        <div className="flex flex-col gap-2 p-3 pt-0 md:hidden">
          {list.map((t) => (
            <button key={t.id} onClick={() => setDetail(t)} className="rounded-xl border border-border p-3 text-left">
              <div className="flex items-center gap-2">
                <span className={cn('size-2 rounded-full', statusCfg[t.status].dot)} />
                <p className="flex-1 truncate font-semibold">{t.name}</p>
                <Badge tone={statusCfg[t.status].tone}>{statusCfg[t.status].label}</Badge>
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {t.plan} · vence {t.expires} · {t.pcs[0]}/{t.pcs[1] ?? '∞'} PCs
              </p>
            </button>
          ))}
        </div>
      </Card>

      <NewTenantDialog mode={newOpen} onClose={() => setNewOpen(false)} />
      <TenantSheet tenant={detail ? tenants.find((t) => t.id === detail.id) ?? null : null} onClose={() => setDetail(null)} />
    </Page>
  )
}

function TenantAvatar({ t }: { t: Tenant }) {
  return (
    <span className="relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-xs font-bold text-muted">
      {t.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
      <span className={cn('absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-surface', t.online ? 'bg-success' : 'bg-subtle')} />
    </span>
  )
}

function Stat({ icon, label, value, sub, alert }: { icon: ReactNode; label: string; value: string; sub: string; alert?: boolean }) {
  return (
    <Card className="p-4">
      <div className={cn('flex items-center gap-2 text-[12.5px] font-medium [&_svg]:size-4', alert ? 'text-danger' : 'text-muted')}>
        {icon} <span className="truncate">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
      <p className="mt-0.5 truncate text-xs text-muted">{sub}</p>
    </Card>
  )
}

export function TenantActions({ t }: { t: Tenant }) {
  if (isWebApp) return <RealTenantActions t={t} />
  return <DemoTenantActions t={t} />
}

/** Ações reais (gravam no banco). */
function RealTenantActions({ t }: { t: Tenant }) {
  const { reload } = useSaas()
  const navigate = useNavigate()
  const run = async (fn: () => Promise<void>, ok: string) => {
    try { await fn(); toast.success(ok, { description: t.name }); reload() } catch (e) { toast.error('Não foi possível concluir', { description: adminError(e) }) }
  }
  const hide = async () => {
    if (!window.confirm(`Ocultar "${t.name}" do painel do IC Chat?

Nada é excluído: a pessoa, os dados e os outros sistemas que usam este banco continuam intactos. Só some desta lista, e dá para desfazer.`)) return
    try {
      await setTenantHidden(t.id, true)
      reload()
      toast.success('Empresa oculta do IC Chat', {
        description: 'Nada foi excluído.',
        action: { label: 'Desfazer', onClick: () => { void setTenantHidden(t.id, false).then(() => reload()) } }
      })
    } catch (e) {
      toast.error('Não foi possível ocultar', { description: adminError(e) })
    }
  }
  return (
    <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
      <Button variant="ghost" size="icon-sm" aria-label="Renovar por 30 dias" title="Renovar +30 dias" onClick={() => run(() => extendTenant(t.id, 30), 'Empresa renovada por 30 dias')}><CalendarPlus /></Button>
      <Button variant="ghost" size="icon-sm" aria-label="Gerar chave de licença" title="Gerar chave de licença" onClick={() => navigate('/admin/licencas')}><KeyRound /></Button>
      {t.status === 'suspensa' || t.status === 'carencia' || t.status === 'restrito' ? (
        <Button variant="ghost" size="icon-sm" className="hover:text-success" aria-label="Liberar empresa" title="Liberar acesso" onClick={() => run(() => setTenantBlocked(t.id, false), 'Empresa liberada')}><RotateCcw /></Button>
      ) : (
        <Button variant="ghost" size="icon-sm" className="hover:text-danger" aria-label="Bloquear empresa" title="Bloquear (falta de pagamento)" onClick={() => { if (window.confirm(`Bloquear ${t.name}? O acesso (site e app) é cortado.`)) void run(() => setTenantBlocked(t.id, true), 'Empresa bloqueada') }}><Ban /></Button>
      )}
      <Button variant="ghost" size="icon-sm" aria-label="Ocultar empresa do IC Chat" title="Ocultar do IC Chat (não exclui nada)" onClick={() => void hide()}><EyeOff /></Button>
    </div>
  )
}

function DemoTenantActions({ t }: { t: Tenant }) {
  const { renew, issueKey, setStatus } = useSaas()
  const { notify } = useNotifications()
  const act = (msg: string, fn: () => void) => () => {
    fn()
    toast.success(msg, { description: t.name })
  }
  return (
    <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
      <Button variant="ghost" size="icon-sm" aria-label="Renovar licença (+30 dias)" onClick={act('Licença renovada por +30 dias', () => renew(t.id))}>
        <CalendarPlus />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label="Gerar nova chave" onClick={() => {
        const k = issueKey(t.id)
        void navigator.clipboard?.writeText(k)
        toast.success('Nova chave gerada e copiada', { description: `${t.name} · ${k}` })
      }}>
        <KeyRound />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label="Enviar aviso de vencimento" onClick={act('Aviso enviado por WhatsApp e e-mail', () => notify({ kind: 'licenca', title: 'Aviso de vencimento enviado', body: `${t.name} · vence ${t.expires}`, link: '/admin' }))}>
        <Send />
      </Button>
      {t.status === 'suspensa' ? (
        <Button variant="ghost" size="icon-sm" className="hover:text-success" aria-label="Reativar empresa" onClick={act('Empresa reativada', () => setStatus(t.id, t.days < 0 ? 'restrito' : 'ativa'))}>
          <RotateCcw />
        </Button>
      ) : (
        <Button variant="ghost" size="icon-sm" className="hover:text-danger" aria-label="Suspender empresa" onClick={act('Empresa suspensa', () => setStatus(t.id, 'suspensa'))}>
          <Ban />
        </Button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Cadastro de empresa: dados + gerente + licença, num passo só          */
/* ------------------------------------------------------------------ */
function NewTenantDialog({ mode, onClose }: { mode: false | 'cliente' | 'teste'; onClose: () => void }) {
  const { createTenant } = useSaas()
  const [key, setKey] = useState(randomKey)
  const trial = mode === 'teste'
  const blank = {
    name: '', document: '', segment: 'Salão', managerName: '', managerEmail: '', whatsapp: '',
    plan: 'Pro' as Plan, kind: 'Mensal' as LicenseKey['kind'], mode: 'Local' as 'Local' | 'Nuvem',
    modality: 'suporte' as Modality
  }
  const [f, setF] = useState(blank)
  useEffect(() => {
    if (mode) {
      setF({ ...blank, kind: mode === 'teste' ? 'Teste' : 'Mensal' })
      setKey(randomKey())
    }
  }, [mode])
  const set = <K extends keyof typeof blank>(k: K, v: (typeof blank)[K]) => setF((x) => ({ ...x, [k]: v }))
  const valid = f.name.trim() && f.managerName.trim() && /^\S+@\S+\.\S+$/.test(f.managerEmail)
  return (
    <Dialog
      open={Boolean(mode)}
      onOpenChange={(v) => !v && onClose()}
      title={trial ? 'Nova empresa em teste grátis' : 'Nova empresa'}
      description="A empresa, o usuário gerente e a chave são criados juntos. O gerente recebe o acesso por WhatsApp e e-mail."
      className="md:max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!valid}
            onClick={() => {
              createTenant({ ...f, name: f.name.trim(), managerName: f.managerName.trim() }, key)
              onClose()
              void navigator.clipboard?.writeText(key).catch(() => {})
              toast.success('Empresa criada', { description: `Chave ${key} copiada · envie para ${f.managerEmail}` })
            }}
          >
            <KeyRound /> Criar e enviar acesso
          </Button>
        </>
      }
    >
      <Section n={1} title="Empresa">
        <Field label="Nome fantasia" className="sm:col-span-2"><Input autoFocus placeholder="Ex.: Studio Bella" value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="CNPJ ou CPF"><Input placeholder="Documento" value={f.document} onChange={(e) => set('document', e.target.value)} /></Field>
        <Field label="Segmento">
          <Select value={f.segment} onChange={(e) => set('segment', e.target.value)}>
            {['Salão', 'Barbearia', 'Estética', 'Clínica', 'Pet shop', 'Outro'].map((x) => <option key={x}>{x}</option>)}
          </Select>
        </Field>
      </Section>
      <Section n={2} title="Gerente (primeiro acesso)">
        <Field label="Nome"><Input placeholder="Nome do responsável" value={f.managerName} onChange={(e) => set('managerName', e.target.value)} /></Field>
        <Field label="E-mail de login"><Input type="email" placeholder="gerente@empresa.com" value={f.managerEmail} onChange={(e) => set('managerEmail', e.target.value)} /></Field>
        <Field label="WhatsApp para avisos"><Input placeholder="(11) 90000-0000" value={f.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} /></Field>
        <Field label="Senha provisória" hint="Será trocada no primeiro acesso"><Input readOnly value="Gerada automaticamente" /></Field>
      </Section>
      <Section n={3} title="O que a empresa está contratando">
        <div className="sm:col-span-2">
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(modalityCfg) as Modality[]).map((m) => {
              const cfg = modalityCfg[m]
              const ativo = f.modality === m
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => set('modality', m)}
                  aria-pressed={ativo}
                  className={cn(
                    'rounded-xl border p-3 text-left transition-colors',
                    ativo
                      ? 'border-primary bg-primary-soft ring-1 ring-primary'
                      : 'border-border bg-surface hover:border-border-strong'
                  )}
                >
                  <span className={cn('block text-sm font-semibold', ativo && 'text-primary')}>{cfg.label}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted">{cfg.hint}</span>
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-subtle">
            Define as telas que o cliente enxerga. Pode ser alterado depois, e o sistema do cliente se ajusta no próximo acesso.
          </p>
        </div>
      </Section>
      <Section n={4} title="Plano e licença">
        <Field label="Plano" hint="Start 3 PCs · Pro 10 PCs · Business ilimitado">
          <Select value={f.plan} onChange={(e) => set('plan', e.target.value as Plan)}><option>Start</option><option>Pro</option><option>Business</option></Select>
        </Field>
        <Field label="Tipo">
          <Select value={f.kind} onChange={(e) => set('kind', e.target.value as LicenseKey['kind'])}>
            <option value="Teste">Teste grátis · 7 dias</option>
            <option value="Mensal">Mensal</option>
            <option value="Trimestral">Trimestral</option>
            <option value="Anual">Anual</option>
          </Select>
        </Field>
        <Field label="Instalação">
          <Select value={f.mode} onChange={(e) => set('mode', e.target.value as 'Local' | 'Nuvem')}><option value="Local">Local (SQLite)</option><option value="Nuvem">Nuvem (Supabase)</option></Select>
        </Field>
        <Field label="Carência / sem internet" hint="Padrão: 3 dias / 7 dias">
          <Input defaultValue="3 dias / 7 dias" />
        </Field>
        <div className="rounded-xl border border-dashed border-border-strong bg-surface-2 p-3 sm:col-span-2">
          <p className="text-xs text-muted">Chave que será gerada</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 font-mono text-[15px] font-semibold tracking-wider">{key}</code>
            <Button variant="ghost" size="icon-sm" aria-label="Copiar" onClick={() => { void navigator.clipboard?.writeText(key); toast.success('Chave copiada') }}><Copy /></Button>
          </div>
        </div>
      </Section>
    </Dialog>
  )
}

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="mb-5 last:mb-1">
      <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
        <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-white">{n}</span>
        {title}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Ficha da empresa (painel lateral)                                     */
/* ------------------------------------------------------------------ */
export function toDetailUser(u: TenantUser, t: Tenant): DetailUser {
  return { ...u, company: t.name, companyWhatsapp: t.whatsapp }
}

function TenantSheet({ tenant, onClose }: { tenant: Tenant | null; onClose: () => void }) {
  const { users: tenantUsers, keys: licenseKeys, updateUser, removeUser, addUser, renew, issueKey, updateTenant } = useSaas()
  const [draft, setDraft] = useState({ name: '', document: '', whatsapp: '', email: '' })
  useEffect(() => {
    if (tenant) setDraft({ name: tenant.name, document: tenant.document, whatsapp: tenant.whatsapp, email: tenant.email })
  }, [tenant?.id])
  const [tab, setTab] = useState<'usuarios' | 'licenca' | 'dados'>('usuarios')
  const [selected, setSelected] = useState<TenantUser | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  if (!tenant) return null
  const users = tenantUsers.filter((u) => u.tenantId === tenant.id)
  const keys = licenseKeys.filter((k) => k.tenantId === tenant.id)

  return (
    <Sheet
      open
      onOpenChange={(v) => {
        if (!v) {
          setSelected(null)
          onClose()
        }
      }}
      title={tenant.name}
      className="max-w-lg"
    >
      {selected ? (
        <UserDetailView
          user={toDetailUser(selected, tenant)}
          onBack={() => setSelected(null)}
          onSave={(patch) => updateUser(selected.id, patch)}
          onRemove={() => removeUser(selected.id)}
        />
      ) : (
      <>
      <div className="flex items-center gap-3 border-b border-border p-5">
        <TenantAvatar t={tenant} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{tenant.name}</p>
          <p className="truncate text-xs text-muted">{tenant.document} · {tenant.segment}</p>
        </div>
        <Badge tone={statusCfg[tenant.status].tone} size="md">{statusCfg[tenant.status].label}</Badge>
      </div>
      <div className="border-b border-border px-5 py-3">
        <Segmented
          className="w-full"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'usuarios', label: 'Usuários', count: users.length },
            { value: 'licenca', label: 'Licença' },
            { value: 'dados', label: 'Dados' }
          ]}
        />
      </div>

      <div className="scroll-thin flex-1 overflow-y-auto p-5">
        {tab === 'usuarios' && (
          <div className="flex flex-col gap-2">
            <div className="mb-1 flex gap-2 rounded-xl bg-primary-soft p-3 text-[12.5px] text-primary">
              <WhatsAppIcon className="mt-0.5 size-4 shrink-0" />
              <p>Todos os usuários desta empresa atendem pelo mesmo WhatsApp: <b>{tenant.whatsapp}</b>.</p>
            </div>
            {users.map((u) => (
              <div
                key={u.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(u)}
                onKeyDown={(e) => e.key === 'Enter' && setSelected(u)}
                className="group flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary/40 hover:bg-primary-soft/40"
              >
                <Avatar name={u.name} size={34} presence={u.active ? (u.lastSeen === 'agora' ? 'online' : 'offline') : undefined} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13.5px] font-medium">{u.name}</p>
                    <Badge tone={u.role === 'gerente' ? 'primary' : 'neutral'}>{u.role === 'gerente' ? 'Gerente' : 'Analista'}</Badge>
                    {!u.active && <Badge tone="danger">Bloqueado</Badge>}
                  </div>
                  <p className="truncate text-xs text-muted">{u.email} · visto {u.lastSeen}</p>
                </div>
                <UserQuickActions user={toDetailUser(u, tenant)} onSetActive={(active) => updateUser(u.id, { active })} />
              </div>
            ))}
            <Button variant="outline" className="mt-1" onClick={() => setInviteOpen(true)}><UserPlus /> Adicionar usuário</Button>
          </div>
        )}

        {tab === 'licenca' && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2 text-[13px]">
              <Info label="Plano" value={tenant.plan} />
              <Info label="Modalidade" value={tenant.mode} />
              <Info label="Vencimento" value={tenant.expires} />
              <Info label="PCs" value={`${tenant.pcs[0]} de ${tenant.pcs[1] ?? '∞'}`} />
            </div>
            <p className="mt-2 text-[11px] font-semibold tracking-wider text-subtle uppercase">Chaves</p>
            {keys.map((k) => (
              <div key={k.key} className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate font-mono text-[13px] font-semibold">{k.key}</code>
                  <Badge tone={k.status === 'ativa' ? 'success' : k.status === 'revogada' ? 'danger' : 'neutral'}>{k.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted">{k.kind} · emitida {k.issued} · última validação {k.lastCheck}</p>
              </div>
            ))}
            <div className="mt-1 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => { renew(tenant.id); toast.success('Licença renovada por +30 dias') }}><CalendarPlus /> Renovar</Button>
              <Button
                variant="outline"
                onClick={() => {
                  const k = issueKey(tenant.id)
                  void navigator.clipboard?.writeText(k)
                  toast.success('Nova chave gerada e copiada', { description: k })
                }}
              >
                <KeyRound /> Nova chave
              </Button>
            </div>
          </div>
        )}

        {tab === 'dados' && (
          <div className="flex flex-col gap-4">
            <Field label="Nome fantasia"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <Field label="CNPJ ou CPF"><Input value={draft.document} onChange={(e) => setDraft({ ...draft, document: e.target.value })} /></Field>
            <Field label="WhatsApp da empresa"><Input value={draft.whatsapp} onChange={(e) => setDraft({ ...draft, whatsapp: e.target.value })} icon={<WhatsAppIcon />} /></Field>
            <Field label="E-mail de cobrança"><Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} icon={<Mail />} /></Field>
            <Button disabled={!draft.name.trim()} onClick={() => { updateTenant(tenant.id, { ...draft, name: draft.name.trim() }); toast.success('Dados salvos') }}>Salvar</Button>
          </div>
        )}
      </div>
      </>
      )}
      <NewUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        fixedCompany={tenant.name}
        defaultRole="gerente"
        onCreate={(u) => addUser({ tenantId: tenant.id, name: u.name, email: u.email, role: u.role })}
      />
    </Sheet>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  )
}
