import type { ReportColumn } from './table-report'

/**
 * Planilha CSV no padrão do Excel brasileiro (separador ";" e BOM UTF-8 para acentos).
 * No IC Chat instalado abre a janela "Salvar como"; no navegador faz o download.
 */
export async function exportCsv(columns: ReportColumn[], rows: Record<string, string>[], fileName: string) {
  const escape = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const lines = [columns.map((c) => escape(c.label)).join(';'), ...rows.map((r) => columns.map((c) => escape(r[c.key] ?? '')).join(';'))]
  const content = '﻿' + lines.join('\r\n')

  if (window.icchat?.saveFile) {
    return window.icchat.saveFile(content, fileName, [{ name: 'Planilha (CSV)', extensions: ['csv'] }])
  }
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  return { ok: true as const }
}
