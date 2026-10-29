import { expect, test } from '@playwright/test'
import { iso, mockBackend } from './backend'

const contacts = [{ id: 'c-1', tenant_id: 't-1', name: 'Cliente Alfa', phone: '11999990001', tags: [], visits: 2, spent: 240, created_at: iso(5000), extra: {} }]
const conversations = [{ id: 'v-1', tenant_id: 't-1', contact_id: 'c-1', channel: 'whatsapp', status: 'nova', unread: 1, last_message: 'Oi', last_time: '09:10', ai_enabled: false, tags: [], created_at: iso(30), updated_at: iso(30), extra: {} }]
const ROUTES = ['/dashboard', '/inbox', '/agenda', '/kanban', '/funil', '/contatos', '/relatorios', '/captacao', '/ia', '/canais', '/equipe', '/config', '/perfil', '/assinar']

// Nenhuma tela pode "estourar" para os lados: a área principal não pode rolar na horizontal
// (isso corta título, empurra botões para fora e deixa a tela torta).
for (const [label, viewport] of [['PC 1366', { width: 1366, height: 800 }], ['PC 1100', { width: 1100, height: 800 }], ['celular 390', { width: 390, height: 800 }]] as const) {
  test.describe(`Sem rolagem horizontal · ${label}`, () => {
    test.use({ viewport })
    for (const route of ROUTES) {
      test(route, async ({ page }) => {
        await mockBackend(page, { seed: { contacts, conversations } })
        await page.goto(route)
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(500)
        const result = await page.evaluate(() => {
          const scrollers = [document.scrollingElement as HTMLElement, ...Array.from(document.querySelectorAll<HTMLElement>('main, div.h-full.overflow-y-auto'))]
          const bad: string[] = []
          for (const s of scrollers) {
            if (s && s.scrollWidth > s.clientWidth + 2) {
              // quem é mais largo que a área?
              const wide = Array.from(s.querySelectorAll<HTMLElement>('*'))
                .filter((e) => e.getBoundingClientRect().right > s.getBoundingClientRect().right + 2)
                .slice(0, 3)
                .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 70)}`)
              bad.push(`${s.tagName.toLowerCase()} rola ${s.scrollWidth - s.clientWidth}px na horizontal; largos: ${wide.join(' | ')}`)
            }
          }
          return bad
        })
        expect(result, `Estouro de largura em ${route}:\n${result.join('\n')}`).toEqual([])
      })
    }
  })
}
