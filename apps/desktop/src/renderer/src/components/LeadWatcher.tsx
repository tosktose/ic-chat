import { useEffect } from 'react'
import { useAppState } from '@/lib/app-state'
import { useNotifications } from '@/lib/notifications'
import { isWebApp, supabase } from '@/lib/supabase'

/** Avisa (som, aviso na tela e notificação do navegador) quando chega um lead novo pelo link de captação ou por outra aba. */
export function LeadWatcher() {
  const { role } = useAppState()
  const { notify } = useNotifications()

  useEffect(() => {
    if (!isWebApp || !supabase || role !== 'gerente') return
    let since = new Date().toISOString()
    let stopped = false
    const check = async () => {
      if (document.hidden && Notification.permission !== 'granted') return
      const { data } = await supabase!.schema('ic_chat').from('conversations').select('id, last_message, created_at').gt('created_at', since).order('created_at', { ascending: false }).limit(5)
      if (stopped || !data?.length) return
      since = String(data[0].created_at)
      notify({ kind: 'mensagem', title: data.length > 1 ? `${data.length} novos contatos chegaram` : 'Novo contato chegou', body: `${String(data[0].last_message).slice(0, 80)} · atualize a página para ver na caixa de entrada.`, link: '/inbox' })
    }
    const t = setInterval(() => { void check() }, 30_000)
    return () => { stopped = true; clearInterval(t) }
  }, [role, notify])

  return null
}
