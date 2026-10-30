import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useLocation } from 'react-router'
import { Tooltip } from 'radix-ui'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/react'
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
import { AiProvider } from '@/lib/ai'
import { ThemeProvider, useTheme } from '@/lib/theme'
import { LoginPage } from '@/pages/LoginPage'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthProvider, useAuth } from '@/lib/auth'
import { isWebApp } from '@/lib/supabase'
import { AuthPage } from '@/pages/AuthPage'
import { LandingPage } from '@/pages/LandingPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { LegalPage } from '@/pages/LegalPage'
import { SeoLanding } from '@/pages/SeoLanding'
import { KEYWORD_PAGES } from '@/seo/pages'
import { ForgotPasswordPage, ResetPasswordPage } from '@/pages/PasswordResetPage'
import { SubscribePage, CheckoutReturnPage } from '@/pages/billing/SubscribePage'
import { LicenseGate } from '@/components/LicenseGate'
import { CookieConsent } from '@/components/CookieConsent'
import { DownloadPage } from '@/pages/DownloadPage'

const Router = isWebApp ? BrowserRouter : HashRouter

const AdminPage = lazy(() => import('@/pages/admin/AdminPage').then((m) => ({ default: m.AdminPage })))
const AdminCreditsPage = lazy(() => import('@/pages/admin/AdminCreditsPage').then((m) => ({ default: m.AdminCreditsPage })))
const AdminLicensesPage = lazy(() => import('@/pages/admin/AdminLicensesPage').then((m) => ({ default: m.AdminLicensesPage })))
const AdminPlansPage = lazy(() => import('@/pages/admin/AdminPlansPage').then((m) => ({ default: m.AdminPlansPage })))
const AdminSystemPage = lazy(() => import('@/pages/admin/AdminSystemPage').then((m) => ({ default: m.AdminSystemPage })))
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })))
const AdminAffiliatesPage = lazy(() => import('@/pages/admin/AdminAffiliatesPage').then((m) => ({ default: m.AdminAffiliatesPage })))
const MyAffiliatesPage = lazy(() => import('@/pages/affiliate/MyAffiliatesPage').then((m) => ({ default: m.MyAffiliatesPage })))
const ChargesPage = lazy(() => import('@/pages/billing/ChargesPage').then((m) => ({ default: m.ChargesPage })))
const BroadcastPage = lazy(() => import('@/pages/social/BroadcastPage').then((m) => ({ default: m.BroadcastPage })))
const LeadFormPage = lazy(() => import('@/pages/public/LeadFormPage').then((m) => ({ default: m.LeadFormPage })))
const AgendaPage = lazy(() => import('@/pages/agenda/AgendaPage').then((m) => ({ default: m.AgendaPage })))
const AiPage = lazy(() => import('@/pages/ai/AiPage').then((m) => ({ default: m.AiPage })))
const MyPerformancePage = lazy(() => import('@/pages/analyst/MyPerformancePage').then((m) => ({ default: m.MyPerformancePage })))
const ChannelsPage = lazy(() => import('@/pages/channels/ChannelsPage').then((m) => ({ default: m.ChannelsPage })))
const ContactsPage = lazy(() => import('@/pages/contacts/ContactsPage').then((m) => ({ default: m.ContactsPage })))
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const InboxPage = lazy(() => import('@/pages/inbox/InboxPage').then((m) => ({ default: m.InboxPage })))
const CaptacaoPage = lazy(() => import('@/pages/social/CaptacaoPage').then((m) => ({ default: m.CaptacaoPage })))
const FunilPage = lazy(() => import('@/pages/funil/FunilPage').then((m) => ({ default: m.FunilPage })))
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
  const { session, loading } = useAuth()
  if (loading) return <PageLoading />
  if (!session) return <Navigate to="/login" replace state={{ from: pathname }} />
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
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-background" role="status" aria-label="Carregando">
      <span className="relative grid size-[76px] place-items-center">
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        <img src="/favicon.png" alt="" className="size-10 rounded-[10px]" />
      </span>
      <span className="h-[3px] w-[120px] overflow-hidden rounded-full bg-primary/15"><span className="block h-full w-[45%] animate-pulse rounded-full bg-primary" /></span>
      <p className="text-[13px] tracking-wide text-muted">Carregando seu painel…</p>
    </div>
  )
}

function Home() {
  const { role } = useAppState()
  const { session, loading } = useAuth()
  if (loading) return <PageLoading />
  if (isWebApp) {
    return <Navigate to={session ? homeByRole[role] : '/'} replace />
  }
  // Ao abrir o app: entra direto só se a pessoa marcou "Manter conectado"
  let keep = false
  try {
    keep = localStorage.getItem('icchat.keep') === '1'
  } catch {
    /* ignore */
  }
  return <Navigate to={session && keep ? homeByRole[role] : '/login'} replace />
}

