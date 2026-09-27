// Relatório de dados filtrados (página Relatórios) → HTML A4 para PDF.
import { barChart, esc, reportShell, type ShellOptions } from './base'

export interface ReportColumn {
  key: string
  label: string
  align?: 'left' | 'right'
  /** Tamanho relativo da coluna */
  width?: string
}

export type CellValue = string | { html: string }

export interface TableReportInput extends Omit<ShellOptions, 'chips'> {
  periodLabel: string
  filters: { label: string; value: string }[]
  kpis: { label: string; value: string; sub?: string }[]
  chart?: { title: string; data: { label: string; value: number }[]; money?: boolean }
  columns: ReportColumn[]
  rows: Record<string, CellValue>[]
  totals?: Record<string, string | undefined>
  /** Linhas acima deste número são resumidas (o CSV traz tudo) */
  maxRows?: number
}

const cell = (v: CellValue | undefined) => (v === undefined ? '' : typeof v === 'string' ? esc(v) : v.html)

export function buildTableReport(i: TableReportInput): string {
  const max = i.maxRows ?? 500
  const rows = i.rows.slice(0, max)
  const n = (k: number) => String(k).padStart(2, '0')
  let sec = 0

  const body: string[] = []

  body.push(`<section class="avoid">
    <h2><span class="n">${n(++sec)}</span> Filtros aplicados</h2>
    <div class="filters">
      <span><b>Período</b>${esc(i.periodLabel)}</span>
      ${i.filters.map((f) => `<span><b>${esc(f.label)}</b>${esc(f.value)}</span>`).join('')}
      <span><b>Registros</b>${i.rows.length.toLocaleString('pt-BR')}</span>
    </div>
  </section>`)

  if (i.kpis.length) {
    body.push(`<section class="avoid">
      <h2><span class="n">${n(++sec)}</span> Resumo</h2>
      <div class="kpis" style="grid-template-columns:repeat(${Math.min(4, i.kpis.length)},1fr)">
        ${i.kpis.map((k) => `<div class="kpi"><p class="kpi-t">${esc(k.label)}</p><p class="kpi-v">${esc(k.value)}</p>${k.sub ? `<p class="kpi-s">${esc(k.sub)}</p>` : ''}</div>`).join('')}
      </div>
    </section>`)
  }

  if (i.chart && i.chart.data.length > 1) {
    body.push(`<section class="card avoid">
      <h2><span class="n">${n(++sec)}</span> ${esc(i.chart.title)}</h2>
      ${barChart(i.chart.data, { money: i.chart.money })}
    </section>`)
  }

  body.push(`<section>
    <h2><span class="n">${n(++sec)}</span> Detalhamento</h2>
    <table>
      <thead><tr>${i.columns.map((c) => `<th class="${c.align === 'right' ? 'r' : ''}"${c.width ? ` style="width:${c.width}"` : ''}>${esc(c.label)}</th>`).join('')}</tr></thead>
      <tbody>
        ${rows.length ? rows.map((r) => `<tr>${i.columns.map((c) => `<td class="${c.align === 'right' ? 'r' : ''}">${cell(r[c.key])}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${i.columns.length}" class="muted" style="text-align:center;padding:18px">Nenhum registro para os filtros escolhidos.</td></tr>`}
      </tbody>
      ${i.totals ? `<tfoot><tr>${i.columns.map((c) => `<td class="${c.align === 'right' ? 'r' : ''}">${esc(i.totals![c.key] ?? '')}</td>`).join('')}</tr></tfoot>` : ''}
    </table>
    ${i.rows.length > max ? `<p class="note">Exibindo ${max.toLocaleString('pt-BR')} de ${i.rows.length.toLocaleString('pt-BR')} registros. Exporte em Excel para a lista completa.</p>` : ''}
  </section>`)

  return reportShell({ ...i, chips: [i.periodLabel] }, body.join('\n'))
}
