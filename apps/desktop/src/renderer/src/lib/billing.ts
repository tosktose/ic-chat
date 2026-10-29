import { supabase } from './supabase'

export type PlanId = 'start' | 'pro' | 'business'

export interface PublicPlan {
  id: PlanId
  name: string
  price: number
  summary: string
  features: string[]
  recommended?: boolean
  days?: number
  discount_type?: 'percent' | 'fixed' | null
  discount_value?: number
  discount_label?: string
  discount_ends_at?: string | null
}

export function discountedPlanPrice(plan: Pick<PublicPlan, 'price' | 'discount_type' | 'discount_value' | 'discount_ends_at'>, now = Date.now()): number {
  const endsAt = plan.discount_ends_at ? new Date(plan.discount_ends_at).getTime() : null
  if (!plan.discount_type || !plan.discount_value || (endsAt !== null && (!Number.isFinite(endsAt) || endsAt <= now))) return plan.price
  const discount = plan.discount_type === 'percent' ? plan.price * plan.discount_value / 100 : plan.discount_value
  return Math.max(0, Math.round((plan.price - discount) * 100) / 100)
}

/** Valores padrão (só usados se o banco não responder). O preço cobrado de verdade é o da tabela `plans`, lido pelo servidor. */
export const PLAN_FALLBACK: PublicPlan[] = [
  { id: 'start', name: 'Start', price: 79, summary: 'Para organizar o atendimento e não perder nenhum contato.', features: ['Até 3 usuários', 'Caixa de entrada e contatos', 'Funil de vendas', 'Agenda e relatórios essenciais'] },
  { id: 'pro', name: 'Pro', price: 149, recommended: true, summary: 'Para equipes que querem automatizar e acompanhar resultados.', features: ['Até 10 usuários', 'Tudo do Start', 'Assistente IA e automações', 'Relatórios por canal e conversão'] },
  { id: 'business', name: 'Business', price: 299, summary: 'Para operações em crescimento e mais de uma unidade.', features: ['Usuários ampliados', 'Tudo do Pro', 'Múltiplas unidades', 'Integrações e suporte prioritário'] }
]

const messages: Record<string, string> = {
  pagamento_nao_configurado: 'O pagamento ainda não foi ativado neste ambiente. Fale com o suporte.',
  nao_autenticado: 'Sua sessão expirou. Entre novamente.',
  apenas_gerentes_podem_assinar: 'Somente gerentes podem contratar o plano.',
  empresa_nao_encontrada: 'Não encontramos a sua empresa. Fale com o suporte.',
  plano_invalido: 'Este plano ou pacote não está disponível.',
  mercado_pago_recusou: 'O Mercado Pago não aceitou o pedido. Tente novamente em instantes.'
}

/** Pede ao servidor um link de pagamento do Mercado Pago para o plano escolhido. */
export async function startCheckout(plan: PlanId): Promise<{ url?: string; error?: string }> {
  if (!supabase) return { error: 'Supabase não configurado.' }
  const { data, error } = await supabase.functions.invoke('create-checkout', { body: { plan } })
  if (error) {
    let code = ''
    try { code = (await (error as { context?: Response }).context?.json())?.error ?? '' } catch { /* sem corpo */ }
    return { error: messages[code] ?? 'Não foi possível falar com o servidor de pagamento. Tente novamente.' }
  }
  if (!data?.url) return { error: 'O servidor não devolveu o link de pagamento.' }
  return { url: String(data.url) }
}

/** Pede ao servidor o link de pagamento de um pacote de créditos de IA. */
export async function startPackCheckout(pack: string): Promise<{ url?: string; error?: string }> {
  if (!supabase) return { error: 'Supabase não configurado.' }
  const { data, error } = await supabase.functions.invoke('create-checkout', { body: { pack } })
  if (error) {
    let code = ''
    try { code = (await (error as { context?: Response }).context?.json())?.error ?? '' } catch { /* sem corpo */ }
    return { error: messages[code] ?? 'Não foi possível falar com o servidor de pagamento. Tente novamente.' }
  }
  if (!data?.url) return { error: 'O servidor não devolveu o link de pagamento.' }
  return { url: String(data.url) }
}
