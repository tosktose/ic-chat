import {
  BookUser,
  CreditCard,
  Building2,
  CalendarDays,
  FileBarChart,
  Gauge,
  KeyRound,
  Coins,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Plug,
  ServerCog,
  Settings,
  Sparkles,
  AtSign,
  SquareKanban,
  Target,
  Users,
  type LucideIcon
} from 'lucide-react'
import type { Role } from '@/data/mock'

export interface NavItem {
  to: string
  label: string
  short?: string
  icon: LucideIcon
  badge?: number
  group: string
  /** Aparece na barra inferior do celular */
  mobile?: boolean
}

/**
 * Menu de cada perfil. Cada perfil só enxerga (e só acessa) as próprias telas.
 * - superadmin: dono do SaaS (ItaCondo) — clientes, licenças e planos
 * - gerente: gestão da empresa cliente
 * - analista: atendente humano — conversas atribuídas a ele e a fila
 */
export const navByRole: Record<Role, NavItem[]> = {
  superadmin: [
    { to: '/admin', label: 'Empresas', icon: Building2, group: 'IC Chat SaaS', mobile: true },
    { to: '/admin/usuarios', label: 'Usuários', icon: Users, group: 'IC Chat SaaS', mobile: true },
    { to: '/admin/licencas', label: 'Licenças', short: 'Licenças', icon: KeyRound, group: 'IC Chat SaaS', mobile: true },
    { to: '/admin/creditos', label: 'Créditos de IA', short: 'Créditos', icon: Coins, group: 'IC Chat SaaS', mobile: true },
    { to: '/admin/planos', label: 'Planos', icon: Layers, group: 'IC Chat SaaS' },
    { to: '/admin/sistema', label: 'Configurações do sistema', short: 'Sistema', icon: ServerCog, group: 'IC Chat SaaS' }
  ],
  gerente: [
    { to: '/dashboard', label: 'Painel do gerente', short: 'Painel', icon: LayoutDashboard, group: 'Gestão', mobile: true },
    { to: '/inbox', label: 'Atendimento', icon: MessageSquare, group: 'Gestão', mobile: true },
    { to: '/agenda', label: 'Agenda', icon: CalendarDays, group: 'Gestão', mobile: true },
    { to: '/kanban', label: 'Kanban IA', short: 'Kanban', icon: SquareKanban, group: 'Gestão', mobile: true },
    { to: '/funil', label: 'Funil de vendas', short: 'Funil', icon: Target, group: 'Gestão', mobile: true },
    { to: '/contatos', label: 'Contatos', icon: BookUser, group: 'Gestão' },
    { to: '/relatorios', label: 'Relatórios', icon: FileBarChart, group: 'Gestão' },
    { to: '/captacao', label: 'Comentário vira conversa', short: 'Captação', icon: AtSign, group: 'Configuração' },
    { to: '/ia', label: 'Assistente IA', short: 'IA', icon: Sparkles, group: 'Configuração' },
    { to: '/canais', label: 'Canais', icon: Plug, group: 'Configuração' },
    { to: '/equipe', label: 'Equipe', icon: Users, group: 'Configuração' },
    { to: '/assinar', label: 'Assinatura', short: 'Plano', icon: CreditCard, group: 'Configuração' },
    { to: '/config', label: 'Configurações', short: 'Config.', icon: Settings, group: 'Configuração' }
  ],
  analista: [
    { to: '/inbox', label: 'Meus atendimentos', short: 'Conversas', icon: MessageSquare, group: 'Atendimento', mobile: true },
    { to: '/agenda', label: 'Agenda', icon: CalendarDays, group: 'Atendimento', mobile: true },
    { to: '/contatos', label: 'Contatos', icon: BookUser, group: 'Atendimento', mobile: true },
    { to: '/meu-painel', label: 'Meu desempenho', short: 'Desempenho', icon: Gauge, group: 'Atendimento', mobile: true }
  ]
}

export const homeByRole: Record<Role, string> = {
  superadmin: '/admin',
  gerente: '/dashboard',
  analista: '/inbox'
}

export const roleLabel: Record<Role, string> = {
  superadmin: 'Super Admin',
  gerente: 'Gerente',
  analista: 'Analista'
}

export function navFor(role: Role): NavItem[] {
  return navByRole[role]
}

export function navByPath(role: Role, path: string): NavItem | undefined {
  if (path.startsWith('/perfil')) return { to: '/perfil', label: 'Meu perfil', icon: Settings, group: '' }
  // Prefere o caminho mais específico (ex.: /admin/planos antes de /admin)
  return [...navByRole[role]].sort((a, b) => b.to.length - a.to.length).find((n) => path.startsWith(n.to))
}

/** Telas que todo usuário logado acessa */
const COMMON = ['/perfil']

export function canAccess(role: Role, path: string): boolean {
  if (COMMON.includes(path)) return true
  return navByRole[role].some((n) => path === n.to || path.startsWith(n.to + '/'))
}
