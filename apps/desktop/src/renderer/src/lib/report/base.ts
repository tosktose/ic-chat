// Base visual dos relatórios em PDF (A4): capa da marca, estilos e utilitários.
// Tudo embutido (fonte, logo, gráficos SVG) para funcionar sem internet.
import interFont from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?inline'

export const C = {
  ink: '#0f172a',
  muted: '#64748b',
  subtle: '#94a3b8',
  line: '#e2e8f0',
  soft: '#f5f7fb',
  primary: '#0a4fe0',
  cyan: '#18c8f5',
  chart: ['#0a4fe0', '#0d9488', '#8b5cf6', '#f59e0b', '#e11d48', '#0891b2'],
  good: '#16a34a',
  bad: '#e11d48'
}

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
export const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const num = (v: number) => v.toLocaleString('pt-BR')

export const LOGO = (size: number) => `
<svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="lg${size}" x1="8" y1="58" x2="60" y2="4" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0036c8"/><stop offset="1" stop-color="#18c8f5"/>
    </linearGradient>
  </defs>
  <path d="M16 4h32c7.7 0 12 4.3 12 12v24c0 7.7-4.3 12-12 12H23.5L10.2 59.1c-1 .5-2.1-.4-1.8-1.5L10 51C6.1 49 4 45.2 4 40V16C4 8.3 8.3 4 16 4Z" fill="url(#lg${size})"/>
  <circle cx="21" cy="19.5" r="4.6" fill="#5fe3ff"/>
  <rect x="16.8" y="26" width="8.4" height="19" rx="2" fill="#fff"/>
  <path d="M46.6 29.6a11 11 0 1 0 0 12.8l-5.4-4.1a4.6 4.6 0 1 1 0-4.6l5.4-4.1Z" fill="#fff"/>
</svg>`

export interface ShellOptions {
  title: string
  subtitle: string
  company: string
  logo?: string
  author: string
  chips: string[]
}

/** Documento completo: capa + corpo + fechamento */
export function reportShell(o: ShellOptions, body: string): string {
  const now = new Date()
  const generated = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  const companyLogo = o.logo
    ? `<img src="${o.logo}" style="width:22px;height:22px;border-radius:6px;object-fit:cover;vertical-align:-6px;margin-right:6px"/>`
    : ''
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<title>${esc(o.title)} — ${esc(o.company)}</title>
<style>${CSS}</style></head>
<body><div class="sheet">
  <header class="cover">
    <div class="brand">${LOGO(34)}<div><b>icChat</b><small>Powered by itaCondo</small></div></div>
    <h1>${esc(o.title)}</h1>
    <p class="co">${companyLogo}${esc(o.company)} · ${esc(o.subtitle)}</p>
    <div class="chips">
      ${o.chips.map((c) => `<span>${esc(c)}</span>`).join('')}
      <span>Gerado em ${generated}</span>
      <span>Por ${esc(o.author)}</span>
    </div>
  </header>
  ${body}
  <div class="end">
    <span>Relatório gerado pelo IC Chat. Dados confidenciais — uso interno da ${esc(o.company)}.</span>
    ${LOGO(18)}
  </div>
</div></body></html>`
}

/** Gráfico de colunas simples (SVG) */
export function barChart(data: { label: string; value: number }[], opts: { money?: boolean } = {}): string {
  if (!data.length) return ''
  const W = 700, H = 190, L = 44, R = 8, T = 14, B = 26
  const max = Math.max(1, ...data.map((d) => d.value))
  const nice = Math.ceil(max / 4) * 4
  const bw = (W - L - R) / data.length
  const y = (v: number) => T + (H - T - B) * (1 - v / nice)
  const fmt = (v: number) => (opts.money ? `R$ ${num(Math.round(v))}` : num(Math.round(v)))
  const step = Math.ceil(data.length / 16)
  const grid = [0, 0.5, 1]
    .map((f) => `<line x1="${L}" x2="${W - R}" y1="${y(nice * f)}" y2="${y(nice * f)}" stroke="${C.line}" stroke-dasharray="3 4"/>
      <text x="${L - 6}" y="${y(nice * f) + 3.5}" text-anchor="end" font-size="9" fill="${C.subtle}">${fmt(nice * f)}</text>`)
    .join('')
  const bars = data
    .map((d, i) => {
      const x = L + i * bw + bw * 0.18
      const w = Math.max(2, bw * 0.64)
      const top = y(d.value)
      const h = Math.max(0, y(0) - top)
      const lastOk = i === data.length - 1 && (data.length - 1) % step >= step / 2
      const label = i % step === 0 || lastOk ? `<text x="${x + w / 2}" y="${H - 8}" text-anchor="middle" font-size="9" fill="${C.muted}">${esc(d.label)}</text>` : ''
      return `<rect x="${x}" y="${top}" width="${w}" height="${h}" rx="${Math.min(4, w / 2)}" fill="${C.primary}"/>${label}`
    })
    .join('')
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg">${grid}${bars}</svg>`
}

