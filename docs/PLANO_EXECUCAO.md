# Plano de execução — IC Chat

Regra de trabalho: **uma fase por vez, cada item só vira ✅ depois de testado de verdade** (navegador + `npm run test:e2e`).
Este arquivo é o registro. Atualize ao terminar cada item.

## Fase 1 — Segurança (front-end e Vercel)
- [ ] 1.1 Login do Google sem token na URL (trocar fluxo implícito por PKCE)
- [ ] 1.2 Cabeçalhos de segurança na Vercel (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy)
- [ ] 1.3 Varredura do bundle: nenhum segredo (service_role, chaves de IA, secrets) no JavaScript publicado
- [ ] 1.4 Revisão das regras do banco (RLS) — toda tabela com `tenant_id` isolada; nada legível por `anon`
- [ ] 1.5 Teste e2e que **falha** se um segredo aparecer no bundle ou se os cabeçalhos sumirem

## Fase 2 — Chaves de licença (instalador)
- [ ] 2.1 Banco: tabela de licenças (só o *hash* da chave é gravado), vínculo com a empresa, status, validade
- [ ] 2.2 Banco: função `validar_licenca(chave)` chamada pelo app instalado (sem expor a tabela)
- [ ] 2.3 Super Admin: botão **Gerar chave** (mostra a chave uma única vez), Revogar, Reativar
- [ ] 2.4 Inadimplência: licença `suspensa`/vencida bloqueia o app na próxima validação
- [ ] 2.5 App desktop: tela de ativação usa a função do banco
- [ ] 2.6 Testes e2e do fluxo

## Fase 3 — Dados de demonstração (mock) fora da versão web
- [ ] 3.1 Inventário de tudo que é mock (equipe, automações, horários, conversas, kanban, agenda, contatos, relatórios)
- [ ] 3.2 Versão web começa **vazia** e lê só do Supabase da empresa logada
- [ ] 3.3 Telas vazias com orientação ("Cadastre seu primeiro contato")

## Fase 4 — Teste página por página (devagar, com registro)
Para cada tela: ❶ tem mock? ❷ cada botão funciona? ❸ salva e persiste após recarregar? ❹ layout ok (desktop e celular)?
- [ ] Painel · [ ] Atendimento (inbox) · [ ] Agenda · [ ] Kanban (arrastar + automático) · [ ] Funil
- [ ] Contatos · [ ] Relatórios (exportar **Excel e PDF**, conferir layout) · [ ] Captação · [ ] Assistente IA
- [ ] Canais · [ ] Equipe · [ ] Configurações · [ ] Perfil · [ ] Super Admin

## Registro
Cada rodada: data, o que foi feito, o que foi testado, o que ficou pendente — em `docs/REGISTRO.md`.
