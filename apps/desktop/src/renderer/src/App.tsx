import { lazy, Suspense, type ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router'
import { Tooltip } from 'radix-ui'
import { Toaster } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { canAccess, homeByRole } from '@/components/layout/nav'
import { AppStateProvider, useAppState } from '@/lib/app-state'
import { CompanyProvider } from '@/lib/company'
import { DataProvider } from '@/lib/data'
import { GoogleProvider } from '@/lib/google'
import { SaasProvider } from '@/lib/saas'
import { NotificationsProvider } from '@/lib/notifications'
import { TagsProvider } from '@/lib/tags'
import { WhatsAppProvider } from '@/lib/whatsapp'
import { ThemeProvider, useTheme } from '@/lib/theme'
import { LoginPage } from '@/pages/LoginPage'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const AdminPage = lazy(() => import('@/pages/admin/AdminPage').then((m) => ({ default: m.AdminPage })))
const AdminLicensesPage = lazy(() => import('@/pages/admin/AdminLicensesPage').then((m) => ({ default: m.AdminLicensesPage })))
const AdminPlansPage = lazy(() => import('@/pages/admin/AdminPlansPage').then((m) => ({ default: m.AdminPlansPage })))
const AdminSystemPage = lazy(() => import('@/pages/admin/AdminSystemPage').then((m) => ({ default: m.AdminSystemPage })))
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })))
const AgendaPage = lazy(() => import('@/pages/agenda/AgendaPage').then((m) => ({ default: m.AgendaPage })))
const AiPage = lazy(() => import('@/pages/ai/AiPage').then((m) => ({ default: m.AiPage })))
const MyPerformancePage = lazy(() => import('@/pages/analyst/MyPerformancePage').then((m) => ({ default: m.MyPerformancePage })))
const ChannelsPage = lazy(() => import('@/pages/channels/ChannelsPage').then((m) => ({ default: m.ChannelsPage })))
const ContactsPage = lazy(() => import('@/pages/contacts/ContactsPage').then((m) => ({ default: m.ContactsPage })))
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const InboxPage = lazy(() => import('@/pages/inbox/InboxPage').then((m) => ({ default: m.InboxPage })))
const KanbanPage = lazy(() => import('@/pages/kanban/KanbanPage').then((m) => ({ default: m.KanbanPage })))
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const TeamPage = lazy(() => import('@/pages/team/TeamPage').then((m) => ({ default: m.TeamPage })))
function ThemedToaster() {
  const { resolved } = useTheme()
  return <Toaster theme={resolved} position="bottom-right" richColors closeButton />
}

/** Só renderiza a tela se o perfil logado tiver acesso; senão volta para a tela inicial do perfil. */
function Guard({ children }: { children: ReactNode }) {
  const { role } = useAppState()
  const { pathname } = useLocation()
  if (!canAccess(role, pathname)) return <Navigate to={homeByRole[role]} replace />
  // Telas carregadas sob demanda (o app abre mais rápido)
  return (
    <ErrorBoundary resetKey={pathname}>
      <Suspense fallback={<PageLoading />}>{children}</Suspense>
    </ErrorBoundary>
  )
}

function PageLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <span className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-label="Carregando" />
    </div>
  )
}

function Home() {
  const { role } = useAppState()
  // Ao abrir o app: entra direto só se a pessoa marcou "Manter conectado"
  let keep = false
  try {
    keep = localStorage.getItem('icchat.keep') === '1'
  } catch {
    /* ignore */
  }
  return <Navigate to={keep ? homeByRole[role] : '/login'} replace />
}

export function App() {
  return (
    <ErrorBoundary full>
    <ThemeProvider>
      <AppStateProvider>
      <CompanyProvider>
      <DataProvider>
      <GoogleProvider>
      <SaasProvider>
        <Tooltip.Provider>
          <HashRouter>
            <NotificationsProvider>
            <TagsProvider>
            <WhatsAppProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<AppShell />}>
                {/* Gerente */}
                <Route path="/dashboard" element={<Guard><DashboardPage /></Guard>} />
                <Route path="/kanban" element={<Guard><KanbanPage /></Guard>} />
                <Route path="/ia" element={<Guard><AiPage /></Guard>} />
                <Route path="/canais" element={<Guard><ChannelsPage /></Guard>} />
                <Route path="/relatorios" element={<Guard><ReportsPage /></Guard>} />
                <Route path="/equipe" element={<Guard><TeamPage /></Guard>} />
                <Route path="/config" element={<Guard><SettingsPage /></Guard>} />
                {/* Gerente e analista */}
                <Route path="/inbox" element={<Guard><InboxPage /></Guard>} />
                <Route path="/agenda" element={<Guard><AgendaPage /></Guard>} />
                <Route path="/contatos" element={<Guard><ContactsPage /></Guard>} />
                {/* Todos os perfis */}
                <Route path="/perfil" element={<Guard><ProfilePage /></Guard>} />
                {/* Analista */}
                <Route path="/meu-painel" element={<Guard><MyPerformancePage /></Guard>} />
                {/* Super Admin (dono do SaaS) */}
                <Route path="/admin" element={<Guard><AdminPage /></Guard>} />
                <Route path="/admin/usuarios" element={<Guard><AdminUsersPage /></Guard>} />
                <Route path="/admin/licencas" element={<Guard><AdminLicensesPage /></Guard>} />
                <Route path="/admin/planos" element={<Guard><AdminPlansPage /></Guard>} />
                <Route path="/admin/sistema" element={<Guard><AdminSystemPage /></Guard>} />
              </Route>
              <Route path="/" element={<Home />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
            </WhatsAppProvider>
            </TagsProvider>
            </NotificationsProvider>
          </HashRouter>
          <ThemedToaster />
        </Tooltip.Provider>
      </SaasProvider>
      </GoogleProvider>
      </DataProvider>
      </CompanyProvider>
      </AppStateProvider>
    </ThemeProvider>
    </ErrorBoundary>
  )
}
