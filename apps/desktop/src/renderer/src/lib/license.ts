import { supabase } from './supabase'

/** Formato da chave: ICCH-XXXXX-XXXXX-XXXXX-XXXXX (gerada no banco, só o hash fica guardado). */
export const LICENSE_KEY_RE = /^ICCH(-[A-Z0-9]{5}){4}$/

export type LicenseReason = 'ok' | 'invalid' | 'revoked' | 'suspended' | 'expired' | 'payment' | 'device_limit' | 'nokey' | 'offline'

export interface LicenseResult {
  valid: boolean
  reason: LicenseReason
  tenantName?: string
  kind?: 'teste' | 'mensal' | 'trimestral' | 'anual'
  expiresAt?: string
  daysLeft?: number
  maxDevices?: number
}

export const reasonText: Record<LicenseReason, string> = {
  ok: 'Licença ativa.',
  invalid: 'Chave não encontrada. Confira se digitou corretamente.',
  revoked: 'Esta chave foi cancelada. Fale com o suporte.',
  suspended: 'Licença suspensa por pendência de pagamento. Regularize para voltar a usar.',
  expired: 'Licença vencida. Renove para continuar usando.',
  payment: 'Assinatura com pagamento pendente. Regularize para voltar a usar.',
  device_limit: 'Limite de computadores desta licença atingido. Peça ao suporte para liberar uma vaga.',
  nokey: 'Informe a chave de licença para ativar o IC Chat neste computador.',
  offline: 'Sem conexão com o servidor de licenças há mais de 7 dias. Conecte-se à internet.'
}

const KEY_STORE = 'icchat.license.key'
const LAST_OK_STORE = 'icchat.license.lastOk'
const OFFLINE_GRACE_DAYS = 7

/** Identificador estável deste computador (não contém dados pessoais). */
export function deviceId(): string {
  try {
    let id = localStorage.getItem('icchat.device')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('icchat.device', id)
    }
    return id
  } catch {
    return 'sem-armazenamento-' + Math.random().toString(36).slice(2, 12)
  }
}

export const storedKey = (): string => {
  try { return localStorage.getItem(KEY_STORE) ?? '' } catch { return '' }
}
export const saveKey = (key: string) => { try { localStorage.setItem(KEY_STORE, key) } catch { /* ignore */ } }
export const clearKey = () => { try { localStorage.removeItem(KEY_STORE); localStorage.removeItem(LAST_OK_STORE) } catch { /* ignore */ } }

/** Pergunta ao banco se a chave vale. Sem internet, aceita por até 7 dias desde a última validação. */
export async function validateLicense(key: string, deviceName?: string): Promise<LicenseResult> {
  if (!key) return { valid: false, reason: 'nokey' }
  if (!supabase) return { valid: false, reason: 'offline' }
  try {
    const { data, error } = await supabase.schema('ic_chat').rpc('validate_license', {
      p_key: key.trim().toUpperCase(),
      p_device_id: deviceId(),
      p_device_name: deviceName ?? null
    })
    if (error) throw error
    const d = data as Record<string, unknown>
    const result: LicenseResult = {
      valid: d.valid === true,
      reason: (d.reason as LicenseReason) ?? 'invalid',
      tenantName: d.tenant_name as string | undefined,
      kind: d.kind as LicenseResult['kind'],
      expiresAt: d.expires_at as string | undefined,
      daysLeft: d.days_left as number | undefined,
      maxDevices: d.max_devices as number | undefined
    }
    if (result.valid) { try { localStorage.setItem(LAST_OK_STORE, String(Date.now())) } catch { /* ignore */ } }
    return result
  } catch {
    // Servidor inacessível (internet): tolera por alguns dias desde a última validação bem-sucedida
    let last = 0
    try { last = Number(localStorage.getItem(LAST_OK_STORE) ?? 0) } catch { /* ignore */ }
    const withinGrace = last > 0 && Date.now() - last < OFFLINE_GRACE_DAYS * 86400_000
    return withinGrace ? { valid: true, reason: 'ok' } : { valid: false, reason: 'offline' }
  }
}
