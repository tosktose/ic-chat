import { useState } from 'react'
import { Popover } from 'radix-ui'
import { formatDistanceToNowStrict } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ArrowLeft,
  Bell,
  BellOff,
  Bot,
  CalendarCheck,
  Check,
  CheckCheck,
  Info,
  KeyRound,
  MessageSquare,
  Settings2,
  TriangleAlert,
  Users,
  Volume2,
  VolumeX,
  X,
  type LucideIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Segmented, Switch, Tooltip } from '@/components/ui/misc'
import { useNotifications, type AppNotification, type NotificationKind } from '@/lib/notifications'
import { playSound, SOUNDS, type SoundId } from '@/lib/sound'
import { cn } from '@/lib/utils'

const KIND: Record<NotificationKind, { icon: LucideIcon; cls: string; label: string }> = {
  mensagem: { icon: MessageSquare, cls: 'bg-primary-soft text-primary', label: 'Mensagens e conversas' },
  ia: { icon: Bot, cls: 'bg-violet-500/12 text-violet-600 dark:text-violet-300', label: 'Ações da IA' },
  agenda: { icon: CalendarCheck, cls: 'bg-teal-500/12 text-teal-600 dark:text-teal-300', label: 'Agenda' },
  alerta: { icon: TriangleAlert, cls: 'bg-warning-soft text-warning', label: 'Alertas e prioridades' },
  licenca: { icon: KeyRound, cls: 'bg-danger-soft text-danger', label: 'Licença' },
  equipe: { icon: Users, cls: 'bg-surface-3 text-muted', label: 'Equipe e atribuições' },
  sistema: { icon: Info, cls: 'bg-surface-3 text-muted', label: 'Sistema' }
}

const ago = (t: number) =>
  Date.now() - t < 60_000 ? 'agora' : formatDistanceToNowStrict(t, { locale: ptBR, addSuffix: true })

export function NotificationBell() {
  const { notifications, unread, markAllRead, clearAll } = useNotifications()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'lista' | 'prefs'>('lista')
  const [filter, setFilter] = useState<'todas' | 'nao-lidas'>('todas')

  const list = filter === 'nao-lidas' ? notifications.filter((n) => !n.read) : notifications
  const today = list.filter((n) => Date.now() - n.at < 24 * 3600_000)
  const older = list.filter((n) => Date.now() - n.at >= 24 * 3600_000)

  return (
    <Popover.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) setView('lista')
      }}
    >
      <Tooltip content="Notificações" description={unread ? `${unread} não lida${unread > 1 ? 's' : ''}` : 'Tudo em dia'} side="bottom">
        <Popover.Trigger asChild>
          <button
            className={cn(
              'relative flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground',
              open && 'bg-surface-2 text-foreground'
            )}
            aria-label="Notificações"
          >
            <Bell className="size-[18px]" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] leading-none font-bold text-white ring-2 ring-surface">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        </Popover.Trigger>
      </Tooltip>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={8}
          className="z-50 flex max-h-[min(640px,calc(100dvh-80px))] w-[min(400px,calc(100vw-16px))] animate-slide-up flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-(--shadow-pop) outline-none"
        >
          {view === 'prefs' ? (
            <Prefs onBack={() => setView('lista')} />
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-border px-4 pt-3.5 pb-3">
                <p className="flex-1 text-[15px] font-semibold">Notificações</p>
                <Button variant="ghost" size="icon-sm" aria-label="Marcar todas como lidas" onClick={markAllRead} disabled={!unread}>
                  <CheckCheck />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Limpar todas" onClick={clearAll} disabled={!notifications.length}>
                  <BellOff />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Preferências de notificação" onClick={() => setView('prefs')}>
                  <Settings2 />
                </Button>
              </div>
              <div className="px-4 pt-3">
                <Segmented
                  size="sm"
                  className="w-full"
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: 'todas', label: 'Todas' },
                    { value: 'nao-lidas', label: 'Não lidas', count: unread }
                  ]}
                />
              </div>

              <div className="scroll-thin flex-1 overflow-y-auto p-2">
                {list.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                      <Check className="size-6" />
                    </span>
                    <p className="font-semibold">Tudo em dia</p>
                    <p className="text-[13px] text-muted">Nenhuma notificação {filter === 'nao-lidas' ? 'não lida' : 'por aqui'}.</p>
                  </div>
                ) : (
                  <>
                    {today.length > 0 && <Group title="Hoje" items={today} onNavigate={() => setOpen(false)} />}
                    {older.length > 0 && <Group title="Anteriores" items={older} onNavigate={() => setOpen(false)} />}
                  </>
                )}
              </div>
            </>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function Group({ title, items, onNavigate }: { title: string; items: AppNotification[]; onNavigate: () => void }) {
  return (
    <div className="mb-1">
      <p className="px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-subtle uppercase">{title}</p>
      {items.map((n) => (
        <Item key={n.id} n={n} onNavigate={onNavigate} />
      ))}
    </div>
  )
}

