// Dados de demonstração da área do Super Admin (dono do SaaS).
// No banco real cada tabela de negócio tem tenant_id e é isolada por RLS.

export type TenantStatus = 'ativa' | 'teste' | 'vencendo' | 'carencia' | 'restrito' | 'suspensa'
export type Plan = 'Start' | 'Pro' | 'Business'

export interface Tenant {
  id: string
  name: string
  document: string
  segment: string
  plan: Plan
  mode: 'Local' | 'Nuvem'
  status: TenantStatus
  expires: string
  days: number
  pcs: [number, number | null]
  mrr: number
  version: string
  online: boolean
  whatsapp: string
  email: string
}

export const tenants: Tenant[] = [
  { id: 't1', name: 'Studio Bella', document: '12.345.678/0001-90', segment: 'Salão', plan: 'Pro', mode: 'Local', status: 'teste', expires: '02/10/2026', days: 5, pcs: [2, 10], mrr: 0, version: '0.1.0', online: true, whatsapp: '(11) 98765-4321', email: 'contato@studiobella.com.br' },
  { id: 't2', name: 'Barbearia do Zé', document: '23.456.789/0001-01', segment: 'Barbearia', plan: 'Start', mode: 'Local', status: 'ativa', expires: '14/12/2026', days: 78, pcs: [3, 3], mrr: 149, version: '0.1.0', online: true, whatsapp: '(11) 97777-1234', email: 'ze@barbeariadoze.com.br' },
  { id: 't3', name: 'Clínica Derma+', document: '34.567.890/0001-12', segment: 'Estética', plan: 'Business', mode: 'Nuvem', status: 'ativa', expires: '01/03/2027', days: 155, pcs: [14, null], mrr: 599, version: '0.1.0', online: true, whatsapp: '(21) 99888-7766', email: 'adm@dermamais.com.br' },
  { id: 't4', name: 'Espaço Bem-Estar', document: '45.678.901/0001-23', segment: 'Estética', plan: 'Pro', mode: 'Nuvem', status: 'vencendo', expires: '30/09/2026', days: 3, pcs: [6, 10], mrr: 299, version: '0.0.9', online: true, whatsapp: '(31) 98111-2233', email: 'contato@bemestar.com.br' },
  { id: 't5', name: 'Salão Glamour', document: '56.789.012/0001-34', segment: 'Salão', plan: 'Start', mode: 'Local', status: 'carencia', expires: '26/09/2026', days: -1, pcs: [2, 3], mrr: 149, version: '0.0.9', online: false, whatsapp: '(11) 96543-2109', email: 'glamour@email.com' },
  { id: 't6', name: 'Pet Shop Amigo Fiel', document: '67.890.123/0001-45', segment: 'Pet shop', plan: 'Pro', mode: 'Local', status: 'restrito', expires: '20/09/2026', days: -7, pcs: [4, 10], mrr: 299, version: '0.0.8', online: false, whatsapp: '(41) 99876-5432', email: 'amigofiel@email.com' },
  { id: 't7', name: 'Nail Design Lu', document: '123.456.789-00', segment: 'Estética', plan: 'Start', mode: 'Local', status: 'suspensa', expires: '10/11/2026', days: 44, pcs: [1, 3], mrr: 149, version: '0.1.0', online: false, whatsapp: '(11) 91234-5678', email: 'lu@naildesign.com' }
]

export const statusCfg: Record<TenantStatus, { label: string; tone: 'success' | 'primary' | 'warning' | 'danger' | 'neutral'; dot: string }> = {
  ativa: { label: 'Ativa', tone: 'success', dot: 'bg-success' },
  teste: { label: 'Teste', tone: 'primary', dot: 'bg-primary' },
  vencendo: { label: 'Vencendo', tone: 'warning', dot: 'bg-warning' },
  carencia: { label: 'Carência', tone: 'danger', dot: 'bg-danger' },
  restrito: { label: 'Restrito', tone: 'danger', dot: 'bg-danger' },
  suspensa: { label: 'Suspensa', tone: 'neutral', dot: 'bg-subtle' }
}

export interface TenantUser {
  id: string
  tenantId: string
  name: string
  email: string
  role: 'gerente' | 'analista'
  active: boolean
  lastSeen: string
}

