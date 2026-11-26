import { expect, test } from '@playwright/test'
import { iso, mockBackend } from './backend'
import { dismissCookies, trackPageErrors } from './helpers'

const contacts = [
  { id: 'c-1', tenant_id: 't-1', name: 'Maria Silva', phone: '11999990001', tags: ['VIP'], visits: 0, spent: 0, created_at: iso(500), extra: {} },
  { id: 'c-2', tenant_id: 't-1', name: 'João Souza', phone: '11999990002', tags: [], visits: 0, spent: 0, created_at: iso(400), extra: {} }
]

test.describe('Recursos de captação, cobrança e disparo', () => {
  test('botão "?" abre a explicação da tela atual', async ({ page }) => {
    const errs = trackPageErrors(page)
    await mockBackend(page, { seed: { contacts, charges: [] } })
    await page.goto('/cobrancas')
    await page.getByRole('button', { name: 'Ajuda sobre esta tela' }).click()
    const guide = page.getByRole('dialog', { name: 'Guia do IC Chat' })
    await expect(guide.getByText('Cobranças', { exact: true })).toBeVisible()
    await expect(guide.getByText(/Recebi/)).toBeVisible()
    errs.expectNone()
  })

  test('cobrança nova é gravada, aparece na lista e "Recebi" marca como paga', async ({ page }) => {
    const { tables, writes } = await mockBackend(page, { seed: { contacts, charges: [] } })
    await page.goto('/cobrancas')
    await page.getByRole('button', { name: 'Nova cobrança' }).first().click()
    const dialog = page.getByRole('dialog', { name: 'Nova cobrança' })
    await dialog.getByLabel('Nome do cliente').fill('Cliente Devedor')
    await dialog.getByLabel('WhatsApp do cliente').fill('11988887777')
    await dialog.getByLabel('Valor').fill('150,50')
    await dialog.getByRole('button', { name: 'Criar cobrança' }).click()
    await expect.poll(() => tables.charges.some((c) => c.customer_name === 'Cliente Devedor' && c.amount === 150.5 && c.tenant_id === 't-1')).toBe(true)
    // O banco de mentira devolve a lista na recarga
    tables.charges[0].id = 'ch-1'
    tables.charges[0].status = 'pendente'
    await page.reload()
    await expect(page.getByText('Cliente Devedor')).toBeVisible()
    await expect(page.getByRole('link', { name: /Cobrar Cliente Devedor no WhatsApp/ })).toHaveAttribute('href', /wa\.me\/5511988887777/)
    await page.getByRole('button', { name: 'Recebi' }).click()
    await expect.poll(() => writes.some((w) => w.table === 'charges' && w.method === 'PATCH' && w.body[0]?.status === 'pago')).toBe(true)
  })

  test('disparos personaliza o nome e filtra por etiqueta', async ({ page }) => {
    await mockBackend(page, { seed: { contacts } })
    await page.goto('/disparos')
    await expect(page.getByRole('link', { name: 'Enviar para Maria Silva' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Enviar para João Souza' })).toBeVisible()
    await page.getByLabel('Para quem enviar').selectOption('VIP')
    await expect(page.getByRole('link', { name: 'Enviar para João Souza' })).toHaveCount(0)
    await page.getByLabel('Mensagem').fill('Oi {nome}, novidade!')
    const href = await page.getByRole('link', { name: 'Enviar para Maria Silva' }).getAttribute('href')
    expect(decodeURIComponent(href ?? '')).toContain('Oi Maria, novidade!')
  })

  test('página pública de captação envia nome e WhatsApp para o banco', async ({ page }) => {
    let payload: Record<string, unknown> | undefined
    await page.route('**/rest/v1/rpc/capture_page_info', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '"Salão Teste"' }))
    await page.route('**/rest/v1/rpc/capture_lead', (r) => { payload = JSON.parse(r.request().postData() ?? '{}'); return r.fulfill({ status: 200, contentType: 'application/json', body: 'true' }) })
    await page.goto('/c/11111111-1111-1111-1111-111111111111')
    await dismissCookies(page)
    await expect(page.getByRole('heading', { name: /Fale com a Salão Teste/ })).toBeVisible()
    await page.getByLabel('Seu nome').fill('Visitante Novo')
    await page.getByLabel('WhatsApp com DDD').fill('(11) 97777-6666')
    await page.getByRole('button', { name: 'Quero ser atendido' }).click()
    await expect(page.getByText('Recebemos seu contato!')).toBeVisible()
    expect(payload).toMatchObject({ p_tenant: '11111111-1111-1111-1111-111111111111', p_name: 'Visitante Novo', p_source: 'link-na-bio' })
  })

  test('Captação mostra o link público da empresa', async ({ page }) => {
    await mockBackend(page, { seed: { contacts } })
    await page.goto('/captacao')
    await expect(page.getByText('Seu link de captação (link na bio)')).toBeVisible()
    await expect(page.getByText(/\/c\/t-1$/)).toBeVisible()
  })
})
