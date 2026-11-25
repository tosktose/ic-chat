import { expect, test, type Page } from '@playwright/test'
import { iso, mockBackend } from './backend'
import { dismissCookies, trackPageErrors } from './helpers'

const contacts = [
  { id: 'c-1', tenant_id: 't-1', name: 'Maria Silva', phone: '11999990001', tags: [], visits: 0, spent: 0, created_at: iso(90_000), extra: {} },
  { id: 'c-2', tenant_id: 't-1', name: 'João Souza', phone: '11999990002', tags: [], visits: 0, spent: 0, created_at: iso(90_000), extra: {} }
]
const H = 3_600_000
const appt = (id: string, contact: string, startsInMs: number, status = 'agendado', extra: Record<string, unknown> = {}) => ({
  id, tenant_id: 't-1', contact_id: contact, professional_id: null, service_name: 'Corte', status, origin: 'manual', amount: 80,
  starts_at: new Date(Date.now() + startsInMs).toISOString(), ends_at: new Date(Date.now() + startsInMs + H).toISOString(),
  extra: { professionalId: 'p-1', ...extra }
})
const settings = (automations: Record<string, unknown> = {}) => [{
  tenant_id: 't-1',
  data: {
    info: { name: 'Salão Teste', hours: Array.from({ length: 7 }, () => ({ open: true, start: '00:00', end: '23:59' })) },
    professionals: [{ id: 'p-1', name: 'Ana', specialty: '', colorKey: 'blue', color: '', dot: 'bg-blue-500', serviceIds: [], active: true }],
    services: [{ id: 's-1', name: 'Corte', minutes: 60, price: 80, deposit: 20 }],
    automations
  }
}]

const noHorizontalScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)

