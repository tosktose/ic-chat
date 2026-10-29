// IA do IC Chat na versão web: confere o saldo de créditos da empresa, chama o provedor e DEBITA o consumo.
// A chave do provedor fica só aqui (Secrets do Supabase); o navegador nunca a vê.
//
// Secrets (nomes com prefixo ICCHAT_ porque o projeto é compartilhado com outros sistemas):
//   ICCHAT_AI_API_KEY    chave do provedor de IA (obrigatório)
//   ICCHAT_AI_BASE_URL   endereço da API compatível com OpenAI (padrão https://openrouter.ai/api/v1)
//   ICCHAT_AI_MODEL      modelo (padrão openai/gpt-4o-mini)
//   ICCHAT_SITE_URL      opcional, padrão https://ic-chat-desktop.vercel.app
import { createClient } from 'npm:@supabase/supabase-js@2'

const SITE = (Deno.env.get('ICCHAT_SITE_URL') ?? 'https://ic-chat-desktop.vercel.app').replace(/\/$/, '')
const cors = {
  'Access-Control-Allow-Origin': SITE,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } })

type Msg = { role: 'user' | 'assistant'; content: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const apiKey = Deno.env.get('ICCHAT_AI_API_KEY')
  if (!apiKey) return json({ error: 'ia_nao_configurada' }, 503)

  // Quem está pedindo? (JWT do usuário logado) e de qual empresa
  const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    db: { schema: 'ic_chat' }
  })
  const { data: auth } = await supa.auth.getUser()
  if (!auth?.user) return json({ error: 'nao_autenticado' }, 401)
  const { data: member } = await supa.from('tenant_members').select('tenant_id').eq('user_id', auth.user.id).maybeSingle()
  if (!member?.tenant_id) return json({ error: 'empresa_nao_encontrada' }, 404)
  const tenantId = String(member.tenant_id)

  let system = ''
  let messages: Msg[] = []
  try {
    const b = await req.json()
    system = String(b.system ?? '').slice(0, 8000)
    messages = (Array.isArray(b.messages) ? b.messages : [])
      .filter((m: Msg) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string')
      .slice(-20)
      .map((m: Msg) => ({ role: m.role, content: m.content.slice(0, 4000) }))
  } catch { /* corpo vazio */ }
  if (!messages.length) return json({ error: 'mensagem_vazia' }, 400)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'ic_chat' } })

  // 1) Tem crédito? (plano do mês + saldo avulso)
  const { data: before } = await admin.rpc('ai_summary', { p_tenant: tenantId })
  if (!before || Number((before as { available: number }).available) <= 0) return json({ error: 'creditos_esgotados' }, 402)

  // 2) Chama o provedor
  const base = (Deno.env.get('ICCHAT_AI_BASE_URL') ?? 'https://openrouter.ai/api/v1').replace(/\/$/, '')
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: Deno.env.get('ICCHAT_AI_MODEL') ?? 'openai/gpt-4o-mini',
      max_tokens: 500,
      messages: [...(system ? [{ role: 'system', content: system }] : []), ...messages]
    })
  })
  const out = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('Provedor de IA recusou:', res.status, JSON.stringify(out).slice(0, 300))
    return json({ error: 'provedor_recusou' }, 502)
  }
  const text = String(out?.choices?.[0]?.message?.content ?? '')
  const tin = Number(out?.usage?.prompt_tokens ?? 0)
  const tout = Number(out?.usage?.completion_tokens ?? 0)

  // 3) Debita o que foi realmente consumido (primeiro do plano, depois do saldo avulso) e registra o custo
  const { data: after, error } = await admin.rpc('ai_record_usage', { p_tenant: tenantId, p_tokens_in: tin, p_tokens_out: tout, p_note: 'Conversa de teste' })
  if (error) console.error('ai_record_usage falhou:', error.message)
  const a = (after ?? {}) as { credits_used?: number; available?: number }
  return json({ text, credits_used: a.credits_used ?? 0, available: a.available ?? 0 })
})
