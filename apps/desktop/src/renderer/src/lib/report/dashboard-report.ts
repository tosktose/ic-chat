// Relatório do Painel do gerente em HTML pronto para virar PDF (A4).
// Tudo é embutido (fonte, logo, gráficos em SVG), então funciona sem internet.
import interFont from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?inline'
import { ANALYST_STATS, DASHBOARD_DATA, ORIGIN_SPLIT, PERIOD_LABEL, type Period } from '@/data/dashboard'
import type { Professional } from '@/data/mock'

export type ReportSection = 'resumo' | 'destaques' | 'conversas' | 'profissionais' | 'atendentes' | 'origem'

export const REPORT_SECTIONS: { id: ReportSection; label: string; description: string }[] = [
  { id: 'resumo', label: 'Resumo do período', description: 'Indicadores principais e comparação' },
  { id: 'destaques', label: 'Destaques', description: 'Pontos de atenção gerados automaticamente' },
  { id: 'conversas', label: 'Conversas por dia', description: 'Gráfico de volume de atendimento' },
  { id: 'profissionais', label: 'Produção dos profissionais', description: 'Clientes, faturamento e ticket médio' },
  { id: 'atendentes', label: 'Desempenho dos analistas', description: 'Conversas, tempo de resposta e agendamentos' },
  { id: 'origem', label: 'Origem dos agendamentos', description: 'IA, equipe e link de agendamento' }
]

export interface ReportOptions {
  period: Period
  sections: ReportSection[]
  company: string
  author: string
  /** Profissionais cadastrados (Configurações) */
  professionals: Professional[]
  logo?: string
}

