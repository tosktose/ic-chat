# Publicação do IC Chat

Este guia descreve a publicação web do IC Chat usando Supabase, GitHub e Vercel.

## Estado deste projeto

- Repositório: `tosktose/ic-chat`
- Branch preparada para produção: `codex/supabase-vercel-setup`
- Projeto Vercel: `ic-chat-desktop`
- URL oficial da aplicação: `https://www.icchat.com.br` (o domínio raiz redireciona para `www`)
- Schema próprio no Supabase: `ic_chat`

## Supabase

1. Confirme que a migration `supabase/migrations/20261028_000001_create_ic_chat_schema.sql` foi aplicada no projeto correto.
2. Depois das migrations `20261029_000002` a `20261029_000005`, aplique `supabase/migrations/20261029_000006_affiliates.sql` para ativar atribuição de indicações, painel, segurança e comissões.
3. Confirme que o schema `ic_chat` está habilitado na Data API. Mantenha os demais schemas do projeto como estavam.
4. Em Authentication, habilite os provedores de login necessários. O cadastro por e-mail e o login Google usam a origem atual da aplicação como destino.
5. Preserve o Site URL global existente, pois este projeto Supabase atende outros aplicativos.
6. Mantenha o Site URL global atual, pois esse projeto Supabase atende outros aplicativos. Em Redirect URLs, inclua `https://www.icchat.com.br/**` e `https://icchat.com.br/**`, além do domínio legado da Vercel enquanto ele continuar sendo usado.
7. O callback OAuth do Google é o callback do Supabase: `https://umnoiivuntnvsxkysvrr.supabase.co/auth/v1/callback`. Esse endereço precisa estar autorizado no cliente OAuth do Google.

### Afiliados

- O Super Admin habilita um usuário existente em **Usuários → Afiliado**; o sistema cria um link individual com taxa inicial configurável de 10%.
- O cadastro por e-mail preserva o código do link; o Google OAuth tenta atribuir a indicação apenas à conta recém-criada.
- Cada pagamento de assinatura aprovado gera uma comissão pendente, registrada uma única vez. Estornos revertem comissões ainda pendentes.
- O repasse é manual e deve acontecer fora do IC Chat. O Super Admin só marca a comissão como paga depois de efetuar a transferência.
- **Admin → Afiliados** mostra parceiros, empresas indicadas, pagamentos e repasses. O usuário habilitado vê o próprio painel em **Programa de afiliados**.

## Vercel

1. Importe `tosktose/ic-chat` e mantenha o Root Directory na raiz (`./`).
2. Use Vite e configure:
   - Install Command: `npm ci`
   - Build Command: `npm run build:web`
   - Output Directory: `apps/desktop/out/web`
3. Cadastre estas variáveis em **Production** e **Preview**:
   - `VITE_SUPABASE_URL` = URL do projeto Supabase
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = chave publishable do projeto Supabase
   - `VITE_SITE_URL` = `https://www.icchat.com.br` (domínio canônico para afiliados e retornos de autenticação)
4. Não coloque `.env.local`, service role keys ou segredos OAuth no GitHub. A chave publishable deve continuar protegida pelas políticas RLS do banco.
5. A branch de produção deste projeto é `codex/supabase-vercel-setup`. Novos commits nela iniciam uma nova publicação.
6. Acompanhe o build em Deployments. Só considere a publicação concluída quando o deployment estiver Ready e `https://www.icchat.com.br` abrir a aplicação.

## Verificação após publicar

1. Abra a landing page e confira os planos Start (R$ 79), Pro (R$ 149) e Business (R$ 299), conforme o roadmap do produto.
2. Crie uma conta de teste e confirme o login por e-mail e Google.
3. Confirme que uma nova conta recebe um período de avaliação de 7 dias e que a aplicação carrega dados pelo schema `ic_chat`.
4. Confirme o isolamento entre empresas com usuários de teste distintos antes de convidar clientes reais.
5. Configure o link de download do instalador apenas depois de hospedar o instalador Windows em um endereço público estável; não versione instaladores no repositório.