test.describe('Automações: lembretes, PIX, retorno e agendamento online', () => {
  test('configura a chave PIX e liga o agendamento online, e grava no banco', async ({ page }) => {
    const errs = trackPageErrors(page)
    const { writes } = await mockBackend(page, { seed: { contacts, company_settings: settings() } })
    await page.goto('/config?tab=automacoes')
    await page.getByPlaceholder('ex.: 12.345.678/0001-90').fill('11.222.333/0001-81')
    await expect(page.getByText('Chave reconhecida: CNPJ')).toBeVisible()
    await page.getByPlaceholder('ex.: 12.345.678/0001-90').fill('123')
    await expect(page.getByText(/Chave inválida/)).toBeVisible()
    await page.getByPlaceholder('ex.: 12.345.678/0001-90').fill('11.222.333/0001-81')
    await page.getByRole('switch', { name: 'Página de agendamento ligada' }).click()
    await expect(page.getByTestId('booking-url')).toHaveText(/\/agendar\/t-1$/)
    await expect
      .poll(() => writes.some((w) => w.table === 'company_settings' && (w.body[0]?.data as { automations?: { pix?: { key?: string }; booking?: { enabled?: boolean } } })?.automations?.booking?.enabled === true
        && (w.body[0]?.data as { automations: { pix: { key: string } } }).automations.pix.key === '11.222.333/0001-81'), { timeout: 5000 })
      .toBe(true)
    errs.expectNone()
  })

  test('lembrete pendente abre o WhatsApp com a mensagem e fica marcado como enviado', async ({ page, context }) => {
    const errs = trackPageErrors(page)
    const { writes } = await mockBackend(page, { seed: { contacts, company_settings: settings(), appointments: [appt('a-1', 'c-1', 5 * H), appt('a-2', 'c-2', 50 * H)] } })
    await page.goto('/lembretes')
    const due = page.getByTestId('due-list')
    await expect(due.getByText('Maria Silva')).toBeVisible()
    await expect(due.getByText('João Souza')).toHaveCount(0)
    await expect(due.getByText('Lembrete 24h')).toBeVisible()
    await context.route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>WhatsApp</p>' }))
    const popup = context.waitForEvent('page')
    await due.getByRole('button', { name: 'Enviar' }).click()
    const wa = await popup
    await wa.waitForLoadState()
    const url = decodeURIComponent(wa.url())
    expect(url).toContain('5511999990001')
    expect(url).toMatch(/Olá, Maria!.*Corte.*Responda \*1\* para confirmar/s)
    await wa.close()
    await expect.poll(() => writes.some((w) => w.table === 'appointments' && w.body[0]?.id === 'a-1' && Boolean((w.body[0]?.extra as { reminders?: { '24h'?: number } })?.reminders?.['24h']))).toBe(true)
    await expect(page.getByText('Nenhum lembrete pendente agora')).toBeVisible()
    errs.expectNone()
  })

  test('cliente atendido há 8 dias aparece em "Clientes de volta" e sai depois do envio', async ({ page }) => {
    const errs = trackPageErrors(page)
    const { writes } = await mockBackend(page, { seed: { contacts, company_settings: settings(), appointments: [appt('a-3', 'c-2', -8 * 24 * H, 'concluido')] } })
    await page.goto('/retorno')
    const list = page.getByTestId('winback-followups')
    await expect(list.getByText('João Souza')).toBeVisible()
    await expect(list.getByText(/Como ficou o seu Corte\?/)).toBeVisible()
    await list.getByRole('button', { name: 'Marcar João Souza como enviado' }).click()
    await expect(page.getByText('Ninguém para chamar hoje')).toBeVisible()
    await expect.poll(() => writes.some((w) => w.table === 'contacts' && w.body[0]?.id === 'c-2' && Boolean((w.body[0]?.extra as { followups?: Record<string, number> })?.followups?.['7']))).toBe(true)
    errs.expectNone()
  })

  test('painel mostra o resumo da semana com 3 sugestões', async ({ page }) => {
    const errs = trackPageErrors(page)
    await mockBackend(page, { seed: { contacts, company_settings: settings(), appointments: [appt('a-4', 'c-1', -3 * 24 * H, 'concluido'), appt('a-5', 'c-2', -2 * 24 * H, 'faltou')] } })
    await page.goto('/dashboard')
    const card = page.getByTestId('weekly-summary')
    await expect(card.getByText('Resumo da semana')).toBeVisible()
    await expect(card.locator('ol > li')).toHaveCount(3)
    await expect(card.getByText(/de faltas na semana/)).toBeVisible()
    errs.expectNone()
  })

  test('sinal por PIX: gera o copia e cola válido a partir da agenda', async ({ page }) => {
    const errs = trackPageErrors(page)
    await mockBackend(page, {
      seed: { contacts, company_settings: settings({ pix: { key: '11.222.333/0001-81', name: 'Salao Teste', city: 'Sao Paulo' } }), appointments: [appt('a-6', 'c-1', 26 * H)] }
    })
    const d = new Date(Date.now() + 26 * H)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/agenda?d=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    await page.getByRole('button', { name: /Maria Silva/ }).first().click()
    await page.getByRole('button', { name: 'Cobrar sinal' }).click()
    const code = await page.getByTestId('pix-code').textContent()
    expect(code).toMatch(/^000201.*br\.gov\.bcb\.pix.*11222333000181.*540520\.00.*6304[0-9A-F]{4}$/)
    errs.expectNone()
  })
})

