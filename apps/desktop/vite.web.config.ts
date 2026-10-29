// Roda só a interface no navegador (para desenhar/testar o layout sem abrir o Electron).
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { DEFAULT_SITE_URL, KEYWORD_PAGES, SEO_PAGES, type SeoPage } from './src/renderer/src/seo/pages'

const outDir = resolve(__dirname, 'out/web')

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Dados estruturados (schema.org) que o Google usa para entender o site e montar resultados ricos. */
function jsonLd(page: SeoPage, base: string): string {
  const url = base + page.path
  const graph: Record<string, unknown>[] = []
  if (page.path === '/') {
    graph.push({ '@type': 'Organization', '@id': `${base}/#org`, name: 'ItaCondo', url: `${base}/`, logo: `${base}/favicon.png` })
    graph.push({ '@type': 'WebSite', '@id': `${base}/#site`, url: `${base}/`, name: 'IC Chat', inLanguage: 'pt-BR', publisher: { '@id': `${base}/#org` } })
    graph.push({
      '@type': 'SoftwareApplication', name: 'IC Chat', applicationCategory: 'BusinessApplication', operatingSystem: 'Web, Windows', inLanguage: 'pt-BR',
      description: page.description, url: `${base}/`, publisher: { '@id': `${base}/#org` },
      offers: { '@type': 'AggregateOffer', priceCurrency: 'BRL', lowPrice: '79', highPrice: '299', offerCount: '3' }
    })
  } else {
    graph.push({ '@type': 'WebPage', '@id': `${url}#page`, url, name: page.title, description: page.description, inLanguage: 'pt-BR', isPartOf: { '@id': `${base}/#site` } })
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'IC Chat', item: `${base}/` },
        { '@type': 'ListItem', position: 2, name: page.crumb ?? page.h1, item: url }
      ]
    })
  }
  if (page.faq.length) {
    graph.push({ '@type': 'FAQPage', mainEntity: page.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) })
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')
}

