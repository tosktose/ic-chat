import { expect, test } from '@playwright/test'
import { fakeSession, trackPageErrors } from './helpers'

const soon = new Date(Date.now() + 20 * 86400_000).toISOString()

const licenses = [
  { id: 'l1', tenant_id: 't1', key_prefix: 'ICCH-AB12C', kind: 'mensal', status: 'ativa', max_devices: 3, expires_at: soon, created_at: new Date().toISOString(), last_validated_at: new Date().toISOString(), tenants: { name: 'Clínica Exemplo' } },
  { id: 'l2', tenant_id: 't2', key_prefix: 'ICCH-ZZ99Y', kind: 'anual', status: 'suspensa', max_devices: 1, expires_at: soon, created_at: new Date().toISOString(), last_validated_at: null, tenants: { name: 'Loja Inadimplente' } }
]

async function mockAdminApi(page: import('@playwright/test').Page, calls: string[]) {
  const json = (body: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  await page.route('**/rest/v1/licenses*', (r) => r.fulfill(json(licenses)))
  await page.route('**/rest/v1/license_activations*', (r) => r.fulfill(json([{ license_id: 'l1' }, { license_id: 'l1' }])))
  await page.route('**/rest/v1/tenants*', (r) =>
    r.fulfill(json([{ id: 't1', name: 'Clínica Exemplo', created_at: soon, subscriptions: [] }, { id: 't2', name: 'Loja Inadimplente', created_at: soon, subscriptions: [] }]))
  )
  await page.route('**/rest/v1/rpc/generate_license', (r) => {
    calls.push('generate:' + r.request().postData())
    return r.fulfill(json({ id: 'l3', key: 'ICCH-11111-22222-33333-44444', expires_at: soon, kind: 'mensal' }))
  })
  await page.route('**/rest/v1/rpc/set_license_status', (r) => {
    calls.push('status:' + r.request().postData())
    return r.fulfill({ status: 204, body: '' })
  })
  await page.route('**/rest/v1/rpc/extend_license', (r) => {
    calls.push('extend:' + r.request().postData())
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(soon) })
  })
}

test.describe('Licenças (Super Admin)', () => {
  test('lista as licenças do banco, sem mostrar a chave inteira', async ({ page }) => {
    const errs = trackPageErrors(page)
    await fakeSession(page, 'superadmin@itacondo.com.br')
    await mockAdminApi(page, [])
    await page.goto('/admin/licencas')
    await expect(page.getByText('Clínica Exemplo').first()).toBeVisible()
    await expect(page.getByText('ICCH-AB12C-•••••-•••••')).toBeVisible()
    await expect(page.getByText('2 / 3')).toBeVisible()
    // Dados de demonstração antigos não podem aparecer
    await expect(page.getByText('Studio Bella')).toHaveCount(0)
    await expect(page.getByText('ICCH-7K2M')).toHaveCount(0)
    errs.expectNone()
  })

  test('gerar chave mostra a chave inteira uma única vez', async ({ page }) => {
    const calls: string[] = []
    await fakeSession(page, 'superadmin@itacondo.com.br')
    await mockAdminApi(page, calls)
    await page.goto('/admin/licencas')
    await page.getByRole('button', { name: 'Gerar chave' }).first().click()
    await page.getByRole('combobox').first().selectOption({ label: 'Clínica Exemplo' })
    await page.getByRole('button', { name: 'Gerar chave' }).last().click()
    await expect(page.getByText('ICCH-11111-22222-33333-44444')).toBeVisible()
    expect(calls.some((c) => c.startsWith('generate:') && c.includes('"p_tenant":"t1"'))).toBe(true)
    await page.getByRole('button', { name: 'Já copiei' }).click()
    await expect(page.getByText('ICCH-11111-22222-33333-44444')).toHaveCount(0)
  })

  test('suspender, reativar e renovar chamam o banco', async ({ page }) => {
    const calls: string[] = []
    await fakeSession(page, 'superadmin@itacondo.com.br')
    await mockAdminApi(page, calls)
    await page.goto('/admin/licencas')
    await page.getByRole('button', { name: 'Suspender' }).first().click()
    await expect.poll(() => calls.some((c) => c.startsWith('status:') && c.includes('suspensa'))).toBe(true)
    await page.getByRole('button', { name: 'Reativar' }).click()
    await expect.poll(() => calls.some((c) => c.startsWith('status:') && c.includes('"p_status":"ativa"'))).toBe(true)
    await page.getByRole('button', { name: 'Renovar por 30 dias' }).first().click()
    await expect.poll(() => calls.some((c) => c.startsWith('extend:') && c.includes('30'))).toBe(true)
  })

  test('usuário comum não vê a tela de licenças', async ({ page }) => {
    await fakeSession(page, 'cliente@exemplo.com')
    await page.goto('/admin/licencas')
    await expect(page).not.toHaveURL(/\/admin/)
  })
})
