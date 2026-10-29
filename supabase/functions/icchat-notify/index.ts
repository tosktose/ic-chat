// Avisos do IC Chat por e-mail (Resend) e WhatsApp (Evolution API). Não usa os e-mails do Supabase, que são compartilhados.
//
// Duas formas de chamar:
//   { "action": "welcome" }   o usuário logado acabou de ativar a conta (manda o "Parabéns", uma vez por empresa)
//   { "action": "due" }       rotina diária (pg_cron): avisa quem está com o acesso acabando ou encerrado.
//                             Exige o cabeçalho x-icchat-cron igual ao segredo "cron_secret" guardado no banco.
//
// Chaves vêm do painel do Super Admin (tabela platform_secrets): resend_api_key, email_from,
// evolution_url, evolution_api_key, evolution_instance.
import { createClient } from 'npm:@supabase/supabase-js@2'

const SITE = (Deno.env.get('ICCHAT_SITE_URL') ?? 'https://www.icchat.com.br').replace(/\/$/, '')
const cors = {
  'Access-Control-Allow-Origin': SITE,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-icchat-cron',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } })
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

type Notice = { subject: string; title: string; lines: string[]; button: string; link: string; whatsapp: string }

function dayText(n: number): string {
  return n <= 0 ? 'hoje' : n === 1 ? 'amanhã' : `em ${n} dias`
}

/** Textos de cada aviso. Mexa aqui para mudar o que o cliente recebe. */
function notice(kind: string, name: string, daysLeft: number): Notice | null {
  const first = name.split(' ')[0] || 'tudo bem'
  switch (kind) {
    case 'welcome':
      return {
        subject: 'Parabéns! Sua conta no IC Chat está ativa',
        title: 'Parabéns, sua conta está ativa! 🎉',
        lines: [`Olá, ${first}. Seu e-mail foi confirmado e o IC Chat já está liberado para você.`, 'Você tem 7 dias para testar tudo, sem cartão. Comece conectando seu WhatsApp e cadastrando seus serviços: o robô guia do sistema mostra o caminho.'],
        button: 'Abrir o IC Chat', link: `${SITE}/dashboard`,
        whatsapp: `Parabéns, ${first}! Sua conta no IC Chat está ativa. Entre em ${SITE}/dashboard e comece o teste de 7 dias.`
      }
    case 'trial_ending_3':
    case 'trial_ending_1':
      return {
        subject: `Seu teste grátis termina ${dayText(daysLeft)}`,
        title: `Seu teste grátis termina ${dayText(daysLeft)}`,
        lines: [`Olá, ${first}. Para continuar atendendo seus clientes sem interrupção, escolha um plano antes do fim do teste.`, 'Seus dados ficam guardados: nada se perde ao assinar.'],
        button: 'Escolher meu plano', link: `${SITE}/assinar`,
        whatsapp: `Olá, ${first}! Seu teste grátis do IC Chat termina ${dayText(daysLeft)}. Escolha seu plano em ${SITE}/assinar e continue sem interrupção.`
      }
    case 'plan_ending_7':
    case 'plan_ending_3':
    case 'plan_ending_1':
      return {
        subject: `Seu acesso ao IC Chat vence ${dayText(daysLeft)}`,
        title: `Seu acesso vence ${dayText(daysLeft)}`,
        lines: [`Olá, ${first}. Renove agora para não interromper o atendimento nem a IA.`, 'A renovação é feita em poucos cliques, com Pix, boleto ou cartão.'],
        button: 'Renovar agora', link: `${SITE}/assinar`,
        whatsapp: `Olá, ${first}! Seu acesso ao IC Chat vence ${dayText(daysLeft)}. Renove em ${SITE}/assinar para não interromper o atendimento.`
      }
    case 'access_ended':
      return {
        subject: 'Seu acesso ao IC Chat foi encerrado',
        title: 'Seu acesso foi encerrado',
        lines: [`Olá, ${first}. O período do seu plano terminou e o acesso está limitado: o envio de mensagens e a IA ficam pausados.`, 'Seus dados continuam guardados. Escolha um plano para voltar na hora.'],
        button: 'Reativar meu acesso', link: `${SITE}/assinar`,
        whatsapp: `Olá, ${first}. Seu acesso ao IC Chat foi encerrado, mas seus dados estão guardados. Reative em ${SITE}/assinar.`
      }
    default:
      return null
  }
}

function html(n: Notice): string {
  const body = n.lines.map((l) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155">${esc(l)}</p>`).join('')
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f1f5f9;font-family:Segoe UI,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,.08)">
<tr><td style="background:linear-gradient(135deg,#2563eb,#1e3a8a);padding:26px 32px"><img src="${SITE}/favicon.png" width="36" height="36" alt="" style="vertical-align:middle;border-radius:8px"> <span style="color:#fff;font-size:18px;font-weight:700;vertical-align:middle;margin-left:8px">IC Chat</span></td></tr>
<tr><td style="padding:32px"><h1 style="margin:0 0 16px;font-size:22px;color:#0f172a">${esc(n.title)}</h1>${body}
<p style="margin:24px 0"><a href="${n.link}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:10px">${esc(n.button)}</a></p>
<p style="margin:0;font-size:12px;color:#94a3b8">Se o botão não abrir, copie este endereço: ${n.link}</p></td></tr>
<tr><td style="padding:18px 32px;background:#f8fafc;font-size:12px;color:#94a3b8">IC Chat · atendimento e chatbot com IA para WhatsApp. Você recebeu este e-mail por ter uma conta no IC Chat.</td></tr>
</table></td></tr></table></body></html>`
}

async function sendEmail(cfg: Record<string, string>, to: string, n: Notice): Promise<boolean> {
  if (!cfg.resend_api_key || !cfg.email_from) return false
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.resend_api_key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: cfg.email_from, to: [to], subject: n.subject, html: html(n) })
  })
  if (!res.ok) console.error('Resend recusou:', res.status, (await res.text()).slice(0, 200))
  return res.ok
}

async function sendWhatsApp(cfg: Record<string, string>, phone: string | null, n: Notice): Promise<boolean> {
  if (!cfg.evolution_url || !cfg.evolution_api_key || !cfg.evolution_instance || !phone) return false
  let digits = phone.replace(/\D/g, '')
  if (digits.length < 10) return false
  if (!digits.startsWith('55')) digits = `55${digits}`
  const res = await fetch(`${cfg.evolution_url.replace(/\/$/, '')}/message/sendText/${encodeURIComponent(cfg.evolution_instance)}`, {
    method: 'POST',
    headers: { apikey: cfg.evolution_api_key, 'content-type': 'application/json' },
    body: JSON.stringify({ number: digits, text: n.whatsapp })
  })
  if (!res.ok) console.error('Evolution recusou:', res.status, (await res.text()).slice(0, 200))
  return res.ok
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  let action = ''
  try { action = String((await req.json()).action ?? '') } catch { /* corpo vazio */ }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'ic_chat' } })
  const { data: rows } = await admin.from('platform_secrets').select('key, value')
  const cfg = Object.fromEntries((rows ?? []).map((r: { key: string; value: string }) => [r.key, r.value]))

  if (action === 'welcome') {
    const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
      db: { schema: 'ic_chat' }
    })
    const { data: auth } = await supa.auth.getUser()
    if (!auth?.user?.email) return json({ error: 'nao_autenticado' }, 401)
    const { data: first } = await supa.rpc('claim_welcome_notice')
    if (first !== true) return json({ sent: false, reason: 'ja_enviado' })
    const n = notice('welcome', String(auth.user.user_metadata?.name ?? auth.user.user_metadata?.company_name ?? ''), 7)!
    const ok = await sendEmail(cfg, auth.user.email, n)
    return json({ sent: ok })
  }

  if (action === 'due') {
    if (!cfg.cron_secret || req.headers.get('x-icchat-cron') !== cfg.cron_secret) return json({ error: 'forbidden' }, 403)
    const { data: due, error } = await admin.rpc('pop_due_notices')
    if (error) { console.error('pop_due_notices falhou:', error.message); return json({ error: 'db' }, 500) }
    let emails = 0, whats = 0
    for (const d of (due ?? []) as { kind: string; name: string; email: string; phone: string | null; days_left: number }[]) {
      const n = notice(d.kind, d.name, d.days_left)
      if (!n) continue
      if (await sendEmail(cfg, d.email, n)) emails++
      if (await sendWhatsApp(cfg, d.phone, n)) whats++
    }
    return json({ due: (due ?? []).length, emails, whats })
  }

  return json({ error: 'acao_invalida' }, 400)
})
