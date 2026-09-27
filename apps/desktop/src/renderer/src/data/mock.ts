// Dados de demonstração usados enquanto o Core (servidor) não está ligado à interface.
import type { ChannelKind } from '@/components/brand'

/** Perfis de acesso: super admin (dono do SaaS), gerente e analista (atendente) da empresa cliente */
export type Role = 'superadmin' | 'gerente' | 'analista'
export type Presence = 'online' | 'away' | 'busy' | 'offline'

export interface User {
  id: string
  name: string
  role: Role
  presence: Presence
  activeChats: number
}

export interface Professional {
  id: string
  name: string
  specialty: string
  color: string // classe de cor da agenda
  dot: string
}

export interface Contact {
  id: string
  name: string
  phone: string
  email?: string
  tags: string[]
  since: string
  visits: number
  spent: number
  favoriteProfessional?: string
  notes?: string
  birthday?: string
}

export type ConversationStatus = 'nova' | 'ia' | 'aguardando' | 'humano' | 'resolvida'

export type MessageKind = 'text' | 'audio' | 'image' | 'document' | 'note' | 'system'
export interface Message {
  id: string
  from: 'contact' | 'agent' | 'ai' | 'system'
  author?: string
  kind: MessageKind
  text?: string
  duration?: string
  fileName?: string
  fileSize?: string
  imageTone?: string
  time: string
  day?: string
  status?: 'sent' | 'delivered' | 'read'
}

export interface Conversation {
  id: string
  contactId: string
  channel: ChannelKind
  status: ConversationStatus
  assignee?: string
  unread: number
  lastMessage: string
  lastTime: string
  aiEnabled: boolean
  tags: string[]
  messages: Message[]
}

export interface Appointment {
  id: string
  contactId: string
  professionalId: string
  service: string
  start: string // HH:mm
  end: string
  status: 'agendado' | 'confirmado' | 'em_atendimento' | 'concluido' | 'faltou'
  price: number
  origin: 'ia' | 'manual' | 'link'
  /** AAAA-MM-DD; sem data = hoje (demonstração) */
  date?: string
  notes?: string
}

export interface Service {
  id: string
  name: string
  minutes: number
  price: number
}

export const services: Service[] = [
  { id: 's1', name: 'Corte feminino', minutes: 60, price: 90 },
  { id: 's2', name: 'Corte masculino', minutes: 45, price: 60 },
  { id: 's3', name: 'Escova', minutes: 60, price: 70 },
  { id: 's4', name: 'Coloração', minutes: 120, price: 220 },
  { id: 's5', name: 'Retoque de raiz', minutes: 90, price: 180 },
  { id: 's6', name: 'Mechas', minutes: 180, price: 420 },
  { id: 's7', name: 'Hidratação', minutes: 60, price: 120 },
  { id: 's8', name: 'Barba', minutes: 30, price: 45 },
  { id: 's9', name: 'Corte + barba', minutes: 60, price: 95 }
]

/** Data "de hoje" usada na demonstração */
export const TODAY = '2026-09-27'

export type KanbanStage = 'nova' | 'ia' | 'aguardando' | 'humano' | 'agendado' | 'concluido'
export interface KanbanCard {
  id: string
  conversationId: string
  stage: KanbanStage
  summary: string
  since: string
  aiSteps?: string[]
}

/** Usuários da empresa cliente (tenant) */
export const users: User[] = [
  { id: 'u4', name: 'Patrícia Nunes', role: 'gerente', presence: 'online', activeChats: 0 },
  { id: 'u2', name: 'Juliana Prado', role: 'analista', presence: 'online', activeChats: 3 },
  { id: 'u3', name: 'Marcos Vieira', role: 'analista', presence: 'away', activeChats: 2 },
  { id: 'u5', name: 'Renata Alves', role: 'analista', presence: 'offline', activeChats: 0 }
]

/** Usuário logado em cada perfil (demonstração) */
export const sessionUsers: Record<Role, User> = {
  superadmin: { id: 'sa', name: 'Luís Ferreira', role: 'superadmin', presence: 'online', activeChats: 0 },
  gerente: users[0],
  analista: users[1]
}

