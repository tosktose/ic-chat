import { useEffect, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  Ban,
  CalendarCheck,
  Clock,
  KeyRound,
  Laptop,
  LogOut,
  Mail,
  MessagesSquare,
  Phone,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserPlus
} from 'lucide-react'
import { toast } from 'sonner'
import { WhatsAppIcon } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/input'
import { Avatar, Badge, Segmented, Switch } from '@/components/ui/misc'
import { Dialog, Sheet } from '@/components/ui/overlay'
import { cn } from '@/lib/utils'

/** Formato comum de usuário para as telas do Super Admin e do gerente. */
export interface DetailUser {
  id: string
  name: string
  email: string
  role: 'gerente' | 'analista'
  active: boolean
  lastSeen: string
  company: string
  companyWhatsapp?: string
}

const roleLabel = { gerente: 'Gerente', analista: 'Analista' }

/** Ações rápidas visíveis (sem menu de três pontinhos) — usadas nas linhas das listas. */
export function UserQuickActions({ user, className }: { user: DetailUser; className?: string }) {
  return (
    <div className={cn('flex items-center gap-0.5', className)} onClick={(e) => e.stopPropagation()}>
      <Button variant="ghost" size="icon-sm" aria-label="Redefinir senha" onClick={() => toast.success('Link de nova senha enviado', { description: user.email })}>
        <KeyRound />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label="Encerrar sessões" onClick={() => toast.success('Sessões encerradas', { description: user.name })}>
        <LogOut />
      </Button>
      {user.active ? (
        <Button variant="ghost" size="icon-sm" className="hover:text-danger" aria-label="Bloquear acesso" onClick={() => toast.success('Acesso bloqueado', { description: user.name })}>
          <Ban />
        </Button>
      ) : (
        <Button variant="ghost" size="icon-sm" className="hover:text-success" aria-label="Desbloquear acesso" onClick={() => toast.success('Acesso liberado', { description: user.name })}>
          <RotateCcw />
        </Button>
      )}
    </div>
  )
}

