import { PartyPopper } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { isWebApp, supabase } from '@/lib/supabase'

const SEEN_KEY = 'icchat.welcome.seen'

/** Parabéns na primeira entrada depois de confirmar o e-mail. Também dispara o e-mail de boas-vindas (uma vez por empresa). */
export function WelcomeActivated() {
  const { session } = useAuth()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const user = session?.user
    if (!isWebApp || !supabase || !user?.email_confirmed_at) return
    const confirmedAgo = Date.now() - new Date(user.email_confirmed_at).getTime()
    let seen = ''
    try { seen = localStorage.getItem(SEEN_KEY) ?? '' } catch { /* sem armazenamento */ }
    // Só para quem acabou de confirmar (últimas 24 horas) e ainda não viu
    if (seen.split(',').includes(user.id) || confirmedAgo > 24 * 3600_000) return
    setOpen(true)
    try { localStorage.setItem(SEEN_KEY, [...seen.split(',').filter(Boolean), user.id].join(',')) } catch { /* ignore */ }
    void supabase.functions.invoke('icchat-notify', { body: { action: 'welcome' } }).catch(() => undefined)
  }, [session?.user.id, session?.user.email_confirmed_at])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="w-full max-w-md animate-slide-up overflow-hidden rounded-3xl border border-border bg-surface text-center shadow-[0_40px_120px_-30px_rgba(2,6,23,.7)]">
        <div className="grid place-items-center bg-gradient-to-br from-emerald-500 via-teal-600 to-blue-700 px-6 pt-9 pb-8 text-white">
          <span className="grid size-16 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/30"><PartyPopper className="size-8" /></span>
        </div>
        <div className="p-6">
          <h2 id="welcome-title" className="text-lg font-bold tracking-tight">Parabéns, sua conta está ativa!</h2>
          <p className="mt-2 text-[13.5px] leading-6 text-muted">Seu e-mail foi confirmado. Você tem 7 dias para testar tudo, sem cartão. O robô guia vai te mostrar cada tela, e você pode chamá-lo quando quiser no botão "Guia".</p>
          <button onClick={() => setOpen(false)} className="mt-6 h-12 w-full rounded-xl bg-blue-700 text-sm font-semibold text-white shadow-lg shadow-blue-700/25 transition hover:bg-blue-800">Começar</button>
        </div>
      </div>
    </div>
  )
}
