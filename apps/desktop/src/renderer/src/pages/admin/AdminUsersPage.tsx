import { useMemo, useState } from 'react'
import { Search, UserPlus } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Avatar, Badge, Card, Segmented } from '@/components/ui/misc'
import { NewUserDialog, UserDetailSheet, UserQuickActions, type DetailUser } from '@/components/UserDetail'
import { tenantById, tenants, tenantUsers, type TenantUser } from '@/data/saas'

const toDetail = (u: TenantUser): DetailUser => {
  const t = tenantById(u.tenantId)
  return { ...u, company: t.name, companyWhatsapp: t.whatsapp }
}

type RoleFilter = 'todos' | 'gerente' | 'analista'

export function AdminUsersPage() {
  const [q, setQ] = useState('')
  const [tenant, setTenant] = useState('todas')
  const [role, setRole] = useState<RoleFilter>('todos')
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<DetailUser | null>(null)

  const list = useMemo(
    () =>
      tenantUsers.filter(
        (u) =>
          (tenant === 'todas' || u.tenantId === tenant) &&
          (role === 'todos' || u.role === role) &&
          (u.name + u.email).toLowerCase().includes(q.toLowerCase())
      ),
    [q, tenant, role]
  )

  return (
    <Page
      wide
      title="Usuários"
      description="Gerentes e analistas de todas as empresas. Cada usuário só acessa os dados da própria empresa."
      actions={<Button onClick={() => setOpen(true)}><UserPlus /> Novo usuário</Button>}
    >
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <Segmented
            value={role}
            onChange={setRole}
            className="self-start"
            options={[
              { value: 'todos', label: 'Todos', count: tenantUsers.length },
              { value: 'gerente', label: 'Gerentes' },
              { value: 'analista', label: 'Analistas' }
            ]}
          />
          <div className="flex flex-col gap-2 sm:flex-row lg:ml-auto">
            <Select value={tenant} onChange={(e) => setTenant(e.target.value)} className="sm:w-56">
              <option value="todas">Todas as empresas</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
            <div className="sm:w-64">
              <Input icon={<Search />} placeholder="Buscar nome ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead>
              <tr className="border-y border-border bg-surface-2/60 text-left text-[11px] font-semibold tracking-wider text-subtle uppercase">
                <th className="px-5 py-2.5">Usuário</th>
                <th className="px-3 py-2.5">Empresa</th>
                <th className="px-3 py-2.5">Perfil</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Último acesso</th>
                <th className="w-32 px-3 py-2.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id} onClick={() => setDetail(toDetail(u))} className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-2/40">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} size={32} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{u.name}</p>
                        <p className="truncate text-xs text-muted">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">{tenantById(u.tenantId).name}</td>
                  <td className="px-3 py-3"><Badge tone={u.role === 'gerente' ? 'primary' : 'neutral'}>{u.role === 'gerente' ? 'Gerente' : 'Analista'}</Badge></td>
                  <td className="px-3 py-3"><Badge tone={u.active ? 'success' : 'neutral'}>{u.active ? 'Ativo' : 'Bloqueado'}</Badge></td>
                  <td className="px-3 py-3 whitespace-nowrap text-muted">{u.lastSeen}</td>
                  <td className="px-3 py-3">
                    <UserQuickActions user={toDetail(u)} className="justify-end" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <NewUserDialog open={open} onOpenChange={setOpen} companies={tenants.map((t) => t.name)} />
      <UserDetailSheet user={detail} onClose={() => setDetail(null)} />
    </Page>
  )
}
