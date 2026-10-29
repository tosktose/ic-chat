# SEO do IC Chat

Endereço oficial: **https://www.icchat.com.br** (o `icchat.com.br` redireciona para o `www`).

## Links para o Google
| O quê | Endereço |
| --- | --- |
| Sitemap | https://www.icchat.com.br/sitemap.xml |
| robots.txt | https://www.icchat.com.br/robots.txt |
| Página 404 (teste) | https://www.icchat.com.br/qualquer-endereco-que-nao-existe |

## Páginas indexáveis (estão no sitemap)
| Página | Palavra-chave principal |
| --- | --- |
| `/` | chatbot com IA para WhatsApp, CRM, sistema de atendimento |
| `/chatbot-whatsapp-ia` | chatbot com IA para WhatsApp, chatbot com inteligência artificial |
| `/crm-whatsapp` | CRM para WhatsApp, funil de vendas |
| `/automatizar-atendimento` | automatizar atendimento ao cliente, multiatendimento WhatsApp |
| `/cadastro` | teste grátis |
| `/privacidade`, `/termos` | institucionais (LGPD) |

Não indexáveis (`noindex`): `/login`, `404`, e toda a área logada (bloqueada no robots.txt).

## Onde editar os textos
Tudo (título, descrição, h1, textos e perguntas frequentes) está em um arquivo só:
`apps/desktop/src/renderer/src/seo/pages.ts`. O build gera sozinho o sitemap, o robots.txt, o HTML de cada página e a `404.html`.
Regras que os testes cobram: título até 65 caracteres, descrição entre 60 e 160, textos únicos por página, JSON-LD válido, canonical correto.

## O que o Google lê (dados estruturados)
Home: Organization, WebSite, SoftwareApplication (planos de R$ 79 a R$ 299) e FAQPage. Páginas de palavra-chave: WebPage, BreadcrumbList e FAQPage.

## Passo a passo no Google Search Console
1. Adicionar propriedade **Domínio** `icchat.com.br` e verificar com o registro **TXT** no DNS da KingHost (um TXT novo com nome `@`; não apague o TXT do SPF).
2. Sitemaps → enviar `https://www.icchat.com.br/sitemap.xml`.
3. Inspeção de URL → colar `https://www.icchat.com.br/` → "Solicitar indexação". Repetir para as 3 páginas de palavra-chave.
4. Depois de alguns dias, ver em Desempenho quais buscas trazem cliques e ajustar títulos/descrições.
5. (Opcional) Bing Webmaster Tools: importar do Search Console.

## Palavras-chave trabalhadas (por intenção de busca)
chatbot whatsapp com ia · chatbot com inteligência artificial · crm para whatsapp · funil de vendas whatsapp · multiatendimento whatsapp · automatizar atendimento ao cliente · sistema de atendimento · agendamento online · atendimento multicanal · quanto custa chatbot whatsapp (preço nos planos).
> Volume de busca real só o Google Planejador de Palavras-chave / Search Console informam. Esta lista parte da intenção de busca e do que o produto de fato faz.

## Próximos passos de conteúdo (maior efeito a médio prazo)
- Blog com 1 a 2 artigos por mês: "como automatizar o atendimento no WhatsApp", "quanto custa um chatbot de WhatsApp", "CRM para clínica/salão/barbearia".
- Páginas por segmento (clínica, salão, pet shop) com exemplos reais.
- Conseguir links de fora (diretórios de software, parceiros, redes sociais).
