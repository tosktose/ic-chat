/**
 * PIX "copia e cola" estático (BR Code), no padrão EMV do Banco Central.
 * Gera o código com valor a partir da chave PIX da empresa, sem gateway nem taxa.
 * O cliente cola no app do banco (ou lê o QR) e o valor já vem preenchido.
 */

export type PixKeyKind = 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria'

export interface PixInput {
  key: string
  /** Nome de quem recebe (até 25 caracteres, sem acento) */
  name: string
  /** Cidade de quem recebe (até 15 caracteres, sem acento) */
  city: string
  /** Valor em reais; sem valor, o cliente digita no banco */
  amount?: number
  /** Identificador da cobrança (até 25 letras/números). Padrão: *** */
  txid?: string
  /** Mensagem que aparece no app do banco (opcional) */
  message?: string
}

const onlyDigits = (s: string) => s.replace(/\D/g, '')

/** Remove acentos e caracteres fora do padrão do BR Code */
export function pixText(s: string, max: number): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 .,\-@/]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function validCpf(d: string): boolean {
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false
  const calc = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i)
    const r = (sum * 10) % 11
    return r === 10 ? 0 : r
  }
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10])
}

function validCnpj(d: string): boolean {
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false
  const calc = (len: number) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const sum = w.reduce((s, x, i) => s + x * Number(d[i]), 0)
    const r = sum % 11
    return r < 2 ? 0 : 11 - r
  }
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13])
}

/** Descobre o tipo da chave e devolve no formato que o PIX espera (ou null se inválida) */
export function normalizePixKey(raw: string): { kind: PixKeyKind; key: string } | null {
  const k = raw.trim()
  if (!k) return null
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k)) return { kind: 'aleatoria', key: k.toLowerCase() }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(k)) return k.length <= 77 ? { kind: 'email', key: k.toLowerCase() } : null
  const d = onlyDigits(k)
  // Formatado como CPF ou CNPJ: vale só se o dígito verificador bater
  if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(k)) return validCpf(d) ? { kind: 'cpf', key: d } : null
  if (/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(k)) return validCnpj(d) ? { kind: 'cnpj', key: d } : null
  if (k.startsWith('+')) return d.length >= 12 && d.length <= 13 ? { kind: 'telefone', key: `+${d}` } : null
  if (d.length === 14 && validCnpj(d)) return { kind: 'cnpj', key: d }
  if (d.length === 11 && validCpf(d)) return { kind: 'cpf', key: d }
  // Celular brasileiro sem +55 (DDD + 9 dígitos)
  if ((d.length === 10 || d.length === 11) && /^[1-9]{2}/.test(d)) return { kind: 'telefone', key: `+55${d}` }
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return { kind: 'telefone', key: `+${d}` }
  return null
}

export const PIX_KIND_LABEL: Record<PixKeyKind, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  telefone: 'Celular',
  aleatoria: 'Chave aleatória'
}

const field = (id: string, value: string) => `${id}${String(value.length).padStart(2, '0')}${value}`

/** CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF), exigido no campo 63 */
export function crc16(payload: string): string {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/** Monta o PIX copia e cola. Lança erro com mensagem clara se faltar algo. */
export function buildPix(input: PixInput): string {
  const key = normalizePixKey(input.key)
  if (!key) throw new Error('Chave PIX inválida. Use CPF, CNPJ, e-mail, celular ou chave aleatória.')
  const name = pixText(input.name, 25)
  const city = pixText(input.city, 15)
  if (!name) throw new Error('Informe o nome de quem recebe o PIX.')
  if (!city) throw new Error('Informe a cidade de quem recebe o PIX.')
  if (input.amount !== undefined && (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > 9_999_999)) {
    throw new Error('Valor do PIX inválido.')
  }
  const message = input.message ? pixText(input.message, 40) : ''
  const account = field('00', 'br.gov.bcb.pix') + field('01', key.key) + (message ? field('02', message) : '')
  const txid = (input.txid ?? '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***'
  const body =
    field('00', '01') +
    field('26', account) +
    field('52', '0000') +
    field('53', '986') +
    (input.amount !== undefined ? field('54', input.amount.toFixed(2)) : '') +
    field('58', 'BR') +
    field('59', name) +
    field('60', city) +
    field('62', field('05', txid)) +
    '6304'
  return body + crc16(body)
}

/** Lê os campos de um BR Code (usado nos testes e para conferir antes de enviar) */
export function parsePix(code: string): Record<string, string> {
  const out: Record<string, string> = {}
  let i = 0
  while (i + 4 <= code.length) {
    const id = code.slice(i, i + 2)
    const len = Number(code.slice(i + 2, i + 4))
    out[id] = code.slice(i + 4, i + 4 + len)
    i += 4 + len
  }
  return out
}

/** Confere se o CRC do código bate (o banco recusa código com CRC errado) */
export function pixIsValid(code: string): boolean {
  if (code.length < 8 || !code.includes('6304')) return false
  const body = code.slice(0, -4)
  return body.endsWith('6304') && crc16(body) === code.slice(-4)
}
