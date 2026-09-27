import { Info } from 'lucide-react'
import { APP_MODE } from '@/lib/data'

/** Aviso nas telas de números que ainda usam dados de exemplo (enquanto não há histórico real) */
export function DemoDataNotice() {
  if (!APP_MODE) return null
  return (
    <div role="note" className="mb-4 flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-[13px]">
      <Info className="mt-0.5 size-4 shrink-0 text-warning" />
      <p>
        <span className="font-semibold">Números de demonstração.</span>{' '}
        <span className="text-muted">Os indicadores desta tela passam a usar os seus atendimentos reais na próxima versão.</span>
      </p>
    </div>
  )
}
