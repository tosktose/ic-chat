import { supabase } from './supabase'

export type LicenseKind = 'teste' | 'mensal' | 'trimestral' | 'anual'
export type LicenseStatus = 'ativa' | 'suspensa' | 'revogada'

export interface AdminTenant {
  id: string
  name: string
  created_at: string
  subscription: { status: string; plan: string; trial_ends_at: string | null; current_period_ends_at: string | null } | null
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

const db = () => {
  if (!supabase) throw new Error('Supabase não configurado')
  return supabase.schema('ic_chat')
}

/** Traduz erros do banco para uma frase que o dono do SaaS entende. */
export function adminError(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e)
  if (/forbidden|42501|permission denied/i.test(msg)) return 'Seu usuário não é administrador da plataforma.'
  if (/relation .* does not exist|schema .* does not exist|PGRST20[0-9]|Could not find the (table|function)/i.test(msg)) return 'O banco ainda não tem as tabelas de licença. Execute a migração 20261029_000002_licenses.sql no Supabase.'
  if (/tenant_not_found/.test(msg)) return 'Empresa não encontrada.'
  return msg
}

export async function listTenants(): Promise<AdminTenant[]> {
  const { data, error } = await db().from('tenants').select('id, name, created_at, subscriptions(status, plan, trial_ends_at, current_period_ends_at)').order('name')
  if (error) throw error
  return (data ?? []).map((t) => {
    const sub = Array.isArray(t.subscriptions) ? t.subscriptions[0] : t.subscriptions
    return { id: t.id, name: t.name, created_at: t.created_at, subscription: sub ?? null }
  })
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
