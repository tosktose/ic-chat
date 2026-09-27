import { createContext, useContext, useState, type ReactNode } from 'react'
import { appointments as seedAppointments, sessionUsers, type Appointment, type Role, type User } from '@/data/mock'

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
  signIn: (role: Role) => void
  /** Foto do usuário logado (data URL) */
  myPhoto?: string
  setMyPhoto: (url?: string) => void
  /** Agendamentos (em memória até o Core estar ligado) */
  appointments: Appointment[]
  addAppointment: (a: Omit<Appointment, 'id'>) => void
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
  const [appointments, setAppointments] = useState<Appointment[]>(seedAppointments)
  const [signature, setSignature] = useState(true)
  const [photos, setPhotos] = useState<Record<string, string | undefined>>({})
  const [profiles, setProfiles] = useState<Record<string, ProfileOverride>>(() => {
    try {
      return JSON.parse(localStorage.getItem('icchat.profiles') ?? '{}')
    } catch {
      return {}
    }
  })
  const resolveUser = <U extends User | undefined>(u: U): U =>
    (u && profiles[u.id]?.name ? { ...u, name: profiles[u.id].name } : u) as U
  const [apptDialog, setApptDialog] = useState<{ open: boolean; contactId?: string }>({ open: false })
  const [role, setRole] = useState<Role>(() => {
    try {
      const r = localStorage.getItem('icchat.role') as Role | null
      return r && r in sessionUsers ? r : 'gerente'
    } catch {
      return 'gerente'
    }
  })

  return (
    <Ctx.Provider
      value={{
        role,
        me: resolveUser(sessionUsers[role]),
        myDisplayName:
          profiles[sessionUsers[role].id]?.displayName || resolveUser(sessionUsers[role]).name.split(' ')[0],
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
        appointments,
        addAppointment: (a) => setAppointments((list) => [...list, { ...a, id: crypto.randomUUID() }]),
        setAppointmentStatus: (id, status) =>
          setAppointments((list) =>
            status === 'cancelado' ? list.filter((a) => a.id !== id) : list.map((a) => (a.id === id ? { ...a, status } : a))
          ),
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
