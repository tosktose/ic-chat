// Google Agenda: login OAuth de "app instalado" (loopback + PKCE) e API do Calendar.
// Credenciais (Client ID/Secret do Google Cloud) e tokens ficam em %APPDATA%/IC Chat/google.json.
import { app, safeStorage, shell } from 'electron'
import { createHash, randomBytes } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { join } from 'node:path'

interface Tokens {
  access_token: string
  refresh_token?: string
  expiry: number
  email: string
}
interface Store {
  clientId?: string
  clientSecret?: string
  accounts: Record<string, Tokens> // por profissional
}

const SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly'
]
const TZ = 'America/Sao_Paulo'
const file = () => join(app.getPath('userData'), 'google.json')

// A chave secreta e os tokens ficam criptografados com o cofre do sistema (DPAPI no Windows)
const ENC = 'icchat-enc:'
async function load(): Promise<Store> {
  try {
    const raw = await readFile(file(), 'utf8')
    const json = raw.startsWith(ENC) ? safeStorage.decryptString(Buffer.from(raw.slice(ENC.length), 'base64')) : raw
    return { accounts: {}, ...JSON.parse(json) }
  } catch {
    return { accounts: {} }
  }
}
const save = (s: Store) => {
  const json = JSON.stringify(s)
  const out = safeStorage.isEncryptionAvailable() ? ENC + safeStorage.encryptString(json).toString('base64') : json
  return writeFile(file(), out, 'utf8')
}

export async function status() {
  const s = await load()
  return {
    hasCredentials: Boolean(s.clientId && s.clientSecret),
    clientId: s.clientId ?? '',
    accounts: Object.fromEntries(Object.entries(s.accounts).map(([k, v]) => [k, v.email]))
  }
}

export async function setCredentials(clientId: string, clientSecret: string) {
  const s = await load()
  s.clientId = clientId.trim()
  s.clientSecret = clientSecret.trim()
  await save(s)
  return status()
}

const b64url = (b: Buffer) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const PAGE = (title: string, text: string) => `<!doctype html><meta charset="utf-8"><title>IC Chat</title>
<body style="font-family:Segoe UI,Arial;display:grid;place-items:center;height:100vh;margin:0;background:#f5f7fb;color:#0f172a">
<div style="text-align:center;max-width:420px"><h2 style="margin:0 0 8px">${title}</h2><p style="color:#64748b">${text}</p></div></body>`

/** Abre o navegador para o profissional autorizar a agenda dele. Resolve com o e-mail da conta. */
export async function connect(proId: string): Promise<{ email: string }> {
  const s = await load()
  if (!s.clientId || !s.clientSecret) throw new Error('Cadastre o Client ID e o Client Secret do Google Cloud primeiro')
  const verifier = b64url(randomBytes(32))
  const challenge = b64url(createHash('sha256').update(verifier).digest())
  const stateParam = b64url(randomBytes(16))

  const { code, redirectUri } = await new Promise<{ code: string; redirectUri: string }>((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      if (url.pathname !== '/') return res.end()
      const err = url.searchParams.get('error')
      const c = url.searchParams.get('code')
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      if (err || !c || url.searchParams.get('state') !== stateParam) {
        res.end(PAGE('Autorização não concluída', 'Volte ao IC Chat e tente novamente.'))
        server.close()
        return reject(new Error(err === 'access_denied' ? 'Autorização recusada no Google' : 'Autorização não concluída'))
      }
      res.end(PAGE('Agenda conectada ✅', 'Pode fechar esta janela e voltar ao IC Chat.'))
      server.close()
      resolve({ code: c, redirectUri: `http://127.0.0.1:${(server.address() as AddressInfo).port}` })
    })
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port
      const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      auth.search = new URLSearchParams({
        client_id: s.clientId!,
        redirect_uri: `http://127.0.0.1:${port}`,
        response_type: 'code',
        scope: SCOPES.join(' '),
        access_type: 'offline',
        prompt: 'consent',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state: stateParam
      }).toString()
      void shell.openExternal(auth.toString())
    })
    setTimeout(() => {
      server.close()
      reject(new Error('Tempo esgotado aguardando a autorização (5 min)'))
    }, 5 * 60_000)
  })

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: s.clientId,
      client_secret: s.clientSecret,
      code,
      code_verifier: verifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    })
  })
  const t = (await r.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; id_token?: string; error_description?: string }
  if (!r.ok || !t.access_token) throw new Error(t.error_description ?? 'Falha ao obter a autorização do Google')
  const payload = t.id_token ? JSON.parse(Buffer.from(t.id_token.split('.')[1], 'base64').toString('utf8')) : {}
  const fresh = await load()
  fresh.accounts[proId] = {
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expiry: Date.now() + (t.expires_in ?? 3600) * 1000,
    email: payload.email ?? 'conta Google'
  }
  await save(fresh)
  return { email: fresh.accounts[proId].email }
}

