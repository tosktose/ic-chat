# IC Chat — Guia de teste (versão 0.1.0)

## 1. Instalar

Os pacotes ficam em `apps/desktop/release/0.1.0/`:

| Arquivo | Para quê |
|---|---|
| `IC-Chat-Setup-0.1.0.exe` | **Instalador**: instala o IC Chat e cria atalhos na área de trabalho e no menu Iniciar |
| `IC-Chat-Portatil-0.1.0.exe` | **Portátil**: abre direto, sem instalar (bom para testar) |

> O app ainda não tem certificado de assinatura digital. O Windows pode mostrar
> **“O Windows protegeu o computador”**: clique em **Mais informações → Executar assim mesmo**.

Para gerar os pacotes de novo: `npm run dist:win` (na pasta do projeto).

## 2. Entrar

Na tela de login escolha **Gerente** e clique em **Entrar** (o login ainda é de demonstração).
Com **Manter conectado** marcado o app abre direto na próxima vez; **Sair** volta a pedir login.

O app instalado começa **vazio** (sem clientes de exemplo). Para ver as telas preenchidas:
**Configurações → Dados → Carregar dados de exemplo**. Para recomeçar do zero:
**Configurações → Dados → Apagar todos os dados** (digite `APAGAR`).

## 3. Testar o WhatsApp (QR Code)

1. Menu **Canais** → no card “WhatsApp via QR Code” clique em **Conectar** / **Ver QR Code**.
2. No celular: WhatsApp → **Aparelhos conectados → Conectar aparelho** → aponte para o QR.
   (Ou use **Conectar com código de 8 dígitos**.)
3. Quando conectar, aparece “WhatsApp conectado” e o número no card.
4. Peça para alguém mandar uma mensagem para esse número: ela aparece em **Atendimento**
   (o contato é criado automaticamente, com notificação e som).
5. Responda pelo IC Chat: texto, foto, documento e áudio (microfone) saem pelo WhatsApp da empresa.
   Com “Assinar mensagens com o nome” ligado (Equipe), o cliente vê `*Nome:*` antes do texto.
6. ✓ = enviada · ✓✓ = entregue · ✓✓ azul = lida · ⚠ vermelho = não enviada.

A sessão fica salva: ao abrir o app de novo ele reconecta sozinho.
Para desconectar: **Canais → ícone de desconectar** (ou pelo celular, em Aparelhos conectados).

> ⚠️ Use de preferência um número de teste. O método por QR Code não é oficial da Meta;
> envios em massa podem causar bloqueio do número.

## 4. Testar o Google Agenda

