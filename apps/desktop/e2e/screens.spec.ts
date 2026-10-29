import { expect, test } from '@playwright/test'
import { iso, mockBackend } from './backend'
import { trackPageErrors } from './helpers'

const contacts = [{ id: 'c-1', tenant_id: 't-1', name: 'Cliente Alfa', phone: '11999990001', tags: [], visits: 2, spent: 240, created_at: iso(5000), extra: {} }]
const conversations = [{ id: 'v-1', tenant_id: 't-1', contact_id: 'c-1', channel: 'whatsapp', status: 'nova', unread: 1, last_message: 'Oi', last_time: '09:10', ai_enabled: false, tags: [], created_at: iso(30), updated_at: iso(30), extra: {} }]

test.describe('Funil de vendas', () => {
  test('filtro de responsável usa a equipe real (nada de Juliana/Marcos)', async ({ page }) => {
    await mockBackend(page, { seed: { contacts, conversations } })
    await page.goto('/funil')
    await expect(page.getByRole('heading', { name: 'Funil de vendas' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Juliana' })).toHaveCount(0)
    await expect(page.getByRole('tab', { name: 'Marcos' })).toHaveCount(0)
    await expect(page.getByRole('tab', { name: 'Cliente' })).toBeVisible() // dono real (display_name "Cliente Novo")
  })

  test('criar negócio grava no banco com o usuário logado como responsável', async ({ page }) => {
    const errs = trackPageErrors(page)
    const { writes } = await mockBackend(page, { seed: { contacts, conversations } })
    await page.goto('/funil')
    await page.getByRole('button', { name: 'Novo negócio' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByText('Contato', { exact: true }).locator('..').locator('select').selectOption({ label: 'Cliente Alfa · 11999990001' })
    await dialog.getByPlaceholder('Ex.: Plano mensal de serviços').fill('Pacote de teste')
    await dialog.getByPlaceholder('0,00').fill('1500')
    await expect(dialog.getByText('Responsável', { exact: true }).locator('..').locator('select')).toHaveValue('u-1') // quem está logado
    await dialog.getByRole('button', { name: 'Salvar negócio' }).click()
    await expect.poll(() => writes.some((w) => w.table === 'deals' && w.body.some((r) => r.title === 'Pacote de teste'))).toBe(true)
    const deal = writes.find((w) => w.table === 'deals')!.body[0]
    expect(Number(deal.amount)).toBe(1500)
    errs.expectNone()
  })
})

test.describe('Agenda', () => {
  test('sem profissionais, orienta a cadastrar (não mostra grade vazia)', async ({ page }) => {
    await mockBackend(page)
    await page.goto('/agenda')
    const day = new Date().getDay()
    if (day >= 1 && day <= 5) {
      await expect(page.getByText('Cadastre quem atende')).toBeVisible()
      await page.getByRole('button', { name: 'Cadastrar profissional' }).click()
      await expect(page).toHaveURL(/config\?tab=profissionais/)
    }
  })

  test('dias passados não mostram agendamentos inventados nem Google conectado de mentira', async ({ page }) => {
    await mockBackend(page)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Dia anterior' }).click()
    await page.waitForTimeout(400)
    await expect(page.getByText(/^0 agendamentos/)).toBeVisible()
    const body = await page.locator('body').innerText()
    for (const fake of ['ana.souza@gmail.com', 'bruno.lima@gmail.com', 'carla.mendes@gmail.com']) expect(body).not.toContain(fake)
  })
})

test.describe('Comentário vira conversa (Captação)', () => {
  test('começa sem regras, sem capturas e sem números inventados', async ({ page }) => {
    await mockBackend(page)
    await page.goto('/captacao')
    await expect(page.getByText('Nenhuma captura ainda')).toBeVisible()
    const body = await page.locator('body').innerText()
    for (const fake of ['marianalv', 'ju.andrade', 'carol_dias', 'Antes e depois da escova', '211']) expect(body).not.toContain(fake)
    await expect(page.getByRole('button', { name: 'Nova regra' })).toBeDisabled()
  })
})

test.describe('Assistente IA', () => {
  test('começa com configuração genérica (não é mais a "Bella" do salão)', async ({ page }) => {
    await mockBackend(page)
    await page.goto('/ia')
    await expect(page.getByText('Nome do assistente', { exact: true }).locator('..').locator('input')).toHaveValue('Assistente')
    await expect(page.getByText('Bella')).toHaveCount(0)
  })
})

test.describe('Canais', () => {
  test('WhatsApp por QR não aparece "conectado" de mentira na versão web', async ({ page }) => {
    await mockBackend(page)
    await page.goto('/canais')
    await expect(page.getByText('Disponível no aplicativo para Windows')).toBeVisible()
    await expect(page.getByText('última mensagem há 1 min')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Em breve nesta versão/ })).toBeDisabled()
  })
})

test.describe('Perfil', () => {
  test('mostra o e-mail real da conta (sem domínio inventado)', async ({ page }) => {
    await mockBackend(page, { email: 'maria@minhaempresa.com.br' })
    await page.goto('/perfil')
    await expect(page.getByText('E-mail de login').locator('..').locator('input')).toHaveValue('maria@minhaempresa.com.br')
    await expect(page.getByText('studiobella')).toHaveCount(0)
  })

  test('alterar senha tem olho de mostrar/ocultar nos três campos', async ({ page }) => {
    await mockBackend(page)
    await page.goto('/perfil')
    await page.getByRole('tab', { name: 'Segurança' }).click()
    await expect(page.getByRole('button', { name: 'Mostrar senha' })).toHaveCount(3)
  })
})

test.describe('Agenda: criar agendamento de ponta a ponta', () => {
  test('com profissional e serviço cadastrados, o agendamento é criado e gravado no banco', async ({ page }) => {
    const errs = trackPageErrors(page)
    const hours = Array.from({ length: 7 }, () => ({ open: true, start: '08:00', end: '20:00' })) // aberto todos os dias
    const settings = [{
      tenant_id: 't-1',
      data: {
        info: { name: 'Empresa Teste', segment: 'outro', document: '', phone: '', email: '', address: '', instagram: '', hours },
        professionals: [{ id: 'p-1', name: 'Dra. Ana Teste', specialty: 'Geral', color: 'bg-blue-100', dot: 'bg-blue-500', colorKey: 'blue', serviceIds: [], active: true, commission: 0 }],
        services: [{ id: 's-1', name: 'Consulta de teste', minutes: 30, price: 120 }],
        quickReplies: []
      }
    }]
    const { writes } = await mockBackend(page, { seed: { contacts, conversations, company_settings: settings } })
    await page.goto('/agenda')
    await expect(page.getByText('Dra. Ana Teste').first()).toBeVisible()
    await page.getByRole('button', { name: /Novo agendamento/ }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Cliente', { exact: true }).locator('..').locator('select')).toHaveValue('c-1') // único contato já vem escolhido
    // escolhe o primeiro horário livre oferecido (o app não deixa marcar no passado)
    await dialog.getByText('Horários livres').locator('..').getByRole('button').first().click()
    await dialog.getByRole('button', { name: /Agendar|Salvar|Confirmar/ }).last().click()
    await expect.poll(() => writes.some((w) => w.table === 'appointments' && w.body.some((r) => r.service_name === 'Consulta de teste'))).toBe(true)
    const appt = writes.find((w) => w.table === 'appointments')!.body[0]
    expect(Number(appt.amount)).toBe(120)
    expect(String(appt.starts_at)).toContain('T') // data e hora gravadas
    await expect(page.getByText('Consulta de teste').first()).toBeVisible()
    errs.expectNone()
  })
})
