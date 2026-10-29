import { expect, test } from '@playwright/test'
import { dismissCookies, fakeSession, trackPageErrors } from './helpers'

test.describe('Redefinição de senha', () => {
  test('fluxo "esqueci minha senha" envia o pedido e confirma', async ({ page }) => {
    let called = false
    await page.route('**/auth/v1/recover*', (r) => {
      called = true
      return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })
    await page.goto('/login')
    await dismissCookies(page)
    await page.getByRole('link', { name: 'Esqueci minha senha' }).click()
    await expect(page).toHaveURL(/\/esqueci-senha/)
    await page.getByPlaceholder('voce@empresa.com.br').fill('alguem@exemplo.com')
    await page.getByRole('button', { name: /Enviar link/ }).click()
    await expect(page.getByRole('heading', { name: 'Confira seu e-mail' })).toBeVisible()
    expect(called).toBe(true)
  })

  test('link de redefinição sem sessão válida mostra aviso e novo pedido', async ({ page }) => {
    await page.goto('/redefinir-senha')
    await expect(page.getByRole('heading', { name: 'Link inválido ou expirado' })).toBeVisible()
    await page.getByRole('button', { name: 'Pedir novo link' }).click()
    await expect(page).toHaveURL(/\/esqueci-senha/)
  })

  test('nova senha exige confirmação igual', async ({ page }) => {
    await fakeSession(page, 'alguem@exemplo.com')
    await page.goto('/redefinir-senha')
    await expect(page.getByRole('heading', { name: 'Crie uma nova senha' })).toBeVisible()
    await page.locator('input[autocomplete=new-password]').nth(0).fill('senhaNova123')
    await page.locator('input[autocomplete=new-password]').nth(1).fill('outraCoisa99')
    await expect(page.getByText('As senhas não conferem')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Salvar nova senha' })).toBeDisabled()
  })
})

test.describe('Perfis de acesso (banco de usuários compartilhado)', () => {
  test('superadmin@itacondo.com.br cai no painel do dono do SaaS', async ({ page }) => {
    const errs = trackPageErrors(page)
    await fakeSession(page, 'superadmin@itacondo.com.br')
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/admin/)
    errs.expectNone()
  })

  test('usuário comum cai no painel do gerente e não acessa /admin', async ({ page }) => {
    await fakeSession(page, 'cliente@exemplo.com')
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)
    await page.goto('/admin')
    await expect(page).not.toHaveURL(/\/admin/)
  })

  test('com sessão ativa, o login avisa quem está conectado', async ({ page }) => {
    await fakeSession(page, 'cliente@exemplo.com')
    await page.goto('/login')
    await expect(page.getByText('cliente@exemplo.com')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sair e usar outra' })).toBeVisible()
  })
})
