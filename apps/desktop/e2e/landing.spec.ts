import { expect, test } from '@playwright/test'
import { dismissCookies, trackPageErrors } from './helpers'

test.describe('Landing page', () => {
  test('carrega sem erros, com logo visível e título correto', async ({ page }) => {
    const errs = trackPageErrors(page)
    await page.goto('/')
    await expect(page).toHaveTitle(/IC Chat/)
    const logo = page.locator('header img[alt="IC Chat"]')
    await expect(logo).toBeVisible()
    // Regressão: a logo ficava branca/ilegível. Tem que ser a imagem real, carregada.
    expect(await logo.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(100)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('não perca nenhuma venda')
    errs.expectNone()
  })

  test('rola com a roda do mouse (regressão: página travada)', async ({ page }) => {
    await page.goto('/')
    await dismissCookies(page)
    const main = page.locator('main').first()
    expect(await main.evaluate((m) => m.scrollHeight > m.clientHeight)).toBe(true)
    await page.mouse.move(600, 400)
    await page.mouse.wheel(0, 1500)
    await expect.poll(() => main.evaluate((m) => m.scrollTop)).toBeGreaterThan(500)
  })

  test('links do menu levam às seções', async ({ page }) => {
    await page.goto('/')
    await dismissCookies(page)
    await page.locator('header nav').getByRole('link', { name: 'Planos' }).click()
    await expect(page.locator('#planos')).toBeInViewport()
  })

  test('mostra os três planos e o botão de teste leva ao cadastro', async ({ page }) => {
    await page.goto('/')
    await dismissCookies(page)
    for (const p of ['Start', 'Pro', 'Business']) await expect(page.getByRole('heading', { name: p, exact: true })).toBeAttached()
    await page.getByRole('link', { name: /Experimentar grátis/ }).click()
    await expect(page).toHaveURL(/\/cadastro/)
  })

  test('FAQ abre e fecha', async ({ page }) => {
    await page.goto('/')
    await dismissCookies(page)
    const q = page.locator('details').first()
    await q.scrollIntoViewIfNeeded()
    await q.locator('summary').click()
    await expect(q).toHaveAttribute('open', '')
  })

  test('seção de download existe (aviso ou link)', async ({ page }) => {
    await page.goto('/')
    await dismissCookies(page)
    await expect(page.locator('#baixar')).toContainText(/Windows/)
  })
})