const CSS = `
@font-face { font-family: 'Inter'; src: url(${interFont}) format('woff2'); font-weight: 100 900; font-display: block; }
@page { size: A4; margin: 12mm 0 11mm 0; }
@page :first { margin-top: 0; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; padding: 0; }
body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; color: ${C.ink}; font-size: 11px; line-height: 1.45; background: #fff; }
.sheet { padding: 0 14mm 10mm; }
.cover { position: relative; margin: 0 -14mm 20px; padding: 14mm 14mm 12mm; color: #fff; overflow: hidden;
  background: linear-gradient(125deg, #0634b8 0%, #0a4fe0 45%, #18c8f5 100%); }
.cover::before { content: ''; position: absolute; right: -60px; top: -80px; width: 280px; height: 280px; border-radius: 50%; background: rgba(255,255,255,.10); }
.cover::after { content: ''; position: absolute; left: 40%; bottom: -120px; width: 320px; height: 320px; border-radius: 50%; background: rgba(24,200,245,.25); }
.brand { position: relative; z-index: 1; display: flex; align-items: center; gap: 10px; }
.brand b { font-size: 17px; font-weight: 800; letter-spacing: -.02em; }
.brand small { display: block; font-size: 8.5px; opacity: .75; }
.cover h1 { position: relative; z-index: 1; margin: 18px 0 4px; font-size: 27px; font-weight: 800; letter-spacing: -.03em; }
.cover .co { position: relative; z-index: 1; margin: 0; font-size: 13px; opacity: .92; }
.chips { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 7px; margin-top: 14px; }
.chips span { background: rgba(255,255,255,.16); border: 1px solid rgba(255,255,255,.25); border-radius: 999px; padding: 4px 11px; font-size: 9.5px; font-weight: 500; }
section { margin-bottom: 18px; }
.avoid { break-inside: avoid; }
h2 { display: flex; align-items: center; gap: 8px; margin: 0 0 10px; font-size: 13.5px; font-weight: 700; letter-spacing: -.01em; }
h2 .n { font-size: 9.5px; font-weight: 700; color: ${C.primary}; background: #e8f0ff; border-radius: 6px; padding: 2px 6px; }
.sub { margin: -4px 0 10px; color: ${C.muted}; font-size: 10px; }
.card { border: 1px solid ${C.line}; border-radius: 14px; padding: 14px 16px 10px; }
.filters { display: flex; flex-wrap: wrap; gap: 6px; background: ${C.soft}; border-radius: 12px; padding: 10px 12px; }
.filters span { background: #fff; border: 1px solid ${C.line}; border-radius: 999px; padding: 3px 9px; font-size: 9.5px; }
.filters b { color: ${C.muted}; font-weight: 600; margin-right: 3px; }
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.kpi { border: 1px solid ${C.line}; border-radius: 14px; padding: 11px 13px; }
.kpi-t { margin: 0; color: ${C.muted}; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; }
.kpi-v { margin: 5px 0 0; font-size: 19px; font-weight: 800; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
.kpi-s { margin: 2px 0 0; color: ${C.subtle}; font-size: 9px; }
table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid ${C.line}; border-radius: 12px; overflow: hidden; }
thead { display: table-header-group; }
tfoot { display: table-row-group; }
tr { break-inside: avoid; }
th { background: ${C.soft}; color: ${C.subtle}; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; text-align: left; padding: 7px 9px; }
td { padding: 6px 9px; border-top: 1px solid ${C.line}; vertical-align: middle; font-size: 9.8px; font-variant-numeric: tabular-nums; }
tbody tr:nth-child(even) td { background: #fbfcfe; }
tfoot td { background: ${C.soft}; font-weight: 700; }
.r { text-align: right; } .muted { color: ${C.muted}; }
.tag { display: inline-block; border-radius: 999px; padding: 1px 7px; font-size: 8.5px; font-weight: 600; }
.t-good { background: #e7f7ee; color: ${C.good}; } .t-bad { background: #ffe8ee; color: ${C.bad}; } .t-warn { background: #fff5e1; color: #d97706; } .t-info { background: #e8f0ff; color: ${C.primary}; } .t-neutral { background: #eef2f7; color: ${C.muted}; }
.bar { display: inline-block; width: 70px; height: 5px; border-radius: 999px; background: #eef2f8; overflow: hidden; vertical-align: middle; margin-left: 6px; } .bar i { display: block; height: 100%; background: ${C.primary}; border-radius: 999px; }
.note { color: ${C.muted}; font-size: 9px; margin-top: 6px; }
.end { margin-top: 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; border-top: 1px solid ${C.line}; padding-top: 12px; color: ${C.subtle}; font-size: 9px; }
`
