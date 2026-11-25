/**
 * "Para quem é cada plano": prós e contras mostrados na landing.
 * O nome, o preço e a lista de recursos vêm do banco (Super Admin → Planos); aqui fica só a orientação de escolha.
 * Plano novo sem entrada aqui aparece sem o quadro (nada quebra).
 */
export interface PlanFit {
  ideal: string
  pros: string[]
  cons: string[]
}

export const PLAN_FIT: Record<string, PlanFit> = {
  start: {
    ideal: 'Profissional autônomo ou equipe pequena, até 3 pessoas atendendo.',
    pros: [
      'Menor custo para sair do caderno e do WhatsApp no celular',
      'Lembretes com confirmação, sinal por PIX e agendamento online inclusos',
      'Agenda, contatos e funil de vendas no mesmo lugar'
    ],
    cons: ['Sem o assistente de IA respondendo sozinho', 'Até 3 usuários']
  },
  pro: {
    ideal: 'Salões, clínicas e lojas com equipe de até 10 pessoas e muito movimento no WhatsApp.',
    pros: [
      'Assistente de IA responde, tira dúvidas e oferece horários 24h',
      'Relatórios por canal: você sabe de onde vêm os clientes',
      'Tudo do Start, com mais usuários'
    ],
    cons: ['Para quem tem uma unidade só (várias unidades ficam no Business)']
  },
  business: {
    ideal: 'Redes e empresas com mais de uma unidade ou equipe grande.',
    pros: ['Várias unidades e usuários ampliados', 'Integrações e suporte prioritário', 'Tudo do Pro'],
    cons: ['Investimento maior: só compensa com mais de uma unidade ou equipe grande']
  }
}

/** Novidades em todos os planos (também usadas no texto da landing) */
export const NEW_FEATURES = [
  { key: 'lembretes', title: 'Lembrete que confirma sozinho', copy: 'O cliente recebe a mensagem 24h e 2h antes e responde 1 para confirmar ou 2 para remarcar. A agenda atualiza na hora.' },
  { key: 'pix', title: 'Sinal por PIX, sem taxa', copy: 'Gere o PIX copia e cola com o valor do sinal e o QR Code. O dinheiro cai direto na sua conta, sem intermediário.' },
  { key: 'agendar', title: 'Agendamento online 24h', copy: 'Um link para a bio do Instagram: o cliente escolhe serviço, profissional e horário livre sozinho.' },
  { key: 'retorno', title: 'Clientes de volta', copy: 'Mensagem de pós-atendimento e convite para quem sumiu há 60 dias. Cada cliente recebe uma vez por visita.' },
  { key: 'resumo', title: 'Resumo da semana', copy: 'Atendimentos, faturamento, faltas e clientes novos comparados com a semana anterior, com 3 sugestões práticas.' }
] as const
