# Testes de ponta a ponta (e2e)

Rodam o site/app web de verdade num navegador (Chrome) contra o **build de produção** — o mesmo que vai para a Vercel.

```bash
npm run test:e2e                                  # builda, sobe o servidor local e roda tudo
E2E_BASE_URL=https://ic-chat-desktop.vercel.app npm run test:e2e   # testa o site já publicado
```

Relatório com prints e traces das falhas: `apps/desktop/e2e/report/index.html` (`npx playwright show-report e2e/report`).

## O que está coberto

| Arquivo | Garante que |
| --- | --- |
| `landing.spec.ts` | a landing carrega sem erro de JS, a **logo aparece**, a página **rola com a roda do mouse**, menu, planos, FAQ, download |
| `lgpd.spec.ts` | faixa de **cookies**, escolha salva e reaberta pelo rodapé, páginas de Privacidade/Termos, aceite no cadastro |
| `seo.spec.ts` | `sitemap.xml`, `robots.txt`, canonical, Open Graph, JSON-LD, **404** com `noindex` |
| `auth.spec.ts` | **olho de mostrar senha**, erro de login claro, rotas protegidas redirecionam |
| `account.spec.ts` | **esqueci minha senha**, link inválido, perfis (**superadmin** vs usuário comum), aviso de sessão ativa |

Rode antes de cada `git push`. Se algo quebrar, o teste aponta qual regressão voltou.
