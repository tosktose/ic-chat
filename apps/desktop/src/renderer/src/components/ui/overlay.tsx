import type { ReactNode } from 'react'
import { Dialog as RDialog, DropdownMenu as RMenu } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip } from './misc'


/** Ao abrir, não coloca foco no primeiro botão (evita abrir a dica "Fechar" sozinha); foca o painel. */
const focusPanel = (e: Event) => {
  e.preventDefault()
  const el = e.currentTarget as HTMLElement
  if (!el.contains(document.activeElement)) el.focus()
}

/* ---------------- Dialog (modal central; vira "folha" de baixo no celular) ---------------- */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-50 animate-fade-in bg-slate-950/40 backdrop-blur-[2px]" />
        <RDialog.Content
          onOpenAutoFocus={focusPanel}
          className={cn(
            'fixed z-50 flex max-h-[92dvh] w-full flex-col bg-surface shadow-(--shadow-pop) outline-none',
            'inset-x-0 bottom-0 animate-slide-up rounded-t-2xl',
            'md:inset-auto md:top-1/2 md:left-1/2 md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl',
            className
          )}
        >
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border-strong md:hidden" />
          <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-2 md:px-6 md:pt-5">
            <div>
              <RDialog.Title className="text-lg font-semibold">{title}</RDialog.Title>
              {description ? (
                <RDialog.Description className="mt-1 text-sm text-muted">{description}</RDialog.Description>
              ) : (
                <RDialog.Description className="sr-only">{String(title)}</RDialog.Description>
              )}
            </div>
            <Tooltip content="Fechar" shortcut="Esc">
              <RDialog.Close className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-foreground" aria-label="Fechar">
                <X className="size-5" />
              </RDialog.Close>
            </Tooltip>
          </div>
          <div className="scroll-thin flex-1 overflow-y-auto px-5 py-3 md:px-6">{children}</div>
          {footer && (
            <div className="pb-safe flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end md:px-6">
              {footer}
            </div>
          )}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  )
}

/* ---------------- Sheet (painel lateral) ---------------- */
export function Sheet({
  open,
  onOpenChange,
  side = 'right',
  title,
  children,
  className
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  side?: 'left' | 'right'
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-50 animate-fade-in bg-slate-950/40" />
        <RDialog.Content
          onOpenAutoFocus={focusPanel}
          className={cn(
            'fixed inset-y-0 z-50 flex w-[88vw] max-w-sm flex-col bg-surface shadow-(--shadow-pop) outline-none',
            side === 'right' ? 'right-0 animate-slide-in-right' : 'left-0 animate-slide-in-left',
            className
          )}
        >
          <RDialog.Title className="sr-only">{title}</RDialog.Title>
          <RDialog.Description className="sr-only">{title}</RDialog.Description>
          {children}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  )
}

/* ---------------- Dropdown menu ---------------- */
export const Menu = RMenu.Root
export const MenuTrigger = RMenu.Trigger

export function MenuContent({ children, align = 'end', className }: { children: ReactNode; align?: 'start' | 'end' | 'center'; className?: string }) {
  return (
    <RMenu.Portal>
      <RMenu.Content
        align={align}
        sideOffset={6}
        className={cn(
          'z-50 min-w-48 animate-fade-in rounded-xl border border-border bg-surface p-1 shadow-(--shadow-pop)',
          className
        )}
      >
        {children}
      </RMenu.Content>
    </RMenu.Portal>
  )
}

export function MenuItem({
  children,
  icon,
  onSelect,
  danger,
  shortcut
}: {
  children: ReactNode
  icon?: ReactNode
  onSelect?: () => void
  danger?: boolean
  shortcut?: string
}) {
  return (
    <RMenu.Item
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] outline-none select-none data-highlighted:bg-surface-2 [&_svg]:size-4',
        danger ? 'text-danger' : 'text-foreground [&_svg]:text-muted'
      )}
    >
      {icon}
      <span className="flex-1">{children}</span>
      {shortcut && <span className="text-[11px] text-subtle">{shortcut}</span>}
    </RMenu.Item>
  )
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <RMenu.Label className="px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-subtle uppercase">{children}</RMenu.Label>
}

export function MenuSeparator() {
  return <RMenu.Separator className="my-1 h-px bg-border" />
}
