import { expect, test } from '@playwright/test'
import { dismissCookies } from './helpers'

test.describe('Link de afiliado', () => {
  test('?ref= na home guarda o código e o cadastro envia código + marca do IC Chat ao servidor', async ({ page }) => {
    let body: Record<string, unknown> | null = null
    await page.route('**/auth/v1/signup*', async (route) => {
      body = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'u-new', email: 'novo@exemplo.com', aud: 'authenticated', app_metadata: {}, user_metadata: {}, identities: [{}] }) })
    })
    await page.goto('/?ref=02107dcb17')
    await dismissCookies(page)
    expect(await page.evaluate(() => localStorage.getItem('icchat.affiliate.referral_code'))).toBe('02107DCB17')

    // Navega para o cadastro pelo próprio site (como o cliente) e preenche
    await page.goto('/cadastro')
    await page.getByPlaceholder('voce@empresa.com.br').fill('novo@exemplo.com')
    await page.getByPlaceholder('Mínimo de 8 caracteres').fill('senha-forte-123')
    await page.getByPlaceholder('Sua empresa').fill('Empresa de Teste')
    await page.locator('form input[type=checkbox]').check()
    await page.locator('form').getByRole('button', { name: /Criar conta/ }).click()
    await expect.poll(() => body).not.toBeNull()
    const data = (body as unknown as { data: Record<string, string> }).data
    expect(data.affiliate_referral_code).toBe('02107DCB17')
    expect(data.app).toBe('icchat')
  })

  test('código inválido na URL é ignorado', async ({ page }) => {
    await page.goto('/?ref=<script>')
    expect(await page.evaluate(() => localStorage.getItem('icchat.affiliate.referral_code'))).toBeNull()
  })
})
