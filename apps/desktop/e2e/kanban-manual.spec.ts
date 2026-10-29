import { expect, test } from '@playwright/test'
import { iso, mockBackend } from './backend'
import { trackPageErrors } from './helpers'

const contacts = [{ id: 'c-1', tenant_id: 't-1', name: 'Cliente Alfa', phone: '11999990001', tags: [], visits: 0, spent: 0, created_at: iso(500), extra: {} }]
const conversations = [
  { id: 'v-1', tenant_id: 't-1', contact_id: 'c-1', channel: 'whatsapp', status: 'nova', unread: 0, last_message: 'Oi', last_time: '09:10', ai_enabled: true, tags: [], created_at: iso(30), updated_at: iso(30), extra: {} }
]

test.describe('Kanban manual', () => {
  test('Novo cartão cria cliente e atendimento na etapa escolhida e grava no banco', async ({ page }) => {
    const errs = trackPageErrors(page)
    const { tables } = await mockBackend(page, { seed: { contacts, conversations } })
    await page.goto('/kanban')
    await page.getByRole('button', { name: 'Novo cartão' }).click()
    const dialog = page.getByRole('dialog', { name: /Novo cartão/ })
    await dialog.getByPlaceholder('(11) 90000-0000').fill('(11) 98888-7777')
    await dialog.getByPlaceholder('Nome do cliente').fill('Cliente Novo Manual')
    await dialog.getByRole('combobox').first().selectOption('humano')
    await dialog.getByRole('button', { name: 'Criar cartão' }).click()
    await expect(page.getByText('Cliente Novo Manual').first()).toBeVisible()
    await expect.poll(() => tables.contacts.some((c) => c.name === 'Cliente Novo Manual')).toBe(true)
    await expect.poll(() => tables.conversations.some((c) => c.status === 'humano' && c.contact_id !== 'c-1')).toBe(true)
    errs.expectNone()
  })

  test('botão pausa e religa a IA no cartão e grava', async ({ page }) => {
    const { tables } = await mockBackend(page, { seed: { contacts, conversations } })
    await page.goto('/kanban')
    await page.locator('button[aria-label="Pausar a IA"]').click()
    await expect(page.locator('button[aria-label="Ligar a IA"]').first()).toBeVisible()
    await expect.poll(() => tables.conversations.find((c) => c.id === 'v-1')?.ai_enabled).toBe(false)
    await page.locator('button[aria-label="Ligar a IA"]').first().click()
    await expect.poll(() => tables.conversations.find((c) => c.id === 'v-1')?.ai_enabled).toBe(true)
  })
})

test('Configurações tem a aba Google Agenda explicando como conectar', async ({ page }) => {
  await mockBackend(page, { seed: { contacts, conversations } })
  await page.goto('/config?tab=google')
  await expect(page.getByText('Compromissos pessoais do profissional bloqueiam o horário')).toBeVisible()
})
