import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAppState } from '@/lib/app-state'
import { playSound, type SoundId } from '@/lib/sound'
import type { Role } from '@/data/mock'

export type NotificationKind = 'mensagem' | 'ia' | 'agenda' | 'alerta' | 'licenca' | 'equipe' | 'sistema'

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body?: string
  /** Tela para abrir ao clicar */
  link?: string
  at: number
  read: boolean
}

export interface NotificationPrefs {
  toast: boolean
  sound: boolean
  soundId: SoundId
  /** 0 a 1 */
  volume: number
  desktop: boolean
  kinds: Record<NotificationKind, boolean>
}

interface Ctx {
  notifications: AppNotification[]
  unread: number
  notify: (n: Omit<AppNotification, 'id' | 'at' | 'read'>) => void
  markRead: (id: string) => void
  markAllRead: () => void
  remove: (id: string) => void
  clearAll: () => void
  open: (n: AppNotification) => void
  prefs: NotificationPrefs
  setPrefs: (p: NotificationPrefs) => void
  desktopPermission: NotificationPermission | 'unsupported'
  requestDesktopPermission: () => void
}

const NotificationsCtx = createContext<Ctx | null>(null)

const DEFAULT_PREFS: NotificationPrefs = {
  toast: true,
  sound: true,
  soundId: 'suave',
  volume: 0.7,
  desktop: true,
  kinds: { mensagem: true, ia: true, agenda: true, alerta: true, licenca: true, equipe: true, sistema: true }
}

const min = (m: number) => Date.now() - m * 60_000

/** Notificações iniciais de cada perfil (demonstração até o Core enviar eventos reais) */
function seedFor(role: Role): AppNotification[] {
  const base: Record<Role, Omit<AppNotification, 'id' | 'read'>[]> = {
    gerente: [
      { kind: 'alerta', title: 'Reclamação na fila', body: 'Gabriel Souza está esperando há 40 min. A IA marcou como prioridade.', link: '/inbox?c=v4', at: min(3) },
      { kind: 'ia', title: 'IA agendou um horário', body: 'Camila Rodrigues · Hidratação qui 15h com Diego', link: '/agenda', at: min(18) },
      { kind: 'mensagem', title: '2 conversas novas sem responsável', body: 'Larissa Gomes e Lucas Martins aguardam na fila.', link: '/inbox', at: min(35) },
      { kind: 'licenca', title: 'Seu teste grátis termina em 5 dias', body: 'Fale com o suporte para ativar o plano Pro.', link: '/config?tab=licenca', at: min(60 * 5) },
      { kind: 'equipe', title: 'Renata Alves ficou offline', body: 'Última atividade há 12 dias.', link: '/equipe', at: min(60 * 26) }
    ],
    analista: [
      { kind: 'mensagem', title: 'Maria Silva respondeu', body: '“Pode ser às 10h então! 😊”', link: '/inbox?c=v1', at: min(2) },
      { kind: 'equipe', title: 'Conversa atribuída a você', body: 'A IA transferiu Maria Silva: cliente pediu atendimento humano.', link: '/inbox?c=v1', at: min(9) },
      { kind: 'agenda', title: 'Lembrete: horário em 30 min', body: 'Juliana Ferreira · Corte + escova às 11h com Ana', link: '/agenda', at: min(40) }
    ],
    superadmin: [
      { kind: 'licenca', title: 'Salão Glamour entrou em carência', body: 'Licença vencida em 26/09. Restam 2 dias para o modo restrito.', link: '/admin', at: min(12) },
      { kind: 'alerta', title: 'Pet Shop Amigo Fiel em modo restrito', body: 'Sem renovação há 7 dias. Aviso enviado por WhatsApp e e-mail.', link: '/admin', at: min(60 * 3) },
      { kind: 'sistema', title: 'Teste termina esta semana', body: 'Studio Bella · teste grátis vence em 02/10.', link: '/admin', at: min(60 * 6) },
      { kind: 'equipe', title: 'Novo usuário criado', body: 'Bruna Teixeira (Analista) · Clínica Derma+', link: '/admin/usuarios', at: min(60 * 30) }
    ]
  }
  return base[role].map((n, i) => ({ ...n, id: `seed-${role}-${i}`, read: i >= 2 }))
}

/** Eventos "ao vivo" simulados — no sistema real chegam do Core via WebSocket */
const LIVE: Record<Role, Omit<AppNotification, 'id' | 'at' | 'read'>[]> = {
  gerente: [
    { kind: 'mensagem', title: 'Nova conversa no WhatsApp', body: 'Rafael Almeida: “Vocês abrem domingo?”', link: '/inbox' },
    { kind: 'ia', title: 'IA transferiu uma conversa', body: 'Fernanda Costa pediu para falar com uma pessoa.', link: '/inbox?c=v2' },
    { kind: 'agenda', title: 'Horário confirmado pelo cliente', body: 'João Pedro Santos confirmou sexta 18h.', link: '/agenda' }
  ],
  analista: [
    { kind: 'mensagem', title: 'João Pedro Santos respondeu', body: '“Beleza, até sexta!”', link: '/inbox?c=v3' },
    { kind: 'equipe', title: 'Nova conversa atribuída a você', body: 'Larissa Gomes · penteado de noiva', link: '/inbox?c=v5' }
  ],
  superadmin: [
    { kind: 'sistema', title: 'Validação de licença', body: 'Clínica Derma+ validou a licença (14 PCs ativos).', link: '/admin/licencas' },
    { kind: 'licenca', title: 'Espaço Bem-Estar vence em 3 dias', body: 'Aviso automático enviado por WhatsApp e e-mail.', link: '/admin' }
  ]
}

function loadPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem('icchat.notifyPrefs')
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS
  } catch {
    return DEFAULT_PREFS
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { role, license } = useAppState()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<AppNotification[]>(() => seedFor(role))
  const [prefs, setPrefsState] = useState<NotificationPrefs>(loadPrefs)
  const [desktopPermission, setDesktopPermission] = useState<Ctx['desktopPermission']>(() =>
    'Notification' in window ? Notification.permission : 'unsupported'
  )
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs

  // Cada perfil tem suas notificações
  useEffect(() => {
    setNotifications(seedFor(role))
  }, [role])

  const markRead = useCallback((id: string) => setNotifications((l) => l.map((n) => (n.id === id ? { ...n, read: true } : n))), [])

  const open = useCallback(
    (n: AppNotification) => {
      markRead(n.id)
      if (n.link) navigate(n.link)
    },
    [markRead, navigate]
  )

  const notify = useCallback<Ctx['notify']>(
    (input) => {
      const p = prefsRef.current
      if (!p.kinds[input.kind]) return
      const n: AppNotification = { ...input, id: crypto.randomUUID(), at: Date.now(), read: false }
      setNotifications((l) => [n, ...l].slice(0, 100))

      if (p.sound) playSound(p.soundId, p.volume)
      if (p.toast) {
        toast(n.title, {
          description: n.body,
          action: n.link ? { label: 'Ver', onClick: () => open(n) } : undefined
        })
      }
      // Fora de foco: notificação do Windows/macOS + janela piscando na barra de tarefas
      const away = document.hidden || !document.hasFocus()
      if (away) {
        window.icchat?.flashFrame()
        if (p.desktop && 'Notification' in window && Notification.permission === 'granted') {
          const native = new Notification(n.title, { body: n.body, icon: './favicon.png', tag: n.id })
          native.onclick = () => {
            window.focus()
            open(n)
            native.close()
          }
        }
      }
    },
    [open]
  )

  // Avisos da licença viram notificação quando o estado muda
  const lastLicense = useRef(license.state)
  useEffect(() => {
    if (lastLicense.current === license.state || role === 'superadmin') {
      lastLicense.current = license.state
      return
    }
    lastLicense.current = license.state
    const msg = {
      ativa: { kind: 'sistema' as const, title: 'Licença ativa', body: `Válida até ${license.expiresAt}.` },
      teste: { kind: 'licenca' as const, title: `Teste grátis: ${license.daysLeft} dias restantes`, body: 'Ative o plano para continuar depois do teste.' },
      vencendo: { kind: 'licenca' as const, title: `Licença vence em ${license.daysLeft} dias`, body: `Vencimento em ${license.expiresAt}. Renove para não interromper o atendimento.` },
      carencia: { kind: 'alerta' as const, title: 'Licença vencida: período de carência', body: 'O sistema continua funcionando por mais alguns dias.' },
      restrito: { kind: 'alerta' as const, title: 'Modo restrito ativado', body: 'Envio de mensagens, IA e novos agendamentos pausados.' }
    }[license.state]
    notify({ ...msg, link: role === 'gerente' ? '/config?tab=licenca' : undefined })
  }, [license.state, license.daysLeft, license.expiresAt, role, notify])

  // Eventos em tempo real (simulados)
  useEffect(() => {
    const pool = LIVE[role]
    let i = 0
    const fire = () => {
      notify(pool[i % pool.length])
      i++
    }
    const first = setTimeout(fire, 25_000)
    const every = setInterval(fire, 90_000)
    return () => {
      clearTimeout(first)
      clearInterval(every)
    }
  }, [role, notify])

  const unread = notifications.filter((n) => !n.read).length

  // Contador no título da janela/aba
  useEffect(() => {
    document.title = unread ? `(${unread}) IC Chat` : 'IC Chat'
  }, [unread])

  const value = useMemo<Ctx>(
    () => ({
      notifications,
      unread,
      notify,
      markRead,
      markAllRead: () => setNotifications((l) => l.map((n) => ({ ...n, read: true }))),
      remove: (id) => setNotifications((l) => l.filter((n) => n.id !== id)),
      clearAll: () => setNotifications([]),
      open,
      prefs,
      setPrefs: (p) => {
        setPrefsState(p)
        try {
          localStorage.setItem('icchat.notifyPrefs', JSON.stringify(p))
        } catch {
          /* ignore */
        }
      },
      desktopPermission,
      requestDesktopPermission: () => {
        if (!('Notification' in window)) return
        void Notification.requestPermission().then(setDesktopPermission)
      }
    }),
    [notifications, unread, notify, markRead, open, prefs, desktopPermission]
  )

  return <NotificationsCtx.Provider value={value}>{children}</NotificationsCtx.Provider>
}

export function useNotifications(): Ctx {
  const ctx = useContext(NotificationsCtx)
  if (!ctx) throw new Error('useNotifications fora do NotificationsProvider')
  return ctx
}