/** Conteúdo da ficha do usuário (pode ficar dentro de outro painel, com "voltar"). */
export function UserDetailView({ user, onBack }: { user: DetailUser; onBack?: () => void }) {
  const [tab, setTab] = useState<'perfil' | 'acesso' | 'atividade'>('perfil')
  const [role, setRole] = useState(user.role)
  const [active, setActive] = useState(user.active)

  useEffect(() => {
    setTab('perfil')
    setRole(user.role)
    setActive(user.active)
  }, [user])

  const online = user.lastSeen === 'agora'

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-5">
        {onBack && (
          <button onClick={onBack} className="mb-3 flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-foreground">
            <ArrowLeft className="size-4" /> Voltar para a empresa
          </button>
        )}
        <div className="flex items-center gap-3">
          <Avatar name={user.name} size={52} presence={active ? (online ? 'online' : 'offline') : undefined} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-semibold">{user.name}</p>
            <p className="truncate text-[13px] text-muted">{user.email}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge tone={role === 'gerente' ? 'primary' : 'neutral'}>{roleLabel[role]}</Badge>
              <Badge tone={active ? 'success' : 'danger'}>{active ? 'Ativo' : 'Bloqueado'}</Badge>
              <Badge tone="outline">{user.company}</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-border px-5 py-3">
        <Segmented
          className="w-full"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'perfil', label: 'Perfil' },
            { value: 'acesso', label: 'Acesso' },
            { value: 'atividade', label: 'Atividade' }
          ]}
        />
      </div>

      <div className="scroll-thin flex-1 overflow-y-auto p-5">
        {tab === 'perfil' && (
          <div className="flex flex-col gap-4">
            <Field label="Nome completo"><Input defaultValue={user.name} /></Field>
            <Field label="Nome exibido ao cliente" hint="Aparece em negrito nas mensagens enviadas pelo WhatsApp da empresa">
              <Input defaultValue={user.name.split(' ')[0]} />
            </Field>
            <Field label="E-mail de login"><Input icon={<Mail />} defaultValue={user.email} /></Field>
            <Field label="Telefone (opcional)"><Input icon={<Phone />} placeholder="(11) 90000-0000" /></Field>
            {role === 'analista' && user.companyWhatsapp && (
              <div className="flex gap-2 rounded-xl bg-primary-soft p-3 text-[12.5px] text-primary">
                <WhatsAppIcon className="mt-0.5 size-4 shrink-0" />
                <p>Atende pelo WhatsApp da empresa <b>{user.companyWhatsapp}</b>.</p>
              </div>
            )}
          </div>
        )}

        {tab === 'acesso' && (
          <div className="flex flex-col gap-4">
            <Field label="Perfil" hint="Gerente administra a empresa. Analista só atende os clientes.">
              <Select value={role} onChange={(e) => setRole(e.target.value as DetailUser['role'])}>
                <option value="gerente">Gerente</option>
                <option value="analista">Analista</option>
              </Select>
            </Field>
            {role === 'analista' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Recebe conversas da fila">
                  <Select><option>Sim, em rodízio</option><option>Só quando atribuídas</option></Select>
                </Field>
                <Field label="Máx. de conversas simultâneas">
                  <Input type="number" defaultValue={5} min={1} max={30} />
                </Field>
              </div>
            )}
            <SwitchRow title="Acesso liberado" description="Desligue para bloquear o login imediatamente" checked={active} onChange={setActive} />
            <SwitchRow title="Verificação em 2 etapas" description="Código por e-mail a cada novo computador" defaultOn />
            <SwitchRow title="Exigir troca de senha no próximo acesso" />
          </div>
        )}

        {tab === 'atividade' && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2">
              <Mini icon={<MessagesSquare />} label="Conversas (7 dias)" value={role === 'analista' ? '86' : '12'} />
              <Mini icon={<CalendarCheck />} label="Agendou" value={role === 'analista' ? '27' : '4'} />
              <Mini icon={<Clock />} label="1ª resposta" value="2m 05s" />
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold tracking-wider text-subtle uppercase">Sessões ativas</p>
              {[
                { pc: 'RECEPCAO-01', where: 'Windows · São Paulo', when: user.lastSeen },
                { pc: 'NOTEBOOK-JULIANA', where: 'Windows · São Paulo', when: 'há 2 dias' }
              ].map((s) => (
                <div key={s.pc} className="mb-2 flex items-center gap-3 rounded-xl border border-border p-3">
                  <Laptop className="size-4 text-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{s.pc}</p>
                    <p className="text-xs text-muted">{s.where} · {s.when}</p>
                  </div>
                  <Button variant="ghost" size="icon-sm" aria-label="Encerrar esta sessão" onClick={() => toast.success('Sessão encerrada')}>
                    <LogOut />
                  </Button>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold tracking-wider text-subtle uppercase">Histórico</p>
              <ol className="flex flex-col gap-2.5 text-[13px]">
                {[
                  ['Entrou no sistema', user.lastSeen],
                  ['Senha alterada', 'há 12 dias'],
                  ['Usuário criado', 'há 1 mês']
                ].map(([t, w]) => (
                  <li key={t} className="flex items-center gap-2.5">
                    <ShieldCheck className="size-4 text-subtle" />
                    <span className="flex-1">{t}</span>
                    <span className="text-xs text-muted">{w}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Ações sempre visíveis */}
      <div className="pb-safe flex flex-wrap items-center gap-2 border-t border-border p-4">
        <Button variant="ghost" size="icon" className="text-danger" aria-label="Excluir usuário" onClick={() => toast.success('Usuário removido')}>
            <Trash2 />
          </Button>
        <Button variant="outline" size="sm" onClick={() => toast.success('Link de nova senha enviado', { description: user.email })}>
          <KeyRound /> Redefinir senha
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setActive(!active); toast.success(active ? 'Acesso bloqueado' : 'Acesso liberado') }}>
          {active ? <Ban /> : <RotateCcw />} {active ? 'Bloquear' : 'Desbloquear'}
        </Button>
        <Button size="sm" className="ml-auto" onClick={() => toast.success('Alterações salvas', { description: user.name })}>
          Salvar
        </Button>
      </div>
    </div>
  )
}

/** Ficha do usuário em painel lateral. */
export function UserDetailSheet({ user, onClose }: { user: DetailUser | null; onClose: () => void }) {
  return (
    <Sheet open={Boolean(user)} onOpenChange={(v) => !v && onClose()} title={user?.name ?? 'Usuário'} className="max-w-md">
      {user && <UserDetailView user={user} />}
    </Sheet>
  )
}

/** Convite de novo usuário (gerente ou analista) para uma empresa. */
export function NewUserDialog({
  open,
  onOpenChange,
  companies,
  fixedCompany,
  defaultRole = 'analista'
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  companies?: string[]
  fixedCompany?: string
  defaultRole?: DetailUser['role']
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Novo usuário"
      description="O usuário recebe o convite por e-mail e cria a senha no primeiro acesso."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => { onOpenChange(false); toast.success('Convite enviado') }}><UserPlus /> Criar e enviar convite</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {fixedCompany ? (
          <Field label="Empresa" className="sm:col-span-2"><Input readOnly value={fixedCompany} /></Field>
        ) : (
          <Field label="Empresa" className="sm:col-span-2">
            <Select>
              {(companies ?? []).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Nome"><Input placeholder="Nome completo" /></Field>
        <Field label="Nome exibido ao cliente"><Input placeholder="Ex.: Juliana" /></Field>
        <Field label="E-mail de login" className="sm:col-span-2"><Input type="email" placeholder="usuario@empresa.com" /></Field>
        <Field label="Perfil" className="sm:col-span-2" hint="Gerente administra a empresa. Analista atende pelo WhatsApp da empresa.">
          <Select defaultValue={defaultRole}>
            <option value="gerente">Gerente</option>
            <option value="analista">Analista</option>
          </Select>
        </Field>
      </div>
    </Dialog>
  )
}

function SwitchRow({ title, description, checked, onChange, defaultOn }: { title: string; description?: string; checked?: boolean; onChange?: (v: boolean) => void; defaultOn?: boolean }) {
  const [local, setLocal] = useState(Boolean(defaultOn))
  const value = checked ?? local
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border p-3">
      <div>
        <p className="text-[13.5px] font-medium">{title}</p>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
      <Switch checked={value} onCheckedChange={onChange ?? setLocal} />
    </label>
  )
}

function Mini({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3 [&_svg]:size-4 [&_svg]:text-muted">
      {icon}
      <p className="mt-1.5 text-lg font-bold tabular-nums">{value}</p>
      <p className="text-[11px] leading-tight text-muted">{label}</p>
    </div>
  )
}
