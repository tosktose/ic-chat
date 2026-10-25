// Funil de vendas — dados de demonstração.
// É a contraparte comercial do Kanban de atendimento: aqui o card tem VALOR,
// dono e próxima ação, e a coluna soma dinheiro. No banco real cada negócio
// tem tenant_id e referencia um contato.

export type EtapaFunil = 'novo' | 'qualificando' | 'proposta' | 'negociacao' | 'ganho' | 'perdido'

export interface Negocio {
  id: string
  contactId: string
  titulo: string
  valor: number
  etapa: EtapaFunil
  /** Chance de fechar, 0–100. Alimenta a previsão ponderada. */
  probabilidade: number
  donoId: string
  /** Dias parados nesta etapa — vira alerta quando passa do limite. */
  diasNaEtapa: number
  proximaAcao?: string
  origem: 'WhatsApp' | 'Instagram' | 'Indicação' | 'Site'
  motivoPerda?: string
}

export const ETAPAS: { id: EtapaFunil; label: string; accent: string; limiteDias: number }[] = [
  { id: 'novo', label: 'Novo lead', accent: 'bg-primary', limiteDias: 2 },
  { id: 'qualificando', label: 'Qualificando', accent: 'bg-violet-500', limiteDias: 3 },
  { id: 'proposta', label: 'Proposta enviada', accent: 'bg-warning', limiteDias: 4 },
  { id: 'negociacao', label: 'Negociação', accent: 'bg-accent', limiteDias: 5 },
  { id: 'ganho', label: 'Ganho', accent: 'bg-success', limiteDias: 999 },
  { id: 'perdido', label: 'Perdido', accent: 'bg-subtle', limiteDias: 999 }
]

export const negocios: Negocio[] = [
  { id: 'n1', contactId: 'c1', titulo: 'Pacote coloração + hidratação', valor: 890, etapa: 'negociacao', probabilidade: 70, donoId: 'u2', diasNaEtapa: 2, proximaAcao: 'Confirmar desconto de 10%', origem: 'WhatsApp' },
  { id: 'n2', contactId: 'c3', titulo: 'Primeira visita — avaliação', valor: 180, etapa: 'novo', probabilidade: 20, donoId: 'u2', diasNaEtapa: 1, proximaAcao: 'Responder primeira mensagem', origem: 'Instagram' },
  { id: 'n3', contactId: 'c4', titulo: 'Mechas + corte', valor: 1240, etapa: 'proposta', probabilidade: 55, donoId: 'u3', diasNaEtapa: 6, proximaAcao: 'Cobrar retorno da proposta', origem: 'WhatsApp' },
  { id: 'n4', contactId: 'c8', titulo: 'Plano mensal VIP', valor: 3600, etapa: 'negociacao', probabilidade: 80, donoId: 'u2', diasNaEtapa: 1, proximaAcao: 'Enviar contrato', origem: 'Indicação' },
  { id: 'n5', contactId: 'c6', titulo: 'Tratamento capilar — 6 sessões', valor: 1450, etapa: 'qualificando', probabilidade: 35, donoId: 'u3', diasNaEtapa: 4, proximaAcao: 'Descobrir orçamento', origem: 'Site' },
  { id: 'n6', contactId: 'c2', titulo: 'Barba + corte mensal', valor: 320, etapa: 'ganho', probabilidade: 100, donoId: 'u2', diasNaEtapa: 0, origem: 'WhatsApp' },
  { id: 'n7', contactId: 'c5', titulo: 'Corte simples', valor: 90, etapa: 'perdido', probabilidade: 0, donoId: 'u3', diasNaEtapa: 0, origem: 'Instagram', motivoPerda: 'Achou caro' },
  { id: 'n8', contactId: 'c7', titulo: 'Day spa para dois', valor: 760, etapa: 'novo', probabilidade: 15, donoId: 'u3', diasNaEtapa: 3, proximaAcao: 'Primeiro contato', origem: 'Site' },
  { id: 'n9', contactId: 'c6', titulo: 'Pacote noiva', valor: 2800, etapa: 'proposta', probabilidade: 60, donoId: 'u2', diasNaEtapa: 2, proximaAcao: 'Agendar prova', origem: 'Indicação' },
  { id: 'n10', contactId: 'c1', titulo: 'Escova progressiva', valor: 540, etapa: 'qualificando', probabilidade: 40, donoId: 'u3', diasNaEtapa: 1, proximaAcao: 'Checar histórico de alergia', origem: 'WhatsApp' },
  { id: 'n11', contactId: 'c4', titulo: 'Manutenção trimestral', valor: 980, etapa: 'ganho', probabilidade: 100, donoId: 'u2', diasNaEtapa: 0, origem: 'WhatsApp' },
  { id: 'n12', contactId: 'c8', titulo: 'Indicação — amiga da Juliana', valor: 450, etapa: 'novo', probabilidade: 25, donoId: 'u2', diasNaEtapa: 0, proximaAcao: 'Ligar hoje', origem: 'Indicação' }
]

export const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

/** Previsão ponderada: só o que ainda está em aberto conta. */
export function previsao(lista: Negocio[]): number {
  return lista
    .filter((n) => n.etapa !== 'ganho' && n.etapa !== 'perdido')
    .reduce((soma, n) => soma + (n.valor * n.probabilidade) / 100, 0)
}

export function totalDaEtapa(lista: Negocio[], etapa: EtapaFunil): number {
  return lista.filter((n) => n.etapa === etapa).reduce((s, n) => s + n.valor, 0)
}

/** Negócio parado além do limite da etapa — é o que vaza receita. */
export function estaParado(n: Negocio): boolean {
  const etapa = ETAPAS.find((e) => e.id === n.etapa)
  return !!etapa && n.diasNaEtapa > etapa.limiteDias
}
