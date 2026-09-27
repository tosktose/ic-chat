import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Dialog as RDialog } from 'radix-ui'
import { CalendarPlus, CornerDownLeft, Search } from 'lucide-react'
import { navFor } from '@/components/layout/nav'
import { Avatar } from '@/components/ui/misc'
import { useAppState } from '@/lib/app-state'
import { cn, formatPhone } from '@/lib/utils'
import { contacts } from '@/data/mock'

interface Item {
  id: string
  group: string
  label: string
  hint?: string
  icon: ReactNode
  run: () => void
}

export function CommandPalette() {
  const { commandOpen, setCommandOpen, role } = useAppState()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)

  const items = useMemo<Item[]>(() => {
    const go = (to: string) => () => {
      navigate(to)
      setCommandOpen(false)
    }
    const all: Item[] = [
      ...(role === 'superadmin'
        ? []
        : [{ id: 'new-appt', group: 'Ações', label: 'Novo agendamento', icon: <CalendarPlus className="size-4" />, run: go('/agenda?novo=1') }]),
      ...navFor(role).map((n) => {
        const Icon = n.icon
        return { id: n.to, group: 'Ir para', label: n.label, icon: <Icon className="size-4" />, run: go(n.to) }
      }),
      ...(role === 'superadmin' ? [] : contacts).map((c) => ({
        id: c.id,
        group: 'Contatos',
        label: c.name,
        hint: formatPhone(c.phone),
        icon: <Avatar name={c.name} size={22} />,
        run: go('/contatos')
      }))
    ]
    const term = q.trim().toLowerCase()
    return term ? all.filter((i) => (i.label + ' ' + (i.hint ?? '')).toLowerCase().includes(term)) : all.slice(0, 14)
  }, [q, navigate, setCommandOpen, role])

  const groups = [...new Set(items.map((i) => i.group))]

  return (
    <RDialog.Root
      open={commandOpen}
      onOpenChange={(v) => {
        setCommandOpen(v)
        if (!v) {
          setQ('')
          setActive(0)
        }
      }}
    >
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-50 animate-fade-in bg-slate-950/40 backdrop-blur-[2px]" />
        <RDialog.Content
          className="fixed top-[12vh] left-1/2 z-50 w-[calc(100vw-24px)] max-w-xl -translate-x-1/2 animate-slide-up overflow-hidden rounded-2xl border border-border bg-surface shadow-(--shadow-pop) outline-none"
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => Math.min(items.length - 1, a + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(0, a - 1))
            } else if (e.key === 'Enter') {
              items[active]?.run()
            }
          }}
        >
          <RDialog.Title className="sr-only">Busca rápida</RDialog.Title>
          <RDialog.Description className="sr-only">Busque telas, ações e contatos</RDialog.Description>
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="size-[18px] text-subtle" />
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setActive(0)
              }}
              placeholder="Buscar telas, ações e contatos…"
              className="h-13 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle"
            />
            <kbd className="rounded border border-border px-1.5 text-[10.5px] text-muted">Esc</kbd>
          </div>
          <div className="scroll-thin max-h-[52vh] overflow-y-auto p-2">
            {items.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted">Nada encontrado para “{q}”.</p>}
            {groups.map((g) => (
              <div key={g} className="mb-1">
                <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-subtle uppercase">{g}</p>
                {items
                  .filter((i) => i.group === g)
                  .map((i) => {
                    const idx = items.indexOf(i)
                    return (
                      <button
                        key={i.id}
                        onMouseEnter={() => setActive(idx)}
                        onClick={i.run}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm',
                          idx === active ? 'bg-primary-soft text-primary' : 'text-foreground'
                        )}
                      >
                        <span className="flex size-6 items-center justify-center text-muted">{i.icon}</span>
                        <span className="flex-1 truncate font-medium">{i.label}</span>
                        {i.hint && <span className="text-xs text-muted">{i.hint}</span>}
                        {idx === active && <CornerDownLeft className="size-3.5" />}
                      </button>
                    )
                  })}
              </div>
            ))}
          </div>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  )
}
