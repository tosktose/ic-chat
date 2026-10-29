import { expect, test } from '@playwright/test'
import { trackPageErrors } from './helpers'

test.describe('SEO e indexação', () => {
  test('sitemap.xml é XML e lista as páginas públicas', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toMatch(/xml/)
    const xml = await res.text()
    expect(xml).toContain('<urlset')
    for (const p of ['/cadastro', '/privacidade', '/termos']) expect(xml).toContain(p)
    // Áreas logadas nunca entram no sitemap
    for (const p of ['/dashboard', '/inbox', '/admin']) expect(xml).not.toContain(p)
  })

  test('robots.txt aponta o sitemap e bloqueia o app logado', async ({ request }) => {
    const res = await request.get('/robots.txt')
    expect(res.status()).toBe(200)
    const txt = await res.text()
    expect(txt).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/)
    expect(txt).toContain('Disallow: /dashboard')
  })

  test('home tem description, canonical, Open Graph e dados estruturados', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('meta[name=description]')).toHaveAttribute('content', /.{50,}/)
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /^https?:\/\/[^%]+\/$/)
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /og-image\.png$/)
    const ld = await page.locator('script[type="application/ld+json"]').textContent()
    expect(() => JSON.parse(ld ?? '')).not.toThrow()
    expect(ld).not.toContain('%SITE_URL%')
  })

  test('imagem de compartilhamento existe', async ({ request }) => {
    expect((await request.get('/og-image.png')).status()).toBe(200)
  })

  test('URL inexistente mostra a 404 e pede noindex', async ({ page }) => {
    const errs = trackPageErrors(page)
    await page.goto('/pagina-que-nao-existe-123')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('se perdeu no caminho')
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/)
    await page.getByRole('button', { name: 'Somente necessários' }).click()
    await page.getByRole('link', { name: 'Voltar ao início' }).click()
    await expect(page).toHaveURL(/\/$/)
    errs.expectNone()
  })

  test('login não é indexado, cadastro é', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/)
    await page.goto('/cadastro')
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /^index/)
  })
})
