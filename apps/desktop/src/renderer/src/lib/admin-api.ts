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
  affiliate_active: boolean
  affiliate_code: string | null
  affiliate_commission_rate: number | null
}

export interface AffiliateSummary {
  user_id: string
  email: string
  display_name: string
  referral_code: string
  commission_rate: number
  active: boolean
  referrals: number
  active_subscriptions: number
  paid_revenue: number
  commission_pending: number
  commission_paid: number
  commission_reversed: number
  created_at: string
}

export interface AffiliateReferral {
  commission_id: string | null
  affiliate_user_id: string
  affiliate_email: string
  tenant_id: string
  tenant_name: string
  owner_email: string | null
  plan: string | null
  subscription_status: string | null
  referred_at: string
  payment_amount: number
  commission_amount: number
  paid_revenue: number
  commission_pending: number
  commission_paid: number
  commission_status: 'pending' | 'paid' | 'reversed' | null
}

export interface MyAffiliateDashboard {
  referral_code: string
  commission_rate: number
  referrals: number
  active_subscriptions: number
  paid_revenue: number
  commission_pending: number
  commission_paid: number
  commission_reversed: number
}

export interface MyAffiliateReferral {
  tenant_id: string
  tenant_name: string
  plan: string | null
  subscription_status: string | null
  referred_at: string
  paid_revenue: number
  commission_pending: number
  commission_paid: number
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
  discount_type?: 'percent' | 'fixed' | null
  discount_value?: number
  discount_label?: string | null
  discount_ends_at?: string | null
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
  if (/affiliate_not_active/.test(msg)) return 'Este usuário ainda não foi habilitado como afiliado. Fale com o administrador do IC Chat.'
  if (/invalid_commission_rate/.test(msg)) return 'Informe uma comissão entre 0% e 100%.'
  if (/user_not_found/.test(msg)) return 'Usuário não encontrado no IC Chat.'
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

export async function setAffiliate(userId: string, enabled: boolean, commissionRate = 10): Promise<void> {
  const { error } = await db().rpc('admin_set_affiliate', {
    p_user_id: userId,
    p_enabled: enabled,
    p_commission_rate: commissionRate
  })
  if (error) throw error
}

export async function deleteAffiliate(userId: string): Promise<void> {
  const { error } = await db().rpc('admin_archive_affiliate', { p_user_id: userId })
  if (error) throw error
}

export async function listAffiliateSummaries(): Promise<AffiliateSummary[]> {
  const { data, error } = await db().rpc('admin_affiliate_overview')
  if (error) throw error
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    commission_rate: Number(row.commission_rate),
    referrals: Number(row.referrals),
    active_subscriptions: Number(row.active_subscriptions),
    paid_revenue: Number(row.paid_revenue),
    commission_pending: Number(row.commission_pending),
    commission_paid: Number(row.commission_paid),
    commission_reversed: Number(row.commission_reversed)
  })) as AffiliateSummary[]
}

export async function listAffiliateReferrals(): Promise<AffiliateReferral[]> {
  const { data, error } = await db().rpc('admin_affiliate_referrals')
  if (error) throw error
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    payment_amount: Number(row.payment_amount),
    commission_amount: Number(row.commission_amount),
    paid_revenue: Number(row.paid_revenue),
    commission_pending: Number(row.commission_pending),
    commission_paid: Number(row.commission_paid)
  })) as AffiliateReferral[]
}

export async function markAffiliateCommissionsPaid(ids: string[]): Promise<number> {
  const { data, error } = await db().rpc('admin_mark_affiliate_commissions_paid', { p_commission_ids: ids })
  if (error) throw error
  return Number(data ?? 0)
}

export async function getMyAffiliateDashboard(): Promise<MyAffiliateDashboard> {
  const { data, error } = await db().rpc('my_affiliate_dashboard')
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('affiliate_not_active')
  return {
    ...row,
    commission_rate: Number(row.commission_rate),
    referrals: Number(row.referrals),
    active_subscriptions: Number(row.active_subscriptions),
    paid_revenue: Number(row.paid_revenue),
    commission_pending: Number(row.commission_pending),
    commission_paid: Number(row.commission_paid),
    commission_reversed: Number(row.commission_reversed)
  } as MyAffiliateDashboard
}

export async function getMyAffiliateReferrals(): Promise<MyAffiliateReferral[]> {
  const { data, error } = await db().rpc('my_affiliate_referrals')
  if (error) throw error
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    paid_revenue: Number(row.paid_revenue),
    commission_pending: Number(row.commission_pending),
    commission_paid: Number(row.commission_paid)
  })) as MyAffiliateReferral[]
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

/* ---------------- Créditos de IA ---------------- */
export interface AiSettings {
  ai_tokens_per_credit: string
  ai_cost_per_credit: string
  ai_price_per_credit: string
  ai_trial_credits: string
}
export const AI_SETTING_KEYS = ['ai_tokens_per_credit', 'ai_cost_per_credit', 'ai_price_per_credit', 'ai_trial_credits'] as const
export const AI_DEFAULTS: AiSettings = { ai_tokens_per_credit: '1000', ai_cost_per_credit: '0.009', ai_price_per_credit: '0.04', ai_trial_credits: '50' }

