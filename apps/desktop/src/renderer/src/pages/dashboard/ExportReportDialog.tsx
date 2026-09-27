import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, FileDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/misc'
import { Dialog } from '@/components/ui/overlay'
import { useAppState } from '@/lib/app-state'
import { buildDashboardReport, REPORT_SECTIONS, type ReportSection } from '@/lib/report/dashboard-report'
import { exportPdf } from '@/lib/report/export-pdf'
import { cn } from '@/lib/utils'
import { useCompany } from '@/lib/company'
import { PERIOD_LABEL, type Period } from '@/data/dashboard'

const A4_WIDTH = 794 // px (210 mm a 96 dpi)

export function ExportReportDialog({ open, onOpenChange, initialPeriod }: { open: boolean; onOpenChange: (v: boolean) => void; initialPeriod: Period }) {
  const { me } = useAppState()
  const { info: company, professionals } = useCompany()
  const [period, setPeriod] = useState<Period>(initialPeriod)
  const [sections, setSections] = useState<ReportSection[]>(REPORT_SECTIONS.map((s) => s.id))
  const [busy, setBusy] = useState(false)
  const previewBox = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.45)

  useEffect(() => {
    if (open) setPeriod(initialPeriod)
  }, [open, initialPeriod])

  // A pré-visualização é o próprio documento do PDF, reduzido para caber na janela
  useEffect(() => {
    if (!open) return
    const el = previewBox.current
    if (!el) return
    const ro = new ResizeObserver(() => setScale(el.clientWidth / A4_WIDTH))
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])

  const html = useMemo(
    () => buildDashboardReport({ period, sections, company: company.name, author: me.name, professionals, logo: company.logo }),
    [period, sections, me.name, company.name, company.logo, professionals]
  )

  const toggle = (id: ReportSection) =>
    setSections((s) => (s.includes(id) ? s.filter((x) => x !== id) : REPORT_SECTIONS.map((r) => r.id).filter((r) => r === id || s.includes(r))))

  const download = async () => {
    setBusy(true)
    const slug = company.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')
    const date = new Date().toISOString().slice(0, 10)
    const res = await exportPdf(html, `relatorio-${slug}-${period}-${date}.pdf`)
    setBusy(false)
    if (res.ok) {
      toast.success('Relatório gerado', { description: res.path ?? 'Escolha “Salvar como PDF” na janela de impressão.' })
      onOpenChange(false)
    } else if (!res.canceled) {
      toast.error('Não foi possível gerar o PDF', { description: res.error })
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Exportar relatório em PDF"
      description="Escolha o período e o que entra no relatório. A pré-visualização mostra exatamente o arquivo final."
      className="md:max-w-5xl"
      footer={
        <>
          <p className="mr-auto hidden self-center text-xs text-muted sm:block">A4 · {sections.length} {sections.length === 1 ? 'seção' : 'seções'} · {PERIOD_LABEL[period].range}</p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={download} disabled={busy || sections.length === 0}>
            {busy ? <Loader2 className="animate-spin" /> : <FileDown />}
            {busy ? 'Gerando…' : 'Baixar PDF'}
          </Button>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-[280px_1fr]">
        <div className="flex flex-col gap-5">
          <div>
            <p className="mb-2 text-[13px] font-medium">Período</p>
            <Segmented
              className="w-full"
              value={period}
              onChange={setPeriod}
              options={[
                { value: 'semana', label: 'Semana' },
                { value: 'quinzena', label: 'Quinzena' },
                { value: 'mes', label: 'Mês' }
              ]}
            />
            <p className="mt-1.5 text-xs text-muted">{PERIOD_LABEL[period].range}</p>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium">Conteúdo</p>
              <button
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => setSections(sections.length === REPORT_SECTIONS.length ? [] : REPORT_SECTIONS.map((s) => s.id))}
              >
                {sections.length === REPORT_SECTIONS.length ? 'Desmarcar tudo' : 'Marcar tudo'}
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {REPORT_SECTIONS.map((s) => {
                const on = sections.includes(s.id)
                return (
                  <button
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border p-2.5 text-left transition-colors',
                      on ? 'border-primary/40 bg-primary-soft/50' : 'border-border hover:bg-surface-2'
                    )}
                  >
                    <span className={cn('mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border', on ? 'border-primary bg-primary text-white' : 'border-border-strong')}>
                      {on && <Check className="size-3" />}
                    </span>
                    <span>
                      <span className="block text-[13px] font-medium">{s.label}</span>
                      <span className="block text-[11.5px] text-muted">{s.description}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div ref={previewBox} className="scroll-thin relative h-[52vh] min-h-72 overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-slate-200/70 p-0 dark:bg-slate-900">
          <div style={{ width: A4_WIDTH * scale, height: 1123 * 2 * scale }} className="mx-auto">
            <iframe
              title="Pré-visualização do relatório"
              srcDoc={html}
              sandbox=""
              style={{ width: A4_WIDTH, height: 1123 * 2, transform: `scale(${scale})`, transformOrigin: 'top left' }}
              className="pointer-events-none border-0 bg-white shadow-lg"
            />
          </div>
        </div>
      </div>
    </Dialog>
  )
}
