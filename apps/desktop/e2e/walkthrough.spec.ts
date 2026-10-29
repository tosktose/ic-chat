import { test } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { iso, mockBackend } from './backend'
import { fakeSession } from './helpers'

const contacts = [
  { id: 'c-1', tenant_id: 't-1', name: 'Cliente Alfa', phone: '11999990001', tags: [], visits: 2, spent: 240, created_at: iso(5000), extra: {} },
  { id: 'c-2', tenant_id: 't-1', name: 'Cliente Beta', phone: '11999990002', tags: [], visits: 0, spent: 0, created_at: iso(400), extra: {} }
]
const conversations = [
  { id: 'v-1', tenant_id: 't-1', contact_id: 'c-1', channel: 'whatsapp', status: 'nova', unread: 1, last_message: 'Oi, quero um orçamento', last_time: '09:10', ai_enabled: false, tags: [], created_at: iso(30), updated_at: iso(30), extra: {} }
]

// Tira um print de cada tela (conta nova, banco vazio) para revisão visual: WALKTHROUGH=1 npm run test:e2e -- walkthrough
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../docs/qa')
const ROUTES = ['/dashboard', '/inbox', '/agenda', '/kanban', '/funil', '/contatos', '/relatorios', '/captacao', '/ia', '/canais', '/equipe', '/config', '/perfil']

test.describe('Revisão visual', () => {
  test.skip(!process.env.WALKTHROUGH, 'rode com WALKTHROUGH=1')
  test.use({ viewport: { width: 1366, height: 800 } })
  for (const route of ROUTES) {
    test(`print ${route}`, async ({ page }) => {
      mkdirSync(OUT, { recursive: true })
      await mockBackend(page, { seed: { contacts, conversations } })
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(800)
      await page.screenshot({ path: resolve(OUT, `gerente${route.replace(/\//g, '-')}.png`) })
    })
  }
  test('print /admin (super admin)', async ({ page }) => {
    mkdirSync(OUT, { recursive: true })
    await fakeSession(page, 'superadmin@itacondo.com.br')
    for (const route of ['/admin', '/admin/licencas', '/admin/usuarios']) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(800)
      await page.screenshot({ path: resolve(OUT, `superadmin${route.replace(/\//g, '-')}.png`) })
    }
  })
})
