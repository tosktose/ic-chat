import { expect, test } from '@playwright/test'

const readConsent = (page: import('@playwright/test').Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('icchat.consent.v1') ?? 'null'))

test.describe('Cookies e LGPD', () => {
  test('faixa de cookies aparece na primeira visita e some após escolher', async ({ page }) => {
    await page.goto('/')
    const dialog = page.getByRole('dialog', { name: 'Preferências de cookies' })
    await expect(dialog).toBeVisible()
    await page.getByRole('button', { name: 'Somente necessários' }).click()
    await expect(dialog).toBeHidden()
    expect(await readConsent(page)).toMatchObject({ necessary: true, analytics: false, marketing: false })
    await page.reload()
    await expect(dialog).toBeHidden()
  })

  test('"Aceitar todos" grava consentimento completo', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Aceitar todos' }).click()
    expect(await readConsent(page)).toMatchObject({ analytics: true, marketing: true })
  })

  test('personalizar permite escolher e o rodapé reabre as preferências', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Personalizar' }).click()
    await page.getByRole('switch', { name: 'Análise' }).click()
    await page.getByRole('button', { name: 'Salvar preferências' }).click()
    expect(await readConsent(page)).toMatchObject({ analytics: true, marketing: false })
    await page.getByRole('button', { name: 'Preferências de cookies' }).click()
    await expect(page.getByRole('dialog', { name: 'Preferências de cookies' })).toBeVisible()
  })

  test('políticas de privacidade e termos existem', async ({ page }) => {
    for (const [path, title] of [['/privacidade', 'Política de Privacidade'], ['/termos', 'Termos de Uso']]) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
    }
  })

  test('cadastro exige aceitar termos e privacidade', async ({ page }) => {
    await page.goto('/cadastro')
    await expect(page.locator('input[type=checkbox][required]')).toBeVisible()
  })
})
