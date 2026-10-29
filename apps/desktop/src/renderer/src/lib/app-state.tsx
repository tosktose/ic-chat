import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { appointments as seedAppointments, sessionUsers, type Appointment, type Role, type User } from '@/data/mock'
import { isSuperAdmin, useAuth } from '@/lib/auth'
import { isWebApp, supabase } from '@/lib/supabase'

/** Estados da licença (seção 5.8 do documento do projeto) */
export type LicenseState = 'ativa' | 'teste' | 'vencendo' | 'carencia' | 'restrito'

export interface LicenseInfo {
  state: LicenseState
  plan: 'Start' | 'Pro' | 'Business'
  key: string
  expiresAt: string
  daysLeft: number
  pcsUsed: number
  pcsMax: number | null
  lastCheck: string
}

const presets: Record<LicenseState, Partial<LicenseInfo>> = {
  ativa: { daysLeft: 142, expiresAt: '15/02/2027' },
  teste: { daysLeft: 5, expiresAt: '02/10/2026' },
  vencendo: { daysLeft: 3, expiresAt: '30/09/2026' },
  carencia: { daysLeft: -1, expiresAt: '26/09/2026' },
  restrito: { daysLeft: -4, expiresAt: '23/09/2026' }
}

interface AppState {
  /** Perfil logado: define o painel e o menu que a pessoa vê */
  role: Role
  me: User
  /** Nome que o cliente vê nas mensagens (padrão: primeiro nome) */
  myDisplayName: string
  myPhone?: string
  /** Salva nome, nome exibido e celular do usuário logado — reflete no sistema todo */
  updateMyProfile: (p: ProfileOverride) => void
  /** Aplica as alterações de perfil a qualquer usuário (listas, conversas, painel) */
  resolveUser: <U extends User | undefined>(u: U) => U
  /** Meu status: define se a URA pode me encaminhar clientes */
  myPresence: 'online' | 'away' | 'busy'
  setMyPresence: (p: 'online' | 'away' | 'busy') => void
  signIn: (role: Role) => void
  /** Foto do usuário logado (data URL) */
  myPhoto?: string
  setMyPhoto: (url?: string) => void
  /** Agendamentos (em memória até o Core estar ligado) */
  /** Agendamentos ativos (sem os cancelados) */
  appointments: Appointment[]
  /** Todos, inclusive cancelados (relatórios e indicadores) */
  appointmentLog: Appointment[]
  addAppointment: (a: Omit<Appointment, 'id'>) => Appointment
  updateAppointment: (id: string, patch: Partial<Appointment>) => void
  /** 'cancelado' remove o horário da agenda */
  setAppointmentStatus: (id: string, status: Appointment['status'] | 'cancelado') => void
  /** Janela "Novo agendamento", abre de qualquer tela (opcionalmente já com o cliente) */
  apptDialog: { open: boolean; contactId?: string }
  openNewAppointment: (contactId?: string) => void
  closeNewAppointment: () => void
  /** Mensagens do analista saem com o nome dele em negrito (o WhatsApp é um só, da empresa) */
  signature: boolean
  setSignature: (v: boolean) => void
  license: LicenseInfo
  simulateLicense: (s: LicenseState) => void
  /** Ativa uma chave nova (no sistema real, validada pelo servidor de licenças) */
  activateLicense: (key: string) => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (v: boolean) => void
  sidebarHidden: boolean
  setSidebarHidden: (v: boolean) => void
  commandOpen: boolean
  setCommandOpen: (v: boolean) => void
}

export interface ProfileOverride {
  name?: string
  displayName?: string
  phone?: string
}

