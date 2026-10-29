import { supabase } from './supabase'

export type PlanId = 'start' | 'pro' | 'business'

/** Valores só para EXIBIR. O preço cobrado de verdade é o da função create-checkout (servidor). */
export const PLAN_LIST: { id: PlanId; name: string; price: number; summary: string; features: string[]; recommended?: boolean }[] = [
  { id: 'start', name: 'Start', price: 79, summary: 'Para organizar o atendimento e não perder nenhum contato.', features: ['Até 3 usuários', 'Caixa de entrada e contatos', 'Funil de vendas', 'Agenda e relatórios essenciais'] },
  { id: 'pro', name: 'Pro', price: 149, recommended: true, summary: 'Para equipes que querem automatizar e acompanhar resultados.', features: ['Até 10 usuários', 'Tudo do Start', 'Assistente IA e automações', 'Relatórios por canal e conversão'] },
  { id: 'business', name: 'Business', price: 299, summary: 'Para operações em crescimento e mais de uma unidade.', features: ['Usuários ampliados', 'Tudo do Pro', 'Múltiplas unidades', 'Integrações e suporte prioritário'] }
]

const messages: Record<string, string> = {
  pagamento_nao_configurado: 'O pagamento ainda não foi ativado neste ambiente. Fale com o suporte.',
  nao_autenticado: 'Sua sessão expirou. Entre novamente.',
  apenas_gerentes_podem_assinar: 'Somente gerentes podem contratar o plano.',
  empresa_nao_encontrada: 'Não encontramos a sua empresa. Fale com o suporte.',
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
