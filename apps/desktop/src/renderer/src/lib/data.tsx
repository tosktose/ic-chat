import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { ChannelKind } from '@/components/brand'
import {
  contacts as contactList,
  conversations as conversationList,
  type Contact,
  type Conversation,
  type Message
} from '@/data/mock'

/**
 * Contatos, conversas e mensagens.
 * - No app instalado: salvos no banco SQLite local (começa limpo, sem dados de exemplo).
 * - No navegador: dados de demonstração em memória.
 * Alterações aparecem em todas as telas: atendimento, contatos, kanban, agenda.
 */
export const APP_MODE = typeof window !== 'undefined' && Boolean(window.icchat?.db)

// Cópia dos exemplos (para "Carregar dados de exemplo" no app instalado)
const DEMO_CONTACTS: Contact[] = structuredClone(contactList)
const DEMO_CONVERSATIONS: Conversation[] = structuredClone(conversationList)

// No app instalado a lista começa vazia e é preenchida pelo banco
if (APP_MODE) {
  contactList.splice(0)
  conversationList.splice(0)
}

interface Ctx {
  version: number
  /** false enquanto o banco carrega (app instalado) */
  ready: boolean
  contacts: Contact[]
  conversations: Conversation[]
  contactById: (id: string) => Contact
  addContact: (c: Omit<Contact, 'id' | 'since' | 'visits' | 'spent'> & Partial<Pick<Contact, 'visits' | 'spent'>>) => Contact
  updateContact: (id: string, patch: Partial<Contact>) => void
  importContacts: (list: { name: string; phone: string; email?: string }[]) => { added: number; skipped: number }
  /** Abre (ou reaproveita) a conversa do contato no canal */
  openConversation: (contactId: string, channel?: ChannelKind) => string
  updateConversation: (id: string, patch: Partial<Conversation>) => void
  /** Adiciona a mensagem e devolve o id dela */
  appendMessage: (id: string, msg: Omit<Message, 'id' | 'time'> & { time?: string }) => string
  updateMessage: (convId: string, msgId: string, patch: Partial<Message>) => void
  /** Atualiza pelo id do WhatsApp (confirmações de entrega/leitura) */
  updateMessageByWaId: (waId: string, patch: Partial<Message>) => void
  findContactByPhone: (phone: string) => Contact | undefined
  /** Guarda o arquivo (foto, áudio, documento) e devolve o endereço para exibir */
  saveMedia: (blob: Blob, mime: string, fileName?: string) => Promise<string>
  loadDemo: () => Promise<void>
  clearAll: () => Promise<void>
}

const DataCtx = createContext<Ctx | null>(null)

const now = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const onlyDigits = (s: string) => s.replace(/\D/g, '')
const sinceLabel = () => new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('. de ', '/').replace(' de ', '/').replace('.', '')

function normalizeContact(c: Partial<Contact>): Contact {
  return { since: '', visits: 0, spent: 0, ...c, id: String(c.id), name: c.name || 'Contato', phone: c.phone ?? '', tags: Array.isArray(c.tags) ? c.tags : [] }
}

const WEEKDAYS_PT = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
/** Data/hora aproximada das mensagens de exemplo ("Hoje 09:31", "Ontem 19:20", "Segunda 11:20") */
function demoTimestamp(m: Message): number {
  const d = new Date()
  const day = (m.day ?? 'Hoje').toLowerCase()
  if (day.startsWith('ontem')) d.setDate(d.getDate() - 1)
  else if (!day.startsWith('hoje')) {
    const wd = WEEKDAYS_PT.findIndex((w) => day.startsWith(w.slice(0, 3)))
    if (wd >= 0) d.setDate(d.getDate() - (((d.getDay() - wd + 7) % 7) || 7))
  }
  const [h, min] = (m.time || '12:00').split(':').map(Number)
  d.setHours(h || 0, min || 0, 0, 0)
  return d.getTime()
}

