// WhatsApp via QR Code (Baileys) rodando no processo principal do Electron.
// A sessão fica salva em %APPDATA%/IC Chat/whatsapp-auth: depois de escanear uma vez,
// o app reconecta sozinho ao abrir.
import { app, BrowserWindow } from 'electron'
import { spawn } from 'node:child_process'
import { mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import makeWASocket, {
  Browsers,
  DisconnectReason,
  downloadMediaMessage,
  fetchLatestBaileysVersion,
  isJidGroup,
  isPnUser,
  jidNormalizedUser,
  useMultiFileAuthState,
  type WAMessage,
  type WASocket
} from '@whiskeysockets/baileys'
import pino from 'pino'
import QRCode from 'qrcode'
import ffmpegPath from 'ffmpeg-static'

export type WaStatus = 'desconectado' | 'conectando' | 'qr' | 'conectado'

export interface WaState {
  status: WaStatus
  qr?: string // data URL do QR
  me?: { jid: string; phone: string; name?: string }
  error?: string
}

export interface WaIncoming {
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

const logger = pino({ level: 'silent' })
const authDir = () => join(app.getPath('userData'), 'whatsapp-auth')
const MAX_MEDIA = 15 * 1024 * 1024

let sock: WASocket | null = null
let state: WaState = { status: 'desconectado' }
let stopping = false
/** Mensagens enviadas pelo app (para não duplicar quando o WhatsApp devolve o eco) */
const sentByApp = new Set<string>()

function emit(type: string, payload: unknown) {
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send('wa:event', { type, payload })
}
function setState(s: Partial<WaState>) {
  state = { ...state, ...s }
  emit('state', state)
}
export const getState = () => state

const digits = (jid: string) => jid.split('@')[0].split(':')[0].replace(/\D/g, '')
const humanSize = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

/** Só existe sessão depois que o celular leu o QR (as credenciais passam a ter o "me") */
export async function hasSession(): Promise<boolean> {
  try {
    const creds = JSON.parse(await readFile(join(authDir(), 'creds.json'), 'utf8')) as { me?: unknown }
    return Boolean(creds.me)
  } catch {
    return false
  }
}

export async function start(): Promise<WaState> {
  if (sock && (state.status === 'conectado' || state.status === 'qr' || state.status === 'conectando')) return state
  stopping = false
  setState({ status: 'conectando', qr: undefined, error: undefined })
  await mkdir(authDir(), { recursive: true })
  const { state: auth, saveCreds } = await useMultiFileAuthState(authDir())
  let version: [number, number, number] | undefined
  try {
    version = (await fetchLatestBaileysVersion()).version
  } catch {
    /* usa a versão padrão da biblioteca */
  }

  const s = makeWASocket({
    auth,
    logger,
    version,
    browser: Browsers.windows('IC Chat'),
    markOnlineOnConnect: false,
    syncFullHistory: false
  })
  sock = s
  s.ev.on('creds.update', saveCreds)

  s.ev.on('connection.update', async (u) => {
    if (u.qr) setState({ status: 'qr', qr: await QRCode.toDataURL(u.qr, { margin: 1, width: 320 }) })
    if (u.connection === 'open') {
      const id = s.user?.id ?? ''
      setState({ status: 'conectado', qr: undefined, me: { jid: jidNormalizedUser(id), phone: digits(id), name: s.user?.name } })
    }
    if (u.connection === 'close') {
      const code = (u.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode
      sock = null
      if (code === DisconnectReason.loggedOut) {
        await rm(authDir(), { recursive: true, force: true })
        setState({ status: 'desconectado', qr: undefined, me: undefined, error: 'Sessão encerrada no celular. Conecte de novo.' })
      } else if (!stopping) {
        // Queda de rede ou reinício pedido pelo WhatsApp: reconecta sozinho
        setState({ status: 'conectando' })
        setTimeout(() => void start(), code === DisconnectReason.restartRequired ? 0 : 3000)
      } else {
        setState({ status: 'desconectado', qr: undefined })
      }
    }
  })

  s.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const m of messages) {
      try {
        const msg = await toIncoming(s, m)
        if (msg) emit('message', msg)
      } catch (e) {
        console.error('[wa] mensagem ignorada', e)
      }
    }
  })

  // Confirmações: entregue (3) e lida (4)
  s.ev.on('messages.update', (updates) => {
    for (const { key, update } of updates) {
      const st = update.status
      if (key.fromMe && key.id && typeof st === 'number' && st >= 3) emit('ack', { id: key.id, status: st >= 4 ? 'read' : 'delivered' })
    }
  })

  return state
}

