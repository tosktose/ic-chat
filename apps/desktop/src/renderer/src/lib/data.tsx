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
import { negocios as demoDeals, type Negocio } from '@/data/funil'
import { useAuth } from '@/lib/auth'
import { isWebApp, supabase } from '@/lib/supabase'

/**
 * Contatos, conversas e mensagens.
 * - No app instalado: salvos no banco SQLite local (começa limpo, sem dados de exemplo).
 * - No navegador: registros remotos no Supabase, isolados por empresa (tenant).
 * Alterações aparecem em todas as telas: atendimento, contatos, kanban, agenda.
 */
export const APP_MODE = typeof window !== 'undefined' && Boolean(window.icchat?.db)
export const REMOTE_MODE = isWebApp && Boolean(supabase)

// Cópia dos exemplos (para "Carregar dados de exemplo" no app instalado)
const DEMO_CONTACTS: Contact[] = structuredClone(contactList)
const DEMO_CONVERSATIONS: Conversation[] = structuredClone(conversationList)
const DEMO_DEALS: Negocio[] = structuredClone(demoDeals)
const dealList: Negocio[] = []

// No app instalado a lista começa vazia e é preenchida pelo banco
if (typeof window !== 'undefined') {
  contactList.splice(0)
  conversationList.splice(0)
}

