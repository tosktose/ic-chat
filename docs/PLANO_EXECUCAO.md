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

## Fase 3c — Créditos de IA (Super Admin + cliente) 🔄
- [x] Modelo: 1 crédito = N tokens; plano inclui créditos/mês; excedente = saldo avulso (pacotes comprados ou bônus); extrato com custo real do provedor
- [x] Migração 20261029_000005_ai_credits.sql (saldo, extrato, pacotes, configuração) — **ainda não executada no banco**
- [x] Super Admin → Créditos de IA: preço/conversão com margem ao vivo, créditos por plano, pacotes à venda, saldo por empresa, dar bônus/ajuste, extrato
- [x] Cliente → Assistente IA: saldo, uso do plano, extrato e compra de pacote (Mercado Pago)
- [x] Funções: ai-chat (confere saldo, chama a IA, debita), create-checkout e mp-webhook aceitam pacotes — **código pronto, ainda não publicadas**
- [x] Migração 5 executada no banco de produção (29/10/2026): 2 tabelas, 8 funções, planos com 300/1.000/5.000 créditos, 3 pacotes. Testada como visitante: consultas sensíveis recusadas.
- [x] Funções publicadas: ai-chat (nova), create-checkout e mp-webhook (atualizadas para pacotes). Smoke test: respondem "não configurado" até os Secrets existirem.
- [ ] Criar o Secret ICCHAT_AI_API_KEY (obrigatório) e, se quiser, ICCHAT_AI_BASE_URL / ICCHAT_AI_MODEL
- [ ] Desligar "Verify JWT with legacy secret" no mp-webhook (hoje o Mercado Pago recebe 401)
- [ ] A resposta automática da IA no WhatsApp (app instalado) ainda usa a chave do próprio cliente e o limite em tokens; ligar ao mesmo saldo é a próxima etapa

## Fase 5 — Cobrança com Mercado Pago ⏳ (aguardando o aplicativo do Mercado Pago)
- [x] 5.1 Tela **Assinar** (/assinar) + retorno do pagamento (/assinar/retorno), atalho no topo e no menu — testada (billing.spec.ts)
- [x] 5.2 Código pronto: supabase/functions/create-checkout (preço definido no servidor; token só nos Secrets) · ⏳ falta publicar a função e colar o token
- [x] 5.3 Código pronto: supabase/functions/mp-webhook (consulta o pagamento na API do MP, confere valor, idempotente) · ⏳ falta publicar e cadastrar a URL no MP
- [ ] 5.4 Falta de pagamento → assinatura past_due → app instalado bloqueia na próxima verificação
- [x] 5.5a Migração 20261029_000003_payments.sql executada (29/10/2026). Lógica testada no banco com rollback: aprovado libera plano e licença, aviso repetido não duplica, estorno suspende.
- [x] 5.5b Funções publicadas no Supabase em 29/10/2026: create-checkout e mp-webhook. Secrets exclusivos do IC Chat: ICCHAT_MP_ACCESS_TOKEN e ICCHAT_MP_WEBHOOK_SECRET (o projeto é compartilhado: MP_ACCESS_TOKEN é usado por mercadopago-payment de outro sistema — não usar esse nome).
- [ ] 5.5c Desligar "Verify JWT with legacy secret" SOMENTE na função mp-webhook (o Mercado Pago não envia login) e criar os 2 Secrets ICCHAT_*
- [ ] 5.5d Pagamento de teste de ponta a ponta (cartão de teste do Mercado Pago)
- [ ] ATENÇÃO: conferir se MP_ACCESS_TOKEN / MP_WEBHOOK_SECRET (usados por outros sistemas) não foram sobrescritos hoje às 14:19/14:21

## Pendências conhecidas (honestas)
- "Novo analista" na Equipe e "Nova empresa" no Super Admin ficam **desativados** na web: criar usuário de outra pessoa exige uma função segura no servidor (Edge Function). Fica para a próxima rodada.
- O botão "Excel" gera **CSV** (abre no Excel). Para `.xlsx` de verdade seria preciso uma biblioteca de planilha.
- O teste usa um banco simulado em memória; a confirmação final com o Supabase real depende de login no painel do Supabase.
