import {
  forwardRef,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes
} from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const fieldBase =
  'w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-subtle transition-[border-color,box-shadow] outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 disabled:opacity-60'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode
  trailing?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, trailing, ...props }, ref) => {
    if (!icon && !trailing) {
      return <input ref={ref} className={cn(fieldBase, 'h-9 px-3', className)} {...props} />
    }
    return (
      <div className="relative w-full">
        {icon && (
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle [&_svg]:size-4">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(fieldBase, 'h-9', icon ? 'pl-9' : 'pl-3', trailing ? 'pr-10' : 'pr-3', className)}
          {...props}
        />
        {trailing && (
          <span className="absolute top-1/2 right-2 -translate-y-1/2 text-subtle">{trailing}</span>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldBase, 'min-h-24 resize-y px-3 py-2 leading-relaxed', className)} {...props} />
  )
)
Textarea.displayName = 'Textarea'

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(fieldBase, 'h-9 appearance-none pr-9 pl-3', className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-subtle" />
    </div>
  )
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('text-[13px] font-medium text-foreground', className)} {...props} />
}

export function Field({
  label,
  hint,
  children,
  className
}: {
  label: string
  hint?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  )
}