// Cores fixas do papel (sempre tema claro) — paleta categórica validada
const C = {
  ink: '#0f172a',
  muted: '#64748b',
  subtle: '#94a3b8',
  line: '#e2e8f0',
  soft: '#f5f7fb',
  primary: '#0a4fe0',
  cyan: '#18c8f5',
  chart: ['#0a4fe0', '#0d9488', '#8b5cf6', '#f59e0b'],
  good: '#16a34a',
  bad: '#e11d48'
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const num = (v: number) => v.toLocaleString('pt-BR')
const initials = (n: string) => n.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

const LOGO = (size: number, white = false) => `
<svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="lg${size}${white ? 'w' : ''}" x1="8" y1="58" x2="60" y2="4" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${white ? '#ffffff' : '#0036c8'}" stop-opacity="${white ? 0.22 : 1}"/>
      <stop offset="1" stop-color="${white ? '#ffffff' : '#18c8f5'}" stop-opacity="${white ? 0.32 : 1}"/>
    </linearGradient>
  </defs>
  <path d="M16 4h32c7.7 0 12 4.3 12 12v24c0 7.7-4.3 12-12 12H23.5L10.2 59.1c-1 .5-2.1-.4-1.8-1.5L10 51C6.1 49 4 45.2 4 40V16C4 8.3 8.3 4 16 4Z" fill="url(#lg${size}${white ? 'w' : ''})"/>
  <circle cx="21" cy="19.5" r="4.6" fill="#5fe3ff"/>
  <rect x="16.8" y="26" width="8.4" height="19" rx="2" fill="#fff"/>
  <path d="M46.6 29.6a11 11 0 1 0 0 12.8l-5.4-4.1a4.6 4.6 0 1 1 0-4.6l5.4-4.1Z" fill="#fff"/>
</svg>`

/* ------------------------------------------------------------------ */
/* Gráficos em SVG                                                       */
/* ------------------------------------------------------------------ */
function areaChart(data: { d: string; v: number }[]): string {
  const W = 700, H = 230, L = 36, R = 12, T = 18, B = 28
  const max = Math.ceil(Math.max(...data.map((p) => p.v)) / 20) * 20 || 20
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(1, data.length - 1)
  const y = (v: number) => T + (H - T - B) * (1 - v / max)
  const pts = data.map((p, i) => [x(i), y(p.v)] as const)
  // curva suave (Catmull-Rom → Bézier)
  let path = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2
    path += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`
  }
  const area = `${path} L${pts[pts.length - 1][0]},${y(0)} L${pts[0][0]},${y(0)} Z`
  const peak = data.reduce((m, p, i) => (p.v > data[m].v ? i : m), 0)
  const step = Math.ceil(data.length / 10)
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((f) => {
      const v = Math.round(max * f)
      return `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="${C.line}" stroke-dasharray="3 4"/>
      <text x="${L - 8}" y="${y(v) + 3.5}" text-anchor="end" font-size="10" fill="${C.subtle}">${v}</text>`
    })
    .join('')
  const labels = data
    .map((p, i) => (i % step === 0 || i === data.length - 1 ? `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="${C.muted}">${esc(p.d)}</text>` : ''))
    .join('')
  const [px, py] = pts[peak]
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="af" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.primary}" stop-opacity=".22"/><stop offset="1" stop-color="${C.primary}" stop-opacity="0"/></linearGradient></defs>
    ${grid}
    <path d="${area}" fill="url(#af)"/>
    <path d="${path}" fill="none" stroke="${C.primary}" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="${px}" cy="${py}" r="4.5" fill="${C.primary}" stroke="#fff" stroke-width="2"/>
    <g transform="translate(${Math.min(px, W - 90)},${py - 30})">
      <rect x="-4" y="0" width="92" height="20" rx="6" fill="${C.ink}"/>
      <text x="42" y="13.5" text-anchor="middle" font-size="10" font-weight="600" fill="#fff">Pico: ${data[peak].v} conversas</text>
    </g>
    ${labels}
  </svg>`
}

function stackedBar(parts: { label: string; value: number; color: string }[], total: number): string {
  const segs = parts
    .map((p) => `<div style="width:${(p.value / total) * 100}%;background:${p.color}" title="${esc(p.label)}"></div>`)
    .join('')
  return `<div class="stack">${segs}</div>`
}

/* ------------------------------------------------------------------ */
/* Documento                                                             */
/* ------------------------------------------------------------------ */
export function buildDashboardReport(opts: ReportOptions): string {
  const d = DASHBOARD_DATA[opts.period]
  const label = PERIOD_LABEL[opts.period]
  const has = (s: ReportSection) => opts.sections.includes(s)
  const now = new Date()
  const generated = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`

  // Números de demonstração ligados aos profissionais de exemplo (p1..p4); novos começam em zero
  const SEED_INDEX: Record<string, number> = { p1: 0, p2: 1, p3: 2, p4: 3 }
  const pros = opts.professionals
    .map((p, i) => ({ ...p, clients: d.pros[SEED_INDEX[p.id]] ?? 0, revenue: d.revenue[SEED_INDEX[p.id]] ?? 0, color: C.chart[i % C.chart.length] }))
    .sort((a, b) => b.clients - a.clients)
  const totalRevenue = pros.reduce((s, p) => s + p.revenue, 0) || 1
  const totalClients = pros.reduce((s, p) => s + p.clients, 0) || 1
  const maxClients = Math.max(1, ...pros.map((p) => p.clients))
  const analysts = ANALYST_STATS[opts.period]
  const origin = ORIGIN_SPLIT[opts.period]
  const peakDay = d.daily.reduce((m, p) => (p.v > m.v ? p : m), d.daily[0])

  const kpi = (title: string, value: string, delta: number, lowerIsBetter = false, unit = '%') => {
    const good = lowerIsBetter ? delta < 0 : delta > 0
    const arrow = delta > 0 ? '▲' : '▼'
    return `<div class="kpi">
      <p class="kpi-t">${title}</p>
      <p class="kpi-v">${value}</p>
      <p class="kpi-d"><span class="pill ${good ? 'good' : 'bad'}">${arrow} ${num(Math.abs(delta))}${unit}</span> vs. período anterior</p>
    </div>`
  }

  const insights = [
    `<b>${esc(pros[0].name)}</b> liderou o período com <b>${pros[0].clients} clientes</b> atendidos (${Math.round((pros[0].clients / totalClients) * 100)}% do total).`,
    `O tempo da 1ª resposta ficou em <b>${d.kpis.frt}</b>, ${d.kpis.frtDelta < 0 ? `<b>${Math.abs(d.kpis.frtDelta)}% mais rápido</b>` : `${d.kpis.frtDelta}% mais lento`} que no período anterior.`,
    `A IA foi responsável por <b>${origin[0]}% dos agendamentos</b>, liberando a equipe para os casos que precisam de atenção humana.`,
    `O dia de maior movimento foi <b>${esc(peakDay.d)}</b>, com <b>${peakDay.v} conversas</b>. Vale reforçar a equipe nesse dia.`
  ]

  const sections: string[] = []

  if (has('resumo')) {
    sections.push(`<section>
      <h2><span class="n">01</span> Resumo do período</h2>
      <div class="kpis">
        ${kpi('Conversas recebidas', num(d.kpis.conv), d.kpis.convDelta)}
        ${kpi('Tempo da 1ª resposta', d.kpis.frt, d.kpis.frtDelta, true)}
        ${kpi('Atendimentos concluídos', num(d.kpis.done), d.kpis.doneDelta)}
        ${kpi('Taxa de faltas', `${num(d.kpis.noShow)}%`, d.kpis.noShowDelta, true, ' p.p.')}
      </div>
      <div class="money">
        <div><p class="kpi-t">Faturamento no período</p><p class="big">${brl(totalRevenue)}</p></div>
        <div><p class="kpi-t">Clientes atendidos</p><p class="big">${num(totalClients)}</p></div>
        <div><p class="kpi-t">Ticket médio</p><p class="big">${brl(totalRevenue / totalClients)}</p></div>
      </div>
    </section>`)
  }

  if (has('destaques')) {
    sections.push(`<section class="insights">
      <h2><span class="n">02</span> Destaques</h2>
      <ul>${insights.map((t) => `<li>${t}</li>`).join('')}</ul>
    </section>`)
  }

  if (has('conversas')) {
    sections.push(`<section class="card avoid">
      <h2><span class="n">03</span> Conversas por dia</h2>
      <p class="sub">Todas as conversas recebidas em todos os canais · ${esc(label.range)}</p>
      ${areaChart(d.daily)}
    </section>`)
  }

  if (has('profissionais')) {
    sections.push(`<section class="avoid">
      <h2><span class="n">04</span> Produção dos profissionais</h2>
      <table>
        <thead><tr><th>#</th><th>Profissional</th><th>Clientes</th><th class="r">Faturamento</th><th class="r">Ticket médio</th><th class="r">Participação</th></tr></thead>
        <tbody>
          ${pros
            .map(
              (p, i) => `<tr>
                <td class="rank">${i + 1}</td>
                <td><div class="who"><span class="av" style="background:${p.color}">${initials(p.name)}</span><div><b>${esc(p.name)}</b><small>${esc(p.specialty)}</small></div></div></td>
                <td><div class="barcell"><span>${p.clients}</span><div class="bar"><i style="width:${(p.clients / maxClients) * 100}%;background:${p.color}"></i></div></div></td>
                <td class="r">${brl(p.revenue)}</td>
                <td class="r muted">${p.clients ? brl(p.revenue / p.clients) : '—'}</td>
                <td class="r">${Math.round((p.revenue / totalRevenue) * 100)}%</td>
              </tr>`
            )
            .join('')}
        </tbody>
        <tfoot><tr><td></td><td><b>Total</b></td><td><b>${totalClients}</b></td><td class="r"><b>${brl(totalRevenue)}</b></td><td class="r muted">${brl(totalRevenue / totalClients)}</td><td class="r"><b>100%</b></td></tr></tfoot>
      </table>
      <p class="sub" style="margin-top:14px">Participação no faturamento</p>
      ${stackedBar(pros.map((p) => ({ label: p.name, value: p.revenue, color: p.color })), totalRevenue)}
      <div class="legend">${pros.map((p) => `<span><i style="background:${p.color}"></i>${esc(p.name.split(' ')[0])} · ${brl(p.revenue)}</span>`).join('')}</div>
    </section>`)
  }

  if (has('atendentes')) {
    sections.push(`<section class="avoid">
      <h2><span class="n">05</span> Desempenho dos analistas</h2>
      <table>
        <thead><tr><th>Analista</th><th class="r">Conversas</th><th class="r">1ª resposta</th><th class="r">Agendou</th><th class="r">Conversão</th><th class="r">Avaliação</th></tr></thead>
        <tbody>
          ${analysts
            .map(
              (a) => `<tr>
                <td><div class="who"><span class="av" style="background:${C.primary}">${initials(a.name)}</span><b>${esc(a.name)}</b></div></td>
                <td class="r">${a.chats}</td>
                <td class="r">${a.frt}</td>
                <td class="r">${a.booked}</td>
                <td class="r">${Math.round((a.booked / a.chats) * 100)}%</td>
                <td class="r"><span class="star">★</span> ${a.rating.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}</td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </section>`)
  }

  if (has('origem')) {
    const parts = [
      { label: 'Assistente IA', value: origin[0], color: C.chart[0] },
      { label: 'Equipe (manual)', value: origin[1], color: C.chart[1] },
      { label: 'Link de agendamento', value: origin[2], color: C.chart[2] }
    ]
    sections.push(`<section class="card avoid">
      <h2><span class="n">06</span> Origem dos agendamentos</h2>
      <p class="sub">Quanto a IA está agendando sozinha</p>
      ${stackedBar(parts, 100)}
      <div class="origin">${parts
        .map((p) => `<div><i style="background:${p.color}"></i><p class="big">${p.value}%</p><p class="muted">${p.label}</p></div>`)
        .join('')}</div>
    </section>`)
  }

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Relatório IC Chat — ${esc(opts.company)} — ${esc(label.short)}</title>
<style>
@font-face { font-family: 'Inter'; src: url(${interFont}) format('woff2'); font-weight: 100 900; font-display: block; }
@page { size: A4; margin: 12mm 0 11mm 0; }
@page :first { margin-top: 0; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; padding: 0; }
body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; color: ${C.ink}; font-size: 11px; line-height: 1.45; background: #fff; }
.sheet { padding: 0 14mm 10mm; }
.cover { position: relative; margin: 0 -14mm 22px; padding: 16mm 14mm 14mm; color: #fff; overflow: hidden;
  background: linear-gradient(125deg, #0634b8 0%, #0a4fe0 45%, #18c8f5 100%); }
.cover::before { content: ''; position: absolute; right: -60px; top: -80px; width: 280px; height: 280px; border-radius: 50%; background: rgba(255,255,255,.10); }
.cover::after { content: ''; position: absolute; left: 40%; bottom: -120px; width: 320px; height: 320px; border-radius: 50%; background: rgba(24,200,245,.25); }
.brand { position: relative; z-index: 1; display: flex; align-items: center; gap: 10px; }
.brand b { font-size: 17px; font-weight: 800; letter-spacing: -.02em; }
.brand small { display: block; font-size: 8.5px; opacity: .75; }
.cover h1 { position: relative; z-index: 1; margin: 22px 0 4px; font-size: 30px; font-weight: 800; letter-spacing: -.03em; }
.cover .co { position: relative; z-index: 1; font-size: 13px; opacity: .9; }
.chips { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.chips span { background: rgba(255,255,255,.16); border: 1px solid rgba(255,255,255,.25); border-radius: 999px; padding: 4px 11px; font-size: 10px; font-weight: 500; }
section { margin-bottom: 20px; }
.avoid { break-inside: avoid; }
h2 { display: flex; align-items: center; gap: 8px; margin: 0 0 10px; font-size: 14px; font-weight: 700; letter-spacing: -.01em; }
h2 .n { font-size: 9.5px; font-weight: 700; color: ${C.primary}; background: #e8f0ff; border-radius: 6px; padding: 2px 6px; }
.sub { margin: -4px 0 10px; color: ${C.muted}; font-size: 10px; }
.card { border: 1px solid ${C.line}; border-radius: 14px; padding: 14px 16px 10px; }
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.kpi { border: 1px solid ${C.line}; border-radius: 14px; padding: 12px 14px; }
.kpi-t { margin: 0; color: ${C.muted}; font-size: 9.5px; font-weight: 500; text-transform: uppercase; letter-spacing: .06em; }
.kpi-v { margin: 6px 0 4px; font-size: 22px; font-weight: 800; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
.kpi-d { margin: 0; color: ${C.subtle}; font-size: 9px; }
.pill { display: inline-block; border-radius: 999px; padding: 1px 6px; font-weight: 700; margin-right: 3px; }
.pill.good { background: #e7f7ee; color: ${C.good}; } .pill.bad { background: #ffe8ee; color: ${C.bad}; }
.money { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px; background: ${C.soft}; border-radius: 14px; padding: 12px 14px; }
.big { margin: 4px 0 0; font-size: 17px; font-weight: 800; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
.insights ul { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.insights li { position: relative; background: ${C.soft}; border-radius: 12px; padding: 10px 12px 10px 28px; font-size: 10.5px; }
.insights li::before { content: ''; position: absolute; left: 12px; top: 15px; width: 7px; height: 7px; border-radius: 50%; background: linear-gradient(135deg, ${C.primary}, ${C.cyan}); }
table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid ${C.line}; border-radius: 14px; overflow: hidden; }
th { background: ${C.soft}; color: ${C.subtle}; font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; text-align: left; padding: 8px 10px; }
td { padding: 8px 10px; border-top: 1px solid ${C.line}; vertical-align: middle; font-variant-numeric: tabular-nums; }
tfoot td { background: ${C.soft}; }
.r { text-align: right; } .muted { color: ${C.muted}; }
.rank { width: 22px; color: ${C.subtle}; font-weight: 700; }
.who { display: flex; align-items: center; gap: 8px; } .who small { display: block; color: ${C.muted}; font-size: 9px; }
.av { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; color: #fff; font-size: 8.5px; font-weight: 700; flex-shrink: 0; }
.barcell { display: flex; align-items: center; gap: 8px; } .barcell span { width: 24px; font-weight: 700; }
.bar { flex: 1; max-width: 110px; height: 6px; border-radius: 999px; background: #eef2f8; overflow: hidden; } .bar i { display: block; height: 100%; border-radius: 999px; }
.stack { display: flex; gap: 2px; height: 12px; border-radius: 999px; overflow: hidden; }
.stack div:first-child { border-radius: 999px 0 0 999px; } .stack div:last-child { border-radius: 0 999px 999px 0; }
.legend { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 8px; font-size: 9.5px; color: ${C.muted}; }
.legend i, .origin i { display: inline-block; width: 9px; height: 9px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; }
.origin { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; }
.origin p { margin: 0; } .origin .muted { font-size: 9.5px; }
.star { color: #f59e0b; }
.end { margin-top: 10px; display: flex; align-items: center; justify-content: space-between; gap: 10px; border-top: 1px solid ${C.line}; padding-top: 12px; color: ${C.subtle}; font-size: 9px; }
</style></head>
<body><div class="sheet">
  <header class="cover">
    <div class="brand">${LOGO(34)}<div><b>icChat</b><small>Powered by itaCondo</small></div></div>
    <h1>Relatório de desempenho</h1>
    <p class="co">${opts.logo ? `<img src="${opts.logo}" style="width:22px;height:22px;border-radius:6px;object-fit:cover;vertical-align:-6px;margin-right:6px"/>` : ''}${esc(opts.company)} · Painel do gerente</p>
    <div class="chips">
      <span>${esc(label.short)} · ${esc(label.range)}</span>
      <span>Gerado em ${generated}</span>
      <span>Por ${esc(opts.author)}</span>
    </div>
  </header>
  ${sections.join('\n')}
  <div class="end">
    <span>Relatório gerado automaticamente pelo IC Chat. Dados confidenciais — uso interno da ${esc(opts.company)}.</span>
    ${LOGO(18)}
  </div>
</div></body></html>`
}
