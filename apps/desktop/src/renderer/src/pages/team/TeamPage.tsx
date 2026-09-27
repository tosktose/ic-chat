import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { WhatsAppIcon } from '@/components/brand'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Avatar, Badge, Card, CardHeader, Switch } from '@/components/ui/misc'
import { NewUserDialog, UserDetailSheet, UserQuickActions, type DetailUser } from '@/components/UserDetail'
import { useAppState } from '@/lib/app-state'
import { cn } from '@/lib/utils'
import { users, type User } from '@/data/mock'
import { useCompany } from '@/lib/company'

const toDetail = (u: User, companyName: string, whatsapp: string): DetailUser => ({
  id: u.id,
  name: u.name,
  email: `${u.name.split(' ')[0].toLowerCase()}@studiobella.com.br`,
  role: u.role === 'gerente' ? 'gerente' : 'analista',
  active: true,
  lastSeen: u.presence === 'online' ? 'agora' : u.presence === 'away' ? 'há 20 min' : 'há 12 dias',
  company: companyName,
  companyWhatsapp: whatsapp
})

const presenceLabel = { online: 'Disponível', away: 'Ausente', busy: 'Ocupado', offline: 'Offline' }

/** Gerente administra a própria empresa: cria analistas que atendem pelo WhatsApp único da empresa. */
export function TeamPage() {
  const { signature, setSignature, resolveUser } = useAppState()
  const { info } = useCompany()
  const company = info
  const asDetail = (u: User) => toDetail(u, info.name, info.phone)
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<DetailUser | null>(null)

  return (
    <Page
      title="Equipe"
      description={`Usuários da ${company.name}. Todos atendem pelo mesmo WhatsApp da empresa.`}
      actions={<Button onClick={() => setOpen(true)}><UserPlus /> Novo analista</Button>}
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader title="Usuários" description="Gerentes administram a empresa · Analistas atendem os clientes" />
          <div className="flex flex-col">
            {users.map(resolveUser).map((u) => (
              <div
                key={u.id}
                role="button"
                tabIndex={0}
                onClick={() => setDetail(asDetail(u))}
                onKeyDown={(e) => e.key === 'Enter' && setDetail(asDetail(u))}
                className="flex cursor-pointer items-center gap-3 border-t border-border px-5 py-3 transition-colors hover:bg-surface-2/50"
              >
                <Avatar name={u.name} size={38} presence={u.presence} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium">{u.name}</p>
                  <p className="truncate text-xs text-muted">
                    {presenceLabel[u.presence]} · {u.activeChats} {u.activeChats === 1 ? 'conversa' : 'conversas'} agora
                  </p>
                </div>
                <Badge tone={u.role === 'gerente' ? 'primary' : 'neutral'}>{u.role === 'gerente' ? 'Gerente' : 'Analista'}</Badge>
                <UserQuickActions user={asDetail(u)} />
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="WhatsApp da empresa" description="Um número só, compartilhado pela equipe" />
            <div className="px-5 pb-5">
              <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-whatsapp text-white">
                  <WhatsAppIcon className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">{info.phone}</p>
                  <p className="text-xs text-muted">{company.name} · conectado</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Nome do analista nas mensagens" description="Como o cliente sabe quem está atendendo" />
            <div className="flex flex-col gap-3 px-5 pb-5">
              <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div>
                  <p className="text-[13.5px] font-medium">Assinar mensagens com o nome</p>
                  <p className="text-xs text-muted">O nome vai em negrito no início da mensagem</p>
                </div>
                <Switch checked={signature} onCheckedChange={setSignature} />
              </label>
              <ToggleRow title="Avisar quando um analista assumir" description="“Você está sendo atendido(a) por Juliana”" defaultOn />
              <div>
                <p className="mb-2 text-xs font-medium text-muted">Como o cliente vê no WhatsApp</p>
                <div className="chat-pattern rounded-xl p-3">
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[#d9fdd3] px-3 py-2 text-[13.5px] text-slate-900 shadow-sm">
                    {signature && <b>Juliana:</b>}
                    {signature && <br />}
                    Oi Maria! Seu horário de sábado às 10h está confirmado ✅
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <NewUserDialog open={open} onOpenChange={setOpen} fixedCompany={company.name} />
      <UserDetailSheet user={detail} onClose={() => setDetail(null)} />
    </Page>
  )
}

function ToggleRow({ title, description, defaultOn }: { title: string; description: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(Boolean(defaultOn))
  return (
    <label className={cn('flex items-center justify-between gap-3 rounded-xl border border-border p-3')}>
      <div>
        <p className="text-[13.5px] font-medium">{title}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>
      <Switch checked={on} onCheckedChange={setOn} />
    </label>
  )
}
