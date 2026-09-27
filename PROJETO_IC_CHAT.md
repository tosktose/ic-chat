# IC CHAT — Documento Norteador do Projeto

> Versão 0.2 · 27/09/2026 · Fase: **Análise e descoberta** (nenhum código escrito ainda)

---

## 0. Contexto do MVP (decisões do dono do produto)

| Tema | Situação / decisão |
|---|---|
| **Objetivo do MVP** | Validar e vender o produto para **então formalizar a empresa** |
| **Marca** | **IC = ItaCondo** ([www.itacondo.com.br](https://www.itacondo.com.br)), outro serviço do mesmo dono. Produto: **"IC Chat — de ItaCondo"** |
| **Sistemas operacionais** | **Windows e macOS** |
| **Infra** | Já existe uma conta **Supabase** |
| **CNPJ** | **Ainda não tem** → afeta a API oficial da Meta, a assinatura de código e o Google (ver 0.1) |

### 0.1 Impactos de ainda não ter CNPJ (e como o MVP contorna)

| Item | Precisa de CNPJ? | Solução no MVP |
|---|---|---|
| **WhatsApp via QR (Baileys)** | Não | ✅ **Canal principal do MVP** |
| **WhatsApp Oficial — Embedded Signup / Tech Provider** | **Sim** (Business Manager verificado com documentos da empresa) | ⏸ Fica para **depois da formalização** |
| **WhatsApp Oficial — modo "credenciais do cliente"** | Não para a IC. **O cliente** (salão, que normalmente já tem CNPJ) cria o app dele na Meta | ✅ **Entra no MVP:** o cliente cola no IC Chat o *Token permanente*, o *Phone Number ID* e o *WABA ID*, com um passo a passo guiado na tela. O código é o mesmo que o Embedded Signup usará depois; só muda como as credenciais chegam |
| **Google Agenda (OAuth)** | Não obrigatório. Verificação do app Google pode ser feita como pessoa física + domínio | ⚠️ Em modo "Teste", o Google **expira o login a cada 7 dias** e aceita só 100 usuários. Para o MVP com poucos salões serve, mas o sistema precisa **avisar e pedir reconexão**. Pedir a verificação usando o domínio **itacondo.com.br** (com política de privacidade publicada) |
| **Assinatura de código Windows** | Certificado OV/EV normalmente exige empresa | ⚠️ Sem assinatura o Windows mostra "O Windows protegeu o computador" (SmartScreen); o cliente clica em "Mais informações → Executar assim mesmo". Aceitável no MVP com instalação assistida |
| **Assinatura + notarização macOS** | **Não:** Apple Developer Program aceita **pessoa física** (US$ 99/ano) | ✅ **Recomendado já no MVP:** sem notarização o macOS bloqueia o app e o auto-update não funciona |
| **Cobrança / nota fiscal** | Sim, para emitir NF | Formalizar antes de escalar. **Atenção:** desenvolvimento/licenciamento de software **não é permitido no MEI**; normalmente exige **ME no Simples Nacional** (confirmar com contador) |

### 0.2 Papel do Supabase (que você já tem)
| Uso | Detalhe |
|---|---|
| **Servidor central da IC** | Banco do **Painel Super Admin + Licenças** (tenants, chaves, PCs, avisos) |
| **Relay de webhooks** | **Supabase Edge Functions** recebem os webhooks da Meta e do Google e repassam para a instalação certa (modo Local) |
| **Envio dos avisos de licença** | Edge Function agendada (cron) diária → WhatsApp + e-mail |
| **Modo Nuvem dos clientes** | Postgres + Storage do Supabase como banco e arquivos dos clientes do plano Business |

⚠️ Cuidados:
- **Separar projetos:** um projeto Supabase para **IC (licenças/admin)** e outro(s) para **dados de clientes**. Se misturar, um vazamento de dados de cliente expõe também o controle de licenças.
- A chave `service_role` **nunca** vai dentro do app instalado; o app só conversa com o servidor de licenças por endpoints próprios.
- O **plano grátis** do Supabase **pausa o projeto após ~7 dias sem uso**. Para licenças em produção, use o plano pago ou mantenha um ping diário (o cron de avisos já faz isso).
- A chave **privada** de assinatura das licenças fica em *secrets* das Edge Functions, nunca no banco.

---

## 1. Visão do produto

**IC Chat** é uma plataforma de **atendimento multicanal** instalada no PC (Electron + React), com foco inicial em **WhatsApp**, e com módulos de **agendamento** (sincronizado com o Google Agenda), **gestão de equipe** e **atendimento por IA personalizável**.

- **Cliente piloto:** salão de cabeleireiro.
- **Objetivo comercial:** vender para outras empresas (SaaS / licença) → o sistema precisa nascer **multiempresa (multi-tenant)**, **configurável por segmento** e com **módulos ligáveis por plano**.
- **Canais:** WhatsApp (fase 1) → Instagram e Facebook Messenger (fase 2) → TikTok e outros (fase 3, sujeito a disponibilidade de API).

### Identidade visual (já existente em `/LOGO`)
| Arquivo | Uso |
|---|---|
| `ICON.png` | Ícone do app (gerar `.ico` 256px para Windows, `.icns` p/ macOS, tray icon 16/32px) |
| `LOGO PRETA.png` | Logo para tema claro, tela de login, relatórios |
| `LOGO BRANCA C FUNDO.png` | Logo para tema escuro / splash |

Paleta extraída do ícone: azul royal `#0A4FE0` → azul ciano `#18C8F5` (gradiente), branco, grafite `#111418`.
> ✅ **"DE ITACONDO"** confirmado: IC = ItaCondo ([itacondo.com.br](https://www.itacondo.com.br)). Usar "IC Chat" no app e "de ItaCondo" na tela de login, no "Sobre" e no site. Sugestão de domínios: `icchat.itacondo.com.br` (site/política de privacidade) e `avisos@itacondo.com.br` (e-mails de licença).

---

## 2. Decisão de arquitetura mais importante

**Electron sozinho NÃO basta.** Três motivos:

1. **Webhooks:** a API oficial da Meta (WhatsApp Cloud API, Instagram, Messenger) e o Google Agenda (push) **enviam eventos para uma URL HTTPS pública**. Um PC atrás do roteador do salão não recebe isso sem um servidor/túnel.
2. **Várias pessoas atendendo:** recepção, cabeleireiros e gerente em PCs diferentes precisam ver as **mesmas conversas em tempo real**. A conexão do WhatsApp deve viver em **um único lugar** (o servidor), e não em cada PC.
3. **24/7:** a IA e o recebimento de mensagens precisam funcionar mesmo com o PC da recepção desligado (no modo nuvem).

### Arquitetura proposta: **Cliente Electron + Servidor IC Chat (Core)**

```
┌──────────────────────────┐        ┌───────────────────────────────────────────┐
│  IC Chat Desktop         │ WSS/   │  IC Chat Core (Node.js / TypeScript)      │
│  (Electron + React)      │ HTTPS  │  ├─ API REST + WebSocket (tempo real)      │
│  - Inbox / Agenda / Dash │◄──────►│  ├─ Conectores de canal                    │
│  - Gravação de áudio     │        │  │   ├─ WhatsApp QR (Baileys)              │
│  - Notificações nativas  │        │  │   ├─ WhatsApp Oficial (Cloud API)       │
│  - Auto-update           │        │  │   ├─ Instagram / Messenger (fase 2)     │
└──────────────────────────┘        │  ├─ Motor de IA (chave do cliente)         │
                                    │  ├─ Agenda + Google Calendar Sync          │
   (opcional futuro: Web / Mobile)  │  ├─ Fila de jobs (envios, sync, IA)        │
                                    │  └─ Camada de dados (SQLite OU Postgres)   │
                                    └───────────────────────────────────────────┘
                                                      ▲
                                                      │ licença / planos / telemetria
                                    ┌───────────────────────────────────────────┐
                                    │  Painel Super Admin (você)                │
                                    │  Servidor de Licenças + Relay de Webhooks │
                                    └───────────────────────────────────────────┘
```

### Modalidades de implantação (definidas por contrato)

| Modalidade | Onde roda o Core | Banco | Para quem | Observações |
|---|---|---|---|---|
| **Local (Standalone)** | Dentro do próprio app Electron em **um PC "servidor"** do cliente; outros PCs da rede local conectam nele | **SQLite** | Salão pequeno, 1–5 atendentes, plano barato | Webhooks da Meta/Google chegam via **Relay IC Chat** (seu servidor central repassa ao PC) ou Cloudflare Tunnel. PC servidor precisa ficar ligado. |
| **Nuvem (Cloud)** | VPS/Docker (sua infra ou do cliente) | **Postgres / Supabase** | Redes, várias unidades, planos maiores | 24/7, backup gerenciado, acesso de qualquer lugar. |

**O mesmo código do Core** roda nos dois modos — muda só a configuração (`DB_DRIVER=sqlite|postgres`). Como super admin, você define a modalidade na licença do cliente.

---

## 3. WhatsApp — os dois métodos de conexão

### 3.1 Método QR Code (não oficial)
- **Biblioteca:** [Baileys](https://github.com/whiskeysockets/Baileys) (`@whiskeysockets/baileys`, versão 7.x) — conecta via WebSocket direto no WhatsApp Web, sem navegador. É a base de Evolution API, WAHA, Whaticket etc.
- **Fluxo:** cliente abre "Conectar WhatsApp" → Core gera QR → cliente escaneia pelo celular (Aparelhos conectados) → sessão salva criptografada no banco.
- Também suporta **código de pareamento** (digitar código de 8 dígitos no celular, sem QR).
- **Vantagens:** grátis, sem aprovação da Meta, funciona com o número atual, recebe/envia áudio, imagem, vídeo, documento, figurinha, grupos.
- **Riscos (deixar claro no contrato):**
  - Viola os Termos do WhatsApp → **risco de banimento do número** (sem recurso).
  - O banimento é disparado principalmente por **comportamento** (disparo em massa, mensagens para quem não tem o número salvo, muitas denúncias).
  - Pode quebrar quando o WhatsApp atualiza o protocolo (depende da comunidade atualizar a lib).
- **Mitigações que o sistema deve ter:** limitador de envio (rate limit), atrasos humanizados, "digitando…" antes de responder, bloqueio de disparo em massa nesse modo, aviso claro na tela de conexão, reconexão automática e alerta quando a sessão cair.

### 3.2 Método Oficial (WhatsApp Business Platform — Cloud API da Meta)
- **Onboarding:** **Embedded Signup** (botão "Entrar com Facebook" dentro do IC Chat → o cliente cria/conecta a conta WhatsApp Business dele em poucos cliques).
  - ⚠️ Usar **Embedded Signup v4** (v2/v3 serão descontinuadas em 15/10/2026).
  - **Coexistência:** permite o cliente **continuar usando o app WhatsApp Business no celular** e ao mesmo tempo usar a API — ótimo para salão.
- **O que você (IC Chat) precisa ter:**
  1. Empresa (CNPJ) com **Meta Business Manager verificado** (Business Verification).
  2. App na Meta for Developers com produto WhatsApp.
  3. Cadastro como **Tech Provider** (fornecedor de tecnologia).
  4. App Review + Access Verification → sobe o limite de 10 para **200 novos clientes por semana**.
  5. Webhook HTTPS público (seu servidor central / relay).
- **Custos (Brasil, 2026):** cobrança **por mensagem entregue de template**, paga pelo cliente final (cartão na conta WhatsApp dele):
  - **Respostas dentro da janela de 24h (serviço): grátis.**
  - Marketing: ~R$ 0,31–0,38 por mensagem.
  - Utilidade (ex.: lembrete de horário) e autenticação: ~US$ 0,0068.
  - Desde jul/2026 é possível faturar em **BRL**.
- **Regras importantes:**
  - Fora da janela de 24h só é possível enviar **templates aprovados** (ex.: "Lembrete: seu horário amanhã às 14h").
  - **Política de IA (jan/2026):** a Meta proíbe "assistentes de IA de propósito geral" na API. **Bots de IA focados no negócio** (agendamento, dúvidas sobre serviços, preços) **são permitidos** → a IA do IC Chat deve ser sempre restrita ao contexto da empresa.

### 3.3 Abstração no código
Ambos os métodos implementam a mesma interface `ChannelConnector` (conectar, enviar texto/mídia, receber, status). O restante do sistema (inbox, IA, agenda) **não sabe** qual método está em uso. Isso também serve para Instagram, Messenger e TikTok.

---

## 4. Outros canais (planejamento)

| Canal | API | Viabilidade | Observações |
|---|---|---|---|
| **Instagram Direct** | Instagram Messaging API (Meta) | ✅ Alta | Precisa de App Review + Advanced Access para atender contas de terceiros. Janela de 24h. Reaproveita o mesmo app Meta do WhatsApp. |
| **Facebook Messenger** | Messenger Platform | ✅ Alta | Mesma infraestrutura Meta. |
| **TikTok** | Business Messaging API | ⚠️ Limitada | Em **beta aberto** na América Latina; acesso via programa de parceiros. Deixar para depois e monitorar. |
| Telegram, E-mail, Webchat no site | APIs abertas | ✅ Alta | Bons candidatos "baratos" para fase 3. |

---

## 5. Módulos funcionais

### 5.1 Inbox (Atendimento)
- Lista de conversas unificada (todos os canais), filtros: **minhas / fila / todas / não lidas / por canal / por etiqueta**.
- Estados da conversa: `Nova → IA atendendo → Aguardando humano → Em atendimento → Resolvida`.
- **Atribuição:** automática (rodízio / por setor / por profissional) ou manual; transferência entre atendentes.
- **Mídias:** enviar e receber **áudio** (gravar no app — WhatsApp exige OGG/Opus para aparecer como "mensagem de voz"; conversão com ffmpeg), **imagem, vídeo, documento, figurinha, localização, contato**.
- Respostas rápidas (atalhos `/`), notas internas, etiquetas, emojis, citar/responder mensagem, reações.
- Transcrição automática de áudio pela IA (opcional).
- Perfil do contato ao lado: histórico, próximos agendamentos, serviços preferidos, profissional preferido, observações (ex.: "alergia a amônia").
- Notificações nativas do Windows + som + badge no ícone da barra de tarefas.

### 5.2 Agenda e agendamentos
- Cadastros: **profissionais**, **serviços** (duração, preço, quais profissionais fazem), **horários de trabalho**, folgas, bloqueios, intervalos.
- Visões: dia / semana / por profissional (colunas lado a lado — padrão de salão).
- Agendamento pelo atendente, **pela IA no chat** ou (futuro) por link público.
- Lembretes automáticos (ex.: 24h e 2h antes) + confirmação "responda 1 para confirmar".
- Status: `Agendado → Confirmado → Em atendimento → Concluído / Faltou / Cancelado`.
- **Sincronização Google Agenda (bidirecional):**
  - OAuth 2.0 por profissional (cada cabeleireiro conecta sua agenda) ou uma agenda por profissional numa conta da empresa.
  - Envio: evento criado/alterado no IC Chat → cria/atualiza no Google.
  - Recebimento: **push notifications (`events.watch`)** + **sincronização incremental com `syncToken`**; fallback de verificação a cada ~15 min (o Google não garante 100% dos pushes); tratar erro `410 Gone` fazendo sync completo.
  - Eventos pessoais do Google viram **bloqueio de horário** no IC Chat (evita choque de horário).
  - Renovação automática dos canais de watch (expiram).
  - ⚠️ App Google precisa passar pela **verificação OAuth do Google** (escopo de calendário é "sensível") antes de vender em escala.

### 5.3 Visão do Gerente (Dashboard)
- **Tempo real:** quem está online, quem está atendendo quais conversas, fila de espera, tempo sem resposta (SLA), conversas com a IA × com humanos.
- **Atendimento (chat):** por atendente — conversas atendidas, tempo médio da 1ª resposta, tempo médio de resolução, avaliações.
- **Produção dos profissionais:** clientes atendidos (agendamentos concluídos) por **semana, quinzena e mês**, faturamento estimado por serviço, taxa de faltas, clientes novos × recorrentes, ranking.
- Filtros por período personalizado, unidade e profissional; exportação para Excel/PDF.

### 5.4 IA personalizável (chave do próprio cliente — BYOK)
- Campo para o cliente cadastrar **sua chave de API** e escolher provedor/modelo: Anthropic (Claude), OpenAI, Google Gemini, e compatíveis (OpenRouter, etc.).
- Chave **criptografada** no banco (AES-256, chave mestra fora do banco); nunca exibida novamente após salvar; nunca enviada ao front.
- **Personalização:**
  - Nome e personalidade do agente, tom de voz (formal / descontraído), uso de emojis.
  - Base de conhecimento: serviços, preços, endereço, horários, políticas (cancelamento, atraso), FAQ, arquivos (PDF/tabela de preços).
  - Regras: quando **transferir para humano** (palavra-chave, reclamação, cliente pede, IA sem confiança), horário em que a IA atua (ex.: só fora do expediente), limite de mensagens.
  - **Ferramentas (function calling):** consultar horários livres, criar/remarcar/cancelar agendamento, consultar preço, buscar histórico do cliente.
- Guard-rails: IA restrita ao negócio (exigência da Meta), não inventa preços/horários (só via ferramentas), log de todas as ações.
- Controle de custo: contador de tokens/mês por empresa, limite configurável.

### 5.5 Kanban da IA / Funil
Quadro visual mostrando **o que a IA e a equipe estão fazendo agora**:

| Nova conversa | IA atendendo | Aguardando cliente | Precisa de humano | Agendado | Concluído |
|---|---|---|---|---|---|

- Cada cartão = conversa/contato, com resumo gerado pela IA ("Quer corte + escova sábado de manhã"), canal, tempo na etapa, responsável.
- Cartões se movem **automaticamente** conforme a IA age, e manualmente (arrastar).
- Linha do tempo de "ações da IA" por cartão (consultou agenda → sugeriu 3 horários → criou agendamento).
- Colunas configuráveis por empresa (vira um **CRM/funil** vendável para outros segmentos).

### 5.6 Configurações da empresa (tenant)
Dados da empresa, logo, unidades, usuários e **perfis de permissão** (Admin, Gerente, Atendente, Profissional), canais conectados, horários, templates de mensagem, etiquetas, respostas rápidas, IA, integrações, tema claro/escuro.

### 5.7 Painel Super Admin (você)
- Cadastro de **empresas clientes (tenants)**, plano, **modalidade (Local/SQLite ou Nuvem/Postgres/Supabase)**, limites (usuários, canais, conexões WhatsApp, IA), módulos ativos, vencimento.
- **Servidor de licenças:** o app valida a licença periodicamente (com tolerância offline de X dias).
- Métricas de uso, status das conexões, logs de erro, versão instalada em cada cliente.
- **Segmentos/templates:** "Salão", "Clínica", "Barbearia", "Estética", "Pet shop"… com termos, serviços e fluxos da IA pré-configurados (ex.: "Profissional" vs "Médico", "Serviço" vs "Procedimento").
- Detalhes do licenciamento na seção 5.8.

### 5.8 Licenciamento — Chave com validade (controlada só pelo Super Admin)

Todo cliente só usa o IC Chat com uma **chave de licença que expira**. **Somente você (Super Admin)** cria, renova, suspende ou revoga as chaves. Nenhum usuário do cliente, nem o Admin da empresa, consegue alterar a validade.

#### ✅ Decisões tomadas (27/09/2026)
| Tema | Decisão |
|---|---|
| Ao vencer | **Modo restrito** (vê histórico e exporta dados, não envia nada, IA e agenda param) |
| Carência após vencer | **3 dias** funcionando normalmente, com aviso vermelho |
| Sem internet (offline) | **7 dias** funcionando; no 8º dia entra em modo restrito até validar |
| Limite de PCs | **Sim**: servidor + PCs atendentes contam vagas. **Start = 3 · Pro = 10 · Business = ilimitado** |
| Teste grátis | **Sim, 7 dias**, criado **manualmente pelo Super Admin** no painel (não há cadastro público) |
| Avisos de vencimento | **No sistema + WhatsApp + e-mail** |

Esses valores são o **padrão**. Você pode mudar carência, dias offline e limite de PCs para um cliente específico no painel.

#### Como funciona
```
 Painel Super Admin ──(gera chave)──► Cliente digita a chave no IC Chat (1ª abertura)
        │                                        │
        │                              Ativação: envia chave + ID da máquina
        ▼                                        ▼
 Servidor de Licenças (sua nuvem) ◄──── valida, registra a máquina
        │
        └──► devolve um "token de licença" ASSINADO digitalmente
             (empresa, plano, módulos, limites, data de expiração)
                                                 │
             O Core confere a assinatura com a chave pública embutida
             e revalida online periodicamente (ex.: a cada 6h)
```

- **Formato da chave para o cliente:** algo legível, ex.: `ICCH-7K2M-Q9XD-4TPL-8WNB`.
- **Token assinado (Ed25519 / JWT EdDSA):** o servidor de licenças assina com a **chave privada, que só você tem**. O app só tem a chave pública. Se alguém editar o arquivo ou o banco para mudar a data, a assinatura não bate e o sistema bloqueia. **Não dá para "crackear" trocando a data no banco.**
- **Vínculo com a máquina e limite de PCs:**
  - A licença fica presa ao **PC servidor** (modo Local) ou ao tenant (modo Nuvem), pelo ID de hardware.
  - **Cada PC atendente também ocupa uma vaga.** Na 1ª vez que um PC entra, ele se registra na licença. Se o limite do plano já estiver cheio (ex.: Start = 3 PCs), o PC novo é recusado com a mensagem "Limite de computadores atingido".
  - O Admin da empresa vê a lista de PCs ativos e pode **pedir** a liberação de uma vaga. **Quem libera ou aumenta o limite é só você.**
  - Trocar o PC servidor exige **transferência feita por você** no painel.
- **Proteção contra voltar o relógio do PC:** o sistema guarda o último horário visto (assinado) e usa o horário do servidor de licenças. Se o relógio do PC voltar, a licença é tratada como expirada até a próxima validação online.
- **Tolerância offline: 7 dias.** Sem conseguir validar com o servidor de licenças, o sistema funciona normalmente por até 7 dias, com um aviso a partir do 4º dia ("Sem conexão com o servidor de licenças há X dias"). No 8º dia entra em **modo restrito** até reconectar.

#### O que você controla no painel (por cliente)
| Campo / ação | Descrição |
|---|---|
| Gerar chave | Escolhe empresa, plano, modalidade (Local/Nuvem), **data de expiração** |
| Tipo | **Teste (trial)** · Mensal · Trimestral · Anual · Vitalícia (opcional) |
| Limites | Nº de usuários, conexões WhatsApp, canais, unidades, PCs, uso de IA |
| Módulos | Liga/desliga: IA, Kanban, Dashboard gerente, WhatsApp Oficial, Instagram… |
| **Renovar** | Estende a validade (o app recebe na próxima validação, sem digitar chave nova) |
| **Suspender** | Bloqueia temporariamente (ex.: falta de pagamento) e pode reativar depois |
| **Revogar** | Cancela de vez (chave vazada, fim de contrato) |
| Transferir máquina | Libera a ativação de um PC para outro |
| Tolerância / carência | Dias offline (padrão 7) e dias de carência após vencer (padrão 3) |
| PCs | Limite de PCs, lista dos PCs ativos (nome, último acesso) e botão para liberar vaga |
| Contatos de cobrança | WhatsApp e e-mail que recebem os avisos de vencimento |
| Mensagem ao cliente | Aviso que aparece no app (ex.: "Sua fatura vence dia 10") |
| Histórico | Ativações, IPs, versões, renovações e quem alterou (auditoria) |

#### Ciclo de vida e o que o cliente vê
| Situação | Comportamento no IC Chat |
|---|---|
| **Ativa** | Tudo normal |
| **Faltam 15 / 7 / 3 / 1 dias** | Faixa de aviso no topo + notificação para o Admin da empresa + **WhatsApp + e-mail** para o contato de cobrança |
| **Venceu hoje** | Aviso no sistema + WhatsApp + e-mail: "Sua licença venceu. Você tem 3 dias de carência." |
| **Vencida — em carência** (3 dias) | Funciona, com aviso vermelho fixo e contagem regressiva; aviso diário por WhatsApp/e-mail |
| **Entrou em modo restrito** | Aviso final por WhatsApp + e-mail + resumo para você (lista de clientes que bloquearam hoje) |
| **Vencida — após a carência** | **Modo restrito:** pode ver o histórico e exportar dados, mas **não envia mensagens**, a IA para e não cria agendamentos. Só aparece a tela "Licença expirada — contate o suporte / inserir nova chave" |
| **Suspensa** | Igual ao modo restrito, com a mensagem que você definir |
| **Revogada** | Bloqueio total, só permite exportar dados (LGPD: os dados são do cliente) |

> Regra: **não apagar dados nem desconectar o WhatsApp** quando vencer, só bloquear o uso. Assim o cliente renova e continua de onde parou, e você evita problemas jurídicos.

#### Teste grátis (trial)
- **Duração: 7 dias.** Só você cria, pelo painel (botão "Nova chave de teste": empresa, CNPJ/CPF, contato de WhatsApp e e-mail). A chave é enviada ao cliente por WhatsApp e e-mail na hora.
- Chave do tipo **Trial**, com todos os módulos do plano Pro liberados (ou os que você escolher) e limite reduzido (ex.: 2 PCs, 1 WhatsApp).
- Você pode **prorrogar** um teste pelo painel (ex.: +3 dias) se quiser.
- **Um teste por empresa:** controle por CNPJ/CPF, telefone, e-mail e ID de hardware, para o mesmo cliente não fazer testes infinitos reinstalando.
- Avisos de fim do teste pelos mesmos canais (sistema + WhatsApp + e-mail), com convite para contratar.
- Ao acabar o teste: modo restrito normal. Quando o cliente vira pagante, **a mesma instalação continua com os dados**, basta você converter a chave no painel.

#### Como os avisos são enviados
- Quem envia é o **servidor central de licenças** (o seu), e não o app do cliente. Assim o aviso sai mesmo se o PC do cliente estiver desligado.
- **WhatsApp:** pelo **número da própria IC Chat** (o seu número comercial). Recomendado usar a **API oficial com template de "utilidade"** (ex.: "Olá {nome}, a licença do IC Chat vence em {dias} dias."). Custa em torno de US$ 0,007 por aviso e não tem risco de banimento. Enviar com Baileys a partir do seu número também funciona, mas corre o risco da seção 3.1.
- **E-mail:** por um serviço transacional (Resend, Amazon SES, Brevo ou SMTP próprio), com domínio configurado (SPF/DKIM) para não cair no spam.
- Todos os avisos ficam registrados no histórico do cliente no painel (enviado / entregue / erro).

#### Painel Super Admin — visão geral
- Lista de clientes com status colorido: 🟢 ativa · 🟡 vence em até 15 dias · 🔴 vencida · ⚫ suspensa/revogada.
- Filtros "vencem esta semana" e "vencidas", valor mensal por cliente, receita recorrente (MRR).
- Último contato de cada instalação (online/offline, versão do app).
- **Acesso exclusivo:** login com **2FA obrigatório**. Opcional: restringir o acesso por IP. Chave privada de assinatura guardada fora do banco (variável de ambiente / cofre de segredos).
- Futuro: integração com cobrança (Asaas, Mercado Pago, Stripe). **Pagou → renova sozinho; atrasou → suspende sozinho após X dias.**

---

## 6. Stack tecnológica recomendada

| Camada | Escolha | Por quê |
|---|---|---|
| Linguagem | **TypeScript** em tudo | Tipos compartilhados entre app, Core e admin |
| Desktop | **Electron** + **electron-vite** | Padrão atual; build rápido; separa main/preload/renderer |
| Empacotamento / update | **electron-builder** (NSIS no Windows) + **electron-updater** | Instalador `.exe`, auto-atualização via GitHub Releases ou S3 (permite liberar para 10% antes) |
| Front-end | **React 19** + **Vite** | Pedido do projeto |
| UI | **Tailwind CSS v4** + **shadcn/ui** (Radix) + **lucide-react** | Visual moderno, acessível, tem blocos prontos de inbox/chat/dashboard |
| Estado / dados | **TanStack Query** (servidor) + **Zustand** (UI) | Cache e sincronização simples |
| Roteamento | **TanStack Router** ou React Router | — |
| Formulários | **React Hook Form** + **Zod** | Validação compartilhada com o back |
| Tabelas / listas | TanStack Table + **virtualização** (TanStack Virtual) | Listas de milhares de conversas/mensagens |
| Calendário | **FullCalendar** (resource timeline por profissional) ou Schedule-X | Visão por profissional lado a lado |
| Kanban | **dnd-kit** | Arrastar e soltar acessível |
| Gráficos | **Recharts** (via shadcn charts) | Dashboard do gerente |
| Core (back-end) | **Node.js 22+** + **Fastify** + **Socket.IO** | Leve, rápido, roda embutido no Electron ou em Docker |
| Jobs / filas | **BullMQ + Redis** (nuvem) / fila em SQLite (local) | Envios, lembretes, sync do Google, IA |
| Banco | **SQLite** (better-sqlite3) **ou** **Postgres/Supabase** | Conforme contrato |
| Acesso a dados | **Kysely** (query builder com dialetos SQLite e Postgres na mesma API) + camada de **repositórios** | Troca de banco por configuração; evita `ILIKE`/`jsonb` específicos espalhados no código. (Drizzle é alternativa, mas exige schemas separados por dialeto.) |
| Arquivos de mídia | Disco local (modo Local) / **Supabase Storage ou S3** (Nuvem) | Mesma interface `StorageProvider` |
| WhatsApp não oficial | **@whiskeysockets/baileys** 7.x | Base das soluções brasileiras |
| WhatsApp oficial | Graph API (Cloud API) direto via HTTP | Sem intermediário = sem custo de BSP |
| IA | **Vercel AI SDK** (multi-provedor) ou SDKs oficiais | Troca de provedor com a mesma interface + tool calling |
| Mídia | **ffmpeg** (conversão de áudio p/ OGG Opus, thumbnails) | — |
| Auth | Própria (JWT + refresh, senhas com argon2) | Não depender do Supabase Auth, para funcionar também no modo SQLite |
| Monorepo | **pnpm workspaces** + **Turborepo** | Um repositório, vários apps |
| Testes | Vitest + Playwright (Electron) | — |
| Logs / erros | pino + Sentry | — |

### Estrutura de monorepo sugerida
```
ic-chat/
├─ apps/
│  ├─ desktop/        # Electron + React (cliente)
│  ├─ core/           # Servidor IC Chat (API, canais, IA, agenda)
│  └─ admin/          # Painel super admin + servidor de licenças (web)
├─ packages/
│  ├─ shared/         # tipos, schemas Zod, constantes
│  ├─ db/             # Kysely, migrations SQLite + Postgres, repositórios
│  ├─ channels/       # ChannelConnector: whatsapp-baileys, whatsapp-cloud, instagram...
│  ├─ ai/             # agente, prompts, ferramentas
│  └─ ui/             # componentes shadcn customizados com a marca IC Chat
└─ assets/            # logos e ícones (pasta LOGO atual)
```

---

## 7. Modelo de dados (rascunho)

Toda tabela de negócio possui `tenant_id` (isolamento entre empresas).

- **tenants** (empresa, plano, modalidade, segmento, status)
- **units** (unidades/filiais)
- **users** (nome, e-mail, senha hash, perfil, status online)
- **professionals** (vínculo opcional a user, cor na agenda, google_calendar_id, comissão)
- **services** (nome, duração, preço, categoria) · **professional_services**
- **working_hours** · **time_blocks** (folgas, bloqueios, eventos do Google)
- **contacts** (nome, telefone, e-mail, aniversário, observações, tags, consentimento LGPD)
- **channels** (tipo: whatsapp_qr / whatsapp_cloud / instagram…, credenciais criptografadas, status)
- **conversations** (contact, channel, status, assigned_user, kanban_stage, last_message_at, ai_enabled)
- **messages** (conversation, direção, tipo: texto/áudio/imagem/vídeo/doc…, conteúdo, media_url, status: enviado/entregue/lido/erro, external_id, author: cliente/usuário/IA)
- **appointments** (contact, professional, service(s), início, fim, status, origem: manual/IA/link, google_event_id, preço)
- **ai_settings** (provedor, modelo, chave criptografada, persona, regras) · **ai_knowledge** · **ai_actions_log** · **ai_usage**
- **kanban_stages** (configuráveis) · **tags** · **quick_replies** · **message_templates**
- **audit_log** (quem fez o quê)

Relatórios da gerência saem de `appointments` (produção por profissional) e `conversations/messages` (desempenho no chat), agrupados por semana / quinzena / mês.

---

## 8. Layout e UX

### Princípios
- **Estilo:** moderno, limpo, "app de produtividade" (referências: Linear, Intercom, Chatwoot, WhatsApp Web, Front). Bordas arredondadas (12px, casando com o ícone), sombras suaves, muito espaço em branco.
- **Tema claro e escuro** desde o início (variáveis CSS do shadcn), com as cores da marca.
- **Densidade ajustável** (confortável / compacto) — recepção com monitor pequeno.
- **Atalhos de teclado** (Ctrl+K para busca/comandos, Alt+↑↓ para trocar conversa).
- Acessibilidade: contraste AA, navegação por teclado, textos em pt-BR (preparar i18n para es/en).

### Estrutura de telas (layout de 3 painéis no Inbox)
```
┌────┬──────────────────┬────────────────────────────────┬───────────────────┐
│ ☰  │  🔍 Buscar        │  Maria Silva  · WhatsApp  ⋯    │  PERFIL           │
│ 💬 │  [Minhas][Fila]  │ ─────────────────────────────  │  Maria Silva      │
│ 📅 │  ● Maria Silva   │   Olá, queria marcar corte     │  (11) 9xxxx       │
│ 📊 │    corte sábado… │          Claro! Tenho 9h, 10h ▸│  Próx.: Sáb 10h   │
│ 🗂 │  ○ João P.       │   🎤 ▶ ━━━━━━ 0:12              │  Serviços fav.    │
│ 🤖 │  ○ Ana (IA)      │                                │  Observações      │
│ ⚙  │                  │  [😊][📎][🎤] Digite...   [➤]  │  [Agendar]        │
└────┴──────────────────┴────────────────────────────────┴───────────────────┘
 Menu    Lista de conversas      Conversa ativa              Painel do contato
```
- Menu lateral: Inbox · Agenda · Kanban · Contatos · Dashboard · IA · Configurações.

### Responsividade (todas as telas)
A janela do Electron pode ter qualquer tamanho (notebook 1366px, monitor 1920px, ultrawide, janela reduzida). Breakpoints:

| Largura | Comportamento |
|---|---|
| ≥ 1440px | 4 colunas: menu + lista + conversa + perfil fixo |
| 1024–1439px | Perfil vira gaveta (abre ao clicar) |
| 768–1023px | Menu recolhido só com ícones; lista e conversa alternam |
| < 768px | Uma coluna por vez, navegação estilo celular (preparado para futura versão web/mobile) |

- Usar **container queries** e painéis redimensionáveis (arrastar divisória), lembrando o tamanho escolhido.
- Janela mínima do Electron: ~900×600.

### Recursos específicos do desktop (Electron)
Ícone na bandeja (tray) com contador, iniciar com o sistema, notificações nativas, arrastar arquivos para o chat, colar imagem (Ctrl/Cmd+V), gravação de áudio pelo microfone, instância única, deep link `icchat://`.

### Windows + macOS
| Item | Windows | macOS |
|---|---|---|
| Instalador | `.exe` (NSIS) | `.dmg` (+ `.zip` para o auto-update) |
| Arquitetura | x64 (+ arm64 opcional) | **Universal** (Apple Silicon M1–M4 + Intel) |
| Ícone | `.ico` | `.icns` + ícone de barra de menu "template" (monocromático) |
| Bandeja | Tray ao lado do relógio | Ícone na barra de menus + badge no Dock |
| Atalhos | Ctrl | **Cmd** (usar `CmdOrCtrl` nos menus) |
| Janela | Barra de título customizada | Botões "semáforo" à esquerda (`titleBarStyle: hiddenInset`) |
| Microfone | Automático | Pedido de permissão + texto em `NSMicrophoneUsageDescription` |
| Assinatura | Opcional no MVP (aviso SmartScreen) | **Obrigatória na prática** (Apple Developer PF + notarização) |
| Iniciar com o sistema | Registro do Windows | Login Items |
| ID de hardware (licença) | MachineGuid | IOPlatformUUID |

- **Módulos nativos** (`better-sqlite3`, `ffmpeg`) precisam ser compilados para cada sistema. O build do Mac **precisa rodar num Mac**, ou no **GitHub Actions com runner macOS** (ver seção 9.1).
- Testar sempre nos dois sistemas antes de cada versão.

---

## 9. Segurança e LGPD

- Comunicação sempre HTTPS/WSS; Electron com `contextIsolation`, `sandbox`, sem `nodeIntegration` no renderer, CSP restritiva.
- Credenciais (chaves de IA, tokens Meta/Google, sessão Baileys) **criptografadas** em repouso.
- Permissões por perfil (atendente só vê suas conversas/fila, profissional vê só sua agenda, etc.).
- **LGPD:** base legal e consentimento do contato, exportação e exclusão de dados a pedido, política de retenção de mensagens/mídias, termo de uso e política de privacidade (a Meta e o Google exigem URL pública de privacidade), registro de operador × controlador no contrato.
- Aviso ao enviar dados para provedores de IA (o cliente é o controlador e usa a própria chave).
- Backups automáticos (modo Local: cópia do SQLite + mídias para pasta/nuvem; modo Nuvem: backups do Postgres).

### 9.1 Repositório no GitHub

O código do IC Chat ficará no **GitHub**.

| Decisão | Recomendação | Por quê |
|---|---|---|
| Visibilidade | **Repositório PRIVADO** | É um produto pago com licença. Código público facilita alguém remover a verificação de licença ou copiar o produto |
| Estrutura | **1 monorepo** `ic-chat` (desktop + core + admin + packages) | Tipos compartilhados, uma versão por release |
| Segredos | **Nunca no Git:** `.env`, chave privada das licenças, `service_role` do Supabase, certificados, tokens Meta/Google | Ficam em **GitHub Secrets** (para o CI) e nos *secrets* do Supabase. `.gitignore` + `.env.example` desde o 1º commit |
| Proteção extra | Ativar **Secret scanning / Push protection** e **Dependabot** | Bloqueia commit com chave vazada e avisa sobre bibliotecas com falha de segurança |
| Branches | `main` (estável/releases) + `develop` + branches por funcionalidade (`feat/inbox`, `fix/…`) com Pull Request | Histórico organizado |
| Versões | SemVer (`1.0.0`) + tags `v1.0.0` + changelog automático | O auto-update depende da versão |
| **CI/CD (GitHub Actions)** | Em cada PR: lint + testes (SQLite **e** Postgres). Em cada tag `v*`: **build Windows (runner windows) + macOS (runner macos, assina e notariza)** e publica a release | Gera os dois instaladores sem precisar de Mac próprio |
| **Distribuição dos updates** | Repositório privado **não serve** para o `electron-updater` sem expor um token. Publicar os instaladores em um **repo público separado só de releases** (`ic-chat-releases`, sem código) **ou** no **Supabase Storage**/S3 | Clientes baixam atualizações sem acesso ao código |
| Issues / Projects | Usar **GitHub Projects** (kanban) para o roadmap e Issues para bugs dos clientes piloto | Organização do desenvolvimento |
| Licença do código | "All rights reserved" (proprietário), **sem** licença open source | Protege o produto |
| Dependências open source | Conferir licenças (Baileys MIT ✅; evitar código copiado de forks do Whaticket sem licença) | Evita problema jurídico ao vender |

---

## 10. Modelo comercial (sugestão)

| Plano | Modalidade | Inclui |
|---|---|---|
| **Start** | Local (SQLite) | 1 WhatsApp (QR), até 3 usuários, **3 PCs**, agenda, Google Agenda |
| **Pro** | Local ou Nuvem | + WhatsApp Oficial, IA (BYOK), kanban, dashboard gerente, até 10 usuários, **10 PCs** |
| **Business** | Nuvem (Postgres/Supabase) | + Instagram/Messenger, várias unidades, usuários e **PCs ilimitados**, API/webhooks |
| Adicionais | — | Conexão extra de WhatsApp, implantação, treinamento, IA gerenciada (você fornece a chave e cobra por uso) |

---

## 11. Roadmap sugerido

| Fase | Entregas |
|---|---|
| **0 — Fundação** | Repositório privado no GitHub + CI (build Windows/macOS), monorepo, Electron + React + shadcn com a marca, Core Fastify, banco com Kysely (SQLite + Postgres), login/perfis, multi-tenant, instalador + auto-update, **servidor de licenças + painel Super Admin básico (gerar/renovar/suspender chaves com validade)** |
| **1 — MVP Salão** | WhatsApp via QR (Baileys) + **WhatsApp Oficial com credenciais do próprio cliente**, Inbox completo com mídias (áudio/imagem/doc), contatos, profissionais/serviços, agenda, lembretes, **sync Google Agenda** |
| **2 — IA + Gestão** | Configuração de IA (BYOK), agente com ferramentas de agendamento, Kanban, Dashboard do gerente (semana/quinzena/mês) |
| **3 — Oficial (após o CNPJ)** | Formalização (ME), Business Manager verificado, Tech Provider na Meta, assinatura de código Windows, Embedded Signup v4 + Coexistência, templates, webhook relay, painel super admin completo (métricas, MRR, cobrança automática) |
| **4 — Multicanal** | Instagram, Messenger, (TikTok quando liberado), segmentos para outros negócios, versão web |

---

## 12. Referências de mercado (estudar, não copiar código de licença incompatível)

| Projeto | O que aproveitar | Licença / observação |
|---|---|---|
| [Chatwoot](https://github.com/chatwoot/chatwoot) | Melhor referência de UX de inbox multicanal, atribuição, relatórios | MIT (core) — Ruby, só referência de produto |
| [Evolution API](https://github.com/evolution-foundation/evolution-api) | Como gerenciar várias instâncias Baileys + Cloud API, eventos, webhooks | Apache 2.0 com condições — ler a licença |
| Whaticket / forks (Whaticket SaaS, Izing) | Fluxo "ticket" brasileiro, filas, multiatendente | Muitos forks sem licença clara — **não copiar código** |
| [Baileys](https://github.com/whiskeysockets/Baileys) | Biblioteca de conexão QR | MIT |
| Trinks, Avec, Booksy, Fresha | UX de agenda de salão (visão por profissional, comissões) | Produtos comerciais — referência visual |
| Blocos shadcn de Inbox/Chat/Dashboard | Ponto de partida de layout | MIT |

---

## 13. Riscos principais

| Risco | Impacto | Mitigação |
|---|---|---|
| Banimento de número no modo QR | Alto | Aviso contratual, anti-spam, oferecer migração fácil para o Oficial |
| Mudanças de protocolo quebrando o Baileys | Médio | Manter lib atualizada, monitorar comunidade, fallback para o Oficial |
| Sem CNPJ: sem Tech Provider/Embedded Signup | Médio | MVP com QR + credenciais oficiais do próprio cliente; formalizar com a receita das primeiras vendas |
| Aprovação Meta (Tech Provider/App Review) demorar | Médio | Iniciar logo após obter o CNPJ |
| Verificação OAuth do Google | Médio | Solicitar cedo com o domínio itacondo.com.br; até lá, modo teste (100 usuários, reconexão a cada 7 dias) |
| Código vazar ou licença ser removida | Médio | Repo privado, segredos fora do Git, verificação de licença no Core (não só na tela), ofuscação do build |
| Build/assinatura do macOS | Médio | Apple Developer PF + GitHub Actions com runner macOS |
| Dois bancos (SQLite/Postgres) divergirem | Médio | Kysely + repositórios + testes rodando nos dois bancos no CI |
| Modo Local depender de um PC ligado | Médio | Deixar explícito no plano; relay + alerta quando o servidor cair |
| Custo de IA do cliente | Baixo | BYOK + limites + contador de uso |

---

## 14. Perguntas em aberto (preciso das suas respostas)

1. ~~Marca~~ → **Respondido:** IC = ItaCondo (itacondo.com.br).
2. ~~Sistema operacional~~ → **Respondido:** Windows e macOS.
3. **Quantos PCs** no salão piloto vão usar ao mesmo tempo? Quantos cabeleireiros e atendentes?
4. ~~Hospedagem~~ → **Respondido:** tem Supabase (servidor central = Supabase, ver 0.2). **Falta:** o Painel Super Admin (web) ficará hospedado onde? (sugestão: Vercel/Netlify grátis ou `admin.itacondo.com.br`)
5. ~~Meta/CNPJ~~ → **Respondido:** ainda sem CNPJ; o MVP é para vender e depois formalizar (ver 0.1). **Falta:** o salão piloto tem CNPJ? (para usar o WhatsApp Oficial com as credenciais dele)
19. **Mac:** você tem um Mac para testar? Topa a conta **Apple Developer** (pessoa física, US$ 99/ano) para assinar o app?
20. ~~GitHub~~ → **Feito:** repositório **privado** [tosktose/ic-chat](https://github.com/tosktose/ic-chat), branch `main`.
6. **Agenda:** cada profissional tem sua própria conta Google, ou a empresa terá uma conta com várias agendas?
7. **Comissões / financeiro:** o gerente precisa ver comissão por profissional, caixa, pagamentos? (Muitos sistemas de salão têm isso — pode ser um módulo futuro.)
8. **Agendamento online** por link (cliente marca sozinho numa página) — entra no MVP?
9. **Disparos em massa / campanhas** (promoções, aniversariantes) — desejado? (No modo QR é arriscado; no Oficial custa por mensagem.)
10. **App mobile** para o cabeleireiro ver a agenda no celular — está nos planos?
11. **Provedor de IA padrão** que você prefere sugerir aos clientes (Claude, GPT, Gemini)?
12. **Cobrança dos seus clientes:** mensalidade recorrente? Precisa integrar pagamento (Asaas, Mercado Pago, Stripe) no painel super admin?
13. ~~Licença ao vencer~~ → **Respondido:** modo restrito.
14. ~~Carência e offline~~ → **Respondido:** 3 dias de carência, 7 dias offline.
15. ~~Limite de máquinas~~ → **Respondido:** limitar PCs (servidor + atendentes).
16. ~~Teste grátis~~ → **Respondido:** 7 dias, criado por você no painel.
17. ~~Avisos~~ → **Respondido:** sistema + WhatsApp + e-mail. **Falta:** qual número de WhatsApp da ItaCondo vai enviar os avisos? (No MVP, sem CNPJ, será via QR/Baileys: é pouco volume e só para os seus clientes, então o risco é baixo. Depois do CNPJ, migrar para a API oficial.) E-mail sugerido: `avisos@itacondo.com.br`.
18. ~~Limite de PCs~~ → **Respondido:** Start 3 · Pro 10 · Business ilimitado.

---

## 15. Fontes consultadas

- Baileys — [GitHub](https://github.com/whiskeysockets/Baileys) · [npm](https://www.npmjs.com/package/@whiskeysockets/baileys)
- Meta — [Preços da WhatsApp Business Platform](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing) · [Embedded Signup](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/overview/) · [Onboarding de usuários do app Business (Coexistência)](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users/) · [Tornar-se Tech Provider](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/get-started-for-tech-providers)
- Preços Brasil 2026 — [Message Central](https://www.messagecentral.com/blog/whatsapp-business-api-pricing-brazil) · [Whautomate](https://whautomate.com/whatsapp-business-api-pricing-brazil)
- Política de IA 2026 — [Gulf News](https://gulfnews.com/technology/no-more-chatgpt-and-perplexity-on-whatsapp-meta-bans-major-ai-chatbots-from-2026-1.500316016) · [Zylos Research](https://zylos.ai/research/2026-01-26-whatsapp-api-automation/)
- Risco de banimento — [Wapisimo](https://wapisimo.dev/blog/en/whatsapp-unofficial-api-ban-risk) · [WASenderApi](https://wasenderapi.com/blog/how-to-use-evolution-api-without-getting-banned-on-whatsapp-2026-guide)
- Instagram — [Messaging API (Meta)](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/) · [Regras e limites 2026](https://mark360.ai/blog/instagram-messaging-api-rules-limits-2026)
- TikTok — [Business Messaging API](https://business-api.tiktok.com/portal/docs/business-messaging-api/v1.3)
- Google Agenda — [Push notifications](https://developers.google.com/workspace/calendar/api/guides/push) · [Sincronização incremental](https://developers.google.com/workspace/calendar/api/guides/sync)
- Electron — [electron-vite](https://electron-vite.org/) · [Boilerplates oficiais](https://www.electronjs.org/docs/latest/tutorial/boilerplates-and-clis)
- Banco — [Drizzle multi-dialeto (discussão)](https://github.com/drizzle-team/drizzle-orm/discussions/5269) · [Drizzle + Supabase](https://supabase.com/docs/guides/database/drizzle)
- UI — [shadcn/ui componentes de chat (jun/2026)](https://ui.shadcn.com/docs/changelog/2026-06-chat-components) · [Shadcn Inbox blocks](https://shadcnstudio.com/blocks/dashboard-and-application/inbox-app)
- Referências — [Chatwoot](https://github.com/chatwoot/chatwoot) · [Evolution API](https://github.com/evolution-foundation/evolution-api)
