// Créditos de IA — a camada que sustenta a cobrança.
//
// Modelo: você aluga a API de um agregador (OpenRouter, por exemplo), paga
// por token consumido, e revende ao cliente em CRÉDITOS. A margem é a
// diferença. Medir isso por empresa não é relatório: é o que impede vender
// no prejuízo quando um cliente usa muito mais do que o plano previa.
//
// 1 crédito = 1.000 tokens (entrada + saída somadas).

export const CREDITO_EM_TOKENS = 1000

/** Em reais. O custo é estimativa do provedor; o preço é o que você cobra. */
export const PRECO = {
  /** Você paga ao provedor por 1.000 tokens. */
  custoPorCredito: 0.009,
  /** Você cobra do cliente por crédito avulso, fora do plano. */
  vendaPorCredito: 0.04
} as const

export interface SaldoIa {
  tenantId: string
  /** Créditos que o plano já inclui por mês. */
  incluidoNoPlano: number
  /** Créditos avulsos comprados e ainda não usados. */
  saldoAvulso: number
  consumoMes: number
  /** Recarrega sozinho quando o saldo acaba, para a IA não parar. */
  autoRecarga: boolean
  ultimaRecarga?: string
}

export const saldos: SaldoIa[] = [
  { tenantId: 't1', incluidoNoPlano: 1000, saldoAvulso: 420, consumoMes: 1180, autoRecarga: true, ultimaRecarga: '18/10/2026' },
  { tenantId: 't2', incluidoNoPlano: 300, saldoAvulso: 0, consumoMes: 268, autoRecarga: false },
  { tenantId: 't3', incluidoNoPlano: 5000, saldoAvulso: 2500, consumoMes: 6310, autoRecarga: true, ultimaRecarga: '21/10/2026' },
  { tenantId: 't4', incluidoNoPlano: 1000, saldoAvulso: 0, consumoMes: 994, autoRecarga: false },
  { tenantId: 't5', incluidoNoPlano: 300, saldoAvulso: 0, consumoMes: 41, autoRecarga: false },
  { tenantId: 't6', incluidoNoPlano: 1000, saldoAvulso: 0, consumoMes: 0, autoRecarga: false },
  { tenantId: 't7', incluidoNoPlano: 300, saldoAvulso: 0, consumoMes: 0, autoRecarga: false }
]

/** Créditos ainda disponíveis no mês. */
export function disponivel(s: SaldoIa): number {
  return Math.max(0, s.incluidoNoPlano - s.consumoMes) + s.saldoAvulso
}

/** Quanto passou do que o plano inclui — é o que vira cobrança avulsa. */
export function excedente(s: SaldoIa): number {
  return Math.max(0, s.consumoMes - s.incluidoNoPlano)
}

/** O que você pagou ao provedor por esta empresa no mês. */
export function custo(s: SaldoIa): number {
  return s.consumoMes * PRECO.custoPorCredito
}

/** O que a empresa gerou de receita de IA: só o excedente é faturado. */
export function receita(s: SaldoIa): number {
  return excedente(s) * PRECO.vendaPorCredito
}

export type EstadoSaldo = 'saudavel' | 'atencao' | 'esgotado'

export function estado(s: SaldoIa): EstadoSaldo {
  const sobra = disponivel(s)
  if (sobra <= 0) return 'esgotado'
  if (sobra < s.incluidoNoPlano * 0.2) return 'atencao'
  return 'saudavel'
}

export const estadoCfg: Record<EstadoSaldo, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  saudavel: { label: 'Saudável', tone: 'success' },
  atencao: { label: 'Acabando', tone: 'warning' },
  esgotado: { label: 'Esgotado', tone: 'danger' }
}

export function saldoDe(tenantId: string): SaldoIa | undefined {
  return saldos.find((s) => s.tenantId === tenantId)
}