export const professionals: Professional[] = [
  { id: 'p1', name: 'Ana Souza', specialty: 'Cortes e coloração', color: 'bg-blue-500/12 border-blue-500 text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  { id: 'p2', name: 'Bruno Lima', specialty: 'Barbearia', color: 'bg-emerald-500/12 border-emerald-500 text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  { id: 'p3', name: 'Carla Mendes', specialty: 'Mechas e escova', color: 'bg-violet-500/12 border-violet-500 text-violet-700 dark:text-violet-300', dot: 'bg-violet-500' },
  { id: 'p4', name: 'Diego Rocha', specialty: 'Tratamentos capilares', color: 'bg-amber-500/14 border-amber-500 text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' }
]

export const contacts: Contact[] = [
  { id: 'c1', name: 'Maria Silva', phone: '5511987654321', email: 'maria.silva@email.com', tags: ['VIP', 'Coloração'], since: 'mar/2024', visits: 18, spent: 3240, favoriteProfessional: 'p1', notes: 'Alergia a amônia. Prefere horários pela manhã.', birthday: '14/10' },
  { id: 'c2', name: 'João Pedro Santos', phone: '5511976543210', tags: ['Barba'], since: 'jan/2025', visits: 7, spent: 490, favoriteProfessional: 'p2' },
  { id: 'c3', name: 'Fernanda Costa', phone: '5511965432109', tags: ['Novo cliente'], since: 'set/2026', visits: 0, spent: 0 },
  { id: 'c4', name: 'Beatriz Oliveira', phone: '5511954321098', email: 'bia.oli@email.com', tags: ['Mechas'], since: 'jul/2023', visits: 26, spent: 5810, favoriteProfessional: 'p3', birthday: '02/12' },
  { id: 'c5', name: 'Lucas Martins', phone: '5511943210987', tags: [], since: 'fev/2026', visits: 3, spent: 180, favoriteProfessional: 'p2' },
  { id: 'c6', name: 'Camila Rodrigues', phone: '5511932109876', tags: ['Tratamento'], since: 'mai/2025', visits: 9, spent: 1370, favoriteProfessional: 'p4' },
  { id: 'c7', name: 'Rafael Almeida', phone: '5511921098765', tags: [], since: 'ago/2026', visits: 1, spent: 60 },
  { id: 'c8', name: 'Juliana Ferreira', phone: '5511910987654', tags: ['VIP'], since: 'nov/2022', visits: 41, spent: 9120, favoriteProfessional: 'p1' },
  { id: 'c9', name: 'Gabriel Souza', phone: '5511909876543', tags: ['Reclamação'], since: 'abr/2026', visits: 2, spent: 140 },
  { id: 'c10', name: 'Larissa Gomes', phone: '5511998765432', tags: ['Noiva'], since: 'set/2026', visits: 0, spent: 0 }
]

export const conversations: Conversation[] = [
  {
    id: 'v1', contactId: 'c1', channel: 'whatsapp', status: 'humano', assignee: 'u2', unread: 2,
    lastMessage: 'Pode ser às 10h então! 😊', lastTime: '09:42', aiEnabled: false, tags: ['Coloração'],
    messages: [
      { id: 'm1', from: 'contact', kind: 'text', text: 'Bom dia! Queria marcar retoque de raiz com a Ana 💇‍♀️', time: '09:31', day: 'Hoje' },
      { id: 'm2', from: 'ai', kind: 'text', text: 'Bom dia, Maria! 😊 A Ana tem horários no sábado às 9h, 10h e 14h30. Qual prefere?', time: '09:31', status: 'read' },
      { id: 'm3', from: 'contact', kind: 'audio', duration: '0:14', time: '09:35' },
      { id: 'm4', from: 'system', kind: 'system', text: 'IA transferiu para Juliana Prado · cliente pediu atendimento humano', time: '09:35' },
      { id: 'm5', from: 'agent', author: 'Juliana', kind: 'note', text: 'Lembrar: alergia a amônia — usar linha sem amônia.', time: '09:36' },
      { id: 'm6', from: 'agent', author: 'Juliana', kind: 'text', text: 'Oi Maria, tudo bem? Aqui é a Juliana. Anotei que você prefere a coloração sem amônia, já deixamos separado ✅', time: '09:38', status: 'read' },
      { id: 'm7', from: 'contact', kind: 'image', imageTone: 'from-amber-200 via-orange-300 to-rose-300', text: 'Quero esse tom aqui', time: '09:40' },
      { id: 'm8', from: 'contact', kind: 'text', text: 'Pode ser às 10h então! 😊', time: '09:42' }
    ]
  },
  {
    id: 'v2', contactId: 'c3', channel: 'instagram', status: 'ia', unread: 0,
    lastMessage: 'IA: Temos escova a partir de R$ 70 💙', lastTime: '09:40', aiEnabled: true, tags: ['Novo cliente'],
    messages: [
      { id: 'm1', from: 'contact', kind: 'text', text: 'Oi! Quanto custa uma escova?', time: '09:39', day: 'Hoje' },
      { id: 'm2', from: 'ai', kind: 'text', text: 'Oi, Fernanda! Temos escova a partir de R$ 70 💙 Quer que eu veja um horário para você?', time: '09:40', status: 'delivered' }
    ]
  },
  {
    id: 'v3', contactId: 'c2', channel: 'whatsapp', status: 'aguardando', assignee: 'u2', unread: 0,
    lastMessage: 'Você: Confirmado sexta 18h com o Bruno ✂️', lastTime: '09:15', aiEnabled: true, tags: [],
    messages: [
      { id: 'm1', from: 'contact', kind: 'text', text: 'Fala! Tem horário pra barba sexta depois das 17h?', time: '09:10', day: 'Hoje' },
      { id: 'm2', from: 'agent', author: 'Juliana', kind: 'text', text: 'Confirmado sexta 18h com o Bruno ✂️', time: '09:15', status: 'read' }
    ]
  },
  {
    id: 'v4', contactId: 'c9', channel: 'whatsapp', status: 'humano', unread: 4,
    lastMessage: 'Fiquei bem chateado com o atendimento…', lastTime: '09:02', aiEnabled: false, tags: ['Reclamação'],
    messages: [
      { id: 'm1', from: 'contact', kind: 'text', text: 'Fiquei bem chateado com o atendimento de ontem, esperei 40 minutos.', time: '09:01', day: 'Hoje' },
      { id: 'm2', from: 'system', kind: 'system', text: 'IA identificou uma reclamação e enviou para a fila humana', time: '09:01' },
      { id: 'm3', from: 'contact', kind: 'text', text: 'Fiquei bem chateado com o atendimento…', time: '09:02' }
    ]
  },
  {
    id: 'v5', contactId: 'c10', channel: 'whatsapp_official', status: 'nova', unread: 1,
    lastMessage: 'Vocês fazem penteado de noiva?', lastTime: '08:55', aiEnabled: true, tags: ['Noiva'],
    messages: [{ id: 'm1', from: 'contact', kind: 'text', text: 'Vocês fazem penteado de noiva? Caso em dezembro 💍', time: '08:55', day: 'Hoje' }]
  },
  {
    id: 'v6', contactId: 'c4', channel: 'whatsapp', status: 'resolvida', assignee: 'u2', unread: 0,
    lastMessage: 'Obrigada, amei o resultado! 😍', lastTime: 'Ontem', aiEnabled: true, tags: ['Mechas'],
    messages: [
      { id: 'm1', from: 'contact', kind: 'text', text: 'Obrigada, amei o resultado! 😍', time: '19:20', day: 'Ontem' }
    ]
  },
  {
    id: 'v7', contactId: 'c6', channel: 'messenger', status: 'ia', unread: 0,
    lastMessage: 'IA: Agendei hidratação quinta 15h ✅', lastTime: 'Ontem', aiEnabled: true, tags: ['Tratamento'],
    messages: [
      { id: 'm1', from: 'contact', kind: 'text', text: 'Quero marcar uma hidratação essa semana', time: '16:02', day: 'Ontem' },
      { id: 'm2', from: 'ai', kind: 'text', text: 'Agendei hidratação quinta 15h com o Diego ✅ Te mando um lembrete na véspera!', time: '16:03', status: 'read' }
    ]
  },
  {
    id: 'v8', contactId: 'c8', channel: 'whatsapp', status: 'aguardando', assignee: 'u3', unread: 0,
    lastMessage: 'Você: 📄 Tabela de preços 2026.pdf', lastTime: 'Seg', aiEnabled: false, tags: ['VIP'],
    messages: [
      { id: 'm1', from: 'contact', kind: 'text', text: 'Me manda a tabela de preços nova?', time: '11:20', day: 'Segunda' },
      { id: 'm2', from: 'agent', author: 'Marcos', kind: 'document', fileName: 'Tabela de preços 2026.pdf', fileSize: '284 KB', time: '11:24', status: 'read' }
    ]
  },
  {
    id: 'v9', contactId: 'c5', channel: 'tiktok', status: 'nova', unread: 1,
    lastMessage: 'Vi o vídeo do degradê, vocês fazem?', lastTime: 'Seg', aiEnabled: true, tags: [],
    messages: [{ id: 'm1', from: 'contact', kind: 'text', text: 'Vi o vídeo do degradê, vocês fazem?', time: '20:14', day: 'Segunda' }]
  }
]

export const appointments: Appointment[] = [
  { id: 'a1', contactId: 'c1', professionalId: 'p1', service: 'Retoque de raiz', start: '09:00', end: '10:30', status: 'concluido', price: 180, origin: 'ia' },
  { id: 'a2', contactId: 'c8', professionalId: 'p1', service: 'Corte + escova', start: '11:00', end: '12:00', status: 'em_atendimento', price: 150, origin: 'manual' },
  { id: 'a3', contactId: 'c4', professionalId: 'p3', service: 'Mechas', start: '09:30', end: '12:30', status: 'confirmado', price: 420, origin: 'manual' },
  { id: 'a4', contactId: 'c2', professionalId: 'p2', service: 'Barba', start: '10:00', end: '10:30', status: 'confirmado', price: 45, origin: 'ia' },
  { id: 'a5', contactId: 'c5', professionalId: 'p2', service: 'Corte masculino', start: '11:00', end: '11:45', status: 'agendado', price: 60, origin: 'link' },
  { id: 'a6', contactId: 'c6', professionalId: 'p4', service: 'Hidratação', start: '14:00', end: '15:00', status: 'agendado', price: 120, origin: 'ia' },
  { id: 'a7', contactId: 'c7', professionalId: 'p2', service: 'Corte + barba', start: '15:30', end: '16:30', status: 'agendado', price: 95, origin: 'manual' },
  { id: 'a8', contactId: 'c3', professionalId: 'p3', service: 'Escova', start: '14:30', end: '15:30', status: 'agendado', price: 70, origin: 'ia' },
  { id: 'a9', contactId: 'c9', professionalId: 'p1', service: 'Corte feminino', start: '16:00', end: '17:00', status: 'faltou', price: 90, origin: 'manual' },
  { id: 'a10', contactId: 'c10', professionalId: 'p4', service: 'Teste de penteado', start: '17:00', end: '18:30', status: 'agendado', price: 250, origin: 'ia' }
]

export const kanban: KanbanCard[] = [
  { id: 'k1', conversationId: 'v5', stage: 'nova', summary: 'Penteado de noiva em dezembro — quer orçamento', since: '12 min' },
  { id: 'k2', conversationId: 'v9', stage: 'nova', summary: 'Pergunta sobre corte degradê (veio do TikTok)', since: '2 d' },
  { id: 'k3', conversationId: 'v2', stage: 'ia', summary: 'Quer preço de escova · IA oferecendo horários', since: '2 min', aiSteps: ['Consultou tabela de preços', 'Respondeu valor', 'Buscando horários livres'] },
  { id: 'k4', conversationId: 'v3', stage: 'aguardando', summary: 'Barba sexta 18h · aguardando confirmação', since: '27 min' },
  { id: 'k5', conversationId: 'v8', stage: 'aguardando', summary: 'Recebeu tabela de preços 2026', since: '3 d' },
  { id: 'k6', conversationId: 'v4', stage: 'humano', summary: 'Reclamação de atraso (40 min) · prioridade', since: '40 min' },
  { id: 'k7', conversationId: 'v1', stage: 'humano', summary: 'Retoque de raiz sáb 10h · sem amônia', since: '11 min' },
  { id: 'k8', conversationId: 'v7', stage: 'agendado', summary: 'Hidratação qui 15h com Diego', since: '1 d', aiSteps: ['Consultou agenda do Diego', 'Criou agendamento', 'Sincronizou com Google Agenda'] },
  { id: 'k9', conversationId: 'v6', stage: 'concluido', summary: 'Mechas concluídas · cliente elogiou', since: '1 d' }
]

export const quickReplies = [
  { shortcut: '/ola', text: 'Olá! Seja bem-vindo(a) ao Studio Bella 💙 Como posso ajudar?' },
  { shortcut: '/endereco', text: 'Estamos na Rua das Flores, 123 — Centro. Temos estacionamento conveniado 🚗' },
  { shortcut: '/pix', text: 'Nossa chave Pix é o CNPJ: 00.000.000/0001-00' },
  { shortcut: '/horario', text: 'Funcionamos de terça a sábado, das 9h às 20h.' }
]

export const company = { name: 'Studio Bella', segment: 'Salão de beleza', plan: 'Pro', trialDaysLeft: 5 }

export function contactById(id: string): Contact {
  return contacts.find((c) => c.id === id)!
}
export function userById(id?: string): User | undefined {
  return users.find((u) => u.id === id)
}
export function professionalById(id?: string): Professional | undefined {
  return professionals.find((p) => p.id === id)
}
