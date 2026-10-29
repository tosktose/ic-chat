import { expect, test } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SEO_PAGES, KEYWORD_PAGES } from '../src/renderer/src/seo/pages'
import { trackPageErrors } from './helpers'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../out/web')
const built = existsSync(resolve(OUT, 'index.html'))
const fileOf = (path: string) => resolve(OUT, path === '/' ? 'index.html' : `${path.slice(1)}.html`)
const pick = (html: string, re: RegExp) => re.exec(html)?.[1] ?? ''

test.describe('SEO · HTML pré-gerado (o que o Google lê sem JavaScript)', () => {
  test.skip(!built, 'rode npm run build:web antes')

  for (const page of SEO_PAGES) {
    test(`${page.path}: título, descrição, canonical, h1 e dados estruturados`, () => {
      const html = readFileSync(fileOf(page.path), 'utf8')
      const title = pick(html, /<title>([^<]*)<\/title>/)
      const desc = pick(html, /<meta name="description" content="([^"]*)"/)
      expect(title).toBe(page.title.replace(/&/g, '&amp;'))
      expect(title.length, 'título deve ter até 65 caracteres').toBeLessThanOrEqual(65)
      expect(desc.length, 'descrição entre 60 e 160 caracteres').toBeGreaterThanOrEqual(page.index ? 60 : 20)
      expect(desc.length).toBeLessThanOrEqual(160)
      expect(html).not.toContain('%SITE_URL%')
      expect(pick(html, /<h1>([^<]*)<\/h1>/)).toBe(page.h1)
      expect(pick(html, /<link rel="canonical" href="([^"]*)"/)).toMatch(new RegExp(`^https://[^/]+${page.path === '/' ? '/' : page.path}$`))
      expect(pick(html, /<meta name="robots" content="([^"]*)"/)).toContain(page.index ? 'index, follow' : 'noindex')
      const ld = pick(html, /application\/ld\+json">([\s\S]*?)<\/script>/)
      expect(() => JSON.parse(ld)).not.toThrow()
      expect(JSON.parse(ld)['@graph'].length).toBeGreaterThan(0)
      if (page.faq.length) expect(JSON.parse(ld)['@graph'].some((n: { '@type': string }) => n['@type'] === 'FAQPage')).toBe(true)
    })
  }

  test('títulos e descrições das páginas indexáveis são únicos (sem conteúdo duplicado)', () => {
    const idx = SEO_PAGES.filter((p) => p.index)
    expect(new Set(idx.map((p) => p.title)).size).toBe(idx.length)
    expect(new Set(idx.map((p) => p.description)).size).toBe(idx.length)
  })

  test('as palavras-chave principais estão no título/h1/texto da home', () => {
    const html = readFileSync(fileOf('/'), 'utf8').toLowerCase()
    for (const kw of ['chatbot', 'whatsapp', 'ia', 'crm', 'atendimento', 'funil de vendas', 'agenda']) expect(html, kw).toContain(kw)
  })

  test('páginas por palavra-chave têm texto próprio suficiente', () => {
    for (const p of KEYWORD_PAGES) {
      const words = [p.lead, ...p.sections.flatMap((s) => [s.p ?? '', ...(s.items ?? [])]), ...p.faq.flatMap((f) => [f.q, f.a])].join(' ').split(/\s+/).length
      expect(words, `${p.path} deveria ter texto de verdade`).toBeGreaterThan(170)
    }
  })

  test('sitemap.xml lista todas as páginas indexáveis e nenhuma privada', () => {
    const xml = readFileSync(resolve(OUT, 'sitemap.xml'), 'utf8')
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    expect(locs.length).toBe(SEO_PAGES.filter((p) => p.index).length)
    for (const p of SEO_PAGES.filter((x) => x.index)) expect(locs.some((l) => l.endsWith(p.path === '/' ? '.br/' : p.path) || l.endsWith(p.path))).toBe(true)
    for (const bad of ['/login', '/dashboard', '/admin', '/assinar', '/404']) expect(xml).not.toContain(bad)
    for (const l of locs) expect(l).toMatch(/^https:\/\/[^/]+(\/|\/[a-z-]+)$/)
  })

  test('robots.txt aponta o sitemap e não bloqueia as páginas públicas', () => {
    const txt = readFileSync(resolve(OUT, 'robots.txt'), 'utf8')
    expect(txt).toMatch(/^Sitemap: https:\/\/[^\s]+\/sitemap\.xml$/m)
    for (const p of SEO_PAGES.filter((x) => x.index)) expect(txt).not.toMatch(new RegExp(`^Disallow: ${p.path}$`, 'm'))
  })

  test('404.html pede noindex e não tem canonical', () => {
    const html = readFileSync(resolve(OUT, '404.html'), 'utf8')
    expect(html).toContain('noindex')
    expect(html).not.toContain('rel="canonical"')
    expect(html).toContain('Página não encontrada')
  })
})

test.describe('SEO · páginas por palavra-chave no navegador', () => {
  for (const p of KEYWORD_PAGES) {
    test(`${p.path} abre, tem h1, links internos e botão de teste grátis`, async ({ page }) => {
      const errs = trackPageErrors(page)
      await page.goto(p.path)
      await expect(page).toHaveTitle(p.title)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(p.h1)
      await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', new RegExp(`${p.path}$`))
      await expect(page.getByRole('link', { name: /Teste grátis por 7 dias/ }).first()).toHaveAttribute('href', '/cadastro')
      await expect(page.getByRole('navigation', { name: 'Veja também' }).getByRole('link')).toHaveCount(KEYWORD_PAGES.length - 1 + 1)
      await expect(page.getByRole('heading', { name: 'Perguntas frequentes' })).toBeVisible()
      errs.expectNone()
    })
  }

  test('home liga para as três páginas de palavra-chave', async ({ page }) => {
    await page.goto('/')
    for (const p of KEYWORD_PAGES) await expect(page.locator(`footer a[href="${p.path}"]`)).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('não perca nenhuma venda')
  })
})

test.describe('SEO · site publicado', () => {
  test('endereço inexistente responde 404 de verdade (não "soft 404")', async ({ request, baseURL }) => {
    test.skip(!baseURL || /localhost|127\.0\.0\.1/.test(baseURL), 'só no site publicado')
    const res = await request.get('/isso-nao-existe-123')
    expect(res.status()).toBe(404)
    expect(await res.text()).toContain('noindex')
  })

  test('páginas públicas respondem 200 e áreas do app continuam abrindo', async ({ request, baseURL }) => {
    test.skip(!baseURL || /localhost|127\.0\.0\.1/.test(baseURL), 'só no site publicado')
    for (const p of ['/', '/login', '/cadastro', '/privacidade', '/termos', '/chatbot-whatsapp-ia', '/crm-whatsapp', '/automatizar-atendimento', '/dashboard', '/admin/licencas', '/assinar/retorno', '/redefinir-senha']) {
      expect((await request.get(p)).status(), p).toBe(200)
    }
  })
})
