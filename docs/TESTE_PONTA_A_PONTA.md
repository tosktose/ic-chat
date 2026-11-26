# Teste de ponta a ponta e achados (29/10/2026)

Bateria automática: `npm run test:e2e` (Playwright, contra o build de produção e banco simulado). Última rodada completa: 162 passaram, 18 pulados (só rodam contra o site publicado).

## Achados e correções
| Achado | Situação |
| --- | --- |
| Super Admin: "Redefinir senha", "Encerrar sessões", bloquear e excluir usuário eram só mensagens na tela | Redefinir senha agora envia de verdade. Bloquear/liberar corta o acesso da empresa. "Excluir" virou "Ocultar do IC Chat" (nada é apagado do banco compartilhado). Encerrar sessões: desligado na web |
| Perfil: "Verificação em 2 etapas", "Avisar novo acesso" e "Sessões ativas" eram de mentira | Escondidos na versão web |
| Empresas de outros sistemas aparecendo no IC Chat (gatilho criava empresa para qualquer cadastro do banco compartilhado) | Gatilho só cria empresa para cadastro marcado `app: icchat`; empresas existentes podem ser ocultadas |
| Tela de texto da home ao atualizar `/admin` etc. | Molde vazio `app.html` com carregamento premium |
| Link de afiliado não contabilizava para conta já existente | Indicação registrada também no primeiro login de quem já tinha conta (só se a empresa acabou de ser criada). Teste automático confirma que o cadastro envia código e marca ao servidor |
| Aviso "Teste grátis" a cada login | 1 vez por dia por situação |
| Kanban sem criar cartão manual / sem pausar IA | Botão "Novo cartão" e botão "IA ligada/pausada" em cada cartão |
| LGPD: não existia exclusão | Perfil → Dados pessoais → "Privacidade e seus dados": apaga a empresa e todos os dados do IC Chat (digitar "excluir"). O login compartilhado não é apagado |
| Console 403 | Provável: script do Vercel Analytics antes de ativar o Analytics no projeto da Vercel (Analytics → Enable). Não reproduzido |

## App instalado (revisão do código; não foi rodado o instalador)
- Ativação por chave: `LicenseGate` + `validate_license` (já existia). Confere ao abrir e a cada 12 h; tolera 7 dias offline.
- Aviso de vencimento: agora a partir de 7 dias (antes 3), com notificação diária.
- Não achei dados de demonstração nas telas do app instalado; em modo navegador sem login ainda há exemplos (intencional, só para demonstração local).
- Pendente de teste real: instalar o `.exe`, ativar com uma chave gerada no Super Admin e conferir bloqueio por inadimplência.

## Integrações (Super Admin → Configurações do sistema)
OpenRouter, Mercado Pago, Resend (e-mail), Evolution API, n8n e Google. As chaves ficam só no servidor. As funções `ai-chat`, `create-checkout`, `mp-webhook` e `icchat-notify` leem do painel (Secrets do Supabase continuam valendo como reserva).

## Avisos por e-mail/WhatsApp
Função `icchat-notify`: boas-vindas ao confirmar o e-mail; rotina diária às 12h UTC (cron `icchat-notify-daily`) avisa teste/plano acabando (7, 3 e 1 dia) e acesso encerrado, sem repetir. Precisa de `resend_api_key` + `email_from` (e-mail) e Evolution (WhatsApp) preenchidos.