const Ctx = createContext<AppState | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const tenantIdRef = useRef<string | undefined>(undefined)
  const [license, setLicense] = useState<LicenseInfo>({
    state: 'teste',
    plan: 'Pro',
    key: 'ICCH-7K2M-Q9XD-4TPL-8WNB',
    expiresAt: '02/10/2026',
    daysLeft: 5,
    pcsUsed: 2,
    pcsMax: 10,
    lastCheck: 'há 12 min'
  })
  const [sidebarCollapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('icchat.sidebar') === 'collapsed'
    } catch {
      return false
    }
  })
  const [sidebarHidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem('icchat.sidebar.hidden') === '1'
    } catch {
      return false
    }
  })
  const [commandOpen, setCommandOpen] = useState(false)
  // App instalado: agendamentos vêm do banco local; navegador: exemplos
  const appMode = Boolean(window.icchat?.db)
  const [appointments, setAppointments] = useState<Appointment[]>(appMode || isWebApp ? [] : seedAppointments)
  useEffect(() => {
    let active = true
    if (appMode) {
      void window.icchat!.db.load().then((r) => r.ok && active && setAppointments(r.data.appointments as Appointment[]))
    } else if (isWebApp && session && supabase) {
      void (async () => {
        const { data, error } = await supabase.schema('ic_chat').from('appointments').select('*').order('starts_at')
        if (error) throw error
        if (!active) return
        setAppointments((data ?? []).map((row) => {
          const start = new Date(row.starts_at)
          const end = new Date(row.ends_at)
          return { ...(row.extra ?? {}), id: String(row.id), contactId: String(row.contact_id ?? ''), professionalId: String(row.professional_id ?? ''), service: row.service_name ?? '', start: start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), end: end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), date: start.toISOString().slice(0, 10), status: row.status, origin: row.origin, price: Number(row.amount ?? 0) } as Appointment
        }))
      })().catch((error: unknown) => console.error('IC Chat appointments:', error))
    } else if (isWebApp) setAppointments([])
    return () => { active = false }
  }, [appMode, session?.user.id])
  const saveAppt = (a: Appointment) => {
    if (appMode) { void window.icchat?.db.upsert('appointment', a.id, a); return }
    if (!isWebApp || !session || !supabase) return
    void (async () => {
      if (!tenantIdRef.current) {
        const { data, error } = await supabase.schema('ic_chat').from('tenant_members').select('tenant_id').eq('user_id', session.user.id).maybeSingle()
        if (error) throw error
        tenantIdRef.current = data?.tenant_id
      }
      if (!tenantIdRef.current) throw new Error('Empresa não encontrada para esta conta.')
      const date = a.date ?? new Date().toISOString().slice(0, 10)
      const startsAt = new Date(`${date}T${a.start}:00`).toISOString()
      const endsAt = new Date(`${date}T${a.end}:00`).toISOString()
      const { error } = await supabase.schema('ic_chat').from('appointments').upsert({ id: a.id, tenant_id: tenantIdRef.current, contact_id: a.contactId || null, professional_id: null, service_name: a.service, starts_at: startsAt, ends_at: endsAt, status: a.status, origin: a.origin, amount: a.price, extra: { ...a, professionalId: a.professionalId } }, { onConflict: 'id' })
      if (error) throw error
    })().catch((error: unknown) => console.error('IC Chat appointments:', error))
  }
  const activeAppointments = useMemo(() => appointments.filter((a) => a.status !== 'cancelado'), [appointments])
  const [signature, setSignature] = useState(true)
  const [photos, setPhotos] = useState<Record<string, string | undefined>>({})
  const [profiles, setProfiles] = useState<Record<string, ProfileOverride>>(() => {
    try {
      return JSON.parse(localStorage.getItem('icchat.profiles') ?? '{}')
    } catch {
      return {}
    }
  })
  const [myPresence, setPresenceState] = useState<'online' | 'away' | 'busy'>(() => {
    try {
      const p = localStorage.getItem('icchat.presence')
      return p === 'away' || p === 'busy' ? p : 'online'
    } catch {
      return 'online'
    }
  })
  const resolveUser = <U extends User | undefined>(u: U): U => {
    if (!u) return u
    let out: User = u
    if (profiles[u.id]?.name) out = { ...out, name: profiles[u.id].name! }
    if (u.id === sessionUsers[role].id) out = { ...out, presence: myPresence }
    return out as U
  }
  const [apptDialog, setApptDialog] = useState<{ open: boolean; contactId?: string }>({ open: false })
  const [role, setRole] = useState<Role>(() => {
    if (isWebApp) return isSuperAdmin(session) ? 'superadmin' : 'gerente'
    try {
      const r = localStorage.getItem('icchat.role') as Role | null
      return r && r in sessionUsers ? r : 'gerente'
    } catch {
      return 'gerente'
    }
  })

  // Na versão web o perfil vem de quem está logado (o banco de usuários é compartilhado)
  const webRole: Role = isSuperAdmin(session) ? 'superadmin' : 'gerente'
  useEffect(() => {
    if (isWebApp) setRole(webRole)
  }, [webRole])

  return (
    <Ctx.Provider
      value={{
        role: isWebApp ? webRole : role,
        me: isWebApp && session?.user ? {
          id: session.user.id,
          name: String(session.user.user_metadata?.full_name ?? session.user.user_metadata?.name ?? session.user.email ?? 'Minha conta'),
          role: webRole, presence: 'online', activeChats: 0
        } : resolveUser(sessionUsers[role]),
        myPresence,
        setMyPresence: (p) => {
          setPresenceState(p)
          try {
            localStorage.setItem('icchat.presence', p)
          } catch {
            /* ignore */
          }
        },
        myDisplayName: isWebApp && session?.user
          ? String(session.user.user_metadata?.full_name ?? session.user.user_metadata?.name ?? session.user.email ?? 'Você').split(' ')[0]
          : profiles[sessionUsers[role].id]?.displayName || resolveUser(sessionUsers[role]).name.split(' ')[0],
        myPhone: profiles[sessionUsers[role].id]?.phone,
        resolveUser,
        updateMyProfile: (p) => {
          const id = sessionUsers[role].id
          setProfiles((all) => {
            const next = { ...all, [id]: { ...all[id], ...p } }
            try {
              localStorage.setItem('icchat.profiles', JSON.stringify(next))
            } catch {
              /* ignore */
            }
            return next
          })
        },
        myPhoto:
          photos[sessionUsers[role].id] ??
          (() => {
            try {
              return localStorage.getItem(`icchat.photo.${sessionUsers[role].id}`) ?? undefined
            } catch {
              return undefined
            }
          })(),
        setMyPhoto: (url) => {
          const id = sessionUsers[role].id
          setPhotos((p) => ({ ...p, [id]: url }))
          try {
            if (url) localStorage.setItem(`icchat.photo.${id}`, url)
            else localStorage.removeItem(`icchat.photo.${id}`)
          } catch {
            /* sem espaço: mantém só nesta sessão */
          }
        },
        appointments: activeAppointments,
        appointmentLog: appointments,
        addAppointment: (a) => {
          const appt: Appointment = { createdAt: Date.now(), createdBy: sessionUsers[role].id, ...a, id: crypto.randomUUID() }
          setAppointments((list) => [...list, appt])
          saveAppt(appt)
          return appt
        },
        updateAppointment: (id, patch) =>
          setAppointments((list) =>
            list.map((x) => {
              if (x.id !== id) return x
              const next = { ...x, ...patch }
              saveAppt(next)
              return next
            })
          ),
        setAppointmentStatus: (id, status) =>
          setAppointments((list) => {
            if (status === 'cancelado' && !appMode) return list.filter((a) => a.id !== id)
            return list.map((a) => {
              if (a.id !== id) return a
              const next = { ...a, status }
              saveAppt(next)
              return next
            })
          }),
        apptDialog,
        openNewAppointment: (contactId) => setApptDialog({ open: true, contactId }),
        closeNewAppointment: () => setApptDialog({ open: false }),
        signIn: (r) => {
          setRole(r)
          try {
            localStorage.setItem('icchat.role', r)
          } catch {
            /* ignore */
          }
        },
        signature,
        setSignature,
        license,
        simulateLicense: (state) => setLicense((l) => ({ ...l, ...presets[state], state })),
        activateLicense: (key) => {
          const exp = new Date(Date.now() + 30 * 86400_000)
          setLicense((l) => ({ ...l, key, state: 'ativa', daysLeft: 30, expiresAt: exp.toLocaleDateString('pt-BR'), lastCheck: 'agora' }))
        },
        sidebarCollapsed,
        setSidebarCollapsed: (v) => {
          setCollapsed(v)
          try {
            localStorage.setItem('icchat.sidebar', v ? 'collapsed' : 'expanded')
          } catch {
            /* ignore */
          }
        },
        sidebarHidden,
        setSidebarHidden: (v) => {
          setHidden(v)
          try {
            localStorage.setItem('icchat.sidebar.hidden', v ? '1' : '0')
          } catch {
            /* ignore */
          }
        },
        commandOpen,
        setCommandOpen
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useAppState(): AppState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAppState fora do provider')
  return ctx
}
