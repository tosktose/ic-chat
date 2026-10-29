import { test } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fakeSession } from './helpers'

// Tira um print de cada tela (conta nova, banco vazio) para revisão visual: WALKTHROUGH=1 npm run test:e2e -- walkthrough
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../docs/qa')
const ROUTES = ['/dashboard', '/inbox', '/agenda', '/kanban', '/funil', '/contatos', '/relatorios', '/captacao', '/ia', '/canais', '/equipe', '/config', '/perfil']

test.describe('Revisão visual', () => {
  test.skip(!process.env.WALKTHROUGH, 'rode com WALKTHROUGH=1')
  test.use({ viewport: { width: 1366, height: 800 } })
  for (const route of ROUTES) {
    test(`print ${route}`, async ({ page }) => {
      mkdirSync(OUT, { recursive: true })
      await fakeSession(page, 'cliente-novo@exemplo.com')
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