function Item({ n, onNavigate }: { n: AppNotification; onNavigate: () => void }) {
  const { open, markRead, remove } = useNotifications()
  const k = KIND[n.kind]
  const Icon = k.icon
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        open(n)
        onNavigate()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          open(n)
          onNavigate()
        }
      }}
      className={cn(
        'group relative flex cursor-pointer gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-surface-2',
        !n.read && 'bg-primary-soft/50'
      )}
    >
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', k.cls)}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1 pr-14">
        <p className={cn('text-[13.5px] leading-snug', n.read ? 'font-medium' : 'font-semibold')}>{n.title}</p>
        {n.body && <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-muted">{n.body}</p>}
        <p className="mt-1 text-[11px] text-subtle">{ago(n.at)}</p>
      </div>
      {!n.read && <span className="absolute top-3.5 right-3 size-2 rounded-full bg-primary group-hover:hidden" />}
      <div className="absolute top-2 right-2 hidden items-center gap-0.5 group-hover:flex" onClick={(e) => e.stopPropagation()}>
        {!n.read && (
          <Button variant="ghost" size="icon-sm" aria-label="Marcar como lida" onClick={() => markRead(n.id)}>
            <Check />
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" aria-label="Remover" onClick={() => remove(n.id)}>
          <X />
        </Button>
      </div>
    </div>
  )
}

function Prefs({ onBack }: { onBack: () => void }) {
  const { prefs, setPrefs, desktopPermission, requestDesktopPermission, notify } = useNotifications()
  const row = (title: string, desc: string, checked: boolean, onChange: (v: boolean) => void) => (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-2.5 py-2.5 hover:bg-surface-2">
      <div>
        <p className="text-[13.5px] font-medium">{title}</p>
        <p className="text-xs text-muted">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-3 py-3">
        <Button variant="ghost" size="icon-sm" aria-label="Voltar" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <p className="text-[15px] font-semibold">Preferências</p>
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto p-2">
        <p className="px-2.5 pt-1 pb-1 text-[11px] font-semibold tracking-wider text-subtle uppercase">Como avisar</p>
        {row('Aviso na tela', 'Cartão no canto da tela com botão “Ver”', prefs.toast, (v) => setPrefs({ ...prefs, toast: v }))}
        {row('Som', 'Toque a cada nova notificação', prefs.sound, (v) => setPrefs({ ...prefs, sound: v }))}
        {prefs.sound && <SoundControls />}
        {row('Notificação do Windows', 'Quando o IC Chat estiver minimizado ou em segundo plano', prefs.desktop, (v) => {
          setPrefs({ ...prefs, desktop: v })
          if (v && desktopPermission === 'default') requestDesktopPermission()
        })}
        {desktopPermission === 'denied' && (
          <p className="mx-2.5 mb-2 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
            As notificações do sistema estão bloqueadas nas configurações do Windows/navegador.
          </p>
        )}

        <p className="px-2.5 pt-3 pb-1 text-[11px] font-semibold tracking-wider text-subtle uppercase">O que avisar</p>
        {(Object.keys(KIND) as NotificationKind[]).map((k) =>
          row(KIND[k].label, '', prefs.kinds[k], (v) => setPrefs({ ...prefs, kinds: { ...prefs.kinds, [k]: v } }))
        )}
      </div>
      <div className="border-t border-border p-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => notify({ kind: 'sistema', title: 'Notificação de teste', body: 'Assim chegam os avisos do IC Chat.' })}
        >
          <Bell /> Enviar notificação de teste
        </Button>
      </div>
    </>
  )
}

/** Escolha do som, volume e botão de teste (usado aqui e em "Meu perfil") */
export function SoundControls() {
  const { prefs, setPrefs } = useNotifications()
  return (
    <div className="mx-2.5 mb-2 flex flex-col gap-2.5 rounded-xl bg-surface-2 p-3">
      <div className="flex items-center gap-2">
        <select
          value={prefs.soundId}
          onChange={(e) => {
            const soundId = e.target.value as SoundId
            setPrefs({ ...prefs, soundId })
            playSound(soundId, prefs.volume)
          }}
          className="h-8 flex-1 rounded-lg border border-border bg-surface px-2 text-[13px] outline-none focus:border-primary"
          aria-label="Som da notificação"
        >
          {SOUNDS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <Button variant="outline" size="icon-sm" aria-label="Ouvir o som" onClick={() => playSound(prefs.soundId, prefs.volume)}>
          <Volume2 />
        </Button>
      </div>
      <label className="flex items-center gap-3 text-xs text-muted">
        <VolumeX className="size-4 shrink-0" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={prefs.volume}
          onChange={(e) => setPrefs({ ...prefs, volume: Number(e.target.value) })}
          onPointerUp={() => playSound(prefs.soundId, prefs.volume)}
          className="h-1.5 flex-1 accent-(--primary)"
          aria-label="Volume"
        />
        <Volume2 className="size-4 shrink-0" />
        <span className="w-9 text-right tabular-nums">{Math.round(prefs.volume * 100)}%</span>
      </label>
    </div>
  )
}
