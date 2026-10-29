# Estudo de caso: DGFlow (dgflow.com.br) e plano de melhorias do IC Chat

> Atenção: o nome do concorrente é **DGFlow** (não DejaFlow). Dados lidos da página pública em 29/10/2026; as respostas do FAQ deles não aparecem na página.

## Quem é o DGFlow
CRM e gestão para **agências, freelancers e criativos** (designers, social media, editores de vídeo). Não é um sistema de atendimento: o foco é lead → proposta → contrato → projeto → financeiro. O IC Chat é de **atendimento e chatbot com IA no WhatsApp** para clínicas, salões, pet shops e lojas. Concorrem pouco de frente, mas têm recursos que valem copiar.

## O que eles têm
| Área | Funcionalidades |
| --- | --- |
| Captação | Leads ilimitados; formulários com lógica condicional; quizzes; link na bio; pop-ups; webhooks e Meta Lead Ads; pipeline visual com distribuição automática por responsável |
| Vendas | Propostas com aprovação online; contratos com assinatura digital; portal do cliente |
| Projetos | Kanban de projetos e tarefas; equipe com permissões; tarefas geradas do orçamento |
| Financeiro | Fluxo de caixa; cobrança por PIX, boleto e cartão; conciliação (Asaas, Mercado Pago, Abacate Pay, Banco Inter) |
| IA | Agentes de IA, criação de carrossel, copy, análise de dados |
| Comunicação | WhatsApp integrado com automações e disparos em massa; Google Meet com link automático; sincroniza Google Calendar |
| Marketing | E-mail marketing, Meta Pixel/CAPI, Facebook Ads, landing page e hospedagem incluídas |
| Avisos | Push no navegador para novo lead, pagamento e contrato assinado |
| Preço | R$ 39,90/mês ou R$ 29,90/mês no anual (R$ 297/ano); 7 dias de teste com reembolso, sem cartão |

## O que o IC Chat já tem que eles não mostram
Caixa de entrada única multiatendimento, chatbot com IA que agenda e transfere para humano, funil de atendimento (Kanban) ligado às conversas, relatórios por canal e atendente, créditos de IA com extrato, licença para o app instalado e programa de afiliados.

## O que vale implementar (ordem sugerida)
1. **Guia passo a passo com robô** no primeiro acesso e botão "?" em cada tela (pedido do dono). Tooltips mais explicativos.
2. **Google Calendar / Google Meet**: tela em Configurações para conectar a agenda (a tela existe em `GoogleCalendarDialog`, mas não está visível nas configurações).
3. **Kanban com criação manual** (feito: botão "Novo cartão") e opção de pausar a IA por cartão.
4. **Cobrança do cliente final** por PIX/boleto (Mercado Pago já integrado para a assinatura do IC Chat).
5. **Disparos em massa** e automações no WhatsApp (depende de Evolution API/n8n; ver abaixo).
6. **Formulário de captação / link na bio** que cai direto no funil.
7. **Notificações push** de novo lead/pagamento (o convite de permissão já foi feito).
8. **Landing page + portal** (maior esforço; só se o produto for para esse público).

## Integrações que dependem de você (colocar em Configurações do Super Admin)
- **OpenRouter**: chave da IA (`ICCHAT_AI_API_KEY`). Escolha o modelo (`ICCHAT_AI_MODEL`).
- **Evolution API** (WhatsApp por QR Code) e **n8n** (automações): se formos usar, preciso de URL base e chave de cada um para criar os campos em Configurações do sistema. Hoje o IC Chat não depende deles na versão web.
- **Google Cloud**: ID e segredo do cliente OAuth para a agenda de cada usuário.

## Quanto cobrar pela IA (OpenRouter)
Valores de modelo variam por dia: confira em openrouter.ai/models antes de fechar. Referências lidas em 10/2026 (fontes divergem): modelos "Flash/mini" ficam entre US$ 0,05 e US$ 0,75 por milhão de tokens de entrada e US$ 0,20 a US$ 3,75 de saída; DeepSeek V4 Flash e Gemini Flash são os mais baratos com boa qualidade em português.

Conta de padeiro para uma resposta de atendimento (~1.500 tokens lidos + 300 escritos) com um modelo de US$ 0,15 / US$ 0,60 por milhão:
- custo ≈ US$ 0,0004 por resposta (≈ R$ 0,002);
- 1.000 respostas ≈ R$ 2.

Regra prática: **cobrar de 4 a 6 vezes o custo**. Um plano com 2.000 respostas de IA custa ~R$ 4 para você; vender créditos extras a R$ 0,02 por resposta ainda dá margem enorme. O Super Admin → Créditos de IA já mostra a margem e avisa quando o preço fica abaixo do custo: preencha o custo do modelo escolhido lá.

## Pendências levantadas pelo dono (29/10/2026)
- [x] Kanban: criar cartão manualmente (botão "Novo cartão").
- [x] Aviso "Teste grátis" repetindo a cada login: agora 1 vez por dia por situação.
- [ ] **LGPD: excluir a conta e todos os dados** (tela em Perfil, texto claro, confirmação por senha e prazo). Cuidado: o banco é compartilhado com outros sistemas, então a exclusão deve apagar só os dados do IC Chat e o usuário de autenticação apenas se não existir em outro sistema. Precisa de função no servidor (autorização do dono para publicar).
- [ ] Guia com robô + tooltips melhores.
- [ ] Parar a IA por cartão do Kanban.
- [ ] Google Calendar visível em Configurações.
- [ ] Campos de Evolution API / n8n / OpenRouter em Configurações do sistema.
- [ ] Remover teste e2e quebrados após o convite de notificações (feito em `playwright.config.ts`).
