import type { ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router'
import { Tooltip } from 'radix-ui'
import { Toaster } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { canAccess, homeByRole } from '@/components/layout/nav'
import { AppStateProvider, useAppState } from '@/lib/app-state'
import { NotificationsProvider } from '@/lib/notifications'
import { TagsProvider } from '@/lib/tags'
import { ThemeProvider, useTheme } from '@/lib/theme'
import { AdminPage } from '@/pages/admin/AdminPage'
import { AdminLicensesPage } from '@/pages/admin/AdminLicensesPage'
import { AdminPlansPage } from '@/pages/admin/AdminPlansPage'
import { AdminSystemPage } from '@/pages/admin/AdminSystemPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { AgendaPage } from '@/pages/agenda/AgendaPage'
import { AiPage } from '@/pages/ai/AiPage'
import { MyPerformancePage } from '@/pages/analyst/MyPerformancePage'
import { ChannelsPage } from '@/pages/channels/ChannelsPage'
import { ContactsPage } from '@/pages/contacts/ContactsPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { InboxPage } from '@/pages/inbox/InboxPage'
import { KanbanPage } from '@/pages/kanban/KanbanPage'
import { LoginPage } from '@/pages/LoginPage'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { TeamPage } from '@/pages/team/TeamPage'

function ThemedToaster() {
  const { resolved } = useTheme()
  return <Toaster theme={resolved} position="bottom-right" richColors closeButton />
}

/** Só renderiza a tela se o perfil logado tiver acesso; senão volta para a tela inicial do perfil. */
function Guard({ children }: { children: ReactNode }) {
  const { role } = useAppState()
  const { pathname } = useLocation()
  if (!canAccess(role, pathname)) return <Navigate to={homeByRole[role]} replace />
  return <>{children}</>
}

function Home() {
  const { role } = useAppState()
  return <Navigate to={homeByRole[role]} replace />
}

export function App() {
  return (
    <ThemeProvider>
      <AppStateProvider>
        <Tooltip.Provider>
          <HashRouter>
            <NotificationsProvider>
            <TagsProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<AppShell />}>
                {/* Gerente */}
                <Route path="/dashboard" element={<Guard><DashboardPage /></Guard>} />
                <Route path="/kanban" element={<Guard><KanbanPage /></Guard>} />
                <Route path="/ia" element={<Guard><AiPage /></Guard>} />
                <Route path="/canais" element={<Guard><ChannelsPage /></Guard>} />
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
            </TagsProvider>
            </NotificationsProvider>
          </HashRouter>
          <ThemedToaster />
        </Tooltip.Provider>
      </AppStateProvider>
    </ThemeProvider>
  )
}
