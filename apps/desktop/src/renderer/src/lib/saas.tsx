import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
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

export function SaasProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0)
  const bump = () => setVersion((v) => v + 1)

  const value = useMemo<Ctx>(() => {
    const tenantById = (id: string) => tenantList.find((t) => t.id === id)
    return {
      version,
      tenants: tenantList,
      users: userList,
      keys: keyList,
      plans,
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
        if (u) Object.assign(u, patch)
        bump()
      },
      removeUser: (id) => {
        const i = userList.findIndex((x) => x.id === id)
        if (i >= 0) userList.splice(i, 1)
        bump()
      },
      savePlan: (p, originalName) => {
        const i = plans.findIndex((x) => x.name === (originalName ?? p.name))
        if (i >= 0) plans[i] = p
        else plans.push(p)
        bump()
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
