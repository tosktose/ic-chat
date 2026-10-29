// Roda só a interface no navegador (para desenhar/testar o layout sem abrir o Electron).
import { resolve } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Páginas públicas que o Google deve indexar (o app logado fica de fora).
const publicRoutes = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/cadastro', priority: '0.8', changefreq: 'monthly' },
  { path: '/login', priority: '0.5', changefreq: 'monthly' },
  { path: '/privacidade', priority: '0.3', changefreq: 'yearly' },
  { path: '/termos', priority: '0.3', changefreq: 'yearly' }
]

/** Gera sitemap.xml, robots.txt e injeta a URL canônica do site no HTML. */
function seoFiles(siteUrl: string): Plugin {
  const base = siteUrl.replace(/\/$/, '')
  return {
    name: 'icchat-seo',
    transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', base),
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10)
      const urls = publicRoutes
        .map((r) => `  <url>\n    <loc>${base}${r.path === '/' ? '/' : r.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`)
        .join('\n')
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n` })
      const disallow = ['/dashboard', '/inbox', '/kanban', '/funil', '/captacao', '/ia', '/canais', '/relatorios', '/equipe', '/config', '/agenda', '/contatos', '/perfil', '/meu-painel', '/admin']
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n${disallow.map((p) => `Disallow: ${p}`).join('\n')}\n\nSitemap: ${base}/sitemap.xml\n` })
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname), '')
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL
  const siteUrl = env.VITE_SITE_URL || (vercelHost ? `https://${vercelHost}` : 'https://icchat.com.br')
  return {
    root: resolve(__dirname, 'src/renderer'),
    envDir: resolve(__dirname),
    resolve: { alias: { '@': resolve(__dirname, 'src/renderer/src') } },
    plugins: [react(), tailwindcss(), seoFiles(siteUrl)],
    server: { port: 5173, strictPort: true },
    build: { outDir: resolve(__dirname, 'out/web'), emptyOutDir: true }
  }
})
