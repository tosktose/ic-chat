// Fonte única do SEO do site público: títulos, descrições, textos e perguntas frequentes.
// É usada pela tela (React), pelo sitemap e pelo HTML pré-gerado no build (para o Google ler sem executar JavaScript).
// Mantenha este arquivo SEM imports do React: ele também roda no Node durante o build.

export const DEFAULT_SITE_URL = 'https://www.icchat.com.br'

export interface FaqItem { q: string; a: string }
export interface SeoSection { h2: string; p?: string; items?: string[] }
export interface SeoPage {
  path: string
  title: string // até ~60 caracteres
  description: string // até ~155 caracteres
  index: boolean
  changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly'
  priority: string
  h1: string
  lead: string
  sections: SeoSection[]
  faq: FaqItem[]
  /** Nome curto para o "caminho" (breadcrumb) no Google */
  crumb?: string
}

export const HOME_FAQ: FaqItem[] = [
  { q: 'O que é um chatbot com IA para WhatsApp?', a: 'É um assistente virtual que responde seus clientes automaticamente, a qualquer hora, usando inteligência artificial. No IC Chat ele conhece os serviços, preços e horários da sua empresa, sugere horários livres e passa a conversa para uma pessoa da equipe quando o cliente pede ou quando a situação exige.' },
  { q: 'O IC Chat serve para pequenas empresas?', a: 'Sim. Foi pensado para pequenas e médias empresas que atendem pelo WhatsApp: clínicas, salões, barbearias, pet shops, lojas e prestadores de serviço. Você começa com 7 dias grátis, sem cartão de crédito.' },
  { q: 'Como funciona o teste grátis de 7 dias?', a: 'Você cria a conta, usa todas as funcionalidades por 7 dias e só escolhe um plano se quiser continuar. Não pedimos cartão de crédito para começar.' },
  { q: 'Preciso instalar alguma coisa?', a: 'A versão online funciona direto no navegador. Para conectar o número do WhatsApp por QR Code, usamos o aplicativo IC Chat para Windows, que você baixa na própria página.' },
  { q: 'Quanto custa o IC Chat?', a: 'Os planos começam em R$ 79 por mês (Start), com o Pro a R$ 149 e o Business a R$ 299. Todos incluem créditos de IA por mês; se precisar de mais, você compra pacotes avulsos.' },
  { q: 'Meus dados ficam seguros e seguem a LGPD?', a: 'Os dados de cada empresa ficam separados, com regras de acesso no banco de dados, e o tratamento segue a Lei Geral de Proteção de Dados. Veja a Política de Privacidade para os detalhes e para exercer seus direitos.' },
  { q: 'O que acontece depois dos 7 dias de teste?', a: 'Você escolhe o plano que faz sentido para a sua empresa. Sem uma assinatura ativa, o acesso aos dados fica suspenso até a regularização, e nada é apagado.' }
]

const cta = 'Teste grátis por 7 dias'

