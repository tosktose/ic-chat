export type ExportResult = { ok: true; path?: string } | { ok: false; canceled?: boolean; error?: string }

/**
 * Gera o PDF de um documento HTML.
 * - No IC Chat instalado (Electron): PDF vetorial em A4 com numeração de páginas,
 *   salvo onde o usuário escolher e aberto em seguida.
 * - No navegador: abre a impressão do sistema (opção "Salvar como PDF").
 */
export async function exportPdf(html: string, fileName: string): Promise<ExportResult> {
  if (window.icchat?.exportPdf) {
    try {
      return await window.icchat.exportPdf(html, fileName)
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }
  return printInBrowser(html)
}

function printInBrowser(html: string): Promise<ExportResult> {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe')
    frame.setAttribute('aria-hidden', 'true')
    Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' })
    frame.srcdoc = html
    frame.onload = async () => {
      const w = frame.contentWindow
      if (!w) return resolve({ ok: false, error: 'Não foi possível preparar a impressão' })
      await w.document.fonts?.ready
      w.focus()
      w.print()
      setTimeout(() => frame.remove(), 1000)
      resolve({ ok: true })
    }
    document.body.appendChild(frame)
  })
}
