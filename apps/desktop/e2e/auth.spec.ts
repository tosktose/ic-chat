import { expect, test } from '@playwright/test'
import { dismissCookies, trackPageErrors } from './helpers'

test.describe('Login e cadastro', () => {
  test('todo campo de senha tem o olho de mostrar/ocultar', async ({ page }) => {
    await page.goto('/login')
    await dismissCookies(page)
    const pw = page.getByPlaceholder('Mínimo de 8 caracteres')
    await pw.fill('segredo123')
    await expect(pw).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: 'Mostrar senha' }).click()
    await expect(pw).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: 'Ocultar senha' }).click()
    await expect(pw).toHaveAttribute('type', 'password')
  })

  test('credenciais inválidas mostram mensagem clara e não entram', async ({ page }) => {
    await page.route('**/auth/v1/token*', (r) =>
      r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' }) })
    )
    await page.goto('/login')
    await dismissCookies(page)
    await page.getByPlaceholder('voce@empresa.com.br').fill('ninguem@exemplo.com')
    await page.getByPlaceholder('Mínimo de 8 caracteres').fill('senha-errada-1')
    await page.locator('form').getByRole('button', { name: /Entrar/ }).click()
    await expect(page.getByText('E-mail ou senha incorretos')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('área logada sem sessão redireciona para o login', async ({ page }) => {
    for (const path of ['/dashboard', '/inbox', '/config', '/admin']) {
      await page.goto(path)
      await expect(page, path).toHaveURL(/\/login/)
    }
  })

  test('login e cadastro carregam sem erro de JS', async ({ page }) => {
    const errs = trackPageErrors(page)
    for (const p of ['/login', '/cadastro']) {
      await page.goto(p)
      await expect(page.locator('main h2').first()).toBeVisible()
    }
    errs.expectNone()
  })
})
