import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://umnoiivuntnvsxkysvrr.supabase.co'
// Chave publishable: pública por desenho (vai no JavaScript do site); quem protege os dados é o RLS.
// O padrão permite publicar em qualquer host (Cloudflare, Vercel) sem configurar variável.
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_i2MLYsd9Ac-JP9KaBo2BsQ_qwbAfp9S'

export const supabase = key ? createClient(url, key, {
  // OAuth do desktop abre o navegador do sistema; o retorno com token é encaminhado pelo protocolo icchat://.
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: !window.icchat?.isDesktop, flowType: window.icchat?.isDesktop ? 'implicit' : 'pkce' }
}) : null

export const isWebApp = typeof window !== 'undefined' && !window.icchat?.isDesktop
export const isSupabaseMode = Boolean(supabase)
