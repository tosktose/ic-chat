// Banco local do IC Chat (SQLite embutido no Electron via node:sqlite — sem módulo nativo).
// Arquivo: %APPDATA%/IC Chat/icchat.db  ·  Mídias: %APPDATA%/IC Chat/media/
//
// Modelo de documentos: cada registro é um JSON numa tabela única indexada por tipo.
// Simples de evoluir agora e fácil de migrar depois para o schema relacional/Postgres (Supabase).
import { app } from 'electron'
import { mkdirSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export type Kind = 'contact' | 'conversation' | 'message' | 'appointment' | 'kv'
const KINDS: Kind[] = ['contact', 'conversation', 'message', 'appointment', 'kv']

let db: DatabaseSync | null = null

export const mediaDir = () => join(app.getPath('userData'), 'media')

export function open(): void {
  if (db) return
  mkdirSync(mediaDir(), { recursive: true })
  db = new DatabaseSync(join(app.getPath('userData'), 'icchat.db'))
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    CREATE TABLE IF NOT EXISTS docs (
      kind    TEXT NOT NULL,
      id      TEXT NOT NULL,
      parent  TEXT,
      data    TEXT NOT NULL,
      updated INTEGER NOT NULL,
      PRIMARY KEY (kind, id)
    );
    CREATE INDEX IF NOT EXISTS docs_parent ON docs(kind, parent);
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    INSERT OR IGNORE INTO meta(key, value) VALUES ('schema', '1');
  `)
}

function conn(): DatabaseSync {
  if (!db) open()
  return db!
}

const assertKind = (k: string): Kind => {
  if (!KINDS.includes(k as Kind)) throw new Error('Tipo de registro inválido')
  return k as Kind
}

export function upsert(kind: string, id: string, data: unknown, parent?: string): void {
  if (typeof id !== 'string' || !id || id.length > 200) throw new Error('ID inválido')
  const json = JSON.stringify(data)
  if (json.length > 2_000_000) throw new Error('Registro grande demais')
  conn()
    .prepare('INSERT INTO docs(kind, id, parent, data, updated) VALUES (?, ?, ?, ?, ?) ON CONFLICT(kind, id) DO UPDATE SET parent = excluded.parent, data = excluded.data, updated = excluded.updated')
    .run(assertKind(kind), id, parent ?? null, json, Date.now())
}

export function remove(kind: string, id: string): void {
  conn().prepare('DELETE FROM docs WHERE kind = ? AND id = ?').run(assertKind(kind), id)
  if (kind === 'conversation') conn().prepare("DELETE FROM docs WHERE kind = 'message' AND parent = ?").run(id)
}

/** Tudo o que a interface precisa ao abrir */
export function loadAll() {
  const rows = (kind: Kind) =>
    (conn().prepare('SELECT data FROM docs WHERE kind = ? ORDER BY updated ASC').all(kind) as { data: string }[]).map((r) => JSON.parse(r.data))
  const conversations = rows('conversation') as Array<Record<string, unknown> & { id: string }>
  const msgs = conn().prepare("SELECT parent, data FROM docs WHERE kind = 'message' ORDER BY rowid ASC").all() as { parent: string; data: string }[]
  const byConv = new Map<string, unknown[]>()
  for (const m of msgs) {
    const list = byConv.get(m.parent) ?? []
    list.push(JSON.parse(m.data))
    byConv.set(m.parent, list)
  }
  return {
    contacts: rows('contact').reverse(),
    conversations: conversations.map((c) => ({ ...c, messages: byConv.get(c.id) ?? [] })).reverse(),
    appointments: rows('appointment'),
    kv: Object.fromEntries((rows('kv') as { key: string; value: unknown }[]).map((r) => [r.key, r.value]))
  }
}

export function clearAll(): void {
  conn().exec('DELETE FROM docs')
}

/* ------------------------------------------------------------------ */
/* Mídias (fotos, áudios, documentos)                                   */
/* ------------------------------------------------------------------ */
const EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'audio/ogg': '.ogg',
  'audio/webm': '.webm',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'application/pdf': '.pdf'
}

export const MAX_MEDIA_BYTES = 16 * 1024 * 1024

/** Salva a mídia e devolve o endereço interno icchat-media://m/<arquivo> */
export async function saveMedia(buf: Buffer, mime: string, fileName?: string): Promise<string> {
  if (buf.length > MAX_MEDIA_BYTES) throw new Error('Arquivo maior que 16 MB')
  const clean = mime.split(';')[0].trim().toLowerCase()
  const ext = EXT[clean] ?? (fileName ? extname(fileName).replace(/[^.\w]/g, '').slice(0, 8) : '') ?? ''
  const name = `${Date.now()}-${crypto.randomUUID()}${ext || '.bin'}`
  await writeFile(join(mediaDir(), name), buf)
  return `icchat-media://m/${name}`
}

/** Caminho real do arquivo pedido pelo protocolo (bloqueia "../") */
export function mediaPath(url: string): string {
  const name = basename(decodeURIComponent(new URL(url).pathname))
  if (!/^[\w.-]+$/.test(name)) throw new Error('Arquivo inválido')
  return join(mediaDir(), name)
}

export const readMedia = (url: string) => readFile(mediaPath(url))
