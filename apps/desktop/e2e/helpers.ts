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

const STORAGE_KEY = 'sb-umnoiivuntnvsxkysvrr-auth-token'

/** Finge uma sessão do Supabase (sem rede) para testar o que a interface mostra para cada conta. */
export async function fakeSession(page: Page, email: string) {
  await page.route('**/rest/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/auth/v1/user*', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'u-1', email, aud: 'authenticated', app_metadata: {}, user_metadata: {} }) })
  )
  await page.addInitScript(
    ([key, mail]) => {
      localStorage.setItem('icchat.consent.v1', JSON.stringify({ necessary: true, analytics: false, marketing: false, savedAt: new Date().toISOString() }))
      localStorage.setItem(
        key,
        JSON.stringify({
          access_token: 'fake.jwt.token',
          refresh_token: 'fake-refresh',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { id: 'u-1', email: mail, aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() }
        })
      )
    },
    [STORAGE_KEY, email]
  )
}

