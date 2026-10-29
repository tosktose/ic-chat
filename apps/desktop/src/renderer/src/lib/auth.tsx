import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AuthError, Session } from '@supabase/supabase-js'
import { isWebApp, supabase } from './supabase'

interface AuthContextValue {
  session: Session | null
  loading: boolean
  configured: boolean
  signIn: (email: string, password: string) => Promise<AuthError | null>
  signUp: (email: string, password: string, company: string) => Promise<{ error: AuthError | null; needsEmailConfirmation: boolean }>
  signInWithGoogle: () => Promise<AuthError | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isWebApp && Boolean(supabase))

  useEffect(() => {
    if (!isWebApp || !supabase) return
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
        options: { data: { company_name: company.trim() }, emailRedirectTo: window.location.origin }
      })
      return { error, needsEmailConfirmation: !error && !data.session }
    },
    signInWithGoogle: async () => {
      if (!supabase) return new Error('Supabase não configurado') as AuthError
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard`, queryParams: { access_type: 'offline', prompt: 'select_account' } }
      })
      return error
    },
    signOut: async () => { if (supabase) await supabase.auth.signOut() }
  }), [session, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth fora do AuthProvider')
  return value
}
