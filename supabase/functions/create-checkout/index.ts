// Cria o checkout do Mercado Pago para a empresa de quem está logado.
// O preço vem DESTA função (nunca do navegador) e o Access Token fica só aqui, nos Secrets do Supabase.
//
// Secrets necessários (Supabase → Edge Functions → Secrets):
//   MP_ACCESS_TOKEN   Access Token do aplicativo do Mercado Pago (de teste ou de produção)
//   SITE_URL          opcional, padrão https://ic-chat-desktop.vercel.app
import { createClient } from 'npm:@supabase/supabase-js@2'

const PLANS: Record<string, { title: string; price: number; days: number }> = {
  start: { title: 'IC Chat Start · 30 dias', price: 79, days: 30 },
  pro: { title: 'IC Chat Pro · 30 dias', price: 149, days: 30 },
  business: { title: 'IC Chat Business · 30 dias', price: 299, days: 30 }
}

const SITE = (Deno.env.get('SITE_URL') ?? 'https://ic-chat-desktop.vercel.app').replace(/\/$/, '')
const cors = {
  'Access-Control-Allow-Origin': SITE,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const mpToken = Deno.env.get('MP_ACCESS_TOKEN')
  if (!mpToken) return json({ error: 'pagamento_nao_configurado' }, 503)

  // Quem está pedindo? (o JWT do usuário logado)
  const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    db: { schema: 'ic_chat' }
  })
  const { data: auth } = await supa.auth.getUser()
  const user = auth?.user
  if (!user) return json({ error: 'nao_autenticado' }, 401)

  let plan = ''
  try { plan = String((await req.json()).plan ?? '') } catch { /* corpo vazio */ }
  const chosen = PLANS[plan]
  if (!chosen) return json({ error: 'plano_invalido' }, 400)

  // A empresa vem do banco (RLS garante que é a do usuário), não do pedido
  const { data: member } = await supa.from('tenant_members').select('tenant_id, role').eq('user_id', user.id).maybeSingle()
  if (!member?.tenant_id) return json({ error: 'empresa_nao_encontrada' }, 404)
  if (member.role === 'agent') return json({ error: 'apenas_gerentes_podem_assinar' }, 403)

  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { Authorization: `Bearer ${mpToken}`, 'content-type': 'application/json', 'X-Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({
      items: [{ id: plan, title: chosen.title, quantity: 1, currency_id: 'BRL', unit_price: chosen.price }],
      payer: { email: user.email },
      external_reference: `${member.tenant_id}|${plan}`,
      metadata: { tenant_id: member.tenant_id, plan, days: chosen.days },
      back_urls: { success: `${SITE}/assinar/retorno`, pending: `${SITE}/assinar/retorno`, failure: `${SITE}/assinar/retorno` },
      auto_return: 'approved',
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mp-webhook`,
      statement_descriptor: 'ICCHAT'
    })
  })
  const pref = await res.json()
  if (!res.ok) {
    console.error('Mercado Pago recusou a preferência:', res.status, JSON.stringify(pref).slice(0, 400))
    return json({ error: 'mercado_pago_recusou' }, 502)
  }
  return json({ url: pref.init_point })
})