**Uma única vez — credenciais do Google Cloud (grátis):**
1. [console.cloud.google.com](https://console.cloud.google.com/projectcreate) → criar projeto “IC Chat”.
2. Ativar a **Google Calendar API**.
3. **Tela de consentimento OAuth** → tipo **Externo** → em **Usuários de teste** adicione os e-mails
   dos profissionais que vão conectar a agenda.
4. **Credenciais → Criar credenciais → ID do cliente OAuth → App para computador**.
5. Copie o **ID do cliente** e a **chave secreta**.

**No IC Chat:**
1. **Agenda → botão “Conectar Google Agenda”** (ou Canais → Configurar sincronização).
2. Abra **Credenciais do Google Cloud**, cole o ID e a chave e clique em **Salvar credenciais**.
3. Em cada profissional clique em **Conectar**: o navegador abre, faça login e autorize.
4. Crie um horário em **Agenda → Novo agendamento** → o evento aparece no Google Agenda do profissional.
   Com “Enviar confirmação por WhatsApp” ligado, o cliente recebe data, hora, serviço e profissional
   (a mensagem fica registrada na conversa; se o WhatsApp estiver desconectado ela aparece com ⚠).
5. Crie um compromisso direto no Google Agenda → em **Agenda** clique em **Sincronizar agora**:
   ele aparece como bloco “Google” e o horário fica indisponível no agendamento.
6. Cancelar um horário no IC Chat remove o evento do Google.

## 5. Testar a IA e a fila da URA

1. Crie uma chave de API no provedor (ex.: [console.anthropic.com](https://console.anthropic.com/settings/keys)).
2. **Assistente IA** → escolha provedor e modelo → cole a chave → **Salvar** (ela é testada na hora).
3. Converse com a IA no quadro **Testar** (resposta real, nada é enviado nem agendado).
4. Ligue a chave **IA atendendo** no topo. A partir daí, cliente novo no WhatsApp é atendido pela IA:
   ela responde com base nos serviços, preços, horários livres e na base de conhecimento, e pode **marcar horários** sozinha.
5. Quando precisa de alguém (pedido do cliente, reclamação, dúvida etc.), a IA avisa o cliente e **transfere**:
   a conversa entra na **fila da URA** (aviso amarelo piscando no Atendimento, com a posição de cada cliente).
6. A URA encaminha, por ordem de chegada, para o **analista Disponível há mais tempo livre** (com menos conversas abertas),
   com notificação e som. Ninguém disponível → o cliente espera na fila e todos são avisados.
   Seu status (Disponível / Ausente / Ocupado) fica no menu do seu nome, no topo.
7. No chat, a chave **IA** devolve a conversa para a IA; desligar manda para a fila.

## 6. Números do painel e relatórios

Painel do gerente, Relatórios e Meu desempenho usam os **dados reais** deste computador:
- **Conversas**: cada atendimento (um novo começa quando o cliente escreve depois de 8h de silêncio).
- **1ª resposta**: da primeira mensagem do cliente até a primeira resposta (equipe ou IA).
- **Concluídos**: horários da agenda que já passaram sem falta marcada; **faltas** e **cancelados** também contam.
- Visitas e gasto de cada cliente somam os horários realizados.
Os números começam do zero na instalação e crescem com o uso.

## 7. O que ainda é demonstração nesta versão

- Login, usuários, empresas e licenças (Super Admin) ainda não usam servidor: e-mails de convite,
  de nova senha e de chave de licença não são enviados (a chave gerada é **copiada** para você enviar).
- A **equipe** (analistas) ainda é a lista de exemplo: a presença dos outros analistas vem do cadastro;
  a sua é real. Com o servidor, cada analista entra no próprio computador.
- A IA não ouve áudios (pede para o cliente escrever).
- WhatsApp Oficial (API da Meta), Instagram e Messenger ainda não enviam mensagens.
- Modalidade Nuvem (Supabase) / servidor na rede: só a tela de escolha, os dados ficam neste computador.

## 8. Onde ficam os dados do app

`%APPDATA%\IC Chat\`

| Item | Conteúdo |
|---|---|
| `icchat.db` | Banco SQLite: contatos, conversas, mensagens e agendamentos |
| `media\` | Fotos, áudios e documentos enviados e recebidos |
| `whatsapp-auth\` | Sessão do WhatsApp (apague para desconectar à força) |
| `google.json` | Credenciais e autorizações do Google, **criptografadas** pelo Windows |
| `ai.json` | Chave de API da IA, **criptografada** pelo Windows (nunca volta para a tela) |

## 9. Segurança desta versão

- Interface isolada do sistema (sem acesso a Node), com política de conteúdo (CSP) que bloqueia
  scripts e conexões externas; links externos só abrem no navegador e só `https`, `mailto` e `tel`.
- Todas as chamadas internas validam a origem e os dados (tamanho de arquivos, formato de datas etc.).
- Executável com *fuses* do Electron: não roda como Node, ignora `NODE_OPTIONS`/`--inspect` e confere
  a integridade do pacote `.asar`.
- Tokens do Google guardados com a criptografia do Windows (DPAPI).
- Uma instância só por computador (evita duas cópias brigando pela sessão do WhatsApp e pelo banco).
