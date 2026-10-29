// Recebe os avisos do Mercado Pago. Nunca confia no que veio no aviso: consulta o pagamento
// direto na API do Mercado Pago (com o Access Token) e só então libera o plano.
//
// Secrets: ICCHAT_MP_ACCESS_TOKEN (obrigatório) e ICCHAT_MP_WEBHOOK_SECRET (opcional, mas recomendado: a "assinatura secreta"
// que o Mercado Pago mostra em Webhooks). Prefixo ICCHAT_ de propósito: o projeto é compartilhado com outros sistemas. Deploy SEM verificação de JWT (o Mercado Pago não envia login):
//   supabase functions deploy mp-webhook --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2'


const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

/** Confere a assinatura x-signature do Mercado Pago (HMAC-SHA256 do "manifesto"). */
async function validSignature(req: Request, dataId: string, secret: string): Promise<boolean> {
  const header = req.headers.get('x-signature') ?? ''
  const requestId = req.headers.get('x-request-id') ?? ''
  const parts = Object.fromEntries(header.split(',').map((p) => p.trim().split('=') as [string, string]))
  if (!parts.ts || !parts.v1) return false
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest)))
  return mac === parts.v1
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok')
  const token = Deno.env.get('ICCHAT_MP_ACCESS_TOKEN')
  if (!token) return new Response('not configured', { status: 503 })

  const url = new URL(req.url)
  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { /* aviso sem corpo: usa a query */ }
  const type = String(body.type ?? url.searchParams.get('type') ?? url.searchParams.get('topic') ?? '')
  const dataId = String((body.data as { id?: string } | undefined)?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? '')

  // Só nos interessam avisos de pagamento
  if (!type.includes('payment') || !dataId) return new Response('ignored')

  const secret = Deno.env.get('ICCHAT_MP_WEBHOOK_SECRET')
  if (secret && !(await validSignature(req, dataId, secret))) return new Response('invalid signature', { status: 401 })

  // Fonte da verdade: o próprio Mercado Pago
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return new Response('payment lookup failed', { status: 502 }) // o Mercado Pago tenta de novo
  const pay = await res.json()

  const [tenantId, plan] = String(pay.external_reference ?? '').split('|')
  if (!tenantId || !plan) return new Response('unknown reference') // pagamento que não é nosso

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'ic_chat' } })

  // Compra de pacote de créditos de IA ("pack:<id>"): credita o saldo avulso (a função confere o valor e não duplica)
  if (plan.startsWith('pack:')) {
    const { error: packError } = await admin.rpc('apply_credit_pack', {
      p_tenant: tenantId, p_pack: plan.slice(5), p_provider_payment_id: String(pay.id),
      p_amount: Number(pay.transaction_amount), p_status: String(pay.status)
    })
    if (packError) { console.error('apply_credit_pack falhou:', packError.message); return new Response('db error', { status: 500 }) }
    return new Response('ok')
  }

  const { data: planRow } = await admin.from('plans').select('price, days').eq('id', plan).maybeSingle()
  if (!planRow) return new Response('unknown plan')
  // Valor tem que bater com o plano (evita liberar plano caro com pagamento barato)
  if (pay.status === 'approved' && Number(pay.transaction_amount) < Number(planRow.price)) {
    console.error('Valor pago menor que o plano', dataId, pay.transaction_amount, plan)
    return new Response('amount mismatch')
  }
  const { error } = await admin.rpc('apply_payment', {
    p_tenant: tenantId, p_plan: plan, p_days: Number(planRow.days), p_provider_payment_id: String(pay.id),
    p_amount: Number(pay.transaction_amount), p_status: String(pay.status)
  })
  if (error) {
    console.error('apply_payment falhou:', error.message)
    return new Response('db error', { status: 500 })
  }
  return new Response('ok')
})
