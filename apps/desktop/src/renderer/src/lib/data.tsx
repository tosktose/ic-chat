import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { ChannelKind } from '@/components/brand'
import {
  contacts as contactList,
  conversations as conversationList,
  type Contact,
  type Conversation,
  type Message
} from '@/data/mock'

/**
 * Contatos e conversas "vivos" (em memória até o Core estar ligado).
 * Alterações feitas aqui aparecem em todas as telas: atendimento, contatos, kanban, agenda.
 */
interface Ctx {
  version: number
  contacts: Contact[]
  conversations: Conversation[]
  contactById: (id: string) => Contact
  addContact: (c: Omit<Contact, 'id' | 'since' | 'visits' | 'spent'> & Partial<Pick<Contact, 'visits' | 'spent'>>) => Contact
  updateContact: (id: string, patch: Partial<Contact>) => void
  importContacts: (list: { name: string; phone: string; email?: string }[]) => { added: number; skipped: number }
  /** Abre (ou reaproveita) a conversa do contato no canal */
  openConversation: (contactId: string, channel?: ChannelKind) => string
  updateConversation: (id: string, patch: Partial<Conversation>) => void
  appendMessage: (id: string, msg: Omit<Message, 'id' | 'time'> & { time?: string }) => void
}

const DataCtx = createContext<Ctx | null>(null)

const now = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const onlyDigits = (s: string) => s.replace(/\D/g, '')
const sinceLabel = () => new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('. de ', '/').replace(' de ', '/').replace('.', '')

function preview(m: Omit<Message, 'id' | 'time'>): string {
  const who = m.from === 'agent' ? 'Você: ' : m.from === 'ai' ? 'IA: ' : ''
  if (m.kind === 'audio') return `${who}🎤 Áudio`
  if (m.kind === 'image') return `${who}📷 ${m.text || 'Foto'}`
  if (m.kind === 'document') return `${who}📄 ${m.fileName}`
  return who + (m.text ?? '')
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0)
  const bump = useCallback(() => setVersion((v) => v + 1), [])

  const value = useMemo<Ctx>(
    () => ({
      version,
      contacts: contactList,
      conversations: conversationList,
      contactById: (id) =>
        contactList.find((c) => c.id === id) ?? { id, name: 'Contato', phone: '', tags: [], since: '', visits: 0, spent: 0 },
      addContact: (c) => {
        const contact: Contact = { id: crypto.randomUUID(), since: sinceLabel(), visits: 0, spent: 0, ...c, tags: c.tags ?? [] }
        contactList.unshift(contact)
        bump()
        return contact
      },
      updateContact: (id, patch) => {
        const c = contactList.find((x) => x.id === id)
        if (!c) return
        Object.assign(c, patch)
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
          contactList.unshift({
            id: crypto.randomUUID(),
            name: row.name.trim(),
            phone: phone.startsWith('55') ? phone : '55' + phone,
            email: row.email || undefined,
            tags: [],
            since: sinceLabel(),
            visits: 0,
            spent: 0
          })
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
          aiEnabled: false,
          tags: [],
          messages: []
        }
        conversationList.unshift(conv)
        bump()
        return conv.id
      },
      updateConversation: (id, patch) => {
        const c = conversationList.find((x) => x.id === id)
        if (!c) return
        Object.assign(c, patch)
        bump()
      },
      appendMessage: (id, msg) => {
        const c = conversationList.find((x) => x.id === id)
        if (!c) return
        const full: Message = { ...msg, id: crypto.randomUUID(), time: msg.time ?? now() } as Message
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
        bump()
      }
    }),
    [version, bump]
  )

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>
}

export function useData(): Ctx {
  const ctx = useContext(DataCtx)
  if (!ctx) throw new Error('useData fora do DataProvider')
  return ctx
}
