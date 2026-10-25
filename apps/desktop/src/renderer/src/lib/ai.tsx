import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { TODAY, users, type Conversation, type Message } from '@/data/mock'
import { useAppState } from '@/lib/app-state'
import { describeHours, toMinutes, useCompany, weekdayOf, WEEKDAYS } from '@/lib/company'
import { useData } from '@/lib/data'
import { useGoogle } from '@/lib/google'
import { useNotifications } from '@/lib/notifications'
import { freeSlots, isFree, toHHMM } from '@/lib/slots'
import { brl } from '@/lib/utils'
import { useWhatsApp } from '@/lib/whatsapp'
import { addDays } from '@/data/history'
import { loadKnowledge } from '@/pages/ai/KnowledgeCard'
import type { AiProviderId } from '../../../preload/index.d'

/**
 * Assistente IA + URA.
 * - A IA faz o primeiro atendimento das conversas novas (com a chave do próprio cliente).
 * - Quando precisa de alguém da equipe, transfere: a conversa entra na fila da URA.
 * - A URA encaminha, por ordem de chegada, para o analista disponível que está há mais tempo livre,
 *   com notificação visual e sonora. Sem ninguém disponível, a conversa espera na fila.
 */

export const AI_PROVIDERS: Record<
  AiProviderId,
  { label: string; models: string[]; keyHint: string; keyUrl: string; local?: boolean; nota?: string }
> = {
  ollama: {
    label: 'Ollama (neste computador)',
    models: ['llama3.2', 'qwen2.5', 'mistral', 'gemma3'],
    keyHint: '',
    keyUrl: 'https://ollama.com/download',
    local: true,
    nota: 'Sem chave e sem custo por mensagem. A conversa do cliente nao sai deste computador.'
  },
  anthropic: { label: 'Anthropic (Claude)', models: ['claude-sonnet-5', 'claude-haiku-4-5', 'claude-opus-5-5'], keyHint: 'sk-ant-…', keyUrl: 'https://console.anthropic.com/settings/keys' },
  openai: { label: 'OpenAI (GPT)', models: ['gpt-5-mini', 'gpt-5'], keyHint: 'sk-…', keyUrl: 'https://platform.openai.com/api-keys' },
  google: { label: 'Google (Gemini)', models: ['gemini-2.5-flash', 'gemini-2.5-pro'], keyHint: 'AIza…', keyUrl: 'https://aistudio.google.com/apikey' },
  openrouter: { label: 'OpenRouter', models: ['auto'], keyHint: 'sk-or-…', keyUrl: 'https://openrouter.ai/keys' }
}

export interface AiConfig {
  enabled: boolean
  provider: AiProviderId
  model: string
  name: string
  tone: 'formal' | 'amigavel' | 'descontraido'
  instructions: string
  emojis: boolean
  tools: { agenda: boolean; agendar: boolean; precos: boolean; historico: boolean }
  handoff: { pedido: boolean; reclamacao: boolean; incerteza: boolean; foraAssunto: boolean }
  /** Quando a IA atende */
  schedule: 'sempre' | 'fora' | 'fila'
  /** Limite de tokens por mês (0 = sem limite) */
  monthlyLimit: number
  /** URA: encaminhar automaticamente para o analista mais livre */
  autoRoute: boolean
  /** Máximo de conversas abertas por analista para receber da URA */
  maxPerAnalyst: number
}

const DEFAULT_CONFIG: AiConfig = {
  enabled: false,
  provider: 'anthropic',
  model: 'claude-sonnet-5',
  name: 'Bella',
  tone: 'amigavel',
  instructions:
    'Seja simpática e objetiva. Sempre ofereça até 3 horários livres. Nunca invente preços: consulte a tabela. Se o cliente reclamar ou pedir para falar com alguém, transfira para a equipe.',
  emojis: true,
  tools: { agenda: true, agendar: true, precos: true, historico: false },
  handoff: { pedido: true, reclamacao: true, incerteza: true, foraAssunto: true },
  schedule: 'sempre',
  monthlyLimit: 1_000_000,
  autoRoute: true,
  maxPerAnalyst: 5
}

