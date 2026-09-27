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

## 5. O que ainda é demonstração nesta versão

- Login, usuários, empresas e licenças (Super Admin) ainda não usam servidor: e-mails de convite,
  de nova senha e de chave de licença não são enviados (a chave gerada é **copiada** para você enviar).
- **Painel do gerente**, **Relatórios** e **Meu desempenho** mostram números de demonstração
  (aviso amarelo na tela) — passam a usar os atendimentos reais na próxima versão.
- A IA ainda não responde sozinha e a fila da URA ainda não distribui para o analista mais livre.
- WhatsApp Oficial (API da Meta), Instagram e Messenger ainda não enviam mensagens.
- Modalidade Nuvem (Supabase) / servidor na rede: só a tela de escolha, os dados ficam neste computador.

## 6. Onde ficam os dados do app

`%APPDATA%\IC Chat\`

| Item | Conteúdo |
|---|---|
| `icchat.db` | Banco SQLite: contatos, conversas, mensagens e agendamentos |
| `media\` | Fotos, áudios e documentos enviados e recebidos |
| `whatsapp-auth\` | Sessão do WhatsApp (apague para desconectar à força) |
| `google.json` | Credenciais e autorizações do Google, **criptografadas** pelo Windows |

## 7. Segurança desta versão

- Interface isolada do sistema (sem acesso a Node), com política de conteúdo (CSP) que bloqueia
  scripts e conexões externas; links externos só abrem no navegador e só `https`, `mailto` e `tel`.
- Todas as chamadas internas validam a origem e os dados (tamanho de arquivos, formato de datas etc.).
- Executável com *fuses* do Electron: não roda como Node, ignora `NODE_OPTIONS`/`--inspect` e confere
  a integridade do pacote `.asar`.
- Tokens do Google guardados com a criptografia do Windows (DPAPI).
- Uma instância só por computador (evita duas cópias brigando pela sessão do WhatsApp e pelo banco).
