// Captação social: comentário em post vira conversa no direct.
//
// É o motor de crescimento que ferramentas como o ManyChat vendem. A Meta tem
// endpoint oficial para isso nas duas redes — "private replies" — e as regras
// são quase idênticas:
//
//   Instagram  POST /{ig-user-id}/messages  recipient: { comment_id }
//              permissões: instagram_business_manage_messages
//                        + instagram_business_manage_comments
//              750 chamadas/hora por conta profissional
//
//   Facebook   POST /me/messages            recipient: { comment_id }
//              permissões: pages_messaging + pages_manage_engagement
//
// Em ambas: 7 dias de janela a partir do comentário, UMA mensagem por
// comentário, e só se a pessoa responder abre a janela de 24h para conversar.
// Esses limites não são detalhe: são o que decide se a régua funciona.

export type RedeSocial = 'instagram' | 'messenger'

export const LIMITES = {
  janelaDias: 7,
  respostasPorComentario: 1,
  instagramPorHora: 750
} as const

export interface RegraCaptacao {
  id: string
  ativa: boolean
  rede: RedeSocial
  /** Post específico ou todos os posts da conta. */
  alvo: string
  /** Palavras que disparam. Vazio = qualquer comentário. */
  gatilhos: string[]
  mensagem: string
  /** Etiqueta aplicada ao contato criado. */
  etiqueta?: string
  /** Joga o contato direto para uma etapa do funil de vendas. */
  etapaFunil?: string
  capturados7d: number
  respondidos7d: number
}

export const regras: RegraCaptacao[] = [
  {
    id: 'r1',
    ativa: true,
    rede: 'instagram',
    alvo: 'Reel · "Antes e depois da escova"',
    gatilhos: ['quero', 'preço', 'valor', 'eu'],
    mensagem: 'Oi! Vi seu comentário 💙 A escova sai por R$ 180 e tenho horário essa semana. Quer que eu reserve?',
    etiqueta: 'Veio do Reel',
    etapaFunil: 'novo',
    capturados7d: 148,
    respondidos7d: 61
  },
  {
    id: 'r2',
    ativa: true,
    rede: 'instagram',
    alvo: 'Todos os posts',
    gatilhos: ['tabela', 'preços'],
    mensagem: 'Te mandei a tabela completa aqui no direct! Qualquer dúvida é só responder.',
    etiqueta: 'Pediu tabela',
    capturados7d: 63,
    respondidos7d: 29
  },
  {
    id: 'r3',
    ativa: false,
    rede: 'messenger',
    alvo: 'Post · "Promoção de outubro"',
    gatilhos: ['promo'],
    mensagem: 'A promoção vale até sexta! Quer garantir o seu horário?',
    etiqueta: 'Promoção outubro',
    etapaFunil: 'qualificando',
    capturados7d: 0,
    respondidos7d: 0
  }
]

export type StatusCaptura = 'enviado' | 'respondeu' | 'fora_da_janela' | 'ja_respondido'

export interface Captura {
  id: string
  rede: RedeSocial
  autor: string
  comentario: string
  quando: string
  status: StatusCaptura
  regraId: string
}

export const capturas: Captura[] = [
  { id: 'cap1', rede: 'instagram', autor: 'marianalv', comentario: 'quero saber o preço 😍', quando: 'há 4 min', status: 'respondeu', regraId: 'r1' },
  { id: 'cap2', rede: 'instagram', autor: 'ju.andrade', comentario: 'eu!!', quando: 'há 12 min', status: 'enviado', regraId: 'r1' },
  { id: 'cap3', rede: 'instagram', autor: 'carol_dias', comentario: 'manda a tabela por favor', quando: 'há 38 min', status: 'respondeu', regraId: 'r2' },
  { id: 'cap4', rede: 'messenger', autor: 'Roberto Lima', comentario: 'qual o valor?', quando: 'há 1 h', status: 'enviado', regraId: 'r1' },
  { id: 'cap5', rede: 'instagram', autor: 'paty.makeup', comentario: 'quero', quando: 'há 2 h', status: 'ja_respondido', regraId: 'r1' },
  { id: 'cap6', rede: 'instagram', autor: 'lucas.mtz', comentario: 'preço?', quando: 'há 9 dias', status: 'fora_da_janela', regraId: 'r1' }
]

export const statusCaptura: Record<StatusCaptura, { label: string; tone: 'success' | 'primary' | 'warning' | 'neutral'; explica: string }> = {
  respondeu: { label: 'Respondeu', tone: 'success', explica: 'Virou conversa: a janela de 24 horas está aberta.' },
  enviado: { label: 'DM enviada', tone: 'primary', explica: 'Aguardando a pessoa responder para abrir a conversa.' },
  ja_respondido: { label: 'Já respondido', tone: 'neutral', explica: 'A Meta permite uma única mensagem por comentário.' },
  fora_da_janela: { label: 'Fora da janela', tone: 'warning', explica: 'Passou dos 7 dias permitidos para responder ao comentário.' }
}

export const redeLabel: Record<RedeSocial, string> = {
  instagram: 'Instagram',
  messenger: 'Facebook'
}

export function taxaResposta(r: RegraCaptacao): number {
  return r.capturados7d ? Math.round((r.respondidos7d / r.capturados7d) * 100) : 0
}