const CFG_KEY = 'icchat.ai.config.v1'
const USAGE_KEY = 'icchat.ai.usage.v1'
const month = () => TODAY.slice(0, 7)
/** Espera o cliente terminar de digitar antes de responder */
const REPLY_DELAY_MS = 4000
/** Não responde mensagens antigas (ex.: histórico que chega ao conectar o WhatsApp) */
const MAX_AGE_MS = 6 * 60 * 60 * 1000

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}

export interface ParsedReply {
  text: string
  handoff?: string
  booking?: { date: string; time: string; service: string; pro: string }
}

/** Separa a mensagem ao cliente dos comandos [[TRANSFERIR]] e [[AGENDAR]] */
export function parseReply(raw: string): ParsedReply {
  let text = raw
  let handoff: string | undefined
  let booking: ParsedReply['booking']
  const t = /\[\[\s*TRANSFERIR\s*:?\s*([^\]]*)\]\]/i.exec(text)
  if (t) {
    handoff = t[1].trim() || 'A IA pediu ajuda da equipe'
    text = text.replace(t[0], '')
  }
  const a = /\[\[\s*AGENDAR\s*:\s*(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})\s*\|\s*([^|\]]+)\|\s*([^\]]+)\]\]/i.exec(text)
  if (a) {
    booking = { date: a[1], time: a[2].padStart(5, '0'), service: a[3].trim(), pro: a[4].trim() }
    text = text.replace(a[0], '')
  }
  // Remove qualquer outro comando que o modelo tenha inventado
  text = text.replace(/\[\[[^\]]*\]\]/g, '').trim()
  return { text, handoff, booking }
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

function toTurn(m: Message): { role: 'user' | 'assistant'; content: string } | null {
  if (m.kind === 'system' || m.kind === 'note') return null
  const body =
    m.kind === 'audio'
      ? '[o cliente enviou um áudio]'
      : m.kind === 'image'
        ? `[foto]${m.text ? ' ' + m.text : ''}`
        : m.kind === 'document'
          ? `[documento: ${m.fileName ?? 'arquivo'}]`
          : m.text ?? ''
  return { role: m.from === 'contact' ? 'user' : 'assistant', content: body }
}

interface Ctx {
  /** true no app instalado (a IA chama o provedor pelo processo principal) */
  available: boolean
  config: AiConfig
  update: (patch: Partial<AiConfig>) => void
  keyInfo: { masked: string; checkedAt?: number } | null
  saveKey: (key: string) => Promise<void>
  removeKey: () => Promise<void>
  testKey: () => Promise<void>
  usage: { month: string; tokens: number }
  /** IA ligada e com chave */
  active: boolean
  /** Conversas que a IA está respondendo agora */
  typing: string[]
  /** Fila da URA em ordem de atendimento */
  queue: Conversation[]
  /** Transfere uma conversa da IA para a equipe */
  handoff: (convId: string, reason: string) => void
  /** Devolve a conversa para a IA (tira o responsável) */
  giveBackToAi: (convId: string) => void
  /** Pré-visualização na tela da IA (nada é enviado a clientes) */
  simulate: (turns: { role: 'user' | 'assistant'; content: string }[]) => Promise<ParsedReply>
}

const AiCtx = createContext<Ctx | null>(null)

