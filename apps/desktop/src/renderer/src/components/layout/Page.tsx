import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Página rolável padrão com cabeçalho (título, descrição e ações). */
export function Page({
  title,
  description,
  actions,
  children,
  className,
  wide
}: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  wide?: boolean
}) {
  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className={cn('mx-auto w-full px-4 py-5 md:px-6 md:py-6', wide ? 'max-w-[1600px]' : 'max-w-6xl', className)}>
        {(title || actions) && (
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              {title && <h2 className="hidden text-2xl font-bold tracking-tight md:block">{title}</h2>}
              {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
