import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AuthError, Session } from '@supabase/supabase-js'
import { isWebApp, supabase } from './supabase'
import { clearAffiliateOAuthSignup, consumeAffiliateOAuthSignup, captureAffiliateCode, prepareAffiliateOAuthSignup } from './affiliate'
import { getSiteUrl } from './site-url'

interface AuthContextValue {
  session: Session | null
  loading: boolean
  configured: boolean
  signIn: (email: string, password: string) => Promise<AuthError | null>
  signUp: (email: string, password: string, company: string) => Promise<{ error: AuthError | null; needsEmailConfirmation: boolean }>
  signInWithGoogle: (signup?: boolean) => Promise<AuthError | null>
  signOut: () => Promise<void>
  /** Envia o e-mail de redefinição (o envio usa o SMTP/Resend configurado no Supabase) */
  requestPasswordReset: (email: string) => Promise<AuthError | null>
  updatePassword: (password: string) => Promise<AuthError | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** O banco de usuários é compartilhado entre projetos; o dono do SaaS é identificado pelo e-mail
 *  (padrão ou lista em VITE_SUPERADMIN_EMAILS) ou por role "superadmin" nos metadados do Supabase.
 *  Isso só decide o que a interface mostra; o acesso aos dados continua protegido pelas regras do banco. */
const SUPERADMIN_EMAILS = String(import.meta.env.VITE_SUPERADMIN_EMAILS ?? 'superadmin@itacondo.com.br')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export function isSuperAdmin(session: Session | null): boolean {
  if (!session?.user) return false
  const email = session.user.email?.toLowerCase()
  const role = session.user.app_metadata?.role ?? session.user.user_metadata?.role
  return role === 'superadmin' || (Boolean(email) && SUPERADMIN_EMAILS.includes(email!))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    let mounted = true
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) { setSession(data.session); setLoading(false) }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  // O OAuth não permite anexar metadados personalizados durante a criação do usuário.
  // Após o retorno, o banco valida a data da conta e grava a indicação uma única vez.
  useEffect(() => {
    if (!isWebApp || !supabase || !session?.user) return
    const pending = consumeAffiliateOAuthSignup()
    if (!pending) return
    void supabase.schema('ic_chat').rpc('claim_affiliate_referral', {
      p_code: pending.code,
      p_started_at: pending.startedAt
    }).then(({ error }) => {
      if (!error) clearAffiliateOAuthSignup()
    })
  }, [session?.user.id])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    loading,
    configured: Boolean(supabase),
    signIn: async (email, password) => {
      if (!supabase) return new Error('Supabase não configurado') as AuthError
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return error
    },
    signUp: async (email, password, company) => {
      if (!supabase) return { error: new Error('Supabase não configurado') as AuthError, needsEmailConfirmation: false }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      options: {
        data: { company_name: company.trim(), app: 'icchat', affiliate_referral_code: captureAffiliateCode() },
        emailRedirectTo: getSiteUrl()
      }
      })
      return { error, needsEmailConfirmation: !error && !data.session }
    },
    signInWithGoogle: async (signup = false) => {
      if (!supabase) return new Error('Supabase não configurado') as AuthError
      if (signup) prepareAffiliateOAuthSignup()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${getSiteUrl()}/dashboard`, queryParams: { access_type: 'offline', prompt: 'select_account' } }
      })
      return error
    },
    signOut: async () => { if (supabase) await supabase.auth.signOut() },
    requestPasswordReset: async (email) => {
      if (!supabase) return new Error('Supabase não configurado') as AuthError
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${getSiteUrl()}/redefinir-senha` })
      return error
    },
    updatePassword: async (password) => {
      if (!supabase) return new Error('Supabase não configurado') as AuthError
      const { error } = await supabase.auth.updateUser({ password })
      return error
    }
  }), [session, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth fora do AuthProvider')
  return value
}
