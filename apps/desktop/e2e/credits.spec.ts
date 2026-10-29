import { expect, test, type Page } from '@playwright/test'
import { mockBackend } from './backend'
import { fakeSession, trackPageErrors } from './helpers'

const json = (body: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
const okEmpty = { status: 201, contentType: 'application/json', body: '[]' }

const overview = [
  { tenant_id: 't1', tenant_name: 'Clínica Exemplo', owner_email: 'dono@clinica.com', plan: 'pro', included: 1000, plan_used: 400, pack_balance: 250, used_month: 400, available: 850, cost_month: 3.6, bought_month: 20, last_use: new Date().toISOString() },
  { tenant_id: 't2', tenant_name: 'Loja Sem Crédito', owner_email: 'loja@exemplo.com', plan: 'start', included: 300, plan_used: 300, pack_balance: 0, used_month: 320, available: 0, cost_month: 2.88, bought_month: 0, last_use: null }
]

async function mockAdminCredits(page: Page) {
  const writes: { what: string; body: unknown }[] = []
  await fakeSession(page, 'superadmin@itacondo.com.br')
  await page.route('**/rest/v1/rpc/admin_ai_overview', (r) => r.fulfill(json(overview)))
  await page.route('**/rest/v1/rpc/admin_ai_ledger', (r) => r.fulfill(json([
    { kind: 'uso', credits: 12.5, tokens: 12500, provider_cost: 0.1125, amount: 0, note: 'Conversa de teste', created_at: new Date().toISOString() },
    { kind: 'compra', credits: 500, tokens: 0, provider_cost: 0, amount: 20, note: 'Pacote 500', created_at: new Date().toISOString() }
  ])))
  await page.route('**/rest/v1/rpc/admin_grant_credits', (r) => { writes.push({ what: 'grant', body: r.request().postDataJSON() }); return r.fulfill(json({})) })
  await page.route('**/rest/v1/ai_credit_packs*', (r) => {
    if (r.request().method() === 'GET') return r.fulfill(json([{ id: 'pack_500', name: 'Pacote 500', credits: 500, price: 20, active: true, sort: 1 }, { id: 'pack_2000', name: 'Pacote 2.000', credits: 2000, price: 70, active: true, sort: 2 }]))
    writes.push({ what: 'pack', body: r.request().postDataJSON() }); return r.fulfill(okEmpty)
  })
  await page.route('**/rest/v1/plans*', (r) => {
    if (r.request().method() === 'GET') return r.fulfill(json([{ id: 'start', name: 'Start', ai_credits_month: 300 }, { id: 'pro', name: 'Pro', ai_credits_month: 1000 }, { id: 'business', name: 'Business', ai_credits_month: 5000 }]))
    writes.push({ what: 'plan', body: r.request().postDataJSON() }); return r.fulfill(okEmpty)
  })
  await page.route('**/rest/v1/platform_settings*', (r) => {
    if (r.request().method() === 'GET') return r.fulfill(json([{ key: 'ai_tokens_per_credit', value: '1000' }, { key: 'ai_cost_per_credit', value: '0.009' }, { key: 'ai_price_per_credit', value: '0.04' }, { key: 'ai_trial_credits', value: '50' }]))
    writes.push({ what: 'settings', body: r.request().postDataJSON() }); return r.fulfill(okEmpty)
  })
  return { writes }
}

test.describe('Super Admin · Créditos de IA', () => {
  test('explica como funciona, mostra configuração, planos, pacotes e saldo de cada empresa', async ({ page }) => {
    const errs = trackPageErrors(page)
    await mockAdminCredits(page)
    await page.goto('/admin/creditos')
    await expect(page.getByText('Como funciona')).toBeVisible()
    await expect(page.getByText('Preço e conversão')).toBeVisible()
    await expect(page.getByText('Créditos incluídos por plano')).toBeVisible()
    await expect(page.getByText('Pacotes avulsos à venda')).toBeVisible()
    await expect(page.getByText('Clínica Exemplo')).toBeVisible()
    await expect(page.getByText('dono@clinica.com · plano pro')).toBeVisible()
    await expect(page.getByText('Esgotado')).toBeVisible()
    await expect(page.getByText(/1 empresa\(s\) sem crédito/)).toBeVisible()
    // nada da maquete antiga
    for (const fake of ['Studio Bella', 'Clínica Derma+', 'Receita de excedente']) await expect(page.getByText(fake)).toHaveCount(0)
    errs.expectNone()
  })

  test('mostra a margem e avisa quando o preço fica abaixo do custo', async ({ page }) => {
    await mockAdminCredits(page)
    await page.goto('/admin/creditos')
    await expect(page.getByText(/Margem por crédito:/)).toContainText('R$ 0,03')
    await page.getByText('Preço de venda por crédito (R$)').locator('..').locator('input').fill('0.005')
    await expect(page.getByText(/vendendo no prejuízo/)).toBeVisible()
  })

  test('salvar a configuração grava no banco', async ({ page }) => {
    const { writes } = await mockAdminCredits(page)
    await page.goto('/admin/creditos')
    await page.getByText('Créditos de teste grátis').locator('..').locator('input').fill('80')
    await page.getByRole('button', { name: 'Salvar', exact: true }).first().click()
    await expect.poll(() => writes.some((w) => w.what === 'settings')).toBe(true)
    const rows = writes.find((w) => w.what === 'settings')!.body as { key: string; value: string }[]
    expect(rows.find((r) => r.key === 'ai_trial_credits')?.value).toBe('80')
    expect(rows.map((r) => r.key).sort()).toEqual(['ai_cost_per_credit', 'ai_price_per_credit', 'ai_tokens_per_credit', 'ai_trial_credits'])
  })

  test('créditos incluídos por plano são editáveis e gravados', async ({ page }) => {
    const { writes } = await mockAdminCredits(page)
    await page.goto('/admin/creditos')
    const proRow = page.getByText('Pro', { exact: true }).locator('..')
    await proRow.locator('input').fill('1500')
    await proRow.getByRole('button', { name: 'Salvar' }).click()
    await expect.poll(() => writes.some((w) => w.what === 'plan')).toBe(true)
    expect((writes.find((w) => w.what === 'plan')!.body as { ai_credits_month: number }).ai_credits_month).toBe(1500)
  })

  test('dar créditos de bônus chama o banco com empresa, quantidade e motivo', async ({ page }) => {
    const { writes } = await mockAdminCredits(page)
    await page.goto('/admin/creditos')
    await page.getByRole('button', { name: 'Dar créditos' }).nth(1).click()
    await page.getByRole('dialog').getByText('Quantidade de créditos').locator('..').locator('input').fill('500')
    await page.getByRole('dialog').getByPlaceholder('Ex.: cortesia de boas-vindas').fill('cortesia de teste')
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click()
    await expect.poll(() => writes.some((w) => w.what === 'grant')).toBe(true)
    expect(writes.find((w) => w.what === 'grant')!.body).toMatchObject({ p_tenant: 't2', p_credits: 500, p_kind: 'bonus', p_note: 'cortesia de teste' })
  })

  test('extrato mostra uso e compras', async ({ page }) => {
    await mockAdminCredits(page)
    await page.goto('/admin/creditos')
    await page.getByRole('button', { name: 'Ver extrato' }).first().click()
    const d = page.getByRole('dialog')
    await expect(d.getByText('Conversa de teste')).toBeVisible()
    await expect(d.getByText('Compra de pacote')).toBeVisible()
  })

  test('pacote vendido abaixo do custo é sinalizado', async ({ page }) => {
    await mockAdminCredits(page)
    await page.goto('/admin/creditos')
    await page.locator('input[type=number]').filter({ hasNot: page.locator('x') }).nth(0).waitFor()
    const pack = page.getByText('créditos por R$').first().locator('..')
    await pack.locator('input[step="0.01"]').fill('1')
    await expect(page.getByText(/abaixo do custo/).first()).toBeVisible()
  })
})

test.describe('Cliente · Créditos de IA', () => {
  const summary = { included: 1000, plan_used: 400, plan_left: 600, pack_balance: 250, used_month: 400, available: 850, tokens_per_credit: 1000, price_per_credit: 0.04, tenant_id: 't-1',
    ledger: [{ kind: 'uso', credits: 3.2, tokens: 3200, note: 'Conversa de teste', created_at: new Date().toISOString() }, { kind: 'compra', credits: 500, tokens: 0, note: 'Pacote 500', created_at: new Date().toISOString() }] }

  async function mockCustomer(page: Page, s: object = summary) {
    await mockBackend(page)
    await page.route('**/rest/v1/rpc/my_ai_summary', (r) => r.fulfill(json(s)))
    await page.route('**/rest/v1/ai_credit_packs*', (r) => r.fulfill(json([{ id: 'pack_500', name: 'Pacote 500', credits: 500, price: 20, active: true, sort: 1 }])))
  }

  test('mostra saldo, uso do plano, extrato e pacotes à venda', async ({ page }) => {
    await mockCustomer(page)
    await page.goto('/ia')
    await expect(page.getByText('Créditos de IA').first()).toBeVisible()
    await expect(page.getByText('850 disponíveis')).toBeVisible()
    await expect(page.getByText('400 de 1.000 usados')).toBeVisible()
    await expect(page.getByRole('button', { name: /Pacote 500/ })).toBeVisible()
    await page.getByText('Extrato (últimos movimentos)').click()
    await expect(page.getByText('Compra de pacote')).toBeVisible()
    // na web não pede mais chave de API do cliente
    await expect(page.getByText('Provedor e chave de API')).toHaveCount(0)
  })

  test('sem créditos: avisa e destaca a compra', async ({ page }) => {
    await mockCustomer(page, { ...summary, available: 0, plan_left: 0, pack_balance: 0, plan_used: 1000 })
    await page.goto('/ia')
    await expect(page.getByText('Sem créditos')).toBeVisible()
  })

  test('comprar pacote chama o checkout com o pacote e vai ao Mercado Pago', async ({ page }) => {
    await mockCustomer(page)
    let body = ''
    await page.route('**/functions/v1/create-checkout', (r) => { body = r.request().postData() ?? ''; return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ url: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=PACK-1' }) }) })
    await page.route('https://www.mercadopago.com.br/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Checkout simulado</h1>' }))
    await page.goto('/ia')
    await page.getByRole('button', { name: /Pacote 500/ }).click()
    await expect(page).toHaveURL(/pref_id=PACK-1/)
    expect(JSON.parse(body)).toEqual({ pack: 'pack_500' }) // só o id do pacote; o preço é do servidor
  })

  test('conversa de teste usa a função ai-chat e mostra a resposta', async ({ page }) => {
    await mockCustomer(page)
    let sent: { system?: string; messages?: { role: string; content: string }[] } = {}
    await page.route('**/functions/v1/ai-chat', (r) => { sent = r.request().postDataJSON(); return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ text: 'Olá! Posso ajudar com o seu agendamento.', credits_used: 1.2, available: 848.8 }) }) })
    await page.goto('/ia')
    await page.getByPlaceholder('Escreva como um cliente…').fill('Oi, quero marcar um horário')
    await page.keyboard.press('Enter')
    await expect(page.getByText('Posso ajudar com o seu agendamento.')).toBeVisible()
    expect(sent.messages?.at(-1)).toMatchObject({ role: 'user', content: 'Oi, quero marcar um horário' })
  })

  test('créditos esgotados na conversa de teste mostram orientação clara', async ({ page }) => {
    await mockCustomer(page)
    await page.route('**/functions/v1/ai-chat', (r) => r.fulfill({ status: 402, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ error: 'creditos_esgotados' }) }))
    await page.goto('/ia')
    await page.getByPlaceholder('Escreva como um cliente…').fill('Oi')
    await page.keyboard.press('Enter')
    await expect(page.getByText(/Seus créditos de IA acabaram/)).toBeVisible()
  })
})
