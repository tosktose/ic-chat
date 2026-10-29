type Result<T> = { ok: true; data: T } | { ok: false; error: string }

export interface WaStateDTO {
  status: 'desconectado' | 'conectando' | 'qr' | 'conectado'
  qr?: string
  me?: { jid: string; phone: string; name?: string }
  error?: string
}

export interface WaIncomingDTO {
  id: string
  chatJid: string
  phone: string
  name?: string
  fromMe: boolean
  kind: 'text' | 'image' | 'audio' | 'document'
  text?: string
  src?: string
  mime?: string
  fileName?: string
  fileSize?: string
  seconds?: number
  timestamp: number
}

export type AiProviderId = 'anthropic' | 'openai' | 'google' | 'openrouter' | 'ollama'

export interface GEventDTO {
  id: string
  summary: string
  start: string
  end: string
  allDay: boolean
  fromIcChat: boolean
}

type FileResult = { ok: true; path?: string } | { ok: false; canceled?: boolean; error?: string }

declare global {
  interface Window {
    /** Presente só quando roda dentro do Electron. */
    icchat?: {
      isDesktop: true
      platform: NodeJS.Platform | string
      setTitleBarTheme: (theme: 'light' | 'dark') => void
      flashFrame: () => void
      saveFile: (content: string, fileName: string, filters: { name: string; extensions: string[] }[]) => Promise<FileResult>
      exportPdf: (html: string, fileName: string) => Promise<FileResult>
      db: {
        load: () => Promise<Result<{ contacts: unknown[]; conversations: unknown[]; appointments: unknown[]; deals: unknown[]; kv: Record<string, unknown> }>>
        upsert: (kind: 'contact' | 'conversation' | 'message' | 'appointment' | 'deal' | 'kv', id: string, data: unknown, parent?: string) => Promise<Result<void>>
        remove: (kind: 'contact' | 'conversation' | 'message' | 'appointment' | 'deal' | 'kv', id: string) => Promise<Result<void>>
        clear: () => Promise<Result<void>>
      }
      media: {
        save: (base64: string, mime: string, fileName?: string) => Promise<Result<string>>
      }
      wa: {
        start: () => Promise<Result<WaStateDTO>>
        state: () => Promise<Result<WaStateDTO>>
        logout: () => Promise<Result<void>>
        pair: (phone: string) => Promise<Result<string>>
        check: (phone: string) => Promise<Result<{ exists: boolean; jid?: string }>>
        sendText: (to: string, text: string) => Promise<Result<{ id: string; jid: string }>>
        sendMedia: (
          to: string,
          media: { base64: string; mime: string; fileName?: string; caption?: string; kind: 'image' | 'video' | 'document' | 'audio' }
        ) => Promise<Result<{ id: string; jid: string }>>
        on: (cb: (e: { type: 'state' | 'message' | 'ack'; payload: unknown }) => void) => () => void
      }
      ai: {
        status: () => Promise<Result<Record<AiProviderId, { masked: string; checkedAt?: number } | null>>>
        /** Ollama na propria maquina: se esta rodando e quais modelos ja foram baixados. */
        localStatus: () => Promise<Result<{ running: boolean; models: { name: string; sizeGb: number }[] }>>
        setKey: (provider: AiProviderId, key: string) => Promise<Result<void>>
        clearKey: (provider: AiProviderId) => Promise<Result<void>>
        test: (provider: AiProviderId, model: string) => Promise<Result<{ text: string; tokens: number }>>
        reply: (
          provider: AiProviderId,
          model: string,
          system: string,
          turns: { role: 'user' | 'assistant'; content: string }[]
        ) => Promise<Result<{ text: string; tokens: number }>>
      }
      gcal: {
        status: () => Promise<Result<{ hasCredentials: boolean; clientId: string; accounts: Record<string, string> }>>
        setCredentials: (id: string, secret: string) => Promise<Result<{ hasCredentials: boolean; clientId: string; accounts: Record<string, string> }>>
        connect: (proId: string) => Promise<Result<{ email: string }>>
        disconnect: (proId: string) => Promise<Result<void>>
        createEvent: (
          proId: string,
          ev: { summary: string; description?: string; date: string; start: string; end: string; reminderMin?: number; icchatId?: string }
        ) => Promise<Result<{ id: string; htmlLink?: string }>>
        deleteEvent: (proId: string, id: string) => Promise<Result<void>>
        listDay: (proId: string, date: string) => Promise<Result<GEventDTO[]>>
      }
    }
  }
}
export {}
