import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { toast } from 'sonner'
import { useData } from '@/lib/data'
import { useNotifications } from '@/lib/notifications'
import { formatPhone } from '@/lib/utils'
import type { WaIncomingDTO, WaStateDTO } from '../../../preload/index.d'
import type { Conversation } from '@/data/mock'

/**
 * Ponte entre o serviço de WhatsApp (processo principal) e as telas.
 * Mensagens recebidas viram conversas no Atendimento; as enviadas saem pelo número da empresa.
 * No navegador (sem Electron) fica em modo demonstração.
 */
interface Ctx {
  /** true quando roda no app instalado (WhatsApp real disponível) */
  available: boolean
  state: WaStateDTO
  start: () => Promise<void>
  logout: () => Promise<void>
  /** Envia texto numa conversa. Devolve o id no WhatsApp ou lança erro. */
  sendText: (conv: Conversation, phone: string, text: string) => Promise<string>
  sendMedia: (conv: Conversation, phone: string, media: { blob: Blob; mime: string; fileName?: string; caption?: string; kind: 'image' | 'video' | 'document' | 'audio' }) => Promise<string>
}

const WaCtx = createContext<Ctx | null>(null)

const blobToBase64 = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(b)
  })

export function WhatsAppProvider({ children }: { children: ReactNode }) {
  const api = window.icchat?.wa
  const [state, setState] = useState<WaStateDTO>({ status: 'desconectado' })
  const data = useData()
  const { notify } = useNotifications()
  const { pathname, search } = useLocation()
  const dataRef = useRef(data)
  dataRef.current = data
  const openConvRef = useRef<string | null>(null)
  openConvRef.current = pathname.startsWith('/inbox') ? new URLSearchParams(search).get('c') : null

  // Mensagem recebida (ou enviada pelo celular) → contato + conversa + mensagem
  const onIncoming = useCallback(
    (m: WaIncomingDTO) => {
      const d = dataRef.current
      let contact = d.findContactByPhone(m.phone)
      if (!contact) {
        contact = d.addContact({ name: m.name || formatPhone(m.phone), phone: m.phone.startsWith('55') ? m.phone : m.phone, tags: [] })
      }
      const convId = d.openConversation(contact.id, 'whatsapp')
      const conv = d.conversations.find((c) => c.id === convId)!
      const patch: Partial<Conversation> = { waJid: m.chatJid }
      const time = new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      d.appendMessage(convId, {
        from: m.fromMe ? 'agent' : 'contact',
        author: m.fromMe ? 'Celular' : undefined,
        kind: m.kind,
        text: m.text,
        src: m.src,
        mime: m.mime,
        fileName: m.fileName,
        fileSize: m.fileSize,
        duration: m.seconds ? `${Math.floor(m.seconds / 60)}:${String(m.seconds % 60).padStart(2, '0')}` : undefined,
        time,
        waId: m.id,
        status: m.fromMe ? 'sent' : undefined
      })
      if (!m.fromMe) {
        const isOpen = openConvRef.current === convId
        Object.assign(patch, {
          unread: isOpen ? 0 : conv.unread + 1,
          status: conv.status === 'resolvida' ? 'nova' : conv.status
        })
        if (!isOpen) {
          const preview = m.kind === 'text' ? m.text : m.kind === 'audio' ? '🎤 Áudio' : m.kind === 'image' ? '📷 Foto' : `📄 ${m.fileName}`
          notify({ kind: 'mensagem', title: contact.name, body: preview ?? '', link: `/inbox?c=${convId}` })
        }
      }
      d.updateConversation(convId, patch)
    },
    [notify]
  )

  useEffect(() => {
    if (!api) return
    void api.state().then((r) => r.ok && setState(r.data))
    return api.on((e) => {
      if (e.type === 'state') {
        const s = e.payload as WaStateDTO
        setState((prev) => {
          if (prev.status !== 'conectado' && s.status === 'conectado') toast.success('WhatsApp conectado', { description: s.me ? formatPhone(s.me.phone) : undefined })
          if (prev.status === 'conectado' && s.status === 'desconectado' && s.error) toast.error('WhatsApp desconectado', { description: s.error })
          return s
        })
      } else if (e.type === 'message') onIncoming(e.payload as WaIncomingDTO)
      else if (e.type === 'ack') {
        const a = e.payload as { id: string; status: 'delivered' | 'read' }
        dataRef.current.updateMessageByWaId(a.id, { status: a.status })
      }
    })
  }, [api, onIncoming])

  const value = useMemo<Ctx>(
    () => ({
      available: Boolean(api),
      state,
      start: async () => {
        if (!api) return
        const r = await api.start()
        if (!r.ok) toast.error('Não foi possível iniciar o WhatsApp', { description: r.error })
      },
      logout: async () => {
        if (!api) return
        await api.logout()
      },
      sendText: async (conv, phone, text) => {
        if (!api) throw new Error('WhatsApp real disponível só no app instalado')
        const r = await api.sendText(conv.waJid ?? phone, text)
        if (!r.ok) throw new Error(r.error)
        if (!conv.waJid) dataRef.current.updateConversation(conv.id, { waJid: r.data.jid })
        return r.data.id
      },
      sendMedia: async (conv, phone, media) => {
        if (!api) throw new Error('WhatsApp real disponível só no app instalado')
        const r = await api.sendMedia(conv.waJid ?? phone, {
          base64: await blobToBase64(media.blob),
          mime: media.mime,
          fileName: media.fileName,
          caption: media.caption,
          kind: media.kind
        })
        if (!r.ok) throw new Error(r.error)
        if (!conv.waJid) dataRef.current.updateConversation(conv.id, { waJid: r.data.jid })
        return r.data.id
      }
    }),
    [api, state]
  )

  return <WaCtx.Provider value={value}>{children}</WaCtx.Provider>
}

export function useWhatsApp(): Ctx {
  const ctx = useContext(WaCtx)
  if (!ctx) throw new Error('useWhatsApp fora do WhatsAppProvider')
  return ctx
}
