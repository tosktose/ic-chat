import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Tooltip } from './misc'

export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary-hover',
        secondary: 'bg-surface-2 text-foreground hover:bg-surface-3',
        outline: 'border border-border bg-surface text-foreground hover:bg-surface-2',
        ghost: 'text-muted hover:bg-surface-2 hover:text-foreground',
        soft: 'bg-primary-soft text-primary hover:bg-primary-soft/70',
        danger: 'bg-danger text-white hover:bg-danger/90',
        success: 'bg-success text-white hover:bg-success/90'
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-9 px-4',
        lg: 'h-11 px-5 text-[15px]',
        icon: 'size-9',
        'icon-sm': 'size-8 [&_svg]:size-[15px]'
      }
    },
    defaultVariants: { variant: 'primary', size: 'md' }
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Texto da dica. Botões só com ícone usam o aria-label automaticamente. */
  tooltip?: string
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left'
  shortcut?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', tooltip, tooltipSide, shortcut, ...props }, ref) => {
    const btn = (
      <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    )
    const iconOnly = size === 'icon' || size === 'icon-sm'
    const tip = tooltip ?? (iconOnly ? props['aria-label'] : undefined)
    if (!tip) return btn
    return (
      <Tooltip content={tip} side={tooltipSide} shortcut={shortcut}>
        {btn}
      </Tooltip>
    )
  }
)
Button.displayName = 'Button'
