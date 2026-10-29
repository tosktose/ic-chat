import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { adminError, listMembers, listPlans, listTenants, savePlanRow, setTenantBlocked, setTenantHidden, type AdminTenant } from '@/lib/admin-api'
import { isSuperAdmin, useAuth } from '@/lib/auth'
import { isWebApp, supabase } from '@/lib/supabase'
import {
  licenseKeys as keyList,
  randomKey,
  tenants as tenantList,
  tenantUsers as userList,
  type LicenseKey,
  type Modality,
  type Plan,
  type Tenant,
  type TenantStatus,
  type TenantUser
} from '@/data/saas'

/** Planos editáveis pelo Super Admin */
export interface PlanDef {
  name: Plan
  price: number
  mode: string
  pcs: number | null
  users: number | null
  features: string[]
  highlight?: boolean
  discount_type?: 'percent' | 'fixed' | null
  discount_value?: number
  discount_label?: string
  discount_ends_at?: string | null
}

const plans: PlanDef[] = [
  { name: 'Start', price: 149, mode: 'Local (SQLite)', pcs: 3, users: 3, features: ['1 WhatsApp (QR Code)', 'Atendimento multiusuário', 'Agenda + Google Agenda', 'Lembretes automáticos'] },
  { name: 'Pro', price: 299, mode: 'Local ou Nuvem', pcs: 10, users: 10, highlight: true, features: ['Tudo do Start', 'WhatsApp Oficial (API Meta)', 'Assistente IA (chave do cliente)', 'Kanban IA', 'Painel do gerente e relatórios'] },
  { name: 'Business', price: 599, mode: 'Nuvem (Supabase)', pcs: null, users: null, features: ['Tudo do Pro', 'Instagram e Messenger', 'Várias unidades', 'API e webhooks', 'Suporte prioritário'] }
]

const fmt = (d: Date) => d.toLocaleDateString('pt-BR')
const parse = (s: string) => {
  const [d, m, y] = s.split('/').map(Number)
  return new Date(y, m - 1, d)
}
const TODAY = (() => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
})()
const daysUntil = (d: Date) => Math.round((d.getTime() - TODAY.getTime()) / 86400000)

export interface NewTenantInput {
  name: string
  document: string
  segment: string
  plan: Plan
  /** O que esta empresa comprou: suporte, funil de vendas ou os dois. */
  modality: Modality
  mode: 'Local' | 'Nuvem'
  kind: LicenseKey['kind']
  managerName: string
  managerEmail: string
  whatsapp: string
}

interface Ctx {
  version: number
  /** Recarrega empresas, usuários e planos do banco (versão web) */
  reload: () => void
  tenants: Tenant[]
  users: TenantUser[]
  keys: LicenseKey[]
  plans: PlanDef[]
  renew: (tenantId: string, days?: number) => void
  setStatus: (tenantId: string, status: TenantStatus) => void
  issueKey: (tenantId: string, kind?: LicenseKey['kind'], key?: string) => string
  revokeKey: (key: string) => void
  updateTenant: (id: string, patch: Partial<Tenant>) => void
  createTenant: (i: NewTenantInput, key: string) => Tenant
  addUser: (u: Omit<TenantUser, 'id' | 'lastSeen' | 'active'>) => void
  updateUser: (id: string, patch: Partial<TenantUser>) => void
  removeUser: (id: string) => void
  savePlan: (p: PlanDef, originalName?: Plan) => void
}

const SaasCtx = createContext<Ctx | null>(null)

// Na versão web não existe empresa de exemplo: o Super Admin vê só o que está no banco.
if (isWebApp) {
  tenantList.splice(0)
  userList.splice(0)
  keyList.splice(0)
  plans.splice(0)
}

