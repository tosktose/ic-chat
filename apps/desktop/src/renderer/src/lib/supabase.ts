import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://umnoiivuntnvsxkysvrr.supabase.co'
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = key ? createClient(url, key, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
}) : null

export const isWebApp = typeof window !== 'undefined' && !window.icchat?.isDesktop
export const isSupabaseMode = Boolean(supabase)