async function toIncoming(s: WASocket, m: WAMessage): Promise<WaIncoming | null> {
  const chatJid = m.key.remoteJid
  if (!chatJid || !m.message || isJidGroup(chatJid) || chatJid === 'status@broadcast' || chatJid.endsWith('@newsletter')) return null
  if (m.key.fromMe && m.key.id && sentByApp.has(m.key.id)) return null
  // Com os novos IDs do WhatsApp (LID), o telefone pode vir no campo alternativo
  const alt = (m.key as { remoteJidAlt?: string }).remoteJidAlt
  const phoneJid = isPnUser(chatJid) ? chatJid : alt && isPnUser(alt) ? alt : chatJid
  const c = m.message
  const base = {
    id: m.key.id ?? crypto.randomUUID(),
    chatJid,
    phone: digits(phoneJid),
    name: m.pushName ?? undefined,
    fromMe: Boolean(m.key.fromMe),
    timestamp: Number(m.messageTimestamp ?? Date.now() / 1000) * 1000
  }
  const text = c.conversation ?? c.extendedTextMessage?.text ?? undefined
  if (text) return { ...base, kind: 'text', text }

  const media = c.imageMessage ?? c.videoMessage ?? c.stickerMessage ?? c.audioMessage ?? c.documentMessage ?? c.documentWithCaptionMessage?.message?.documentMessage
  if (!media) return { ...base, kind: 'text', text: '[mensagem não suportada nesta versão]' }

  const mime = (media as { mimetype?: string }).mimetype ?? 'application/octet-stream'
  const size = Number((media as { fileLength?: number | { toNumber(): number } }).fileLength ?? 0)
  let src: string | undefined
  if (size < MAX_MEDIA) {
    const buf = await downloadMediaMessage(m, 'buffer', {}, { logger, reuploadRequest: s.updateMediaMessage })
    src = `data:${mime.split(';')[0]};base64,${buf.toString('base64')}`
  }
  if (c.audioMessage) return { ...base, kind: 'audio', src, mime, seconds: c.audioMessage.seconds ?? undefined }
  if (c.imageMessage || c.videoMessage || c.stickerMessage) {
    return { ...base, kind: 'image', src, mime, text: c.imageMessage?.caption ?? c.videoMessage?.caption ?? undefined }
  }
  const doc = c.documentMessage ?? c.documentWithCaptionMessage?.message?.documentMessage
  return { ...base, kind: 'document', src, mime, fileName: doc?.fileName ?? 'arquivo', fileSize: humanSize(size) }
}

/** Código de 8 dígitos para conectar sem câmera (digitado no celular) */
export async function pairingCode(phone: string): Promise<string> {
  if (!sock || state.status === 'conectado') await start()
  // aguarda o socket ficar pronto para pedir o código
  for (let i = 0; i < 20 && state.status !== 'qr'; i++) await new Promise((r) => setTimeout(r, 300))
  if (!sock) throw new Error('WhatsApp não iniciou')
  return sock.requestPairingCode(phone.replace(/\D/g, ''))
}

export async function logout(): Promise<void> {
  stopping = true
  try {
    await sock?.logout()
  } catch {
    /* já desconectado */
  }
  sock = null
  await rm(authDir(), { recursive: true, force: true })
  setState({ status: 'desconectado', qr: undefined, me: undefined, error: undefined })
}

function requireSock(): WASocket {
  if (!sock || state.status !== 'conectado') throw new Error('WhatsApp não está conectado')
  return sock
}

/** Descobre o JID de um telefone (e confirma se o número tem WhatsApp) */
export async function checkNumber(phone: string): Promise<{ exists: boolean; jid?: string }> {
  const s = requireSock()
  const d = phone.replace(/\D/g, '')
  const [r] = (await s.onWhatsApp(d)) ?? []
  return r?.exists ? { exists: true, jid: r.jid } : { exists: false }
}

async function resolveJid(chatJidOrPhone: string): Promise<string> {
  if (chatJidOrPhone.includes('@')) return chatJidOrPhone
  const r = await checkNumber(chatJidOrPhone)
  if (!r.exists || !r.jid) throw new Error('Este número não tem WhatsApp')
  return r.jid
}

export async function sendText(to: string, text: string): Promise<{ id: string; jid: string }> {
  const s = requireSock()
  const jid = await resolveJid(to)
  const r = await s.sendMessage(jid, { text })
  const id = r?.key.id ?? crypto.randomUUID()
  sentByApp.add(id)
  return { id, jid }
}

export interface OutMedia {
  base64: string
  mime: string
  fileName?: string
  caption?: string
  kind: 'image' | 'video' | 'document' | 'audio'
}

export async function sendMedia(to: string, media: OutMedia): Promise<{ id: string; jid: string }> {
  const s = requireSock()
  const jid = await resolveJid(to)
  let buf: Buffer = Buffer.from(media.base64, 'base64')
  let content
  if (media.kind === 'audio') {
    // Mensagem de voz precisa ser OGG/Opus para tocar no celular
    buf = await toOggOpus(buf)
    content = { audio: buf, mimetype: 'audio/ogg; codecs=opus', ptt: true }
  } else if (media.kind === 'image') content = { image: buf, caption: media.caption }
  else if (media.kind === 'video') content = { video: buf, caption: media.caption }
  else content = { document: buf, mimetype: media.mime, fileName: media.fileName ?? 'arquivo', caption: media.caption }
  const r = await s.sendMessage(jid, content)
  const id = r?.key.id ?? crypto.randomUUID()
  sentByApp.add(id)
  return { id, jid }
}

async function toOggOpus(input: Buffer): Promise<Buffer> {
  // (Buffer genérico: evita conflito de tipos ArrayBuffer/SharedArrayBuffer)
  // No app instalado o ffmpeg fica fora do .asar
  const bin = String(ffmpegPath ?? '').replace('app.asar', 'app.asar.unpacked')
  if (!bin) return input
  const tmp = join(app.getPath('temp'), `icchat-audio-${Date.now()}`)
  await writeFile(`${tmp}.in`, input)
  await new Promise<void>((resolve, reject) => {
    const p = spawn(bin, ['-y', '-i', `${tmp}.in`, '-vn', '-ac', '1', '-ar', '48000', '-c:a', 'libopus', '-b:a', '32k', `${tmp}.ogg`])
    p.on('error', reject)
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error('Falha ao converter o áudio'))))
  })
  const out = await readFile(`${tmp}.ogg`)
  void unlink(`${tmp}.in`).catch(() => undefined)
  void unlink(`${tmp}.ogg`).catch(() => undefined)
  return out
}

export function stop() {
  stopping = true
  sock?.end(undefined)
  sock = null
}
