// Assistente IA com a chave de API do próprio cliente.
// A chave fica criptografada pelo Windows (DPAPI) e nunca volta para a interface;
// as chamadas aos provedores saem daqui, do processo principal.
import { app, safeStorage } from 'electron'
import { join } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'

export type AiProvider = 'anthropic' | 'openai' | 'google' | 'openrouter' | 'ollama'

/**
 * Ollama roda na propria maquina (MIT, gratuito) e nao usa chave de API.
 * E o unico provedor em que a conversa do cliente nao sai do computador —
 * o que sustenta o argumento de LGPD e elimina custo por token.
 * Fica preso a 127.0.0.1 de proposito: o servidor do Ollama nao tem
 * autenticacao, entao expor em outra interface abriria a IA para a rede.
 */
export const OLLAMA_URL = 'http://127.0.0.1:11434'
export interface AiTurn {
  role: 'user' | 'assistant'
  content: string
}
export interface AiReply {
  text: string
  tokens: number
}

interface Store {
  keys: Partial<Record<AiProvider, string>>
  checkedAt?: Partial<Record<AiProvider, number>>
}

const file = () => join(app.getPath('userData'), 'ai.json')
const ENC = 'icchat-enc:'
const PROVIDERS: AiProvider[] = ['anthropic', 'openai', 'google', 'openrouter', 'ollama']
/** Provedores que precisam de chave. O Ollama e local e nao precisa. */
const PROVIDERS_COM_CHAVE = PROVIDERS.filter((p) => p !== 'ollama')

async function load(): Promise<Store> {
  try {
    const raw = await readFile(file(), 'utf8')
    const json = raw.startsWith(ENC) ? safeStorage.decryptString(Buffer.from(raw.slice(ENC.length), 'base64')) : raw
    const s = JSON.parse(json) as Store
    return { keys: s.keys ?? {}, checkedAt: s.checkedAt ?? {} }
  } catch {
    return { keys: {}, checkedAt: {} }
  }
}
async function save(s: Store) {
  const json = JSON.stringify(s)
  const out = safeStorage.isEncryptionAvailable() ? ENC + safeStorage.encryptString(json).toString('base64') : json
  await writeFile(file(), out, 'utf8')
}

const mask = (k: string) => (k.length > 8 ? `${k.slice(0, 6)}••••${k.slice(-4)}` : '••••')
const assertProvider = (p: unknown): AiProvider => {
  if (!PROVIDERS.includes(p as AiProvider)) throw new Error('Provedor inválido')
  return p as AiProvider
}

/** O que a interface pode saber: se há chave e a versão mascarada */
export async function status() {
  const s = await load()
  return Object.fromEntries(
    PROVIDERS_COM_CHAVE.map((p) => [p, s.keys[p] ? { masked: mask(s.keys[p]!), checkedAt: s.checkedAt?.[p] } : null])
  ) as Record<AiProvider, { masked: string; checkedAt?: number } | null>
}

/**
 * Detecta o Ollama na maquina e lista os modelos ja baixados.
 * Nao lanca erro quando nao ha nada instalado: a ausencia e uma resposta
 * valida, e a interface usa isso para oferecer a instalacao.
 */
export async function localStatus(): Promise<{
  running: boolean
  models: { name: string; sizeGb: number }[]
}> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(1500) })
    if (!res.ok) return { running: false, models: [] }
    const j = (await res.json()) as { models?: { name: string; size?: number }[] }
    return {
      running: true,
      models: (j.models ?? []).map((m) => ({
        name: m.name,
        sizeGb: Math.round(((m.size ?? 0) / 1e9) * 10) / 10
      }))
    }
  } catch {
    // Servidor fora do ar, porta fechada ou Ollama nao instalado.
    return { running: false, models: [] }
  }
}

export async function setKey(provider: unknown, key: unknown) {
  const p = assertProvider(provider)
  if (typeof key !== 'string' || key.trim().length < 12 || key.length > 400 || /\s/.test(key.trim())) throw new Error('Chave inválida')
  const s = await load()
  s.keys[p] = key.trim()
  delete s.checkedAt![p]
  await save(s)
}

export async function clearKey(provider: unknown) {
  const p = assertProvider(provider)
  const s = await load()
  delete s.keys[p]
  delete s.checkedAt![p]
  await save(s)
}

/** Faz uma chamada mínima para confirmar que a chave e o modelo funcionam */
export async function test(provider: unknown, model: unknown) {
  const r = await reply(provider, model, 'Responda apenas: ok', [{ role: 'user', content: 'teste' }], 20)
  const s = await load()
  s.checkedAt![assertProvider(provider)] = Date.now()
  await save(s)
  return r
}