/** Texto real da página dentro do HTML: o Google e leitores sem JavaScript enxergam o conteúdo. O React troca por cima ao carregar. */
function bodyHtml(page: SeoPage, notFound = false): string {
  if (page.path === '/app') return ''
  const links = KEYWORD_PAGES.map((p) => `<a href="${p.path}">${esc(p.crumb ?? p.h1)}</a>`).join(' · ')
  if (notFound) {
    return `<div style="max-width:640px;margin:0 auto;padding:48px 20px;font-family:system-ui,sans-serif;color:#0f172a"><h1>Página não encontrada</h1><p>O endereço pode ter mudado ou nunca ter existido.</p><p><a href="/">Voltar ao início do IC Chat</a></p></div>`
  }
  const sections = page.sections
    .map((s) => `<section><h2>${esc(s.h2)}</h2>${s.p ? `<p>${esc(s.p)}</p>` : ''}${s.items ? `<ul>${s.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}</section>`)
    .join('')
  const faq = page.faq.length ? `<section><h2>Perguntas frequentes</h2>${page.faq.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}</section>` : ''
  return `<div class="seo-prerender" style="max-width:760px;margin:0 auto;padding:32px 20px;font-family:system-ui,sans-serif;line-height:1.6;color:#0f172a"><header><a href="/"><strong>IC Chat</strong></a> &middot; ${links} &middot; <a href="/cadastro">Teste grátis</a> &middot; <a href="/login">Entrar</a></header><main><h1>${esc(page.h1)}</h1><p>${esc(page.lead)}</p>${sections}${faq}<p><a href="/cadastro">Teste grátis por 7 dias</a></p></main><footer><a href="/privacidade">Política de Privacidade</a> &middot; <a href="/termos">Termos de Uso</a></footer></div>`
}

/** Troca título, descrição, canonical, redes sociais, dados estruturados e corpo de um HTML já construído. */
function renderPage(html: string, page: SeoPage, base: string, notFound = false): string {
  const url = base + (page.path === '/' ? '/' : page.path)
  const robots = page.index && !notFound ? 'index, follow, max-image-preview:large' : 'noindex, nofollow'
  const swap = (re: RegExp, to: string) => { html = html.replace(re, to) }
  swap(/<title>[\s\S]*?<\/title>/, `<title>${esc(page.title)}</title>`)
  swap(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(page.description)}" />`)
  swap(/<meta name="robots" content="[^"]*"\s*\/?>/, `<meta name="robots" content="${robots}" />`)
  swap(/<link rel="canonical" href="[^"]*"\s*\/?>/, notFound ? '' : `<link rel="canonical" href="${url}" />`)
  swap(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(page.title)}" />`)
  swap(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${esc(page.description)}" />`)
  swap(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${url}" />`)
  swap(/<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${esc(page.title)}" />`)
  swap(/<meta name="twitter:description" content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${esc(page.description)}" />`)
  swap(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, notFound ? '' : `<script type="application/ld+json">${jsonLd(page, base)}</script>`)
  swap(/<div id="root"><\/div>/, `<div id="root">${bodyHtml(page, notFound)}</div>`)
  return html
}

/** Gera sitemap.xml, robots.txt, o HTML pré-gerado de cada página pública e a 404.html. */
function seoFiles(siteUrl: string): Plugin {
  const base = siteUrl.replace(/\/$/, '')
  return {
    name: 'icchat-seo',
    transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', base),
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10)
      const urls = SEO_PAGES.filter((p) => p.index)
        .map((p) => `  <url>\n    <loc>${base}${p.path === '/' ? '/' : p.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`)
        .join('\n')
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n` })
      const disallow = ['/dashboard', '/inbox', '/kanban', '/funil', '/captacao', '/ia', '/canais', '/relatorios', '/equipe', '/config', '/agenda', '/contatos', '/perfil', '/meu-painel', '/afiliados', '/admin', '/assinar', '/esqueci-senha', '/redefinir-senha']
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n${disallow.map((p) => `Disallow: ${p}`).join('\n')}\n\nSitemap: ${base}/sitemap.xml\n` })
    },
    closeBundle() {
      const indexPath = resolve(outDir, 'index.html')
      if (!existsSync(indexPath)) return
      const shell = readFileSync(indexPath, 'utf8')
      // Cada página pública vira um arquivo próprio (/login → login.html, e assim por diante); a home reescreve o index.html
      for (const page of SEO_PAGES) {
        const file = page.path === '/' ? 'index.html' : `${page.path.slice(1)}.html`
        writeFileSync(resolve(outDir, file), renderPage(shell, page, base))
      }
      // 404 de verdade: a Vercel responde com status 404 e este arquivo para qualquer endereço que não exista
      const notFound: SeoPage = { path: '/404', title: 'Página não encontrada | IC Chat', description: 'A página que você procura não existe ou foi movida.', index: false, changefreq: 'yearly', priority: '0', h1: 'Página não encontrada', lead: '', sections: [], faq: [] }
      writeFileSync(resolve(outDir, '404.html'), renderPage(shell, notFound, base, true))
      // Molde vazio das rotas do app (/dashboard, /admin...): sem o texto da home, para não aparecer nada antes do app carregar
      writeFileSync(resolve(outDir, 'app.html'), renderPage(shell, { ...notFound, path: '/app', title: 'IC Chat', description: 'IC Chat: atendimento, CRM e chatbot com IA para WhatsApp.', h1: 'IC Chat' }, base, true))
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname), '')
  const siteUrl = env.VITE_SITE_URL || DEFAULT_SITE_URL
  return {
    root: resolve(__dirname, 'src/renderer'),
    envDir: resolve(__dirname),
    resolve: { alias: { '@': resolve(__dirname, 'src/renderer/src') } },
    plugins: [react(), tailwindcss(), seoFiles(siteUrl)],
    server: { port: 5173, strictPort: true },
    build: { outDir, emptyOutDir: true }
  }
})