interface Ctx {
  version: number
  /** false enquanto o banco carrega (app instalado) */
  ready: boolean
  contacts: Contact[]
  conversations: Conversation[]
  deals: Negocio[]
  addDeal: (deal: Omit<Negocio, 'id' | 'diasNaEtapa'>) => Negocio
  updateDeal: (id: string, patch: Partial<Negocio>) => void
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

function reportRemoteError(error: { message: string } | null) {
  if (error) toast.error('Não foi possível salvar no Supabase', { description: error.message })
}

function saveRemoteContact(c: Contact, tenantId?: string) {
  if (!supabase || !tenantId) return
  const { id, name, phone, email, tags, notes, birthday, visits, spent, source, campaign, ...extra } = c
  void supabase.schema('ic_chat').from('contacts').upsert({ id, tenant_id: tenantId, name, phone, email: email ?? null, tags, notes: notes ?? null, birthday: birthday ?? null, visits, spent, source: source ?? null, campaign: campaign ?? null, extra }, { onConflict: 'id' }).then(({ error }) => reportRemoteError(error))
}

function saveRemoteDeal(d: Negocio, tenantId?: string) {
  if (!supabase || !tenantId) return
  void supabase.schema('ic_chat').from('deals').upsert({ id: d.id, tenant_id: tenantId, contact_id: d.contactId, title: d.titulo, amount: d.valor, stage: d.etapa, probability: d.probabilidade, owner_id: null, days_in_stage: d.diasNaEtapa, next_action: d.proximaAcao ?? null, source: d.origem, campaign: d.campanha ?? null, lost_reason: d.motivoPerda ?? null, closed_at: d.etapa === 'ganho' || d.etapa === 'perdido' ? new Date().toISOString() : null }, { onConflict: 'id' }).then(({ error }) => reportRemoteError(error))
}

function saveRemoteConversation(c: Conversation, tenantId?: string) {
  if (!supabase || !tenantId) return
  void supabase.schema('ic_chat').from('conversations').upsert({ id: c.id, tenant_id: tenantId, contact_id: c.contactId, channel: c.channel, status: c.status, unread: c.unread, last_message: c.lastMessage, last_time: c.lastTime, ai_enabled: c.aiEnabled, tags: c.tags, assigned_to: null, extra: { createdAt: c.createdAt } }, { onConflict: 'id' }).then(({ error }) => reportRemoteError(error))
}

function saveRemoteMessage(convId: string, m: Message, tenantId?: string) {
  if (!supabase || !tenantId) return
  void supabase.schema('ic_chat').from('messages').upsert({ id: m.id, tenant_id: tenantId, conversation_id: convId, sender_type: m.from, kind: m.kind, content: m.text ?? '', status: m.status ?? null, provider_message_id: m.waId ?? null, sent_at: new Date(m.at ?? Date.now()).toISOString(), extra: m }, { onConflict: 'id' }).then(({ error }) => reportRemoteError(error))
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
  const { session } = useAuth()
  const [version, setVersion] = useState(0)
  const [ready, setReady] = useState(!APP_MODE && !isWebApp)
  const [tenantId, setTenantId] = useState<string>()
  const bump = useCallback(() => setVersion((v) => v + 1), [])

  // App instalado: carrega o banco ao abrir
  useEffect(() => {
    let active = true
    if (APP_MODE) {
      void db()!.load().then((r) => {
      if (!active) return
      if (r.ok) {
        const contacts = (r.data.contacts as Partial<Contact>[]).filter((c) => c && c.id).map(normalizeContact)
        const ids = new Set(contacts.map((c) => c.id))
        const convs = (r.data.conversations as Partial<Conversation>[])
          .filter((c) => c && c.id && c.contactId && ids.has(c.contactId))
          .map((c) => ({ ...c, messages: Array.isArray(c.messages) ? c.messages : [], tags: c.tags ?? [], unread: c.unread ?? 0 }) as Conversation)
        const deals = ((r.data.deals ?? []) as Partial<Negocio>[])
          .filter((d) => d && d.id && d.contactId)
          .map((d) => ({ ...d, diasNaEtapa: d.diasNaEtapa ?? 0, probabilidade: d.probabilidade ?? 0, origem: d.origem ?? 'Desconhecida' }) as Negocio)
        contactList.splice(0, contactList.length, ...contacts)
        conversationList.splice(0, conversationList.length, ...convs)
        dealList.splice(0, dealList.length, ...deals)
      } else {
        toast.error('Não foi possível abrir o banco local', { description: r.error })
      }
      setReady(true)
      bump()
    })
    } else if (isWebApp) {
      if (!session || !supabase) {
        contactList.splice(0); conversationList.splice(0); dealList.splice(0)
        setTenantId(undefined)
        setReady(true)
        bump()
        return () => { active = false }
      }
      setReady(false)
      void (async () => {
        const api = supabase.schema('ic_chat')
        const { error: provisionError } = await api.rpc('ensure_tenant_for_current_user', { requested_company: null })
        if (provisionError) throw provisionError
        const { data: member, error: memberError } = await api.from('tenant_members').select('tenant_id').eq('user_id', session.user.id).maybeSingle()
        if (memberError) throw memberError
        if (!member?.tenant_id) throw new Error('Esta conta ainda não tem uma empresa IC Chat vinculada.')
        const id = String(member.tenant_id)
        const [contacts, conversations, messages, deals] = await Promise.all([
          api.from('contacts').select('*').order('created_at'),
          api.from('conversations').select('*').order('updated_at', { ascending: false }),
          api.from('messages').select('*').order('sent_at'),
          api.from('deals').select('*').order('created_at', { ascending: false })
        ])
        for (const result of [contacts, conversations, messages, deals]) if (result.error) throw result.error
        if (!active) return
        const normalizedContacts = (contacts.data ?? []).map((row) => ({
          ...((row.extra ?? {}) as object), id: String(row.id), name: String(row.name), phone: String(row.phone ?? ''), email: row.email ?? undefined, tags: row.tags ?? [], notes: row.notes ?? undefined, birthday: row.birthday ?? undefined, visits: row.visits ?? 0, spent: Number(row.spent ?? 0), source: row.source ?? undefined, campaign: row.campaign ?? undefined, since: new Date(row.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
        })) as Contact[]
        const normalizedMessages = new Map<string, Message[]>()
        for (const row of messages.data ?? []) {
          const list = normalizedMessages.get(String(row.conversation_id)) ?? []
          list.push({ ...((row.extra ?? {}) as object), id: String(row.id), from: row.sender_type, kind: row.kind, text: row.content, status: row.status ?? undefined, waId: row.provider_message_id ?? undefined, at: new Date(row.sent_at).getTime(), time: new Date(row.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) } as Message)
          normalizedMessages.set(String(row.conversation_id), list)
        }
        const normalizedConversations = (conversations.data ?? []).map((row) => ({
          ...((row.extra ?? {}) as object), id: String(row.id), contactId: String(row.contact_id), channel: row.channel, status: row.status, unread: row.unread ?? 0, lastMessage: row.last_message ?? '', lastTime: row.last_time ?? '', aiEnabled: row.ai_enabled ?? false, tags: row.tags ?? [], createdAt: new Date(row.created_at).getTime(), messages: normalizedMessages.get(String(row.id)) ?? []
        })) as Conversation[]
        const normalizedDeals = (deals.data ?? []).map((row) => ({ id: String(row.id), contactId: String(row.contact_id), titulo: String(row.title), valor: Number(row.amount), etapa: row.stage, probabilidade: row.probability, donoId: row.owner_id ?? '', diasNaEtapa: row.days_in_stage ?? 0, proximaAcao: row.next_action ?? undefined, origem: row.source ?? 'Desconhecida', campanha: row.campaign ?? undefined, motivoPerda: row.lost_reason ?? undefined })) as Negocio[]
        contactList.splice(0, contactList.length, ...normalizedContacts)
        conversationList.splice(0, conversationList.length, ...normalizedConversations)
        dealList.splice(0, dealList.length, ...normalizedDeals)
        setTenantId(id)
        setReady(true)
        bump()
      })().catch((error: unknown) => {
        if (!active) return
        setReady(true)
        toast.error('Não foi possível carregar os dados do IC Chat', { description: error instanceof Error ? error.message : 'Verifique a configuração do Supabase.' })
      })
    }
    return () => { active = false }
  }, [bump, session?.user.id])

  const value = useMemo<Ctx>(
    () => ({
      version,
      ready,
      contacts: contactList,
      conversations: conversationList,
      deals: dealList,
      addDeal: (deal) => {
        const full: Negocio = { ...deal, id: crypto.randomUUID(), diasNaEtapa: 0 }
        dealList.unshift(full)
        persist(APP_MODE ? db()?.upsert('deal', full.id, full) : undefined)
        if (REMOTE_MODE) saveRemoteDeal(full, tenantId)
        bump()
        return full
      },
      updateDeal: (id, patch) => {
        const d = dealList.find((x) => x.id === id)
        if (!d) return
        Object.assign(d, patch)
        persist(APP_MODE ? db()?.upsert('deal', d.id, d) : undefined)
        if (REMOTE_MODE) saveRemoteDeal(d, tenantId)
        bump()
      },
      contactById: (id) =>
        contactList.find((c) => c.id === id) ?? { id, name: 'Contato', phone: '', tags: [], since: '', visits: 0, spent: 0 },
      addContact: (c) => {
        const contact: Contact = { id: crypto.randomUUID(), since: sinceLabel(), visits: 0, spent: 0, ...c, tags: c.tags ?? [] }
        contactList.unshift(contact)
        if (APP_MODE) saveContact(contact)
        if (REMOTE_MODE) saveRemoteContact(contact, tenantId)
        bump()
        return contact
      },
      updateContact: (id, patch) => {
        const c = contactList.find((x) => x.id === id)
        if (!c) return
        Object.assign(c, patch)
        if (APP_MODE) saveContact(c)
        if (REMOTE_MODE) saveRemoteContact(c, tenantId)
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
          if (APP_MODE) saveContact(c)
          if (REMOTE_MODE) saveRemoteContact(c, tenantId)
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
        if (APP_MODE) saveConversation(conv)
        if (REMOTE_MODE) saveRemoteConversation(conv, tenantId)
        bump()
        return conv.id
      },
      updateConversation: (id, patch) => {
        const c = conversationList.find((x) => x.id === id)
        if (!c) return
        Object.assign(c, patch)
        if (APP_MODE) saveConversation(c)
        if (REMOTE_MODE) saveRemoteConversation(c, tenantId)
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
          if (APP_MODE) saveMessage(convId, next)
          if (REMOTE_MODE) saveRemoteMessage(convId, next, tenantId)
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
              if (APP_MODE) saveMessage(c.id, next)
              if (REMOTE_MODE) saveRemoteMessage(c.id, next, tenantId)
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
        if (APP_MODE) { saveMessage(id, full); saveConversation(c) }
        if (REMOTE_MODE) { saveRemoteMessage(id, full, tenantId); saveRemoteConversation(c, tenantId) }
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
        if (isWebApp) return
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
        for (const deal of structuredClone(DEMO_DEALS)) {
          if (dealList.some((x) => x.id === deal.id)) continue
          dealList.push(deal)
          if (APP_MODE) persist(db()?.upsert('deal', deal.id, deal))
        }
        bump()
      },
      clearAll: async () => {
        if (APP_MODE) await db()?.clear()
        if (REMOTE_MODE && tenantId && supabase) {
          const api = supabase.schema('ic_chat')
          await api.from('deals').delete().eq('tenant_id', tenantId)
          await api.from('messages').delete().eq('tenant_id', tenantId)
          await api.from('conversations').delete().eq('tenant_id', tenantId)
          await api.from('contacts').delete().eq('tenant_id', tenantId)
        }
        contactList.splice(0)
        conversationList.splice(0)
        dealList.splice(0)
        bump()
      }
    }),
    [version, ready, bump, tenantId]
  )

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>
}

export function useData(): Ctx {
  const ctx = useContext(DataCtx)
  if (!ctx) throw new Error('useData fora do DataProvider')
  return ctx
}