export const SEO_PAGES: SeoPage[] = [
  {
    path: '/',
    title: 'IC Chat | Chatbot com IA e CRM para WhatsApp',
    description: 'Automatize o atendimento no WhatsApp com chatbot de IA, CRM, funil de vendas e agenda. Sistema para pequenas empresas. Teste grátis por 7 dias, sem cartão.',
    index: true,
    changefreq: 'weekly',
    priority: '1.0',
    h1: 'Automatize seu atendimento no WhatsApp com IA e não perca nenhuma venda',
    lead: 'O IC Chat reúne chatbot com inteligência artificial, CRM, funil de vendas e agenda em um só sistema de atendimento, feito para pequenas e médias empresas.',
    sections: [
      { h2: 'Sistema de atendimento, CRM e chatbot com IA em um só lugar', items: ['Caixa de entrada única para toda a equipe (multiatendimento no mesmo número de WhatsApp)', 'Chatbot com IA que responde, sugere horários e passa para uma pessoa quando precisa', 'CRM com contatos, histórico e origem de cada cliente', 'Funil de vendas visual para acompanhar cada oportunidade', 'Agenda online com profissionais, serviços e lembretes', 'Relatórios em Excel e PDF por canal, atendente e período'] },
      { h2: 'Para quem é o IC Chat', p: 'Clínicas, salões, barbearias, pet shops, lojas e prestadores de serviço que vendem e agendam pelo WhatsApp e querem organizar o atendimento sem planilhas espalhadas.' }
    ],
    faq: HOME_FAQ
  },
  {
    path: '/chatbot-whatsapp-ia',
    title: 'Chatbot com IA para WhatsApp | IC Chat',
    description: 'Chatbot com inteligência artificial para WhatsApp: responde clientes 24h, sugere horários e passa para sua equipe na hora certa. Teste grátis por 7 dias.',
    index: true,
    changefreq: 'monthly',
    priority: '0.9',
    crumb: 'Chatbot com IA para WhatsApp',
    h1: 'Chatbot com IA para WhatsApp que atende, agenda e chama sua equipe',
    lead: 'Pare de responder as mesmas perguntas o dia inteiro. O assistente de IA do IC Chat atende com o jeito da sua empresa e entrega a conversa pronta para quem fecha a venda.',
    sections: [
      { h2: 'Como o chatbot com inteligência artificial atende seus clientes', items: ['Responde dúvidas sobre serviços, preços e horários de funcionamento', 'Sugere horários livres da agenda e ajuda a marcar o atendimento', 'Mantém o tom de voz que você escolher: formal, amigável ou descontraído', 'Entende áudios e mensagens longas e responde em frases curtas, como numa conversa de WhatsApp', 'Transfere para um atendente quando o cliente pede ou quando a IA não tem certeza'] },
      { h2: 'Você no controle da IA', p: 'Você define o nome do assistente, as instruções, os limites de uso e quando ele deve passar a conversa para uma pessoa. Nada de resposta inventada: a IA só fala sobre a sua empresa, com os dados que você cadastrou.' },
      { h2: 'Créditos de IA claros, sem surpresa na fatura', p: 'Cada plano inclui créditos de IA todo mês. Você acompanha o saldo e o extrato na própria tela e, se precisar de mais, compra um pacote avulso. Quando os créditos acabam, a IA pausa e a equipe assume.' }
    ],
    faq: [
      { q: 'O chatbot substitui meus atendentes?', a: 'Não. Ele cuida das perguntas repetidas e da triagem, e passa para uma pessoa quando o cliente pede ou quando o assunto exige. A equipe ganha tempo para o que realmente fecha venda.' },
      { q: 'Posso personalizar o que a IA responde?', a: 'Sim. Você escolhe o nome, o tom de voz e escreve instruções próprias. A IA usa os serviços, preços e horários que você cadastrou.' },
      { q: 'Como conecto o chatbot ao WhatsApp?', a: 'A conexão do número é feita pelo aplicativo IC Chat para Windows, escaneando um QR Code. A versão online organiza contatos, funil, agenda e créditos de IA.' },
      { q: 'Quanto custa um chatbot com IA no IC Chat?', a: 'Os planos começam em R$ 79 por mês e já incluem créditos de IA. Pacotes avulsos estão disponíveis para quem consome mais.' }
    ]
  },
  {
    path: '/crm-whatsapp',
    title: 'CRM para WhatsApp com funil de vendas | IC Chat',
    description: 'CRM para WhatsApp: centralize contatos, conversas e oportunidades em um funil de vendas visual. Ideal para pequenas empresas. Teste grátis por 7 dias.',
    index: true,
    changefreq: 'monthly',
    priority: '0.9',
    crumb: 'CRM para WhatsApp',
    h1: 'CRM para WhatsApp com funil de vendas visual',
    lead: 'Cada conversa vira um contato, e cada contato pode virar uma oportunidade. Veja quanto está em aberto, o que está parado e de onde vêm seus clientes.',
    sections: [
      { h2: 'Tudo sobre o cliente no mesmo lugar', items: ['Ficha do contato com histórico de conversas, etiquetas e observações', 'Origem do cliente (WhatsApp, Instagram, indicação, site) para saber o que funciona', 'Responsável por cada negócio e próxima ação combinada', 'Importação de contatos por planilha CSV'] },
      { h2: 'Funil de vendas para acompanhar cada oportunidade', p: 'Arraste o negócio entre as etapas (novo lead, qualificação, proposta, negociação, ganho ou perdido). O funil mostra o valor em aberto, a previsão pela chance de fechamento e os negócios parados.' },
      { h2: 'Relatórios para decidir com dados', p: 'Exporte em Excel e PDF o que está vendo na tela, filtrado por período, atendente, serviço e origem do cliente.' }
    ],
    faq: [
      { q: 'O que é um CRM para WhatsApp?', a: 'É um sistema que organiza contatos, conversas e oportunidades de venda de quem fala com sua empresa pelo WhatsApp, para que nenhum cliente se perca no meio das mensagens.' },
      { q: 'O IC Chat tem funil de vendas?', a: 'Sim. O funil é visual, com etapas, valores, previsão ponderada e alertas de negócios parados.' },
      { q: 'Várias pessoas podem atender pelo mesmo WhatsApp?', a: 'Sim. A equipe inteira atende pelo mesmo número, com fila, responsável por conversa e histórico compartilhado.' }
    ]
  },
  {
    path: '/automatizar-atendimento',
    title: 'Automatizar atendimento ao cliente | IC Chat',
    description: 'Automatize o atendimento ao cliente: chatbot com IA, respostas rápidas, fila de atendimento e agenda online em um só sistema. Comece grátis por 7 dias.',
    index: true,
    changefreq: 'monthly',
    priority: '0.9',
    crumb: 'Automatizar atendimento',
    h1: 'Como automatizar o atendimento ao cliente sem perder o toque humano',
    lead: 'Automatizar não é virar robô. É deixar a rotina com o sistema e o relacionamento com as pessoas. Veja o que o IC Chat automatiza no seu dia a dia.',
    sections: [
      { h2: 'O que dá para automatizar no atendimento', items: ['Primeira resposta e perguntas frequentes com chatbot de IA', 'Respostas rápidas para as mensagens que você repete todo dia', 'Distribuição de conversas entre os atendentes (multiatendimento)', 'Marcação de horários e confirmação de agendamentos', 'Movimentação de cards no Kanban conforme a conversa avança'] },
      { h2: 'Multiatendimento: vários atendentes, um só WhatsApp', p: 'Gerentes e analistas atendem pelo mesmo número da empresa, cada um com as próprias conversas e a fila de espera à vista. O cliente sabe quem está falando com ele.' },
      { h2: 'Comece em minutos', p: 'Crie a conta, cadastre serviços e horários e teste por 7 dias, sem cartão. Se precisar de ajuda, nossa equipe orienta a configuração inicial.' }
    ],
    faq: [
      { q: 'Como automatizar o atendimento no WhatsApp?', a: 'Combinando um chatbot que cuida das perguntas repetidas, respostas rápidas para o restante e uma caixa de entrada compartilhada para a equipe. O IC Chat reúne tudo isso em um só sistema.' },
      { q: 'Automatizar o atendimento deixa o cliente insatisfeito?', a: 'Não, quando a automação resolve rápido e passa para uma pessoa na hora certa. No IC Chat você define quando a IA deve transferir a conversa.' },
      { q: 'O que é multiatendimento no WhatsApp?', a: 'É usar o mesmo número de WhatsApp com vários atendentes ao mesmo tempo, com divisão de conversas e histórico compartilhado.' }
    ]
  },
  {
    path: '/cadastro',
    title: 'Teste grátis por 7 dias | IC Chat',
    description: 'Crie sua conta e teste o IC Chat por 7 dias, sem cartão de crédito: chatbot com IA, CRM, funil de vendas e agenda para o seu atendimento.',
    index: true,
    changefreq: 'monthly',
    priority: '0.8',
    crumb: 'Teste grátis',
    h1: 'Comece seu teste grátis de 7 dias',
    lead: 'Crie sua conta e use todas as funcionalidades do IC Chat por 7 dias, sem cartão de crédito.',
    sections: [],
    faq: []
  },
  {
    path: '/login',
    title: 'Entrar | IC Chat',
    description: 'Entre na sua conta IC Chat.',
    index: false,
    changefreq: 'yearly',
    priority: '0.1',
    h1: 'Entrar no IC Chat',
    lead: 'Acesse sua conta para continuar de onde sua equipe parou.',
    sections: [],
    faq: []
  },
  {
    path: '/privacidade',
    title: 'Política de Privacidade | IC Chat',
    description: 'Como o IC Chat trata dados pessoais conforme a LGPD: quais dados coletamos, para que usamos, cookies e como exercer seus direitos.',
    index: true,
    changefreq: 'yearly',
    priority: '0.3',
    crumb: 'Política de Privacidade',
    h1: 'Política de Privacidade',
    lead: 'Como o IC Chat trata dados pessoais, de acordo com a Lei Geral de Proteção de Dados (LGPD).',
    sections: [],
    faq: []
  },
  {
    path: '/termos',
    title: 'Termos de Uso | IC Chat',
    description: 'Termos de uso do IC Chat: serviço, período de teste, planos, responsabilidades e cancelamento.',
    index: true,
    changefreq: 'yearly',
    priority: '0.3',
    crumb: 'Termos de Uso',
    h1: 'Termos de Uso',
    lead: 'Regras de uso do IC Chat: serviço, período de teste, planos, responsabilidades e cancelamento.',
    sections: [],
    faq: []
  }
]

/** Páginas de conteúdo por palavra-chave (têm tela própria no site). */
export const KEYWORD_PAGES = SEO_PAGES.filter((p) => ['/chatbot-whatsapp-ia', '/crm-whatsapp', '/automatizar-atendimento'].includes(p.path))

export const pageByPath = (path: string) => SEO_PAGES.find((p) => p.path === path)

export const CTA_LABEL = cta
