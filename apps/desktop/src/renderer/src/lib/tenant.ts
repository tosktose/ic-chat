import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

/** Id da empresa do usuário logado (versão web). Vazio enquanto carrega ou fora da web. */
export function useTenantId(): string | undefined {
  const { session } = useAuth()
  const [id, setId] = useState<string>()
  const userId = session?.user.id
  useEffect(() => {
    if (!supabase || !userId) { setId(undefined); return }
    let alive = true
    void supabase.schema('ic_chat').from('tenant_members').select('tenant_id').eq('user_id', userId).maybeSingle()
      .then(({ data }) => { if (alive) setId(data?.tenant_id ? String(data.tenant_id) : undefined) })
    return () => { alive = false }
  }, [userId])
  return id
}
