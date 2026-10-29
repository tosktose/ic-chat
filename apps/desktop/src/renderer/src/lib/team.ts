import { useEffect, useState } from 'react'
import { users as demoUsers, type User } from '@/data/mock'
import { useAuth } from '@/lib/auth'
import { isWebApp, supabase } from '@/lib/supabase'

/** Equipe da empresa: no app de demonstração vêm os exemplos; na versão web vêm do banco (tenant_members). */
export function useTeam(): User[] {
  const { session } = useAuth()
  const [members, setMembers] = useState<User[]>([])

  useEffect(() => {
    if (!isWebApp || !supabase || !session) { setMembers([]); return }
    let alive = true
    void supabase.schema('ic_chat').from('tenant_members').select('user_id, role, display_name').order('created_at')
      .then(({ data, error }) => {
        if (!alive || error) return
        setMembers((data ?? []).map((m) => ({
          id: String(m.user_id),
          name: String(m.display_name ?? 'Sem nome'),
          role: m.role === 'agent' ? 'analista' : 'gerente',
          presence: m.user_id === session.user.id ? 'online' : 'offline',
          activeChats: 0
        })))
      })
    return () => { alive = false }
  }, [session])

  return isWebApp ? members : demoUsers
}
