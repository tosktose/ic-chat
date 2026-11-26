import { contextBridge, ipcRenderer } from 'electron'

type Result<T> = { ok: true; data: T } | { ok: false; error: string }
const call = <T,>(name: string, ...args: unknown[]) => ipcRenderer.invoke(name, ...args) as Promise<Result<T>>

const api = {
  isDesktop: true,
  platform: process.platform,
  setTitleBarTheme: (theme: 'light' | 'dark') => ipcRenderer.send('titlebar:theme', theme),
  /** Pisca o ícone na barra de tarefas até a janela receber foco */
  flashFrame: () => ipcRenderer.send('window:flash'),
  auth: {
    openOAuth: (url: string) => ipcRenderer.invoke('auth:open-oauth', url) as Promise<{ ok: boolean; error?: string }>,
    takeCallback: () => ipcRenderer.invoke('auth:take-callback') as Promise<{ access_token: string; refresh_token: string } | null>,
    onCallback: (cb: () => void) => {
      ipcRenderer.on('auth:callback-ready', cb)
      return () => ipcRenderer.removeListener('auth:callback-ready', cb)
    }
  },
  /** Gera PDF (A4) do HTML, pergunta onde salvar e abre o arquivo */
  saveFile: (content: string, fileName: string, filters: { name: string; extensions: string[] }[]) =>
    ipcRenderer.invoke('file:save', { content, fileName, filters }) as Promise<
      { ok: true; path?: string } | { ok: false; canceled?: boolean; error?: string }
    >,
  /** Banco local (SQLite) e mídias salvas */
  db: {
    load: () => call('db:load'),
    upsert: (kind: string, id: string, data: unknown, parent?: string) => call('db:upsert', kind, id, data, parent),
    remove: (kind: string, id: string) => call('db:remove', kind, id),
    clear: () => call('db:clear')
  },
  media: {
    save: (base64: string, mime: string, fileName?: string) => call('media:save', base64, mime, fileName)
  },
  /** WhatsApp via QR Code (serviço no processo principal) */
  wa: {
    start: () => call('wa:start'),
    state: () => call('wa:state'),
    logout: () => call('wa:logout'),
    pair: (phone: string) => call('wa:pair', phone),
    check: (phone: string) => call('wa:check', phone),
    sendText: (to: string, text: string) => call('wa:sendText', to, text),
    sendMedia: (to: string, media: unknown) => call('wa:sendMedia', to, media),
    /** Eventos: state, message, ack. Devolve a função para parar de ouvir. */
    on: (cb: (e: { type: string; payload: unknown }) => void) => {
      const fn = (_: unknown, e: { type: string; payload: unknown }) => cb(e)
      ipcRenderer.on('wa:event', fn)
      return () => ipcRenderer.removeListener('wa:event', fn)
    }
  },
  /** Google Agenda (OAuth + API do Calendar) */
  ai: {
    status: () => call('ai:status'),
    localStatus: () => call('ai:localStatus'),
    setKey: (provider: string, key: string) => call('ai:setKey', provider, key),
    clearKey: (provider: string) => call('ai:clearKey', provider),
    test: (provider: string, model: string) => call('ai:test', provider, model),
    reply: (provider: string, model: string, system: string, turns: { role: 'user' | 'assistant'; content: string }[]) =>
      call('ai:reply', provider, model, system, turns)
  },
  gcal: {
    status: () => call('gcal:status'),
    setCredentials: (id: string, secret: string) => call('gcal:setCredentials', id, secret),
    connect: (proId: string) => call('gcal:connect', proId),
    disconnect: (proId: string) => call('gcal:disconnect', proId),
    createEvent: (proId: string, ev: unknown) => call('gcal:createEvent', proId, ev),
    deleteEvent: (proId: string, id: string) => call('gcal:deleteEvent', proId, id),
    listDay: (proId: string, date: string) => call('gcal:listDay', proId, date)
  },
  exportPdf: (html: string, fileName: string) =>
    ipcRenderer.invoke('pdf:export', { html, fileName }) as Promise<
      { ok: true; path?: string } | { ok: false; canceled?: boolean; error?: string }
    >
}

contextBridge.exposeInMainWorld('icchat', api)

export type IcChatBridge = typeof api
