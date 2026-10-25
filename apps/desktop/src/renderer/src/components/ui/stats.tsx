import { useId, type ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Minigráfico de tendência                                             */
/* ------------------------------------------------------------------ */
/**
 * SVG puro de propósito: um sparkline não justifica carregar a biblioteca
 * de gráficos, e assim ele acompanha a cor do contexto sem configuração.
 */
export function Sparkline({
  points,
  className,
  tone = 'primary'
}: {
  points: number[]
  className?: string
  tone?: 'primary' | 'success' | 'warning' | 'danger'
}) {
  const id = useId()
  if (points.length < 2) return null

  const W = 100
  const H = 32
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const passo = W / (points.length - 1)

  const coords = points.map((p, i) => [i * passo, H - ((p - min) / span) * (H - 4) - 2] as const)
  const linha = coords.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${linha} L${W},${H} L0,${H} Z`
  const cor = `var(--${tone})`

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn('h-8 w-full', className)}
    >
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.28" />
          <stop offset="100%" stopColor={cor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#g${id})`} />
      <path
        d={linha}
        fill="none"
        stroke={cor}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Cartão de indicador                                                  */
/* ------------------------------------------------------------------ */
export type StatTone = 'default' | 'primary' | 'success' | 'warning' | 'danger'

const valorTone: Record<StatTone, string> = {
  default: '',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger'
}

/**
 * Cartão único de indicador do sistema. Antes cada tela tinha o seu, o que
 * deixava os painéis desalinhados entre si.
 */
export function StatCard({
  icon,
  label,
  value,
  hint,
  delta,
  lowerIsBetter,
  points,
  trend,
  tone = 'default',
  title,
  className
}: {
  icon?: ReactNode
  label: string
  value: ReactNode
  /** Linha de apoio abaixo do número. Ignorada quando há `delta`. */
  hint?: ReactNode
  /** Variação contra o período anterior. `null` = sem base de comparação. */
  delta?: number | null
  /** Para métricas em que cair é bom (tempo de resposta, faltas). */
  lowerIsBetter?: boolean
  /** Variação em pontos percentuais em vez de porcentagem. */
  points?: boolean
  /** Série para o minigráfico. */
  trend?: number[]
  tone?: StatTone
  title?: string
  className?: string
}) {
  const temDelta = delta !== undefined
  const bom = lowerIsBetter ? (delta ?? 0) < 0 : (delta ?? 0) > 0
  const Seta = (delta ?? 0) > 0 ? ArrowUpRight : ArrowDownRight

  return (
    <article
      title={title}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border bg-surface p-4 shadow-soft',
        'transition-colors hover:border-border-strong',
        className
      )}
    >
      <div className="flex items-center gap-2 text-[12.5px] font-medium text-muted [&_svg]:size-4">
        {icon}
        <span className="truncate">{label}</span>
      </div>

      <p className={cn('mt-2 text-2xl font-bold tracking-tight tabular-nums md:text-[28px]', valorTone[tone])}>
        {value}
      </p>

      {temDelta ? (
        delta === null ? (
          <p className="mt-1 text-xs text-subtle">Sem base para comparar</p>
        ) : delta === 0 ? (
          <p className="mt-1 text-xs text-muted">Igual ao período anterior</p>
        ) : (
          <p
            className={cn(
              'mt-1 flex items-center gap-0.5 text-xs font-semibold',
              bom ? 'text-success' : 'text-danger'
            )}
          >
            <Seta className="size-3.5" />
            {Math.abs(delta).toLocaleString('pt-BR')}
            {points ? ' p.p.' : '%'}
            <span className="ml-1 hidden font-normal text-muted sm:inline">vs período anterior</span>
          </p>
        )
      ) : hint ? (
        <p className="mt-1 text-xs text-subtle">{hint}</p>
      ) : null}

      {trend && trend.length > 1 && (
        <div className="pointer-events-none mt-3 -mb-4 -ml-4 w-[calc(100%+2rem)] opacity-70 transition-opacity group-hover:opacity-100">
          <Sparkline points={trend} tone={tone === 'default' ? 'primary' : tone} />
        </div>
      )}
    </article>
  )
}

/* ------------------------------------------------------------------ */
/* Grade padrão de indicadores                                          */
/* ------------------------------------------------------------------ */
export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-3 lg:grid-cols-4', className)}>{children}</div>
}
