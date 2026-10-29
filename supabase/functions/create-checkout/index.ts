// Cria o checkout do Mercado Pago para a empresa de quem está logado.
// O preço vem DESTA função (nunca do navegador) e o Access Token fica só aqui, nos Secrets do Supabase.
//
// Secrets necessários (Supabase → Edge Functions → Secrets):
//   ICCHAT_MP_ACCESS_TOKEN   Access Token do aplicativo do Mercado Pago do IC Chat (teste ou produção)
//   ICCHAT_SITE_URL          opcional, padrão https://www.icchat.com.br
// Nomes com prefixo ICCHAT_ de propósito: o projeto Supabase é compartilhado com outros sistemas que usam MP_ACCESS_TOKEN.
import { createClient } from 'npm:@supabase/supabase-js@2'


const SITE = (Deno.env.get('ICCHAT_SITE_URL') ?? 'https://www.icchat.com.br').replace(/\/$/, '')
const cors = {
  'Access-Control-Allow-Origin': SITE,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const mpToken = Deno.env.get('ICCHAT_MP_ACCESS_TOKEN')
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
  let pack = ''
  try { const b = await req.json(); plan = String(b.plan ?? ''); pack = String(b.pack ?? '') } catch { /* corpo vazio */ }
  // Preço e prazo vêm da tabela ic_chat.plans (editada pelo Super Admin), lida com a chave de serviço
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'ic_chat' } })
  let chosen: { title: string; price: number; days: number }
  let refKey = plan
  if (pack) {
    // Pacote avulso de créditos de IA (tabela ic_chat.ai_credit_packs)
    const { data: pk } = await admin.from('ai_credit_packs').select('name, credits, price, active').eq('id', pack).maybeSingle()
    if (!pk || !pk.active) return json({ error: 'plano_invalido' }, 400)
    chosen = { title: `IC Chat · ${pk.name} (${pk.credits} créditos de IA)`, price: Number(pk.price), days: 0 }
    refKey = `pack:${pack}`
  } else {
    const { data: row } = await admin.from('plans').select('name, price, days, active, discount_type, discount_value, discount_ends_at').eq('id', plan).maybeSingle()
    if (!row || !row.active) return json({ error: 'plano_invalido' }, 400)
    const discountActive = row.discount_type && Number(row.discount_value) > 0 && (!row.discount_ends_at || new Date(row.discount_ends_at).getTime() > Date.now())
    const discount = discountActive ? row.discount_type === 'percent' ? Number(row.price) * Number(row.discount_value) / 100 : Number(row.discount_value) : 0
    const chargedPrice = Math.max(0, Math.round((Number(row.price) - discount) * 100) / 100)
    chosen = { title: `IC Chat ${row.name} · ${row.days} dias`, price: chargedPrice, days: Number(row.days) }
  }

  // A empresa vem do banco (RLS garante que é a do usuário), não do pedido
  const { data: member } = await supa.from('tenant_members').select('tenant_id, role').eq('user_id', user.id).maybeSingle()
  if (!member?.tenant_id) return json({ error: 'empresa_nao_encontrada' }, 404)
  if (member.role === 'agent') return json({ error: 'apenas_gerentes_podem_assinar' }, 403)

  const quoteId = crypto.randomUUID()
  if (!pack) {
    const { error } = await admin.from('checkout_quotes').insert({ id: quoteId, tenant_id: member.tenant_id, plan_id: refKey, amount: chosen.price })
    if (error) { console.error('Não foi possível registrar a cotação:', error.message); return json({ error: 'checkout_indisponivel' }, 503) }
  }

  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { Authorization: `Bearer ${mpToken}`, 'content-type': 'application/json', 'X-Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({
      items: [{ id: refKey, title: chosen.title, quantity: 1, currency_id: 'BRL', unit_price: chosen.price }],
      payer: { email: user.email },
      external_reference: `${member.tenant_id}|${refKey}${pack ? '' : `|${quoteId}`}`,
      metadata: { tenant_id: member.tenant_id, plan: refKey, days: chosen.days, ...(pack ? {} : { checkout_quote_id: quoteId }) },
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
