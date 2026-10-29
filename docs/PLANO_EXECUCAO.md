# Plano de execução — IC Chat

Regra de trabalho: **uma fase por vez, cada item só vira ✅ depois de testado de verdade** (navegador + `npm run test:e2e`).
Este arquivo é o registro. Detalhes de cada rodada em `REGISTRO.md`. Prints de cada tela em `docs/qa/`.

## Fase 1 — Segurança (front-end e Vercel) ✅
- [x] 1.1 Login do Google sem token na URL (PKCE)
- [x] 1.2 Cabeçalhos de segurança na Vercel (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy)
- [x] 1.3 Varredura do bundle: nenhum segredo no JavaScript publicado (teste automático)
- [x] 1.4 Revisão das regras do banco (RLS) — lida na migração. ⚠️ falta conferir no banco ao vivo (precisa de login no Supabase)
- [x] 1.5 Testes que falham se um segredo aparecer ou os cabeçalhos sumirem

## Fase 2 — Chaves de licença (instalador) ✅ código · ⏳ banco
- [x] 2.1 Tabelas de licença (só o hash da chave) — `20261029_000002_licenses.sql`
- [x] 2.2 Função `validate_license` chamada pelo app instalado
- [x] 2.3 Super Admin: **Gerar chave** (aparece uma vez), renovar +30 dias, suspender/reativar, revogar
- [x] 2.4 Inadimplência: suspensa/vencida/assinatura pendente bloqueia o app (confere ao abrir e a cada 12 h)
- [x] 2.5 App desktop: tela de ativação (`LicenseGate`) + aba Licença sem botões de simulação
- [x] 2.6 Testes e2e do painel de licenças
- [x] 2.7 Migração executada no Supabase (29/10/2026) e validada ao vivo: chave válida, limite de computadores, chave inexistente, suspensa (inadimplente) e tabela fechada para quem não está logado. Licença de teste apagada.

## Fase 3 — Dados de demonstração fora da versão web 🔄
- [x] 3.1 Inventário feito (teste `no-mock.spec.ts` varre todas as telas atrás de nomes fictícios)
- [x] 3.2 Equipe e Painel: usam os membros reais (`tenant_members`)
- [x] 3.3 Super Admin: empresas vêm do banco (sem Studio Bella etc.)
- [x] 3.4 Notificações inventadas ("Nova conversa no WhatsApp", "IA transferiu…") removidas da web
- [x] 3.5 Kanban: "Atividade da IA" e contadores sem exemplos; etapa do cartão passa a ser gravada
- [x] 3.6 Configurações da empresa (dados, profissionais, serviços, respostas rápidas) gravadas no banco, não só no navegador
- [x] 3.7 Plano/dias de teste vêm da assinatura real
- [ ] 3.8 Telas ainda por revisar linha a linha: Captação, Assistente IA, Canais, Créditos de IA (Super Admin), Usuários/Planos (Super Admin)

## Fase 4 — Teste página por página 🔄
Para cada tela: ❶ tem mock? ❷ botões funcionam? ❸ salva e persiste após recarregar? ❹ layout ok?
- [x] Painel · [x] Atendimento · [x] Kanban (arrastar + gravar + recarregar) · [x] Contatos (criar + gravar)
- [x] Relatórios (Excel/CSV baixa; PDF monta a impressão) · [x] Configurações (salvar + recarregar) · [x] Equipe
- [x] Agenda (criar agendamento + gravar; sem histórico/Google inventados; orienta a cadastrar profissional) · [x] Funil (criar negócio com responsável real; filtro com a equipe real) · [x] Captação (vazia, sem números inventados) · [x] Assistente IA (padrão genérico; estouro de largura corrigido) · [x] Canais (sem WhatsApp "conectado" falso) · [x] Perfil (e-mail e nome reais) · [x] Super Admin (empresas, usuários, planos, sistema, créditos)
- [x] Auditoria de layout: nenhuma das 14 telas estoura a largura em PC (1366 e 1100) e celular (390). Corrigidos: Assistente IA e Equipe.
- [ ] Ainda sem teste de ponta a ponta com o Supabase real logado como cliente (só com banco simulado)

## Fase 3b — Super Admin conectado ao banco 🔄
- [x] Empresas mostram o dono (e-mail) de cada uma; as 4 que apareciam são contas reais do banco compartilhado
- [x] Renovar / bloquear / liberar empresa gravam no banco (antes só mudavam a tela)
- [x] Usuários, Planos e Configurações do sistema lidos e gravados no Supabase (migração 20261029_000004_platform_admin.sql)
- [x] Créditos de IA: sem custo/consumo inventado (aparece vazio até o consumo ser registrado)
- [x] Removido o "servidor de licenças" de mentira: as licenças são verificadas no próprio Supabase
- [x] Bug corrigido: tabelas do Super Admin ficavam vazias mesmo com dados (lista em cache)
- [x] Migração 4 executada no banco de produção (29/10/2026) e testada como visitante: contato público abre, planos públicos abrem, tabelas e funções de admin recusadas
- [ ] WhatsApp de suporte: informar o número em Super Admin → Configurações do sistema

## Fase 5 — Cobrança com Mercado Pago ⏳ (aguardando o aplicativo do Mercado Pago)
- [x] 5.1 Tela **Assinar** (/assinar) + retorno do pagamento (/assinar/retorno), atalho no topo e no menu — testada (billing.spec.ts)
- [x] 5.2 Código pronto: supabase/functions/create-checkout (preço definido no servidor; token só nos Secrets) · ⏳ falta publicar a função e colar o token
- [x] 5.3 Código pronto: supabase/functions/mp-webhook (consulta o pagamento na API do MP, confere valor, idempotente) · ⏳ falta publicar e cadastrar a URL no MP
- [ ] 5.4 Falta de pagamento → assinatura past_due → app instalado bloqueia na próxima verificação
- [x] 5.5a Migração 20261029_000003_payments.sql executada (29/10/2026). Lógica testada no banco com rollback: aprovado libera plano e licença, aviso repetido não duplica, estorno suspende.
- [ ] 5.5b Publicar as Edge Functions, colar os Secrets e testar um pagamento real de teste (cartão de teste do Mercado Pago)

## Pendências conhecidas (honestas)
- "Novo analista" na Equipe e "Nova empresa" no Super Admin ficam **desativados** na web: criar usuário de outra pessoa exige uma função segura no servidor (Edge Function). Fica para a próxima rodada.
- O botão "Excel" gera **CSV** (abre no Excel). Para `.xlsx` de verdade seria preciso uma biblioteca de planilha.
- O teste usa um banco simulado em memória; a confirmação final com o Supabase real depende de login no painel do Supabase.