const statusFromSubscription = (s: AdminTenant['subscription']): { status: TenantStatus; expires: string; days: number; plan: Plan } => {
  const end = s?.status === 'trialing' ? s.trial_ends_at : s?.current_period_ends_at ?? s?.trial_ends_at
  const date = end ? new Date(end) : null
  const days = date ? Math.ceil((date.getTime() - Date.now()) / 86400000) : 0
  const status: TenantStatus =
    s?.status === 'trialing' ? (days >= 0 ? 'teste' : 'restrito')
    : s?.status === 'active' ? (days >= 0 ? (days <= 5 ? 'vencendo' : 'ativa') : 'carencia')
    : s?.status === 'past_due' ? 'carencia'
    : 'suspensa'
  const plan = (s?.plan ? s.plan.charAt(0).toUpperCase() + s.plan.slice(1) : 'Start') as Plan
  return { status, expires: date ? fmt(date) : '—', days, plan: plan === ('Trial' as Plan) ? 'Start' : plan }
}

export function SaasProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0)
  const bump = () => setVersion((v) => v + 1)
  const { session } = useAuth()
  const [tick, setTick] = useState(0)

  // Super Admin (web): empresas reais do banco
  useEffect(() => {
    if (!isWebApp || !supabase || !isSuperAdmin(session)) return
    let alive = true
    void Promise.all([listTenants(), listMembers(), listPlans()]).then(([rows, members, planRows]) => {
      if (!alive) return
      plans.splice(0, plans.length, ...planRows.map((p): PlanDef => ({
        name: p.name as Plan, price: p.price, mode: `${p.max_devices} computadores`, pcs: p.max_devices, users: p.max_users, features: p.features, highlight: p.highlight,
        discount_type: p.discount_type ?? null, discount_value: Number(p.discount_value ?? 0), discount_label: p.discount_label ?? '', discount_ends_at: p.discount_ends_at ?? null
      })))
      const priceOf = (name: string) => plans.find((p) => p.name.toLowerCase() === name.toLowerCase())?.price ?? 0
      tenantList.splice(0, tenantList.length, ...rows.map((t): Tenant => {
        const st = statusFromSubscription(t.subscription)
        return {
          id: t.id, name: t.name, document: '', segment: t.origin_role ? `vem de outro projeto (${t.origin_role})` : '—', modality: 'completo', mode: 'Nuvem',
          pcs: [t.licenses_active, null], mrr: t.subscription?.status === 'active' ? priceOf(st.plan) : 0, version: '—', online: false, whatsapp: '', email: t.owner_email ?? '',
          ...st
        }
      }))
      userList.splice(0, userList.length, ...members.map((m): TenantUser => ({
        id: m.user_id, tenantId: m.tenant_id, name: m.display_name || m.email, email: m.email, role: m.role === 'agent' ? 'analista' : 'gerente', active: true,
        lastSeen: m.last_sign_in_at ? new Date(m.last_sign_in_at).toLocaleDateString('pt-BR') : 'nunca',
        affiliateActive: m.affiliate_active, affiliateCode: m.affiliate_code,
        affiliateCommissionRate: m.affiliate_commission_rate === null ? null : Number(m.affiliate_commission_rate)
      })))
      bump()
    }).catch(() => { /* migrações ainda não executadas: a tela de licenças explica */ })
    return () => { alive = false }
  }, [session, tick])

  const value = useMemo<Ctx>(() => {
    const tenantById = (id: string) => tenantList.find((t) => t.id === id)
    return {
      version,
      reload: () => setTick((n) => n + 1),
      // Cópias novas a cada mudança: as telas guardam listas em cache e só se atualizam quando a referência muda
      tenants: [...tenantList],
      users: [...userList],
      keys: [...keyList],
      plans: [...plans],
      renew: (id, days = 30) => {
        const t = tenantById(id)
        if (!t) return
        const base = t.days > 0 ? parse(t.expires) : TODAY
        const next = new Date(base.getTime() + days * 86400000)
        Object.assign(t, { expires: fmt(next), days: daysUntil(next), status: 'ativa' as TenantStatus })
        bump()
      },
      setStatus: (id, status) => {
        const t = tenantById(id)
        if (t) Object.assign(t, { status, online: status === 'suspensa' ? false : t.online })
        bump()
      },
      issueKey: (tenantId, kind = 'Mensal', key = randomKey()) => {
        keyList.forEach((k) => {
          if (k.tenantId === tenantId && k.status === 'ativa') k.status = 'substituída'
        })
        keyList.unshift({ key, tenantId, kind, issued: fmt(TODAY), status: 'ativa', lastCheck: '—' })
        bump()
        return key
      },
      revokeKey: (key) => {
        const k = keyList.find((x) => x.key === key)
        if (k) k.status = 'revogada'
        bump()
      },
      updateTenant: (id, patch) => {
        const t = tenantById(id)
        if (t) Object.assign(t, patch)
        bump()
      },
      createTenant: (i, key) => {
        const trial = i.kind === 'Teste'
        const exp = new Date(TODAY.getTime() + (trial ? 7 : i.kind === 'Anual' ? 365 : i.kind === 'Trimestral' ? 90 : 30) * 86400000)
        const plan = plans.find((p) => p.name === i.plan)!
        const t: Tenant = {
          id: crypto.randomUUID(),
          name: i.name,
          document: i.document,
          segment: i.segment,
          plan: i.plan,
          modality: i.modality,
          mode: i.mode,
          status: trial ? 'teste' : 'ativa',
          expires: fmt(exp),
          days: daysUntil(exp),
          pcs: [0, plan.pcs],
          mrr: trial ? 0 : plan.price,
          version: '0.1.0',
          online: false,
          whatsapp: i.whatsapp,
          email: i.managerEmail
        }
        tenantList.unshift(t)
        userList.unshift({ id: crypto.randomUUID(), tenantId: t.id, name: i.managerName, email: i.managerEmail, role: 'gerente', active: true, lastSeen: 'nunca' })
        keyList.unshift({ key, tenantId: t.id, kind: i.kind, issued: fmt(TODAY), status: 'ativa', lastCheck: '—' })
        bump()
        return t
      },
      addUser: (u) => {
        userList.unshift({ ...u, id: crypto.randomUUID(), active: true, lastSeen: 'nunca' })
        bump()
      },
      updateUser: (id, patch) => {
        const u = userList.find((x) => x.id === id)
        if (!u) return
        const before = u.active
        Object.assign(u, patch)
        bump()
        // Na versão web, bloquear/liberar grava de verdade: corta ou devolve o acesso da empresa dessa pessoa
        if (isWebApp && patch.active !== undefined && patch.active !== before) {
          setTenantBlocked(u.tenantId, !patch.active)
            .then(() => setTick((n) => n + 1))
            .catch((e) => { u.active = before; bump(); toast.error('Não foi possível alterar o acesso', { description: adminError(e) }) })
        }
      },
      removeUser: (id) => {
        const i = userList.findIndex((x) => x.id === id)
        if (i < 0) return
        const u = userList[i]
        // Na versão web nada é apagado do banco compartilhado: a empresa só deixa de aparecer no IC Chat (dá para desfazer)
        if (isWebApp) {
          setTenantHidden(u.tenantId, true)
            .then(() => setTick((n) => n + 1))
            .catch((e) => toast.error('Não foi possível ocultar', { description: adminError(e) }))
          return
        }
        userList.splice(i, 1)
        bump()
      },
      savePlan: (p, originalName) => {
        const i = plans.findIndex((x) => x.name === (originalName ?? p.name))
        if (i >= 0) plans[i] = p
        else plans.push(p)
        bump()
        if (isWebApp && supabase) {
          const id = p.name.toLowerCase() as 'start' | 'pro' | 'business'
          void savePlanRow({ id, name: p.name, price: p.price, days: 30, max_users: p.users, max_devices: p.pcs ?? 50, summary: '', features: p.features, highlight: Boolean(p.highlight), active: true, sort: ['start', 'pro', 'business'].indexOf(id) + 1, discount_type: p.discount_type ?? null, discount_value: p.discount_value ?? 0, discount_label: p.discount_label ?? '', discount_ends_at: p.discount_ends_at ?? null })
            .then(() => toast.success('Plano salvo no banco'))
            .catch((e) => toast.error('Não foi possível salvar o plano', { description: adminError(e) }))
        }
      }
    }
  }, [version])

  return <SaasCtx.Provider value={value}>{children}</SaasCtx.Provider>
}

export function useSaas(): Ctx {
  const ctx = useContext(SaasCtx)
  if (!ctx) throw new Error('useSaas fora do SaasProvider')
  return ctx
}