export const tenantUsers: TenantUser[] = [
  { id: 'tu1', tenantId: 't1', name: 'Patrícia Nunes', email: 'patricia@studiobella.com.br', role: 'gerente', active: true, lastSeen: 'agora' },
  { id: 'tu2', tenantId: 't1', name: 'Juliana Prado', email: 'juliana@studiobella.com.br', role: 'analista', active: true, lastSeen: 'agora' },
  { id: 'tu3', tenantId: 't1', name: 'Marcos Vieira', email: 'marcos@studiobella.com.br', role: 'analista', active: true, lastSeen: 'há 20 min' },
  { id: 'tu4', tenantId: 't1', name: 'Renata Alves', email: 'renata@studiobella.com.br', role: 'analista', active: false, lastSeen: 'há 12 dias' },
  { id: 'tu5', tenantId: 't2', name: 'José Carlos', email: 'ze@barbeariadoze.com.br', role: 'gerente', active: true, lastSeen: 'há 1 h' },
  { id: 'tu6', tenantId: 't2', name: 'Pedro Henrique', email: 'pedro@barbeariadoze.com.br', role: 'analista', active: true, lastSeen: 'há 5 min' },
  { id: 'tu7', tenantId: 't3', name: 'Dra. Helena Castro', email: 'helena@dermamais.com.br', role: 'gerente', active: true, lastSeen: 'ontem' },
  { id: 'tu8', tenantId: 't3', name: 'Amanda Lopes', email: 'amanda@dermamais.com.br', role: 'analista', active: true, lastSeen: 'agora' },
  { id: 'tu9', tenantId: 't3', name: 'Bruna Teixeira', email: 'bruna@dermamais.com.br', role: 'analista', active: true, lastSeen: 'agora' },
  { id: 'tu10', tenantId: 't4', name: 'Sônia Ribeiro', email: 'sonia@bemestar.com.br', role: 'gerente', active: true, lastSeen: 'há 2 h' },
  { id: 'tu11', tenantId: 't5', name: 'Carla Glamour', email: 'glamour@email.com', role: 'gerente', active: true, lastSeen: 'há 3 dias' },
  { id: 'tu12', tenantId: 't6', name: 'Rodrigo Mendes', email: 'amigofiel@email.com', role: 'gerente', active: true, lastSeen: 'há 8 dias' }
]

export interface LicenseKey {
  key: string
  tenantId: string
  kind: 'Teste' | 'Mensal' | 'Trimestral' | 'Anual'
  issued: string
  status: 'ativa' | 'revogada' | 'expirada' | 'substituída'
  lastCheck: string
}

export const licenseKeys: LicenseKey[] = [
  { key: 'ICCH-7K2M-Q9XD-4TPL-8WNB', tenantId: 't1', kind: 'Teste', issued: '25/09/2026', status: 'ativa', lastCheck: 'há 12 min' },
  { key: 'ICCH-B4ZE-11QP-7MNA-2KXC', tenantId: 't2', kind: 'Trimestral', issued: '14/09/2026', status: 'ativa', lastCheck: 'há 1 h' },
  { key: 'ICCH-R9TT-6WQE-3LMP-0ZAA', tenantId: 't3', kind: 'Anual', issued: '01/03/2026', status: 'ativa', lastCheck: 'há 4 min' },
  { key: 'ICCH-M2NB-8VCX-5ZLK-7QWE', tenantId: 't4', kind: 'Mensal', issued: '30/08/2026', status: 'ativa', lastCheck: 'há 2 h' },
  { key: 'ICCH-P0OI-9UYT-6REW-3QAS', tenantId: 't5', kind: 'Mensal', issued: '26/08/2026', status: 'expirada', lastCheck: 'há 3 dias' },
  { key: 'ICCH-L4KJ-7HGF-2DSA-5ZXC', tenantId: 't6', kind: 'Mensal', issued: '20/08/2026', status: 'expirada', lastCheck: 'há 8 dias' },
  { key: 'ICCH-A1SD-4FGH-7JKL-0QWE', tenantId: 't7', kind: 'Mensal', issued: '10/10/2026', status: 'revogada', lastCheck: 'há 15 dias' },
  { key: 'ICCH-X8CV-2BNM-6QWE-4RTY', tenantId: 't1', kind: 'Teste', issued: '18/09/2026', status: 'substituída', lastCheck: '—' }
]

export function tenantById(id: string): Tenant {
  return tenants.find((t) => t.id === id)!
}

/** Gera uma chave no formato ICCH-XXXX-XXXX-XXXX-XXXX (demonstração; a real é assinada no servidor) */
export function randomKey(): string {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const block = () => Array.from({ length: 4 }, () => abc[Math.floor(Math.random() * abc.length)]).join('')
  return `ICCH-${block()}-${block()}-${block()}-${block()}`
}
