import { expect, test } from '@playwright/test'
import { fakeSession, trackPageErrors } from './helpers'

// Nomes e textos que só existem nos dados de demonstração (src/renderer/src/data/*).
// Quem entra com a própria conta NUNCA pode ver nenhum deles.
const MOCK_MARKERS = [
  'Amanda Lopes', 'Ana Souza', 'Beatriz Oliveira', 'Bruna Teixeira', 'Bruno Lima', 'Camila Rodrigues', 'Carla Glamour', 'Carla Mendes',
  'Diego Rocha', 'Dra. Helena Castro', 'Fernanda Costa', 'Gabriel Souza', 'José Carlos', 'João Pedro Santos', 'Juliana Ferreira',
  'Juliana Prado', 'Larissa Gomes', 'Lucas Martins', 'Luís Ferreira', 'Marcos Vieira', 'Maria Silva', 'Patrícia Nunes', 'Pedro Henrique',
  'Rafael Almeida', 'Renata Alves', 'Rodrigo Mendes', 'Sônia Ribeiro', 'Studio Bella', 'Barbearia do Zé', 'Clínica Derma+',
  'Espaço Bem-Estar', 'Salão Glamour', 'Pet Shop Amigo Fiel', 'Nail Design Lu', 'Corte + barba', 'Retoque de raiz', 'RECEPCAO-01',
  'ICCH-7K2M', 'marianalv', 'ju.andrade', 'carol_dias', 'ana.souza@gmail.com', 'bruno.lima@gmail.com', 'studiobella', 'Antes e depois da escova'
]

// Telas do gerente (conta comum). /admin é testado à parte com o superadmin.
const ROUTES = ['/dashboard', '/inbox', '/agenda', '/kanban', '/funil', '/contatos', '/relatorios', '/captacao', '/ia', '/canais', '/equipe', '/config', '/perfil']

test.describe('Sem dados de demonstração na versão web', () => {
  for (const route of ROUTES) {
    test(`${route} começa vazia para uma conta nova`, async ({ page }) => {
      const errs = trackPageErrors(page)
      await fakeSession(page, 'cliente-novo@exemplo.com')
      await page.goto(route)
      await expect(page).toHaveURL(new RegExp(route.replace('/', '\\/')))
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(600)
      const text = await page.locator('body').innerText()
      const found = MOCK_MARKERS.filter((m) => text.includes(m))
      expect(found, `Dados fictícios em ${route}: ${found.join(', ')}`).toEqual([])
      errs.expectNone()
    })
  }

  test('sino de notificações não traz avisos inventados', async ({ page }) => {
    await fakeSession(page, 'cliente-novo@exemplo.com')
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /notifica/i }).first().click()
    const text = await page.locator('body').innerText()
    for (const fake of ['Nova conversa no WhatsApp', 'Automação', 'transferir conversa', 'Transferência']) {
      expect(text, `aviso fictício: ${fake}`).not.toContain(fake)
    }
  })

  test('super admin começa sem empresas inventadas', async ({ page }) => {
    await fakeSession(page, 'superadmin@itacondo.com.br')
    for (const route of ['/admin', '/admin/usuarios', '/admin/planos', '/admin/sistema', '/admin/creditos']) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)
      const text = await page.locator('body').innerText()
      const found = MOCK_MARKERS.filter((m) => text.includes(m))
      expect(found, `Dados fictícios em ${route}: ${found.join(', ')}`).toEqual([])
    }
  })
})
