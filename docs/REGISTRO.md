# Registro de execução

## 2026-10-29 · Rodada 1 — Segurança e licenças

### Segurança (Fase 1)
- **O token que apareceu no console** vinha do login com Google no fluxo "implícito" do Supabase: o `access_token` volta na URL (`#access_token=…`) e fica no histórico/console. **Corrigido:** o cliente agora usa **PKCE** (`flowType: 'pkce'`); a URL só carrega um código de uso único. Teste: `security.spec.ts` confere `code_challenge` no pedido de login.
- **Cabeçalhos na Vercel** (`vercel.json`): CSP restritiva (só o próprio site + Supabase), HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP. Testados no site publicado; nenhuma violação de CSP nas páginas principais.
- **Varredura do bundle** (teste automático): nenhum `service_role`, chave secreta, chave de IA/Resend/Google ou chave privada no JavaScript publicado. A chave `VITE_SUPABASE_PUBLISHABLE_KEY` é pública **por desenho**; quem protege os dados é o RLS.
- **RLS** (lido na migração, não no banco ao vivo): todas as tabelas de negócio têm RLS ligado e política por empresa (`tenant_id`) com assinatura ativa. Nada legível por `anon`.
- **Limite conhecido:** a sessão fica no `localStorage` (padrão do Supabase). A CSP sem `unsafe-inline` em scripts reduz o risco de XSS roubar o token. Chaves de IA digitadas no app desktop ficam no processo principal do Electron, não no navegador.

### Licenças (Fase 2)
- Migração: `supabase/migrations/20261029_000002_licenses.sql` — **precisa ser executada no Supabase** (SQL Editor). Cria `platform_admins`, `licenses` (só hash da chave), `license_activations` e as funções `generate_license`, `set_license_status`, `extend_license`, `validate_license`.
- Super Admin → *Licenças*: **Gerar chave** (exibida uma única vez), Renovar +30 dias, Suspender/Reativar (inadimplência), Revogar.
- App instalado: tela **LicenseGate** bloqueia tudo sem chave válida; valida ao abrir e a cada 12 h; tolera 7 dias sem internet. Chave suspensa/revogada/vencida ou empresa inadimplente → bloqueio.
- Removidos: botões "pré-visualizar estados da licença" (eram uma brecha para burlar o bloqueio) e a lista falsa de computadores.
- Testes: `license.spec.ts`, `account.spec.ts`, `security.spec.ts`.

### Pendente
- Executar a migração no Supabase e confirmar `ic_chat` em *Exposed schemas*.
- Fase 3 (dados fictícios na versão web) e Fase 4 (teste tela a tela): ver `PLANO_EXECUCAO.md`.
