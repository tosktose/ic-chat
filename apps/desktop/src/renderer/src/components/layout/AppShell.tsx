import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import {
  Bell,
  ChevronsUpDown,
  CircleAlert,
  KeyRound,
  LogOut,
  Menu as MenuIcon,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sun,
  UserRound
} from 'lucide-react'
import { IcLogo, IcMark } from '@/components/brand'
import { Avatar, Badge, Tooltip } from '@/components/ui/misc'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Sheet } from '@/components/ui/overlay'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { NewAppointmentDialog } from '@/components/NewAppointmentDialog'
import { navByPath, navFor, roleLabel, type NavItem } from '@/components/layout/nav'
import { useAppState } from '@/lib/app-state'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { company } from '@/data/mock'

const platform = window.icchat?.platform
const isDesktopApp = Boolean(window.icchat)
const isMacApp = platform === 'darwin'
const isWinApp = isDesktopApp && !isMacApp

export function AppShell() {
  const { setCommandOpen, sidebarHidden, setSidebarHidden } = useAppState()

  // Atalho global Ctrl/Cmd + K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandOpen(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        setSidebarHidden(!sidebarHidden)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setCommandOpen, sidebarHidden, setSidebarHidden])

  return (
    <div className="flex h-full bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <LicenseBanner />
        <main className="relative min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
        <BottomNav />
      </div>
      <CommandPalette />
      <NewAppointmentDialog />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Menu lateral (tablet e desktop)                                      */
/* ------------------------------------------------------------------ */
function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, sidebarHidden, role } = useAppState()
  const items = navFor(role)
  const groups = [...new Set(items.map((i) => i.group))]
  // Em telas médias (768–1279px) fica sempre recolhido em "trilho" de ícones
  const collapsed = sidebarCollapsed
  if (sidebarHidden) return null

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 md:flex',
        'w-[76px]',
        !collapsed && 'xl:w-[248px]'
      )}
    >
      <div className={cn('app-drag flex h-14 shrink-0 items-center px-4', isMacApp && 'pt-6 h-20')}>
        <div className={cn('flex items-center', !collapsed && 'xl:hidden', 'w-full justify-center')}>
          <IcMark size={34} />
        </div>
        {!collapsed && <IcLogo compact className="hidden xl:flex" />}
      </div>

      <nav className="scroll-thin flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-3">
        {groups.map((g, i) => (
          <NavGroup key={g} label={g} first={i === 0} items={items.filter((n) => n.group === g)} collapsed={collapsed} />
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <button
          onClick={() => setSidebarCollapsed(!collapsed)}
          className="hidden w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-muted hover:bg-surface-2 hover:text-foreground xl:flex"
        >
          {collapsed ? <PanelLeftOpen className="mx-auto size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
          {!collapsed && 'Recolher menu'}
        </button>
        <CompanyCard collapsed={collapsed} />
      </div>
    </aside>
  )
}

function NavGroup({ label, items, collapsed, first }: { label?: string; items: NavItem[]; collapsed: boolean; first?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      {label && (
        <p
          className={cn(
            'mb-1 hidden px-3 text-[11px] font-semibold tracking-wider text-subtle uppercase',
            !collapsed && 'xl:block'
          )}
        >
          {label}
        </p>
      )}
      {label && !first && <div className={cn('mx-auto mb-1 h-px w-8 bg-border', !collapsed && 'xl:hidden')} />}
      {items.map((item) => (
        <SideLink key={item.to} item={item} collapsed={collapsed} />
      ))}
    </div>
  )
}

function SideLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon
  const link = (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'group relative flex h-10 items-center gap-3 rounded-lg px-3 text-[13.5px] font-medium transition-colors',
          'justify-center',
          !collapsed && 'xl:justify-start',
          isActive
            ? 'bg-primary-soft text-primary'
            : 'text-muted hover:bg-surface-2 hover:text-foreground'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute top-2 bottom-2 -left-3 w-1 rounded-r-full bg-primary" />}
          <Icon className="size-[19px] shrink-0" />
          <span className={cn('hidden flex-1 truncate', !collapsed && 'xl:block')}>{item.label}</span>
          {item.badge ? (
            <span
              className={cn(
                'rounded-full bg-primary px-1.5 text-[10.5px] leading-[18px] font-semibold text-white',
                'absolute top-1 right-1.5',
                !collapsed && 'xl:static'
              )}
            >
              {item.badge}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  )
  // Tooltip só quando o menu está em modo ícone
  return collapsed ? <Tooltip content={item.label} side="right">{link}</Tooltip> : <>{link}</>
}

function CompanyCard({ collapsed }: { collapsed: boolean }) {
  const { role } = useAppState()
  const owner = role === 'superadmin'
  return (
    <div className={cn('mt-2 flex items-center gap-3 rounded-lg p-2', !collapsed && 'xl:bg-surface-2')}>
      <div
        className={cn(
          'mx-auto flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white',
          owner ? 'brand-gradient' : 'bg-gradient-to-br from-pink-500 to-violet-600',
          !collapsed && 'xl:mx-0'
        )}
      >
        {owner ? 'IC' : 'SB'}
      </div>
      {!collapsed && (
        <div className="hidden min-w-0 flex-1 xl:block">
          <p className="truncate text-[13px] font-semibold">{owner ? 'itaCondo' : company.name}</p>
          <p className="truncate text-[11.5px] text-muted">{owner ? 'Dono do sistema' : `Plano ${company.plan}`}</p>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Barra superior                                                        */
/* ------------------------------------------------------------------ */
function TopBar() {
  const { pathname } = useLocation()
  const { setCommandOpen, license, sidebarHidden, setSidebarHidden, role } = useAppState()
  const current = navByPath(role, pathname)
  const navigate = useNavigate()

  return (
    <header
      className={cn(
        'app-drag flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface/80 px-3 backdrop-blur md:px-5',
        isWinApp && 'pr-[150px] md:pr-[150px]'
      )}
    >
      <Tooltip content={sidebarHidden ? 'Mostrar menu' : 'Esconder menu'} side="bottom" shortcut="Ctrl B">
        <button
          onClick={() => setSidebarHidden(!sidebarHidden)}
          className="hidden size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground md:flex"
          aria-label={sidebarHidden ? 'Mostrar menu' : 'Esconder menu'}
        >
          {sidebarHidden ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
        </button>
      </Tooltip>
      {sidebarHidden && <IcMark size={28} className="hidden shrink-0 md:block" />}
      <div className="flex items-center gap-2.5 md:hidden">
        <IcMark size={28} />
      </div>
      <h1 className="min-w-0 truncate text-[15px] font-semibold md:hidden">{current?.label ?? 'IC Chat'}</h1>

      {/* Busca global */}
      <button
        onClick={() => setCommandOpen(true)}
        className="hidden h-9 w-80 items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 text-[13px] text-subtle transition-colors hover:border-border-strong lg:flex"
      >
        <Search className="size-4" />
        <span className="flex-1 truncate text-left whitespace-nowrap">{role === 'superadmin' ? 'Buscar empresas, usuários…' : 'Buscar conversas, contatos…'}</span>
        <kbd className="rounded border border-border bg-surface px-1.5 text-[10.5px] font-medium whitespace-nowrap text-muted">Ctrl K</kbd>
      </button>

      <div className="flex-1" />

      <Tooltip content="Buscar" shortcut="Ctrl K" side="bottom">
        <button
          onClick={() => setCommandOpen(true)}
          className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 lg:hidden"
          aria-label="Buscar"
        >
          <Search className="size-[18px]" />
        </button>
      </Tooltip>

      {role !== 'superadmin' && (
        <LicensePill onClick={() => navigate(role === 'gerente' ? '/config?tab=licenca' : '/inbox')} state={license.state} days={license.daysLeft} />
      )}

      <Tooltip content="Notificações" description="3 novas" side="bottom">
        <button className="relative flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground" aria-label="Notificações">
          <Bell className="size-[18px]" />
          <span className="absolute top-2 right-2 size-2 rounded-full bg-danger ring-2 ring-surface" />
        </button>
      </Tooltip>

      <UserMenu />
    </header>
  )
}

function LicensePill({ state, days, onClick }: { state: string; days: number; onClick: () => void }) {
  if (state === 'ativa') return null
  const cfg = {
    teste: { tone: 'primary' as const, text: `Teste grátis · ${days} dias` },
    vencendo: { tone: 'warning' as const, text: `Vence em ${days} dias` },
    carencia: { tone: 'danger' as const, text: 'Licença vencida' },
    restrito: { tone: 'danger' as const, text: 'Modo restrito' }
  }[state]
  if (!cfg) return null
  return (
    <button onClick={onClick} className="hidden sm:block">
      <Badge tone={cfg.tone} size="md" className="gap-1.5">
        <KeyRound />
        {cfg.text}
      </Badge>
    </button>
  )
}

function UserMenu() {
  const { theme, setTheme } = useTheme()
  const { me, role } = useAppState()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'online' | 'away' | 'busy'>('online')
  const statusLabel = { online: 'Disponível', away: 'Ausente', busy: 'Ocupado' }

  return (
    <Menu>
      <MenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg p-1 hover:bg-surface-2 md:pr-2" aria-label="Minha conta">
          <Avatar name={me.name} size={32} presence={status} />
          <div className="hidden text-left leading-tight lg:block">
            <p className="text-[13px] font-semibold">{me.name}</p>
            <p className="text-[11px] text-muted">{roleLabel[role]} · {statusLabel[status]}</p>
          </div>
          <ChevronsUpDown className="hidden size-3.5 text-subtle lg:block" />
        </button>
      </MenuTrigger>
      <MenuContent className="w-60">
        <MenuLabel>Meu status</MenuLabel>
        {(['online', 'away', 'busy'] as const).map((s) => (
          <MenuItem
            key={s}
            onSelect={() => setStatus(s)}
            icon={<span className={cn('ml-1 size-2 rounded-full', { online: 'bg-success', away: 'bg-warning', busy: 'bg-danger' }[s])} />}
          >
            {statusLabel[s]}
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuLabel>Tema</MenuLabel>
        <div className="grid grid-cols-3 gap-1 px-1 pb-1">
          {([
            ['light', Sun, 'Claro'],
            ['dark', Moon, 'Escuro'],
            ['system', Monitor, 'Sistema']
          ] as const).map(([value, Icon, label]) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg py-2 text-[11px] font-medium',
                theme === value ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface-2'
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
        <MenuSeparator />
        <MenuItem icon={<UserRound />}>Meu perfil</MenuItem>
        <MenuItem icon={<LogOut />} danger onSelect={() => navigate('/login')}>
          Sair
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}

/* ------------------------------------------------------------------ */
/* Aviso de licença (carência / modo restrito)                          */
/* ------------------------------------------------------------------ */
function LicenseBanner() {
  const { license, role } = useAppState()
  const navigate = useNavigate()
  if (role === 'superadmin') return null
  if (license.state !== 'carencia' && license.state !== 'restrito' && license.state !== 'vencendo') return null

  const cfg = {
    vencendo: {
      cls: 'bg-warning-soft text-warning border-warning/30',
      text: `Sua licença vence em ${license.daysLeft} dias (${license.expiresAt}). Renove para não interromper o atendimento.`
    },
    carencia: {
      cls: 'bg-danger-soft text-danger border-danger/30',
      text: `Licença vencida em ${license.expiresAt}. Você está no período de carência: faltam ${3 + license.daysLeft} dias para o modo restrito.`
    },
    restrito: {
      cls: 'bg-danger text-white border-danger',
      text: 'Modo restrito: o envio de mensagens, a IA e novos agendamentos estão pausados. Seus dados estão preservados.'
    }
  }[license.state]

  return (
    <div className={cn('flex items-center gap-3 border-b px-4 py-2 text-[13px] font-medium', cfg.cls)}>
      <CircleAlert className="size-4 shrink-0" />
      <p className="flex-1">{cfg.text}</p>
      {role === 'gerente' && (
        <button onClick={() => navigate('/config?tab=licenca')} className="shrink-0 rounded-md px-2 py-1 underline-offset-2 hover:underline">
          Ver licença
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Navegação inferior (celular)                                          */
/* ------------------------------------------------------------------ */
function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const { pathname } = useLocation()
  const { role, me } = useAppState()
  const items = navFor(role)
  const primary = items.filter((n) => n.mobile).slice(0, 4)
  const rest = items.filter((n) => !primary.includes(n))
  const restActive = rest.some((n) => pathname.startsWith(n.to))

  return (
    <>
      <nav
        className="pb-safe grid shrink-0 border-t border-border bg-surface md:hidden"
        style={{ gridTemplateColumns: `repeat(${primary.length + 1}, minmax(0, 1fr))` }}
      >
        {primary.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'relative flex h-15 flex-col items-center justify-center gap-1 text-[10.5px] font-medium',
                  isActive ? 'text-primary' : 'text-muted'
                )
              }
            >
              <Icon className="size-[21px]" />
              {item.short ?? item.label}
              {item.badge ? (
                <span className="absolute top-1.5 left-1/2 ml-1.5 rounded-full bg-primary px-1.5 text-[10px] leading-4 font-semibold text-white">
                  {item.badge}
                </span>
              ) : null}
            </NavLink>
          )
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn('flex h-15 flex-col items-center justify-center gap-1 text-[10.5px] font-medium', restActive ? 'text-primary' : 'text-muted')}
        >
          <MenuIcon className="size-[21px]" />
          Mais
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen} side="left" title="Menu">
        <div className="brand-gradient px-5 pt-8 pb-5">
          <IcLogo inverted />
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-white/12 p-3 text-white">
            <Avatar name={me.name} size={36} presence="online" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{me.name}</p>
              <p className="truncate text-xs text-white/75">
                {roleLabel[role]} · {role === 'superadmin' ? 'itaCondo' : company.name}
              </p>
            </div>
          </div>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium',
                    isActive ? 'bg-primary-soft text-primary' : 'text-foreground hover:bg-surface-2'
                  )
                }
              >
                <Icon className="size-5" />
                <span className="flex-1">{item.label}</span>
                {item.badge ? <Badge tone="solid">{item.badge}</Badge> : null}
              </NavLink>
            )
          })}
        </nav>
      </Sheet>
    </>
  )
}