async function token(proId: string): Promise<string> {
  const s = await load()
  const acc = s.accounts[proId]
  if (!acc) throw new Error('Agenda do profissional não conectada')
  if (Date.now() < acc.expiry - 60_000) return acc.access_token
  if (!acc.refresh_token) throw new Error('Autorização expirada. Conecte a agenda novamente.')
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: s.clientId!, client_secret: s.clientSecret!, refresh_token: acc.refresh_token, grant_type: 'refresh_token' })
  })
  const t = (await r.json()) as { access_token?: string; expires_in?: number; error?: string }
  if (!r.ok || !t.access_token) throw new Error(t.error === 'invalid_grant' ? 'Autorização revogada. Conecte a agenda novamente.' : 'Falha ao renovar o acesso ao Google')
  acc.access_token = t.access_token
  acc.expiry = Date.now() + (t.expires_in ?? 3600) * 1000
  await save(s)
  return acc.access_token
}

async function api<T>(proId: string, path: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${await token(proId)}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) }
  })
  if (r.status === 204) return undefined as T
  const body = (await r.json()) as { error?: { message?: string } }
  if (!r.ok) throw new Error(body?.error?.message ?? `Erro do Google Agenda (${r.status})`)
  return body as T
}

export interface NewEvent {
  summary: string
  description?: string
  date: string // AAAA-MM-DD
  start: string // HH:mm
  end: string
  reminderMin?: number
  icchatId?: string
}

export async function createEvent(proId: string, e: NewEvent): Promise<{ id: string; htmlLink?: string }> {
  const r = await api<{ id: string; htmlLink?: string }>(proId, '/calendars/primary/events', {
    method: 'POST',
    body: JSON.stringify({
      summary: e.summary,
      description: e.description,
      start: { dateTime: `${e.date}T${e.start}:00`, timeZone: TZ },
      end: { dateTime: `${e.date}T${e.end}:00`, timeZone: TZ },
      reminders: e.reminderMin ? { useDefault: false, overrides: [{ method: 'popup', minutes: e.reminderMin }] } : { useDefault: false },
      extendedProperties: { private: { icchat: e.icchatId ?? 'sim' } }
    })
  })
  return { id: r.id, htmlLink: r.htmlLink }
}

export async function deleteEvent(proId: string, eventId: string): Promise<void> {
  await api(proId, `/calendars/primary/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' })
}

export interface GEvent {
  id: string
  summary: string
  start: string // HH:mm
  end: string
  allDay: boolean
  fromIcChat: boolean
}

/** Eventos de um dia na agenda principal do profissional */
export async function listDay(proId: string, date: string): Promise<GEvent[]> {
  const [y, m, d] = date.split('-').map(Number)
  const min = new Date(y, m - 1, d).toISOString()
  const max = new Date(y, m - 1, d + 1).toISOString()
  const r = await api<{ items: Array<{ id: string; summary?: string; status?: string; start: { dateTime?: string; date?: string }; end: { dateTime?: string; date?: string }; extendedProperties?: { private?: Record<string, string> } }> }>(
    proId,
    `/calendars/primary/events?${new URLSearchParams({ timeMin: min, timeMax: max, singleEvents: 'true', orderBy: 'startTime', maxResults: '100' })}`
  )
  const hhmm = (iso?: string) => (iso ? new Date(iso).toTimeString().slice(0, 5) : '00:00')
  return (r.items ?? [])
    .filter((ev) => ev.status !== 'cancelled')
    .map((ev) => ({
      id: ev.id,
      summary: ev.summary ?? '(sem título)',
      start: ev.start.dateTime ? hhmm(ev.start.dateTime) : '00:00',
      end: ev.end.dateTime ? hhmm(ev.end.dateTime) : '23:59',
      allDay: !ev.start.dateTime,
      fromIcChat: Boolean(ev.extendedProperties?.private?.icchat)
    }))
}

export async function disconnect(proId: string): Promise<void> {
  const s = await load()
  const acc = s.accounts[proId]
  if (acc?.refresh_token) {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(acc.refresh_token)}`, { method: 'POST' }).catch(() => undefined)
  }
  delete s.accounts[proId]
  await save(s)
}