export function AiProvider({ children }: { children: ReactNode }) {
  const api = window.icchat?.ai
  const [config, setConfig] = useState<AiConfig>(() => readJson(CFG_KEY, DEFAULT_CONFIG))
  const [usage, setUsage] = useState(() => {
    const u = readJson(USAGE_KEY, { month: month(), tokens: 0 })
    return u.month === month() ? u : { month: month(), tokens: 0 }
  })
  const [keys, setKeys] = useState<Record<AiProviderId, { masked: string; checkedAt?: number } | null> | null>(null)
  const [typing, setTyping] = useState<string[]>([])

  const data = useData()
  const { conversations, version } = data
  const app = useAppState()
  const company = useCompany()
  const google = useGoogle()
  const wa = useWhatsApp()
  const { notify } = useNotifications()

  // Sempre a versão mais recente dentro de timers e promessas
  const ref = useRef({ data, app, company, google, wa, notify, config, usage })
  ref.current = { data, app, company, google, wa, notify, config, usage }

  useEffect(() => {
    try {
      localStorage.setItem(CFG_KEY, JSON.stringify(config))
    } catch {
      /* ignore */
    }
  }, [config])
  useEffect(() => {
    try {
      localStorage.setItem(USAGE_KEY, JSON.stringify(usage))
    } catch {
      /* ignore */
    }
  }, [usage])

  const refreshKeys = useCallback(async () => {
    if (!api) return
    const r = await api.status()
    if (r.ok) setKeys(r.data)
  }, [api])
  useEffect(() => {
    void refreshKeys()
  }, [refreshKeys])

  const keyInfo = keys?.[config.provider] ?? null
  const active = Boolean(api && config.enabled && keyInfo)

  /* ------------------------------------------------------------------ instruções */
  const buildSystem = useCallback((conv?: Conversation): string => {
    const { company: co, app: st, config: cfg } = ref.current
    const { info, services, professionals, professionalById } = co
    const now = new Date()
    const pros = professionals.filter((p) => p.active)
    const tone = { formal: 'formal e educado', amigavel: 'amigável e acolhedor', descontraido: 'descontraído e leve' }[cfg.tone]
    const lines: string[] = []
    lines.push(
      `Você é ${cfg.name}, assistente virtual de atendimento de ${info.name}${info.segment ? ` (${info.segment})` : ''}, conversando com clientes pelo WhatsApp.`,
      `Agora: ${WEEKDAYS[now.getDay()].toLowerCase()}, ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`,
      `Tom de voz: ${tone}. ${cfg.emojis ? 'Pode usar emojis com moderação.' : 'Não use emojis.'}`,
      'Responda em português do Brasil, em mensagens curtas (até 3 frases), como numa conversa de WhatsApp. Não use markdown com títulos ou listas longas.',
      `Fale só sobre ${info.name} e seus serviços. Se perguntarem, diga que é a assistente virtual. Nunca invente informações que não estão aqui.`,
      'Se o cliente mandar áudio, peça com gentileza para escrever, porque você ainda não consegue ouvir áudios.'
    )
    if (cfg.instructions.trim()) lines.push('', '## Instruções do dono do negócio', cfg.instructions.trim())

    lines.push('', '## Empresa', `Nome: ${info.name}`)
    if (info.address) lines.push(`Endereço: ${info.address}`)
    if (info.phone) lines.push(`Telefone: ${info.phone}`)
    if (info.instagram) lines.push(`Instagram: ${info.instagram}`)
    lines.push(`Funcionamento: ${describeHours(info.hours)}`)

    lines.push('', '## Serviços')
    for (const s of services) {
      const who = pros.filter((p) => !p.serviceIds.length || p.serviceIds.includes(s.id)).map((p) => p.name)
      lines.push(`- ${s.name} · duração ${s.minutes} min${cfg.tools.precos ? ` · ${brl.format(s.price)}` : ''}${who.length ? ` · com ${who.join(', ')}` : ''}`)
    }
    if (!cfg.tools.precos) lines.push('Não informe preços: diga que a equipe passa o valor.')

    lines.push('', '## Profissionais', ...pros.map((p) => `- ${p.name}${p.specialty ? ` (${p.specialty})` : ''}`))

    const kb = loadKnowledge()
    if (kb.length) {
      lines.push('', '## Base de conhecimento')
      let size = 0
      for (const k of kb) {
        const txt = `- ${k.title}: ${k.content}`.slice(0, 3000)
        size += txt.length
        if (size > 15000) break
        lines.push(txt)
      }
    }

    if (conv) {
      const c = ref.current.data.contactById(conv.contactId)
      lines.push('', '## Cliente desta conversa', `Nome: ${c.name}`)
      const fav = professionalById(c.favoriteProfessional)
      if (fav) lines.push(`Profissional preferido: ${fav.name} (ofereça primeiro os horários dela/dele)`)
      if (cfg.tools.historico) {
        if (c.notes) lines.push(`Observações da equipe: ${c.notes}`)
        const mine = st.appointments.filter((a) => a.contactId === c.id).sort((a, b) => ((a.date ?? TODAY) + a.start).localeCompare((b.date ?? TODAY) + b.start))
        const next = mine.filter((a) => (a.date ?? TODAY) >= TODAY && a.status !== 'faltou')
        const past = mine.filter((a) => (a.date ?? TODAY) < TODAY).slice(-3)
        if (next.length) lines.push(`Próximos horários: ${next.map((a) => `${a.date} ${a.start} ${a.service} com ${professionalById(a.professionalId)?.name ?? ''}`).join('; ')}`)
        if (past.length) lines.push(`Últimos atendimentos: ${past.map((a) => `${a.date} ${a.service}`).join('; ')}`)
      }
    }

    if (cfg.tools.agenda) {
      lines.push('', '## Horários livres (próximos dias)', 'Formato: profissional → intervalos livres. O serviço precisa caber inteiro dentro de um intervalo. Ofereça no máximo 3 opções.')
      let shown = 0
      for (let i = 0; i < 14 && shown < 7; i++) {
        const date = addDays(TODAY, i)
        const day = info.hours[weekdayOf(date)]
        if (!day?.open) continue
        shown++
        const parts: string[] = []
        for (const p of pros) {
          const extra = ref.current.google.busy(p.id, date).map((ev) => [ev.allDay ? 0 : toMinutes(ev.start), ev.allDay ? 1440 : toMinutes(ev.end)] as const)
          const starts = freeSlots({ date, pro: p, minutes: 30, hours: info.hours, appointments: st.appointments, extraBusy: extra })
          // junta horários seguidos em intervalos
          const ranges: string[] = []
          let from: number | null = null
          let prev = -999
          for (const t of starts.map(toMinutes)) {
            if (from === null) from = t
            else if (t !== prev + 30) {
              ranges.push(`${toHHMM(from)}-${toHHMM(prev + 30)}`)
              from = t
            }
            prev = t
          }
          if (from !== null) ranges.push(`${toHHMM(from)}-${toHHMM(prev + 30)}`)
          parts.push(`${p.name}: ${ranges.length ? ranges.join(', ') : 'lotado'}`)
        }
        lines.push(`${WEEKDAYS[weekdayOf(date)]} ${date}: ${parts.join(' | ')}`)
      }
    }

    lines.push('', '## Como marcar horários')
    if (cfg.tools.agendar) {
      lines.push(
        'Quando o cliente confirmar serviço, profissional, dia e horário (livre na lista acima), confirme na mensagem e termine com uma linha exatamente assim:',
        '[[AGENDAR: AAAA-MM-DD HH:MM | Nome do serviço | Nome do profissional]]',
        'Use o nome do serviço e do profissional exatamente como estão nas listas. Não marque sem a confirmação do cliente.'
      )
    } else {
      lines.push('Você não marca horários: descubra o serviço e o melhor dia para o cliente e transfira para a equipe finalizar.')
    }

    const rules = [
      cfg.handoff.pedido && 'o cliente pedir para falar com uma pessoa',
      cfg.handoff.reclamacao && 'houver reclamação, irritação ou problema com um atendimento',
      cfg.handoff.incerteza && 'você não tiver certeza da resposta ou a informação não estiver aqui',
      cfg.handoff.foraAssunto && 'o assunto não for sobre os serviços da empresa'
    ].filter(Boolean)
    lines.push(
      '',
      '## Passar para a equipe',
      rules.length ? `Transfira quando: ${rules.join('; ')}.` : 'Transfira só se o cliente insistir muito em falar com uma pessoa.',
      'Para transferir, avise o cliente em uma frase que vai chamar alguém da equipe e termine com:',
      '[[TRANSFERIR: motivo em poucas palavras]]'
    )
    return lines.join('\n')
  }, [])

  /* ------------------------------------------------------------------ ações */
  const system = (convId: string, text: string) => ref.current.data.appendMessage(convId, { from: 'system', kind: 'system', text })

  const handoff = useCallback((convId: string, reason: string) => {
    const { data: d, config: cfg } = ref.current
    const conv = d.conversations.find((c) => c.id === convId)
    if (!conv) return
    d.updateConversation(convId, { status: 'humano', aiEnabled: false, queuedAt: Date.now(), handoffReason: reason, assignee: undefined })
    system(convId, `${cfg.name} transferiu para a equipe · ${reason}`)
  }, [])

  const giveBackToAi = useCallback((convId: string) => {
    const { data: d, config: cfg } = ref.current
    d.updateConversation(convId, { status: 'ia', aiEnabled: true, assignee: undefined, queuedAt: undefined, handoffReason: undefined })
    system(convId, `Conversa devolvida para ${cfg.name}`)
  }, [])

  /** Envia a resposta da IA ao cliente (fica na conversa mesmo se o WhatsApp cair) */
  const sendAi = (conv: Conversation, text: string) => {
    const { data: d, wa: w, config: cfg } = ref.current
    const msgId = d.appendMessage(conv.id, { from: 'ai', author: cfg.name, kind: 'text', text, status: 'sent' })
    if (conv.channel !== 'whatsapp') return
    const phone = d.contactById(conv.contactId).phone
    if (w.state.status !== 'conectado') {
      d.updateMessage(conv.id, msgId, { status: 'error' })
      return
    }
    w.sendText(conv, phone, text)
      .then((waId) => d.updateMessage(conv.id, msgId, { waId, status: 'sent' }))
      .catch(() => d.updateMessage(conv.id, msgId, { status: 'error' }))
  }

  /** Marca o horário pedido pela IA; devolve a mensagem de erro para o cliente se não der */
  const book = (conv: Conversation, b: NonNullable<ParsedReply['booking']>): string | null => {
    const { company: co, app: st, google: g, notify: n, data: d } = ref.current
    const svc = co.services.find((s) => norm(s.name) === norm(b.service)) ?? co.services.find((s) => norm(s.name).includes(norm(b.service)))
    const pros = co.professionals.filter((p) => p.active)
    const pro = pros.find((p) => norm(p.name) === norm(b.pro)) ?? pros.find((p) => norm(p.name).split(' ')[0] === norm(b.pro).split(' ')[0])
    if (!svc || !pro || (pro.serviceIds.length && !pro.serviceIds.includes(svc.id))) return 'Não consegui confirmar esse serviço com esse profissional 😕 Pode me dizer de novo qual serviço e com quem prefere?'
    const extra = g.busy(pro.id, b.date).map((ev) => [ev.allDay ? 0 : toMinutes(ev.start), ev.allDay ? 1440 : toMinutes(ev.end)] as const)
    if (!isFree({ date: b.date, pro, minutes: svc.minutes, hours: co.info.hours, appointments: st.appointments, extraBusy: extra }, b.time))
      return `Esse horário acabou de ficar indisponível 😕 Quer que eu veja outras opções com ${pro.name.split(' ')[0]}?`
    const start = toMinutes(b.time)
    const appt = st.addAppointment({
      contactId: conv.contactId,
      professionalId: pro.id,
      service: svc.name,
      start: b.time,
      end: toHHMM(start + svc.minutes),
      status: 'agendado',
      price: svc.price,
      origin: 'ia',
      date: b.date
    })
    const c = d.contactById(conv.contactId)
    g.pushAppointment(appt, { clientName: c.name, clientPhone: c.phone })
      .then((id) => id && st.updateAppointment(appt.id, { googleEventId: id }))
      .catch(() => {})
    const [y, m, dd] = b.date.split('-')
    n({ kind: 'ia', title: 'IA agendou um horário', body: `${c.name} · ${svc.name} ${dd}/${m}/${y} às ${b.time} com ${pro.name.split(' ')[0]}`, link: '/agenda' })
    system(conv.id, `${ref.current.config.name} agendou ${svc.name} em ${dd}/${m}/${y} às ${b.time} com ${pro.name}`)
    return null
  }

  /* ------------------------------------------------------------------ motor */
  const busyRef = useRef(new Set<string>())
  const timers = useRef(new Map<string, number>())

  const lastReal = (c: Conversation) => [...c.messages].reverse().find((m) => m.kind !== 'system' && m.kind !== 'note')

  const eligible = useCallback((c: Conversation) => {
    const { config: cfg, app: st, company: co } = ref.current
    if (!cfg.enabled || c.channel !== 'whatsapp' || !c.aiEnabled || c.assignee) return false
    if (c.status !== 'nova' && c.status !== 'ia') return false
    if (cfg.schedule === 'fora') {
      const now = new Date()
      const day = co.info.hours[now.getDay()]
      const min = now.getHours() * 60 + now.getMinutes()
      if (day?.open && min >= toMinutes(day.start) && min < toMinutes(day.end)) return false
    }
    if (cfg.schedule === 'fila') {
      const someone = users.map(st.resolveUser).some((u) => u.role === 'analista' && u.presence === 'online')
      if (someone) return false
    }
    return true
  }, [])

  const respond = useCallback(
    async (convId: string) => {
      const { data: d, config: cfg, usage: u } = ref.current
      const conv = d.conversations.find((c) => c.id === convId)
      if (!conv || !api || busyRef.current.has(convId) || !eligible(conv)) return
      const last = lastReal(conv)
      if (!last || last.from !== 'contact') return
      // Cliente ainda digitando: espera mais um pouco
      const wait = (last.at ?? 0) + REPLY_DELAY_MS - Date.now()
      if (wait > 150) {
        timers.current.set(convId, window.setTimeout(() => {
          timers.current.delete(convId)
          void respond(convId)
        }, wait))
        return
      }
      if (cfg.monthlyLimit && u.tokens >= cfg.monthlyLimit) {
        handoff(convId, 'limite mensal da IA atingido')
        return
      }
      busyRef.current.add(convId)
      setTyping((t) => [...t, convId])
      try {
        const turns = conv.messages.map(toTurn).filter((t): t is NonNullable<typeof t> => t !== null).slice(-24)
        const r = await api.reply(cfg.provider, cfg.model, buildSystem(conv), turns)
        if (!r.ok) throw new Error(r.error)
        setUsage((x) => ({ month: month(), tokens: (x.month === month() ? x.tokens : 0) + r.data.tokens }))
        // Alguém da equipe assumiu enquanto a IA pensava: não responde
        const fresh = ref.current.data.conversations.find((c) => c.id === convId)
        if (!fresh || !eligible(fresh)) return
        const parsed = parseReply(r.data.text)
        let text = parsed.text
        if (parsed.booking && cfg.tools.agendar) {
          const err = book(fresh, parsed.booking)
          if (err) text = err
        }
        if (!text && parsed.handoff) text = 'Vou chamar alguém da equipe para te ajudar, só um instante! 😊'
        if (text) sendAi(fresh, text)
        if (parsed.handoff) handoff(convId, parsed.handoff)
        else if (fresh.status !== 'ia') ref.current.data.updateConversation(convId, { status: 'ia' })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        handoff(convId, 'a IA não conseguiu responder')
        ref.current.notify({ kind: 'alerta', title: 'A IA não conseguiu responder', body: msg, link: `/inbox?c=${convId}` })
      } finally {
        busyRef.current.delete(convId)
        setTyping((t) => t.filter((x) => x !== convId))
      }
    },
    [api, buildSystem, eligible, handoff]
  )

  // A cada mudança nas conversas: agenda resposta para quem está esperando a IA
  useEffect(() => {
    if (!active) return
    for (const c of conversations) {
      if (timers.current.has(c.id) || busyRef.current.has(c.id) || !eligible(c)) continue
      const last = lastReal(c)
      if (!last || last.from !== 'contact' || !last.at || Date.now() - last.at > MAX_AGE_MS) continue
      const wait = Math.max(0, last.at + REPLY_DELAY_MS - Date.now())
      timers.current.set(c.id, window.setTimeout(() => {
        timers.current.delete(c.id)
        void respond(c.id)
      }, wait))
    }
  }, [version, active, conversations, eligible, respond])
  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), [])

  /* ------------------------------------------------------------------ URA */
  const queue = useMemo(
    () =>
      conversations
        .filter((c) => c.status === 'humano' && !c.assignee)
        .sort((a, b) => (a.queuedAt ?? a.createdAt ?? 0) - (b.queuedAt ?? b.createdAt ?? 0)),
    // version muda a cada alteração
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversations, version]
  )
  const alerted = useRef(new Set<string>())

  useEffect(() => {
    const { data: d, app: st, config: cfg, notify: n } = ref.current
    if (!queue.length) return
    const open = (id: string) => d.conversations.filter((c) => c.assignee === id && c.status !== 'resolvida').length
    // "Mais tempo livre": última vez que respondeu ou recebeu uma conversa
    const lastActivity = (id: string) => {
      let t = 0
      for (const c of d.conversations) {
        if (c.assignee === id && c.assignedAt) t = Math.max(t, c.assignedAt)
        for (const m of c.messages) if (m.by === id && m.at) t = Math.max(t, m.at)
      }
      return t
    }
    const me = st.me
    for (const conv of queue) {
      const contact = d.contactById(conv.contactId)
      const candidates = users
        .map(st.resolveUser)
        .filter((u) => u.role === 'analista' && u.presence === 'online' && open(u.id) < cfg.maxPerAnalyst)
        .sort((a, b) => open(a.id) - open(b.id) || lastActivity(a.id) - lastActivity(b.id))
      const target = cfg.autoRoute ? candidates[0] : undefined
      if (target) {
        const waited = Math.max(0, Math.round((Date.now() - (conv.queuedAt ?? Date.now())) / 60000))
        d.updateConversation(conv.id, { assignee: target.id, assignedAt: Date.now() })
        system(conv.id, `URA encaminhou para ${target.name.split(' ')[0]}${waited ? ` · aguardou ${waited} min na fila` : ''}`)
        if (target.id === me.id) {
          n({ kind: 'equipe', title: 'Cliente encaminhado para você', body: `${contact.name} · ${conv.handoffReason ?? 'precisa de atendimento'}`, link: `/inbox?c=${conv.id}` })
          window.icchat?.flashFrame()
        } else if (st.role === 'gerente') {
          n({ kind: 'equipe', title: `URA encaminhou para ${target.name.split(' ')[0]}`, body: `${contact.name} · ${conv.handoffReason ?? ''}`, link: `/inbox?c=${conv.id}` })
        }
        continue
      }
      if (!alerted.current.has(conv.id)) {
        alerted.current.add(conv.id)
        n({ kind: 'alerta', title: 'Cliente na URA aguardando atendimento', body: `${contact.name} · ${conv.handoffReason ?? 'pediu atendimento especializado'}`, link: `/inbox?c=${conv.id}` })
        window.icchat?.flashFrame()
      }
    }
    // Quem sai da fila pode voltar a alertar numa próxima vez
    for (const id of alerted.current) if (!queue.some((c) => c.id === id)) alerted.current.delete(id)
  }, [queue, app.myPresence, config.autoRoute, config.maxPerAnalyst])

  const value = useMemo<Ctx>(
    () => ({
      available: Boolean(api),
      config,
      update: (patch) => setConfig((c) => ({ ...c, ...patch })),
      keyInfo,
      saveKey: async (key) => {
        if (!api) throw new Error('Disponível só no app instalado')
        const r = await api.setKey(config.provider, key)
        if (!r.ok) throw new Error(r.error)
        await refreshKeys()
      },
      removeKey: async () => {
        if (!api) return
        await api.clearKey(config.provider)
        await refreshKeys()
      },
      testKey: async () => {
        if (!api) throw new Error('Disponível só no app instalado')
        const r = await api.test(config.provider, config.model)
        if (!r.ok) throw new Error(r.error)
        await refreshKeys()
      },
      usage,
      active,
      typing,
      queue,
      handoff,
      giveBackToAi,
      simulate: async (turns) => {
        if (!api) throw new Error('A conversa de teste funciona no app instalado, com a sua chave de API.')
        if (!keyInfo) throw new Error('Cadastre a chave de API primeiro.')
        const r = await api.reply(config.provider, config.model, buildSystem(), turns)
        if (!r.ok) throw new Error(r.error)
        setUsage((x) => ({ month: month(), tokens: (x.month === month() ? x.tokens : 0) + r.data.tokens }))
        return parseReply(r.data.text)
      }
    }),
    [api, config, keyInfo, usage, active, typing, queue, handoff, giveBackToAi, buildSystem, refreshKeys]
  )

  return <AiCtx.Provider value={value}>{children}</AiCtx.Provider>
}

export function useAi(): Ctx {
  const ctx = useContext(AiCtx)
  if (!ctx) throw new Error('useAi fora do AiProvider')
  return ctx
}

/** Mostra "há X min" para quem está na fila */
export function waitingFor(conv: Conversation): string {
  const since = conv.queuedAt ?? conv.createdAt
  if (!since) return ''
  const min = Math.max(0, Math.round((Date.now() - since) / 60000))
  return min < 1 ? 'agora' : min < 60 ? `há ${min} min` : `há ${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
}