export interface AiPack { id: string; name: string; credits: number; price: number; active: boolean; sort: number }

export interface AiOverviewRow {
  tenant_id: string; tenant_name: string; owner_email: string | null; plan: string
  included: number; plan_used: number; pack_balance: number; used_month: number; available: number
  cost_month: number; bought_month: number; last_use: string | null
}

export interface AiLedgerRow { kind: 'compra' | 'bonus' | 'ajuste' | 'uso'; credits: number; tokens: number; provider_cost: number; amount: number; note: string | null; created_at: string }

export interface AiSummary {
  included: number; plan_used: number; plan_left: number; pack_balance: number; used_month: number; available: number
  tokens_per_credit: number; price_per_credit: number
  ledger?: { kind: AiLedgerRow['kind']; credits: number; tokens: number; note: string | null; created_at: string }[]
}

const num = (v: unknown) => Number(v ?? 0)

export async function loadAiSettings(): Promise<AiSettings> {
  const { data, error } = await db().from('platform_settings').select('key, value').in('key', [...AI_SETTING_KEYS])
  if (error) throw error
  const out: AiSettings = { ...AI_DEFAULTS }
  for (const r of data ?? []) (out as unknown as Record<string, string>)[r.key] = r.value
  return out
}

export async function saveAiSettings(v: AiSettings): Promise<void> {
  const rows = AI_SETTING_KEYS.map((key) => ({ key, value: String(v[key] ?? '').trim(), updated_at: new Date().toISOString() }))
  const { error } = await db().from('platform_settings').upsert(rows, { onConflict: 'key' })
  if (error) throw error
}

export async function setPlanCredits(planId: string, credits: number): Promise<void> {
  const { error } = await db().from('plans').update({ ai_credits_month: Math.max(0, Math.round(credits)), updated_at: new Date().toISOString() }).eq('id', planId)
  if (error) throw error
}

export async function listPlanCredits(): Promise<{ id: string; name: string; ai_credits_month: number }[]> {
  const { data, error } = await db().from('plans').select('id, name, ai_credits_month').order('sort')
  if (error) throw error
  return (data ?? []).map((p) => ({ id: p.id, name: p.name, ai_credits_month: num(p.ai_credits_month) }))
}

export async function listAiPacks(): Promise<AiPack[]> {
  const { data, error } = await db().from('ai_credit_packs').select('*').order('sort')
  if (error) throw error
  return (data ?? []).map((p) => ({ ...p, credits: num(p.credits), price: num(p.price) })) as AiPack[]
}

export async function saveAiPack(p: AiPack): Promise<void> {
  const { error } = await db().from('ai_credit_packs').upsert(p, { onConflict: 'id' })
  if (error) throw error
}

export async function adminAiOverview(): Promise<AiOverviewRow[]> {
  const { data, error } = await db().rpc('admin_ai_overview')
  if (error) throw error
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    tenant_id: String(r.tenant_id), tenant_name: String(r.tenant_name), owner_email: (r.owner_email as string | null) ?? null, plan: String(r.plan),
    included: num(r.included), plan_used: num(r.plan_used), pack_balance: num(r.pack_balance), used_month: num(r.used_month), available: num(r.available),
    cost_month: num(r.cost_month), bought_month: num(r.bought_month), last_use: (r.last_use as string | null) ?? null
  }))
}

export async function adminAiLedger(tenantId: string): Promise<AiLedgerRow[]> {
  const { data, error } = await db().rpc('admin_ai_ledger', { p_tenant: tenantId })
  if (error) throw error
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    kind: r.kind as AiLedgerRow['kind'], credits: num(r.credits), tokens: num(r.tokens), provider_cost: num(r.provider_cost), amount: num(r.amount),
    note: (r.note as string | null) ?? null, created_at: String(r.created_at)
  }))
}

export async function adminGrantCredits(tenantId: string, credits: number, kind: 'bonus' | 'ajuste', note: string): Promise<void> {
  const { error } = await db().rpc('admin_grant_credits', { p_tenant: tenantId, p_credits: credits, p_kind: kind, p_note: note || null })
  if (error) throw error
}

/** Saldo e extrato da própria empresa (tela Assistente IA). */
export async function myAiSummary(): Promise<AiSummary> {
  const { data, error } = await db().rpc('my_ai_summary')
  if (error) throw error
  const d = data as Record<string, unknown>
  return {
    included: num(d.included), plan_used: num(d.plan_used), plan_left: num(d.plan_left), pack_balance: num(d.pack_balance), used_month: num(d.used_month),
    available: num(d.available), tokens_per_credit: num(d.tokens_per_credit), price_per_credit: num(d.price_per_credit),
    ledger: (d.ledger as AiSummary['ledger']) ?? []
  }
}