function preview(m: Omit<Message, 'id' | 'time'>): string {
  const who = m.from === 'agent' ? 'Você: ' : m.from === 'ai' ? 'IA: ' : ''
  if (m.kind === 'audio') return `${who}🎤 Áudio`
  if (m.kind === 'image') return `${who}📷 ${m.text || 'Foto'}`
  if (m.kind === 'document') return `${who}📄 ${m.fileName}`
  return who + (m.text ?? '')
}

/* ---------------- gravação no banco (só no app instalado) ---------------- */
let warned = false
function persist(job: Promise<{ ok: boolean; error?: string }> | undefined) {
  void job?.then((r) => {
    if (!r.ok && !warned) {
      warned = true
      toast.error('Não foi possível salvar no banco local', { description: r.error })
    }
  })
}
const db = () => window.icchat?.db
const saveContact = (c: Contact) => persist(db()?.upsert('contact', c.id, c))
const saveConversation = (c: Conversation) => {
  // mensagens ficam em registros separados
  const { messages: _m, ...meta } = c
  persist(db()?.upsert('conversation', c.id, meta))
}
const saveMessage = (convId: string, m: Message) => persist(db()?.upsert('message', m.id, m, convId))

const blobToBase64 = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(b)
  })

export function DataProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0)
  const [ready, setReady] = useState(!APP_MODE)
  const bump = useCallback(() => setVersion((v) => v + 1), [])

  // App instalado: carrega o banco ao abrir
  useEffect(() => {
    if (!APP_MODE) return
    void db()!.load().then((r) => {
      if (r.ok) {
        const contacts = (r.data.contacts as Partial<Contact>[]).filter((c) => c && c.id).map(normalizeContact)
        const ids = new Set(contacts.map((c) => c.id))
        const convs = (r.data.conversations as Partial<Conversation>[])
          .filter((c) => c && c.id && c.contactId && ids.has(c.contactId))
          .map((c) => ({ ...c, messages: Array.isArray(c.messages) ? c.messages : [], tags: c.tags ?? [], unread: c.unread ?? 0 }) as Conversation)
        contactList.splice(0, contactList.length, ...contacts)
        conversationList.splice(0, conversationList.length, ...convs)
      } else {
        toast.error('Não foi possível abrir o banco local', { description: r.error })
      }
      setReady(true)
      bump()
    })
  }, [bump])

  const value = useMemo<Ctx>(
    () => ({
      version,
      ready,
      contacts: contactList,
      conversations: conversationList,
      contactById: (id) =>
        contactList.find((c) => c.id === id) ?? { id, name: 'Contato', phone: '', tags: [], since: '', visits: 0, spent: 0 },
      addContact: (c) => {
        const contact: Contact = { id: crypto.randomUUID(), since: sinceLabel(), visits: 0, spent: 0, ...c, tags: c.tags ?? [] }
        contactList.unshift(contact)
        saveContact(contact)
        bump()
        return contact
      },
      updateContact: (id, patch) => {
        const c = contactList.find((x) => x.id === id)
        if (!c) return
        Object.assign(c, patch)
        saveContact(c)
        bump()
      },
      importContacts: (list) => {
        let added = 0
        let skipped = 0
        for (const row of list) {
          const phone = onlyDigits(row.phone)
          if (!row.name.trim() || phone.length < 10 || contactList.some((c) => onlyDigits(c.phone).endsWith(phone.slice(-10)))) {
            skipped++
            continue
          }
          const c: Contact = {
            id: crypto.randomUUID(),
            name: row.name.trim(),
            phone: phone.startsWith('55') ? phone : '55' + phone,
            email: row.email || undefined,
            tags: [],
            since: sinceLabel(),
            visits: 0,
            spent: 0
          }
          contactList.unshift(c)
          saveContact(c)
          added++
        }
        bump()
        return { added, skipped }
      },
      openConversation: (contactId, channel = 'whatsapp') => {
        const existing = conversationList.find((c) => c.contactId === contactId && c.channel === channel)
        if (existing) return existing.id
        const conv: Conversation = {
          id: crypto.randomUUID(),
          contactId,
          channel,
          status: 'nova',
          unread: 0,
          lastMessage: 'Nova conversa',
          lastTime: now(),
          // A IA pode fazer o primeiro atendimento (se estiver ligada em Assistente IA)
          aiEnabled: true,
          tags: [],
          messages: [],
          createdAt: Date.now()
        }
        conversationList.unshift(conv)
        saveConversation(conv)
        bump()
        return conv.id
      },
      updateConversation: (id, patch) => {
        const c = conversationList.find((x) => x.id === id)
        if (!c) return
        Object.assign(c, patch)
        saveConversation(c)
        bump()
      },
      findContactByPhone: (phone) => {
        const d = onlyDigits(phone)
        const tail = d.slice(-8)
        // compara pelos últimos 8 dígitos (resolve o 9º dígito e o +55)
        return contactList.find((c) => onlyDigits(c.phone).slice(-8) === tail)
      },
      updateMessage: (convId, msgId, patch) => {
        const c = conversationList.find((x) => x.id === convId)
        if (!c) return
        c.messages = c.messages.map((m) => {
          if (m.id !== msgId) return m
          const next = { ...m, ...patch }
          saveMessage(convId, next)
          return next
        })
        bump()
      },
      updateMessageByWaId: (waId, patch) => {
        for (const c of conversationList) {
          if (c.messages.some((m) => m.waId === waId)) {
            c.messages = c.messages.map((m) => {
              if (m.waId !== waId) return m
              const next = { ...m, ...patch }
              saveMessage(c.id, next)
              return next
            })
            bump()
            return
          }
        }
      },
      appendMessage: (id, msg) => {
        const c = conversationList.find((x) => x.id === id)
        if (!c) return ''
        const full: Message = { ...msg, id: crypto.randomUUID(), time: msg.time ?? now(), at: msg.at ?? Date.now() } as Message
        c.messages = [...c.messages, full]
        if (msg.kind !== 'system' && msg.kind !== 'note') {
          c.lastMessage = preview(msg)
          c.lastTime = full.time
        }
        // Conversa sobe para o topo da lista
        const i = conversationList.indexOf(c)
        if (i > 0 && msg.kind !== 'system') {
          conversationList.splice(i, 1)
          conversationList.unshift(c)
        }
        saveMessage(id, full)
        saveConversation(c)
        bump()
        return full.id
      },
      saveMedia: async (blob, mime, fileName) => {
        const media = window.icchat?.media
        if (!media) return URL.createObjectURL(blob)
        const r = await media.save(await blobToBase64(blob), mime, fileName)
        if (!r.ok) throw new Error(r.error)
        return r.data
      },
      loadDemo: async () => {
        for (const c of structuredClone(DEMO_CONTACTS)) {
          if (contactList.some((x) => x.id === c.id)) continue
          contactList.push(c)
          saveContact(c)
        }
        for (const conv of structuredClone(DEMO_CONVERSATIONS)) {
          if (conversationList.some((x) => x.id === conv.id)) continue
          conv.messages = conv.messages.map((m) => ({ ...m, at: m.at ?? demoTimestamp(m) }))
          conv.createdAt = conv.messages[0]?.at ?? Date.now()
          conversationList.push(conv)
          saveConversation(conv)
          conv.messages.forEach((m) => saveMessage(conv.id, m))
        }
        bump()
      },
      clearAll: async () => {
        await db()?.clear()
        contactList.splice(0)
        conversationList.splice(0)
        bump()
      }
    }),
    [version, ready, bump]
  )

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>
}

export function useData(): Ctx {
  const ctx = useContext(DataCtx)
  if (!ctx) throw new Error('useData fora do DataProvider')
  return ctx
}
