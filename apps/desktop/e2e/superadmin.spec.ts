import { expect, test, type Page } from '@playwright/test'
import { fakeSession, trackPageErrors } from './helpers'

const soon = new Date(Date.now() + 5 * 86400_000).toISOString()
const tenants = [
  { id: 't1', name: 'Jussara Oliveira', created_at: soon, owner_email: 'jussara@exemplo.com', owner_name: 'Jussara Oliveira', origin_role: null, members: 1, sub_status: 'trialing', sub_plan: 'trial', trial_ends_at: soon, period_ends_at: null, licenses_active: 0, last_payment_at: null },
  { id: 't2', name: 'Condomínio Teste', created_at: soon, owner_email: 'sindico@exemplo.com', owner_name: 'Síndico', origin_role: 'sindico', members: 2, sub_status: 'active', sub_plan: 'pro', trial_ends_at: soon, period_ends_at: soon, licenses_active: 1, last_payment_at: soon }
]
const members = [
  { user_id: 'u1', email: 'jussara@exemplo.com', display_name: 'Jussara Oliveira', role: 'owner', tenant_id: 't1', tenant_name: 'Jussara Oliveira', origin_role: null, last_sign_in_at: soon, created_at: soon }
]
const plans = [
  { id: 'start', name: 'Start', price: 79, days: 30, max_users: 3, max_devices: 3, summary: '', features: ['Até 3 usuários'], highlight: false, active: true, sort: 1 },
  { id: 'pro', name: 'Pro', price: 149, days: 30, max_users: 10, max_devices: 10, summary: '', features: ['Tudo do Start'], highlight: true, active: true, sort: 2 }
]

async function mockAdmin(page: Page) {
  const writes: { table: string; body: unknown }[] = []
  let settings = [
    { key: 'company_name', value: 'ItaCondo' }, { key: 'support_email', value: 'itacondo@gmail.com' },
    { key: 'support_whatsapp', value: '' }, { key: 'site_url', value: 'https://ic-chat-desktop.vercel.app' }
  ]
  await fakeSession(page, 'superadmin@itacondo.com.br')
  const json = (body: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  await page.route('**/rest/v1/rpc/admin_tenants', (r) => r.fulfill(json(tenants)))
  await page.route('**/rest/v1/rpc/admin_members', (r) => r.fulfill(json(members)))
  await page.route('**/rest/v1/plans*', (r) => (r.request().method() === 'GET' ? r.fulfill(json(plans)) : (writes.push({ table: 'plans', body: r.request().postDataJSON() }), r.fulfill({ status: 201, body: '[]', contentType: 'application/json' }))))
  await page.route('**/rest/v1/platform_settings*', (r) => {
    if (r.request().method() === 'GET') return r.fulfill(json(settings))
    const body = r.request().postDataJSON() as { key: string; value: string }[]
    writes.push({ table: 'platform_settings', body })
    settings = body.map((b) => ({ key: b.key, value: b.value }))
    return r.fulfill({ status: 201, body: '[]', contentType: 'application/json' })
  })
  return { writes }
}

test.describe('Super Admin conectado ao banco', () => {
  test('Empresas: mostra quem é o dono de cada empresa e nada inventado', async ({ page }) => {
    const errs = trackPageErrors(page)
    await mockAdmin(page)
    await page.goto('/admin')
    await expect(page.getByText('Jussara Oliveira').first()).toBeVisible()
    await expect(page.getByText('jussara@exemplo.com').first()).toBeVisible()
    await expect(page.getByText('Studio Bella')).toHaveCount(0)
    await expect(page.getByText('+ R$ 299 este mês')).toHaveCount(0)
    errs.expectNone()
  })

  test('Usuários: lista os membros reais', async ({ page }) => {
    await mockAdmin(page)
    await page.goto('/admin/usuarios')
    await expect(page.getByText('jussara@exemplo.com').first()).toBeVisible()
    await expect(page.getByText('Renata Alves')).toHaveCount(0)
  })

  test('Planos: preços vêm do banco', async ({ page }) => {
    await mockAdmin(page)
    await page.goto('/admin/planos')
    await expect(page.getByText('R$ 79,00').first()).toBeVisible()
    await expect(page.getByText('R$ 149,00').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Novo plano' })).toHaveCount(0)
  })

  test('Créditos de IA: sem custo inventado do provedor', async ({ page }) => {
    await mockAdmin(page)
    await page.goto('/admin/creditos')
    await expect(page.getByText('Nenhum consumo de IA registrado')).toBeVisible()
    await expect(page.getByText('Custo com o provedor', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Consumo no mês')).toHaveCount(0)
  })

  test('Sistema: carrega do banco, salva no banco e não tem servidor de licenças de mentira', async ({ page }) => {
    const { writes } = await mockAdmin(page)
    await page.goto('/admin/sistema')
    const email = page.getByText('E-mail de suporte', { exact: true }).locator('..').locator('input')
    await expect(email).toHaveValue('itacondo@gmail.com')
    await expect(page.getByText('licencas.icchat.itacondo.com.br')).toHaveCount(0)
    await expect(page.getByText('Ed25519')).toHaveCount(0)
    await page.getByText('WhatsApp de suporte', { exact: true }).locator('..').locator('input').fill('11987654321')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect.poll(() => writes.some((w) => w.table === 'platform_settings')).toBe(true)
    const rows = writes.find((w) => w.table === 'platform_settings')!.body as { key: string; value: string }[]
    expect(rows.find((r) => r.key === 'support_whatsapp')?.value).toBe('11987654321')
    expect(rows.find((r) => r.key === 'support_email')?.value).toBe('itacondo@gmail.com')
  })

  test('Sistema: rejeita e-mail e endereço inválidos', async ({ page }) => {
    const { writes } = await mockAdmin(page)
    await page.goto('/admin/sistema')
    await page.getByText('E-mail de suporte', { exact: true }).locator('..').locator('input').fill('isso-nao-e-email')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByText('E-mail de suporte inválido')).toBeVisible()
    expect(writes).toHaveLength(0)
  })

  test('renovar e bloquear empresa gravam no banco (não é só de mentira na tela)', async ({ page }) => {
    const calls: string[] = []
    await mockAdmin(page)
    await page.route('**/rest/v1/rpc/admin_extend_tenant', (r) => { calls.push('extend:' + r.request().postData()); return r.fulfill({ status: 200, contentType: 'application/json', body: '"2026-12-01T00:00:00Z"' }) })
    await page.route('**/rest/v1/rpc/admin_set_tenant_blocked', (r) => { calls.push('block:' + r.request().postData()); return r.fulfill({ status: 204, body: '' }) })
    page.on('dialog', (d) => d.accept())
    await page.goto('/admin')
    await page.getByRole('button', { name: 'Renovar por 30 dias' }).first().click()
    await expect.poll(() => calls.some((c) => c.startsWith('extend:') && c.includes('"p_days":30'))).toBe(true)
    await page.getByRole('button', { name: 'Bloquear empresa' }).first().click()
    await expect.poll(() => calls.some((c) => c.startsWith('block:') && c.includes('"p_blocked":true'))).toBe(true)
    await expect(page.getByRole('button', { name: 'Enviar aviso de vencimento' })).toHaveCount(0)
  })

  test('menu do Super Admin chama o item de Licenças (sem "tokens")', async ({ page }) => {
    await mockAdmin(page)
    await page.goto('/admin')
    await expect(page.getByRole('link', { name: 'Licenças' }).first()).toBeVisible()
    await expect(page.getByText('Licenças e tokens')).toHaveCount(0)
  })
})
