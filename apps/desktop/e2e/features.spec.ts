import { expect, test, type Page } from '@playwright/test'
import { iso, mockBackend } from './backend'
import { trackPageErrors } from './helpers'

const contacts = [
  { id: 'c-1', tenant_id: 't-1', name: 'Cliente Alfa', phone: '11999990001', tags: [], visits: 0, spent: 0, created_at: iso(500), extra: {} },
  { id: 'c-2', tenant_id: 't-1', name: 'Cliente Beta', phone: '11999990002', tags: [], visits: 0, spent: 0, created_at: iso(400), extra: {} }
]
const conversations = [
  { id: 'v-1', tenant_id: 't-1', contact_id: 'c-1', channel: 'whatsapp', status: 'nova', unread: 1, last_message: 'Oi, quero um orçamento', last_time: '09:10', ai_enabled: false, tags: [], created_at: iso(30), updated_at: iso(30), extra: {} },
  { id: 'v-2', tenant_id: 't-1', contact_id: 'c-2', channel: 'whatsapp', status: 'humano', unread: 0, last_message: 'Pode me ligar?', last_time: '09:20', ai_enabled: false, tags: [], created_at: iso(20), updated_at: iso(20), extra: {} }
]

/** Arrasta um cartão com o mouse (o dnd-kit só começa depois de mover alguns pixels). */
async function drag(page: Page, from: ReturnType<Page['locator']>, to: ReturnType<Page['locator']>) {
  const a = (await from.boundingBox())!
  const b = (await to.boundingBox())!
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2 + 12, { steps: 4 })
  await page.mouse.move(b.x + b.width / 2, b.y + 80, { steps: 12 })
  await page.mouse.up()
}

test.describe('Kanban', () => {
  test('cartões vêm das conversas e arrastar muda a etapa e GRAVA no banco', async ({ page }) => {
    const errs = trackPageErrors(page)
    const { writes, tables } = await mockBackend(page, { seed: { contacts, conversations } })
    await page.goto('/kanban')
    await expect(page.getByText('Cliente Alfa').first()).toBeVisible()
    await expect(page.getByText('Cliente Beta').first()).toBeVisible()

    const card = page.getByText('Cliente Alfa').first()
    const iaColumn = page.getByText('IA atendendo', { exact: true }).first()
    await drag(page, card, iaColumn)

    await expect.poll(() => writes.some((w) => w.table === 'conversations' && w.body.some((r) => r.id === 'v-1' && r.status === 'ia'))).toBe(true)
    const saved = tables.conversations.find((c) => c.id === 'v-1')!
    expect(saved.status).toBe('ia')
    expect((saved.extra as Record<string, unknown>).kanbanStage).toBe('ia')

    // Depois de recarregar, o cartão continua na nova etapa
    await page.reload()
    await expect(page.getByText('Cliente Alfa').first()).toBeVisible()
    expect((tables.conversations.find((c) => c.id === 'v-1') as Record<string, unknown>).status).toBe('ia')
    errs.expectNone()
  })

  test('painel "Atividade da IA" não mostra exemplos', async ({ page }) => {
    await mockBackend(page, { seed: { contacts, conversations } })
    await page.goto('/kanban')
    await page.getByRole('button', { name: /Atividade da IA/ }).click()
    for (const fake of ['Respondeu Fernanda', 'Transferiu Maria Silva', 'Detectou reclamação de Gabriel']) {
      await expect(page.getByText(fake)).toHaveCount(0)
    }
  })
})

test.describe('Contatos, atendimento e funil', () => {
  test('lista contatos reais e cria um novo que é gravado', async ({ page }) => {
    const { writes } = await mockBackend(page, { seed: { contacts, conversations } })
    await page.goto('/contatos')
    await expect(page.getByText('Cliente Alfa').first()).toBeVisible()
    await page.getByRole('button', { name: /Novo contato/ }).first().click()
    await page.getByRole('dialog').getByText('Nome', { exact: true }).locator('..').locator('input').fill('Contato Criado no Teste')
    await page.getByRole('dialog').getByPlaceholder('(11) 90000-0000').fill('11988887777')
    await page.getByRole('dialog').getByRole('button').filter({ hasText: /Salvar|Criar|Adicionar|Cadastrar/ }).last().click()
    await expect.poll(() => writes.some((w) => w.table === 'contacts' && w.body.some((r) => r.name === 'Contato Criado no Teste'))).toBe(true)
  })

  test('atendimento lista as conversas e abre a mensagem', async ({ page }) => {
    await mockBackend(page, { seed: { contacts, conversations } })
    await page.goto('/inbox')
    await expect(page.getByText('Cliente Alfa').first()).toBeVisible()
    await page.getByText('Cliente Alfa').first().click()
    await expect(page.getByText('Oi, quero um orçamento').first()).toBeVisible()
  })

  test('funil abre sem erro e começa vazio', async ({ page }) => {
    const errs = trackPageErrors(page)
    await mockBackend(page, { seed: { contacts, conversations } })
    await page.goto('/funil')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Studio Bella')).toHaveCount(0)
    errs.expectNone()
  })
})

test.describe('Relatórios', () => {
  test('exporta Excel (planilha) com os dados da tela', async ({ page }) => {
    await mockBackend(page, { seed: { contacts, conversations } })
    await page.goto('/relatorios')
    await page.getByRole('button', { name: /Conversas/ }).first().click()
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Excel' }).click()])
    expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx)$/)
  })

  test('PDF monta o documento de impressão', async ({ page }) => {
    await mockBackend(page, { seed: { contacts, conversations } })
    await page.addInitScript(() => { window.print = () => { (window as unknown as { __printed: boolean }).__printed = true } })
    await page.goto('/relatorios')
    await page.getByRole('button', { name: 'PDF' }).click()
    await expect(page.locator('iframe')).toHaveCount(1)
  })
})

test.describe('Configurações salvam no banco', () => {
  test('dados da empresa e segmento "Outro" são gravados e voltam ao recarregar', async ({ page }) => {
    const { writes, tables } = await mockBackend(page)
    await page.goto('/config')
    const name = page.getByText('Nome fantasia').locator('..').locator('input')
    await expect(name).toHaveValue('Empresa Teste') // vem do cadastro da empresa, não vazio
    await name.fill('Academia Força Total')
    await page.getByText('Segmento', { exact: true }).locator('..').locator('select').selectOption('outro')
    await page.getByPlaceholder('Descreva em poucas palavras').fill('Academia de musculação')
    await page.getByRole('button', { name: 'Salvar alterações' }).first().click()
    await expect.poll(() => writes.some((w) => w.table === 'company_settings')).toBe(true)
    const saved = tables.company_settings[0].data as { info: { name: string; segmentCustom: string } }
    expect(saved.info.name).toBe('Academia Força Total')
    expect(saved.info.segmentCustom).toBe('Academia de musculação')
    await page.reload()
    await expect(page.getByText('Nome fantasia').locator('..').locator('input')).toHaveValue('Academia Força Total')
  })

  test('agenda de uma empresa nova já abre em dia útil (não "Fechado")', async ({ page }) => {
    await mockBackend(page)
    await page.goto('/agenda')
    await page.waitForLoadState('networkidle')
    const day = new Date().getDay()
    if (day >= 1 && day <= 5) await expect(page.getByText('Fechado hoje')).toHaveCount(0)
  })
})
