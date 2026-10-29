import { supabase } from './supabase'

export type LicenseKind = 'teste' | 'mensal' | 'trimestral' | 'anual'
export type LicenseStatus = 'ativa' | 'suspensa' | 'revogada'

/** Empresa como o Super Admin enxerga: com o dono (o banco de usuários é compartilhado com outros projetos). */
export interface AdminTenant {
  id: string
  name: string
  created_at: string
  owner_email: string | null
  owner_name: string | null
  origin_role: string | null
  members: number
  subscription: { status: string; plan: string; trial_ends_at: string | null; current_period_ends_at: string | null } | null
  licenses_active: number
  last_payment_at: string | null
}

export interface AdminMember {
  user_id: string
  email: string
  display_name: string | null
  role: 'owner' | 'manager' | 'agent'
  tenant_id: string
  tenant_name: string
  origin_role: string | null
  last_sign_in_at: string | null
  created_at: string
}

export interface AdminLicense {
  id: string
  tenant_id: string
  tenant_name: string
  key_prefix: string
  kind: LicenseKind
  status: LicenseStatus
  max_devices: number
  devices: number
  expires_at: string
  created_at: string
  last_validated_at: string | null
}

export interface PlanRow {
  id: 'start' | 'pro' | 'business'
  name: string
  price: number
  days: number
  max_users: number | null
  max_devices: number
  summary: string
  features: string[]
  highlight: boolean
  active: boolean
  sort: number
}

export interface PublicSettings {
  company_name: string
  support_email: string
  support_whatsapp: string
  site_url: string
}

const db = () => {
  if (!supabase) throw new Error('Supabase não configurado')
  return supabase.schema('ic_chat')
}

/** Traduz erros do banco para uma frase que o dono do SaaS entende. */
export function adminError(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e)
  if (/forbidden|42501|permission denied/i.test(msg)) return 'Seu usuário não é administrador da plataforma.'
  if (/relation .* does not exist|schema .* does not exist|PGRST20[0-9]|Could not find the (table|function)/i.test(msg)) return 'O banco ainda não tem as tabelas necessárias. Execute as migrações da pasta supabase/migrations no Supabase.'
  if (/tenant_not_found/.test(msg)) return 'Empresa não encontrada.'
  return msg
}

type TenantRpc = {
  id: string; name: string; created_at: string; owner_email: string | null; owner_name: string | null; origin_role: string | null; members: number
  sub_status: string | null; sub_plan: string | null; trial_ends_at: string | null; period_ends_at: string | null; licenses_active: number; last_payment_at: string | null
}

export async function listTenants(): Promise<AdminTenant[]> {
  const { data, error } = await db().rpc('admin_tenants')
  if (error) throw error
  return ((data ?? []) as TenantRpc[]).map((t) => ({
    id: t.id, name: t.name, created_at: t.created_at, owner_email: t.owner_email, owner_name: t.owner_name, origin_role: t.origin_role, members: t.members,
    subscription: t.sub_status ? { status: t.sub_status, plan: t.sub_plan ?? 'trial', trial_ends_at: t.trial_ends_at, current_period_ends_at: t.period_ends_at } : null,
    licenses_active: t.licenses_active, last_payment_at: t.last_payment_at
  }))
}

export async function listMembers(): Promise<AdminMember[]> {
  const { data, error } = await db().rpc('admin_members')
  if (error) throw error
  return (data ?? []) as AdminMember[]
}

export async function listLicenses(): Promise<AdminLicense[]> {
  const [lic, act] = await Promise.all([
    db().from('licenses').select('id, tenant_id, key_prefix, kind, status, max_devices, expires_at, created_at, last_validated_at, tenants(name)').order('created_at', { ascending: false }),
    db().from('license_activations').select('license_id')
  ])
  if (lic.error) throw lic.error
  const count = new Map<string, number>()
  for (const a of act.data ?? []) count.set(a.license_id, (count.get(a.license_id) ?? 0) + 1)
  return (lic.data ?? []).map((l) => {
    const t = Array.isArray(l.tenants) ? l.tenants[0] : l.tenants
    return { ...l, tenant_name: t?.name ?? '—', devices: count.get(l.id) ?? 0 } as AdminLicense
  })
}

export async function generateLicense(tenantId: string, kind: LicenseKind, maxDevices: number): Promise<{ key: string; expires_at: string }> {
  const { data, error } = await db().rpc('generate_license', { p_tenant: tenantId, p_kind: kind, p_max_devices: maxDevices })
  if (error) throw error
  return data as { key: string; expires_at: string }
}

export async function setLicenseStatus(id: string, status: LicenseStatus): Promise<void> {
  const { error } = await db().rpc('set_license_status', { p_id: id, p_status: status })
  if (error) throw error
}

export async function extendLicense(id: string, days: number): Promise<void> {
  const { error } = await db().rpc('extend_license', { p_id: id, p_days: days })
  if (error) throw error
}

/** Renova a empresa (assinatura + licenças) por N dias — após pagamento recebido fora do Mercado Pago, por exemplo. */
export async function extendTenant(tenantId: string, days: number): Promise<void> {
  const { error } = await db().rpc('admin_extend_tenant', { p_tenant: tenantId, p_days: days })
  if (error) throw error
}

/** Bloqueia (inadimplência) ou libera a empresa: assinatura e licenças. */
export async function setTenantBlocked(tenantId: string, blocked: boolean): Promise<void> {
  const { error } = await db().rpc('admin_set_tenant_blocked', { p_tenant: tenantId, p_blocked: blocked })
  if (error) throw error
}

/* ---------------- planos ---------------- */
export async function listPlans(): Promise<PlanRow[]> {
  const { data, error } = await db().from('plans').select('*').order('sort')
  if (error) throw error
  return (data ?? []).map((p) => ({ ...p, price: Number(p.price), features: Array.isArray(p.features) ? p.features : [] })) as PlanRow[]
}

export async function savePlanRow(p: PlanRow): Promise<void> {
  const { error } = await db().from('plans').upsert({ ...p, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  if (error) throw error
}

/* ---------------- configurações da plataforma ---------------- */
export const SETTING_KEYS = ['company_name', 'support_email', 'support_whatsapp', 'site_url'] as const

export async function loadSettings(): Promise<PublicSettings> {
  const { data, error } = await db().from('platform_settings').select('key, value')
  if (error) throw error
  const out: Record<string, string> = { company_name: '', support_email: '', support_whatsapp: '', site_url: '' }
  for (const r of data ?? []) out[r.key] = r.value
  return out as unknown as PublicSettings
}

export async function saveSettings(values: PublicSettings): Promise<void> {
  const rows = SETTING_KEYS.map((key) => ({ key, value: String(values[key] ?? '').trim(), updated_at: new Date().toISOString() }))
  const { error } = await db().from('platform_settings').upsert(rows, { onConflict: 'key' })
  if (error) throw error
}
