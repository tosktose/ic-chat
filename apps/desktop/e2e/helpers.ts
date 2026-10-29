import { expect, type Page } from '@playwright/test'

/** Falha o teste se o navegador registrar erro de JavaScript (tela quebrada). */
export function trackPageErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  return {
    expectNone: () => expect(errors, `Erros de JS na página:\n${errors.join('\n')}`).toEqual([])
  }
}

/** Recusa os cookies não essenciais (fecha a faixa que cobre a parte de baixo da tela). */
export async function dismissCookies(page: Page) {
  const btn = page.getByRole('button', { name: 'Somente necessários' })
  if (await btn.isVisible().catch(() => false)) await btn.click()
}
