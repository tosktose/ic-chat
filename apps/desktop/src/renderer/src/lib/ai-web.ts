import { supabase } from './supabase'

export interface WebAiResult { text: string; creditsUsed: number; available: number }

const messages: Record<string, string> = {
  ia_nao_configurada: 'A IA ainda não foi ativada neste ambiente. Fale com o suporte.',
  creditos_esgotados: 'Seus créditos de IA acabaram. Compre um pacote na tela Assistente IA para continuar.',
  nao_autenticado: 'Sua sessão expirou. Entre novamente.',
  empresa_nao_encontrada: 'Não encontramos a sua empresa. Fale com o suporte.',
  provedor_recusou: 'O provedor de IA não respondeu agora. Tente novamente em instantes.'
}

/** Conversa de teste na versão web: passa pela função ai-chat do servidor, que confere e debita os créditos. */
export async function callAiChat(system: string, turns: { role: 'user' | 'assistant'; content: string }[]): Promise<WebAiResult> {
  if (!supabase) throw new Error('Supabase não configurado.')
  const { data, error } = await supabase.functions.invoke('ai-chat', { body: { system, messages: turns } })
  if (error) {
    let code = ''
    try { code = (await (error as { context?: Response }).context?.json())?.error ?? '' } catch { /* sem corpo */ }
    throw new Error(messages[code] ?? 'Não foi possível falar com a IA agora.')
  }
  return { text: String(data.text ?? ''), creditsUsed: Number(data.credits_used ?? 0), available: Number(data.available ?? 0) }
}
