import { expect, test } from '@playwright/test'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dismissCookies } from './helpers'

const BUNDLE = resolve(dirname(fileURLToPath(import.meta.url)), '../out/web')

function allFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? allFiles(p) : [p]
  })
}

test.describe('Segurança', () => {
  test('o JavaScript publicado não contém segredos', async () => {
    test.skip(!existsSync(BUNDLE), 'build não encontrado (rode npm run build:web)')
    const forbidden: [string, RegExp][] = [
      ['chave service_role do Supabase', /service_role/],
      ['chave secreta nova do Supabase', /sb_secret_[A-Za-z0-9_-]{10,}/],
      ['chave da OpenAI/Anthropic', /sk-(ant-)?[A-Za-z0-9_-]{32,}/],
      ['chave do Resend', /\bre_[A-Za-z0-9]{20,}/],
      ['chave privada', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
      ['secret do Google', /GOCSPX-[A-Za-z0-9_-]{10,}/],
      ['token de acesso do GitHub', /gh[pousr]_[A-Za-z0-9]{30,}/]
    ]
    const problems: string[] = []
    for (const file of allFiles(BUNDLE).filter((f) => /\.(js|html|css|map)$/.test(f))) {
      const text = readFileSync(file, 'utf8')
      for (const [label, re] of forbidden) if (re.test(text)) problems.push(`${label} em ${file}`)
      // JWT cujo papel seja service_role (a chave "anon" é pública por desenho, a service_role nunca)
      for (const jwt of text.match(/eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/g) ?? []) {
        try {
          const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString())
          if (payload.role === 'service_role') problems.push(`JWT service_role em ${file}`)
        } catch { /* não era JWT */ }
      }
    }
    expect(problems, problems.join('\n')).toEqual([])
  })

  test('login do Google usa PKCE (nunca devolve token na URL)', async ({ page }) => {
    let authorizeUrl = ''
    await page.route('**/auth/v1/authorize*', (r) => {
      authorizeUrl = r.request().url()
      return r.abort()
    })
    await page.goto('/login')
    await dismissCookies(page)
    await page.getByRole('button', { name: /Continuar com Google/ }).click()
    await expect.poll(() => authorizeUrl).not.toBe('')
    expect(authorizeUrl).toContain('code_challenge=')
    expect(authorizeUrl).toContain('code_challenge_method=s256')
  })

  test('cabeçalhos de segurança estão ativos (somente no site publicado)', async ({ request, baseURL }) => {
    test.skip(!baseURL || /localhost|127\.0\.0\.1/.test(baseURL), 'cabeçalhos vêm da Vercel')
    const h = (await request.get('/')).headers()
    expect(h['content-security-policy']).toContain("frame-ancestors 'none'")
    expect(h['content-security-policy']).toContain("object-src 'none'")
    expect(h['strict-transport-security']).toMatch(/max-age=\d{7,}/)
    expect(h['x-content-type-options']).toBe('nosniff')
    expect(h['x-frame-options']).toBe('DENY')
    expect(h['referrer-policy']).toBeTruthy()
    expect(h['permissions-policy']).toContain('camera=()')
  })

  test('a CSP não bloqueia nada nas páginas principais (somente publicado)', async ({ page, baseURL }) => {
    test.skip(!baseURL || /localhost|127\.0\.0\.1/.test(baseURL), 'CSP vem da Vercel')
    const violations: string[] = []
    page.on('console', (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text()) })
    for (const p of ['/', '/login', '/cadastro', '/privacidade', '/pagina-inexistente']) {
      await page.goto(p)
      await page.waitForLoadState('networkidle')
    }
    expect(violations, violations.join('\n')).toEqual([])
  })
})