test.describe('Página pública de agendamento', () => {
  const tenant = '11111111-1111-1111-1111-111111111111'
  const info = {
    name: 'Salão Teste', address: 'Rua A, 10', note: 'Tolerância de 10 minutos.', daysAhead: 14,
    hours: Array.from({ length: 7 }, () => ({ open: true, start: '08:00', end: '20:00' })),
    services: [{ id: 's-1', name: 'Corte', minutes: 60, price: 80, deposit: 20 }],
    professionals: [{ id: 'p-1', name: 'Ana', specialty: 'Cabelo', serviceIds: [] }, { id: 'p-2', name: 'Bia', specialty: '', serviceIds: [] }]
  }

  test('cliente escolhe serviço, profissional, dia e horário e confirma', async ({ page }) => {
    const errs = trackPageErrors(page)
    let payload: Record<string, unknown> | undefined
    let tries = 0
    await page.route('**/rest/v1/rpc/booking_page_info', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(info) }))
    await page.route('**/rest/v1/rpc/booking_busy', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.route('**/rest/v1/rpc/book_appointment', (r) => {
      tries++
      payload = JSON.parse(r.request().postData() ?? '{}')
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tries === 1 ? { ok: false, error: 'ocupado' } : { ok: true, id: 'x', deposit: 20 }) })
    })
    await page.goto(`/agendar/${tenant}`)
    await dismissCookies(page)
    await expect(page.getByRole('heading', { name: 'Salão Teste' })).toBeVisible()
    await page.getByRole('button', { name: /Corte/ }).click()
    await page.getByRole('button', { name: /Ana/ }).click()
    await page.getByRole('option').nth(1).click()
    await page.getByLabel('Horários').getByRole('button').first().click()
    await page.getByLabel('Seu nome').fill('Cliente Online')
    await page.getByLabel('WhatsApp com DDD').fill('(11) 98888-7777')
    await page.getByRole('button', { name: 'Confirmar horário' }).click()
    // Primeira tentativa: alguém marcou antes, a página avisa e volta para os horários
    await expect(page.getByRole('alert')).toHaveText(/Alguém acabou de marcar/)
    await page.getByLabel('Horários').getByRole('button').nth(1).click()
    await page.getByRole('button', { name: 'Confirmar horário' }).click()
    await expect(page.getByTestId('booking-done')).toBeVisible()
    await expect(page.getByText(/sinal de R\$\s?20,00/)).toBeVisible()
    expect(payload).toMatchObject({ p_tenant: tenant, p_service_id: 's-1', p_professional_id: 'p-1', p_name: 'Cliente Online' })
    expect(String(payload?.p_start)).toMatch(/^\d{2}:\d{2}$/)
    errs.expectNone()
  })

  test('link desligado mostra aviso e celular não tem rolagem lateral', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.route('**/rest/v1/rpc/booking_page_info', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }))
    await page.goto(`/agendar/${tenant}`)
    await expect(page.getByText('Agendamento indisponível')).toBeVisible()
    await noHorizontalScroll(page)
  })
})

test.describe('Landing: novidades e prós e contras dos planos', () => {
  test('mostra as novidades e o quadro "Para quem é" de cada plano', async ({ page }) => {
    const errs = trackPageErrors(page)
    await page.goto('/')
    await dismissCookies(page)
    await expect(page.getByRole('heading', { name: 'Menos faltas, mais clientes voltando.' })).toBeVisible()
    await expect(page.getByText('Sinal por PIX, sem taxa')).toBeVisible()
    for (const id of ['start', 'pro', 'business']) {
      const fit = page.getByTestId(`plan-fit-${id}`)
      await fit.scrollIntoViewIfNeeded()
      await expect(fit.getByText('Prós')).toBeVisible()
      await expect(fit.getByText('Contras')).toBeVisible()
    }
    for (const w of [390, 768, 1366]) {
      await page.setViewportSize({ width: w, height: 900 })
      await noHorizontalScroll(page)
    }
    errs.expectNone()
  })
})

test.describe('Layout das telas novas', () => {
  for (const width of [390, 768, 1100, 1366]) {
    test(`lembretes, retorno e automações cabem em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await mockBackend(page, { seed: { contacts, company_settings: settings(), appointments: [appt('a-1', 'c-1', 5 * H), appt('a-3', 'c-2', -8 * 24 * H, 'concluido')] } })
      for (const path of ['/lembretes', '/retorno', '/config?tab=automacoes']) {
        await page.goto(path)
        await expect(page.locator('main')).toBeVisible()
        await page.waitForTimeout(300)
        await noHorizontalScroll(page)
      }
    })
  }
})