export function App() {
  return (
    <AuthProvider>
    <ErrorBoundary full>
    <ThemeProvider>
      <AppStateProvider>
      <CompanyProvider>
      <DataProvider>
      <GoogleProvider>
      <SaasProvider>
        <Tooltip.Provider>
          <Router>
            <NotificationsProvider>
            <TagsProvider>
            <WhatsAppProvider>
            <AiProvider>
            <Routes>
              <Route path="/" element={isWebApp ? <LandingPage /> : <Home />} />
              <Route path="/login" element={isWebApp ? <AuthPage mode="login" /> : <LoginPage />} />
              {isWebApp && <Route path="/c/:tenantId" element={<Suspense fallback={<PageLoading />}><LeadFormPage /></Suspense>} />}
              {isWebApp && <Route path="/download" element={<DownloadPage />} />}
              <Route path="/cadastro" element={isWebApp ? <AuthPage mode="signup" /> : <LoginPage />} />
              {isWebApp && <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />}
              {isWebApp && <Route path="/redefinir-senha" element={<ResetPasswordPage />} />}
              {isWebApp && KEYWORD_PAGES.map((p) => <Route key={p.path} path={p.path} element={<SeoLanding path={p.path} />} />)}
              <Route path="/privacidade" element={<LegalPage kind="privacidade" />} />
              <Route path="/termos" element={<LegalPage kind="termos" />} />
              <Route element={<LicenseGate><AppShell /></LicenseGate>}>
                {/* Gerente */}
                <Route path="/dashboard" element={<Guard><DashboardPage /></Guard>} />
                <Route path="/kanban" element={<Guard><KanbanPage /></Guard>} />
                <Route path="/funil" element={<Guard><FunilPage /></Guard>} />
                <Route path="/captacao" element={<Guard><CaptacaoPage /></Guard>} />
                <Route path="/cobrancas" element={<Guard><ChargesPage /></Guard>} />
                <Route path="/disparos" element={<Guard><BroadcastPage /></Guard>} />
                <Route path="/ia" element={<Guard><AiPage /></Guard>} />
                <Route path="/canais" element={<Guard><ChannelsPage /></Guard>} />
                <Route path="/relatorios" element={<Guard><ReportsPage /></Guard>} />
                <Route path="/equipe" element={<Guard><TeamPage /></Guard>} />
                <Route path="/assinar" element={<Guard><SubscribePage /></Guard>} />
                <Route path="/assinar/retorno" element={<Guard><CheckoutReturnPage /></Guard>} />
                <Route path="/config" element={<Guard><SettingsPage /></Guard>} />
                {/* Gerente e analista */}
                <Route path="/inbox" element={<Guard><InboxPage /></Guard>} />
                <Route path="/agenda" element={<Guard><AgendaPage /></Guard>} />
                <Route path="/contatos" element={<Guard><ContactsPage /></Guard>} />
                {/* Todos os perfis */}
                <Route path="/perfil" element={<Guard><ProfilePage /></Guard>} />
                {/* Analista */}
                <Route path="/meu-painel" element={<Guard><MyPerformancePage /></Guard>} />
                <Route path="/afiliados" element={<Guard><MyAffiliatesPage /></Guard>} />
                {/* Super Admin (dono do SaaS) */}
                <Route path="/admin" element={<Guard><AdminPage /></Guard>} />
                <Route path="/admin/usuarios" element={<Guard><AdminUsersPage /></Guard>} />
                <Route path="/admin/afiliados" element={<Guard><AdminAffiliatesPage /></Guard>} />
                <Route path="/admin/licencas" element={<Guard><AdminLicensesPage /></Guard>} />
                <Route path="/admin/creditos" element={<Guard><AdminCreditsPage /></Guard>} />
                <Route path="/admin/planos" element={<Guard><AdminPlansPage /></Guard>} />
                <Route path="/admin/sistema" element={<Guard><AdminSystemPage /></Guard>} />
              </Route>
              <Route path="*" element={isWebApp ? <NotFoundPage /> : <Navigate to="/login" replace />} />
            </Routes>
            {isWebApp && <CookieConsent />}
            </AiProvider>
            </WhatsAppProvider>
            </TagsProvider>
            </NotificationsProvider>
          </Router>
          <ThemedToaster />
        </Tooltip.Provider>
      </SaasProvider>
      </GoogleProvider>
      </DataProvider>
      </CompanyProvider>
      </AppStateProvider>
    </ThemeProvider>
    </ErrorBoundary>
    {isWebApp && <Analytics />}
    </AuthProvider>
  )
}
