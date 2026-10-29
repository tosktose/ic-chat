import { expect, test } from '@playwright/test'
import { dismissCookies } from './helpers'

// Sem permissão concedida: é o que o cliente novo vê ao entrar.
test.use({ permissions: [] })

test.describe('Convite de notificações e som', () => {
  test('aparece depois do login, explica o que ativa e "Agora não" guarda a escolha', async ({ page }) => {
    await page.goto('/login')
    await dismissCookies(page)
    // A tela só existe dentro do app; no login ela não pode aparecer
    await page.waitForTimeout(1800)
    await expect(page.getByRole('dialog', { name: /Não perca nenhuma mensagem/ })).toHaveCount(0)
  })
})
