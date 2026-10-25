import type { HTMLAttributes, ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Switch as RSwitch, Tooltip as RTooltip } from 'radix-ui'
import { cn, colorFor, initials } from '@/lib/utils'

/* ---------------- Badge ---------------- */
const badgeVariants = cva(
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full font-medium [&_svg]:size-3',
  {
    variants: {
      tone: {
        /* Fio de contorno em todos: define o selo sem saturar o fundo,
           o que no modo escuro era o que deixava tudo com cara de adesivo. */
        neutral: 'bg-surface-2 text-muted ring-1 ring-inset ring-border',
        primary: 'bg-primary-soft text-primary ring-1 ring-inset ring-primary/25',
        success: 'bg-success-soft text-success ring-1 ring-inset ring-success/25',
        warning: 'bg-warning-soft text-warning ring-1 ring-inset ring-warning/25',
        danger: 'bg-danger-soft text-danger ring-1 ring-inset ring-danger/25',
        solid: 'bg-primary text-primary-foreground',
        outline: 'border border-border text-muted'
      },
      size: {
        sm: 'h-5 px-2 text-[11px]',
        md: 'h-6 px-2.5 text-xs'
      }
    },
    defaultVariants: { tone: 'neutral', size: 'sm' }
  }
)

export function Badge({
  className,
  tone,
  size,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />
}

export function Dot({ className }: { className?: string }) {
  return <span className={cn('inline-block size-2 rounded-full', className)} />
}

/* ---------------- Avatar ---------------- */
type Presence = 'online' | 'away' | 'busy' | 'offline'
const presenceColor: Record<Presence, string> = {
  online: 'bg-success',
  away: 'bg-warning',
  busy: 'bg-danger',
  offline: 'bg-subtle'
}

export function Avatar({
  name,
  src,
  size = 40,
  presence,
  badge,
  className
}: {
  name: string
  src?: string
  size?: number
  presence?: Presence
  badge?: ReactNode
  className?: string
}) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)} style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt={name} className="size-full rounded-full object-cover" />
      ) : (
        <span
          className={cn(
            'flex size-full items-center justify-center rounded-full font-semibold text-white',
            colorFor(name)
          )}
          style={{ fontSize: Math.max(11, size * 0.36) }}
        >
          {initials(name)}
        </span>
      )}
      {presence && (
        <span
          className={cn(
            'absolute right-0 bottom-0 rounded-full ring-2 ring-surface',
            presenceColor[presence]
          )}
          style={{ width: Math.max(8, size * 0.26), height: Math.max(8, size * 0.26) }}
        />
      )}
      {badge && <span className="absolute -right-1 -bottom-1">{badge}</span>}
    </span>
  )
}

/* ---------------- Card ---------------- */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-xl border border-border bg-surface shadow-(--shadow-soft)', className)}
      {...props}
    />
  )
}

export function CardHeader({
  title,
  description,
  action,
  className
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 px-5 pt-4 pb-3', className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

/* ---------------- Switch ---------------- */
export function Switch({
  checked,
  onCheckedChange,
  className,
  ...props
}: {
  checked?: boolean
  onCheckedChange?: (v: boolean) => void
  className?: string
  id?: string
  'aria-label'?: string
}) {
  return (
    <RSwitch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-border-strong transition-colors data-[state=checked]:bg-primary',
        className
      )}
      {...props}
    >
      <RSwitch.Thumb className="block size-4 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px]" />
    </RSwitch.Root>
  )
}

/* ---------------- Tooltip ---------------- */
/**
 * Dica flutuante padrão do sistema: fundo escuro nos dois temas, seta, título
 * opcionalmente com descrição e atalho de teclado.
 */
export function Tooltip({
  content,
  children,
  side = 'top',
  description,
  shortcut,
  disabled
}: {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  description?: ReactNode
  shortcut?: string
  disabled?: boolean
}) {
  if (disabled) return <>{children}</>
  return (
    <RTooltip.Root delayDuration={300}>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className="z-[60] max-w-64 animate-fade-in rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1.5 text-[12px] leading-snug text-white shadow-(--shadow-pop) select-none dark:bg-slate-800"
        >
          <span className="flex items-center gap-2">
            <span className="font-medium">{content}</span>
            {shortcut && (
              <kbd className="rounded border border-white/15 bg-white/10 px-1 font-sans text-[10.5px] text-white/80">{shortcut}</kbd>
            )}
          </span>
          {description && <span className="mt-0.5 block text-[11.5px] text-white/70">{description}</span>}
          <RTooltip.Arrow className="fill-slate-900 dark:fill-slate-800" width={10} height={5} />
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  )
}

/* ---------------- Segmented (abas compactas) ---------------- */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'md'
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; count?: number }[]
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div
      role="tablist"
      className={cn('inline-flex items-center gap-0.5 rounded-lg bg-surface-2 p-0.5', className)}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
              active ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground'
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span
                className={cn(
                  'rounded-full whitespace-nowrap px-1.5 text-[10px] leading-4',
                  active ? 'bg-primary text-white' : 'bg-surface-3 text-muted'
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ---------------- Progress ---------------- */
export function Progress({ value, className, tone = 'primary' }: { value: number; className?: string; tone?: 'primary' | 'success' | 'warning' | 'danger' }) {
  const color = { primary: 'bg-primary', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger' }[tone]
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-3', className)}>
      <div className={cn('h-full rounded-full transition-[width]', color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}

/* ---------------- Empty state ---------------- */
export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary [&_svg]:size-7">{icon}</div>
      <div>
        <p className="font-semibold">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}