/** Junta mensagens seguidas do mesmo lado e garante que a conversa começa pelo cliente */
function normalize(turns: AiTurn[]): AiTurn[] {
  const out: AiTurn[] = []
  for (const t of turns) {
    if (!t.content?.trim()) continue
    const last = out[out.length - 1]
    if (last && last.role === t.role) last.content += '\n' + t.content
    else out.push({ role: t.role === 'assistant' ? 'assistant' : 'user', content: t.content.slice(0, 4000) })
  }
  while (out.length && out[0].role !== 'user') out.shift()
  return out.slice(-30)
}

async function post(url: string, headers: Record<string, string>, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000)
  })
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const err = json.error as { message?: string } | string | undefined
    const msg = typeof err === 'string' ? err : err?.message
    if (res.status === 401 || res.status === 403) throw new Error('Chave de API recusada pelo provedor')
    if (res.status === 429) throw new Error('Limite do provedor atingido (muitas mensagens ou sem crédito)')
    throw new Error(msg ? `Provedor: ${msg}` : `Provedor respondeu ${res.status}`)
  }
  return json
}

export async function reply(provider: unknown, model: unknown, system: unknown, turns: unknown, maxTokens = 700): Promise<AiReply> {
  const p = assertProvider(provider)
  if (typeof model !== 'string' || !/^[\w.:/-]{2,80}$/.test(model)) throw new Error('Modelo inválido')
  if (typeof system !== 'string' || system.length > 60_000) throw new Error('Instruções inválidas')
  if (!Array.isArray(turns)) throw new Error('Conversa inválida')
  const msgs = normalize(turns as AiTurn[])
  if (!msgs.length) throw new Error('Conversa vazia')
  if (p === 'ollama') {
    const j = await post(
      `${OLLAMA_URL}/api/chat`,
      {},
      {
        model,
        stream: false,
        options: { num_predict: maxTokens },
        messages: [{ role: 'system', content: system }, ...msgs]
      }
    )
    const m = j.message as { content?: string } | undefined
    // Ollama devolve contagem de tokens separada por entrada e saida.
    const entrada = Number(j.prompt_eval_count ?? 0)
    const saida = Number(j.eval_count ?? 0)
    return { text: (m?.content ?? '').trim(), tokens: entrada + saida }
  }

  const key = (await load()).keys[p]
  if (!key) throw new Error('Cadastre a chave de API do provedor em Assistente IA')

  if (p === 'anthropic') {
    const j = await post(
      'https://api.anthropic.com/v1/messages',
      { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      { model, max_tokens: maxTokens, system, messages: msgs }
    )
    const content = (j.content as { type: string; text?: string }[] | undefined) ?? []
    const usage = j.usage as { input_tokens?: number; output_tokens?: number } | undefined
    return { text: content.filter((c) => c.type === 'text').map((c) => c.text).join('').trim(), tokens: (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0) }
  }

  if (p === 'google') {
    const j = await post(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      { 'x-goog-api-key': key },
      {
        systemInstruction: { parts: [{ text: system }] },
        contents: msgs.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        generationConfig: { maxOutputTokens: maxTokens }
      }
    )
    const cand = (j.candidates as { content?: { parts?: { text?: string }[] } }[] | undefined)?.[0]
    const usage = j.usageMetadata as { totalTokenCount?: number } | undefined
    return { text: (cand?.content?.parts ?? []).map((x) => x.text ?? '').join('').trim(), tokens: usage?.totalTokenCount ?? 0 }
  }

  // OpenAI e OpenRouter usam o mesmo formato
  const url = p === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions'
  const extra: Record<string, string> = p === 'openrouter' ? { 'HTTP-Referer': 'https://www.itacondo.com.br', 'X-Title': 'IC Chat' } : {}
  const j = await post(
    url,
    { authorization: `Bearer ${key}`, ...extra },
    {
      model: p === 'openrouter' && model === 'auto' ? 'openrouter/auto' : model,
      messages: [{ role: 'system', content: system }, ...msgs],
      ...(p === 'openai' ? { max_completion_tokens: maxTokens * 4 } : { max_tokens: maxTokens })
    }
  )
  const choice = (j.choices as { message?: { content?: string } }[] | undefined)?.[0]
  const usage = j.usage as { total_tokens?: number } | undefined
  return { text: (choice?.message?.content ?? '').trim(), tokens: usage?.total_tokens ?? 0 }
}
