import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Ban,
  HandCoins,
  KeyRound,
  LogOut,
  Mail,
  Phone,
  RotateCcw,
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
import { isWebApp, supabase } from '@/lib/supabase'
import { getSiteUrl } from '@/lib/site-url'

/** Envia de verdade o link de nova senha para o e-mail do usuário (mesmo fluxo do "esqueci minha senha"). */
async function sendPasswordLink(email: string) {
  if (!isWebApp || !supabase) return toast.success('Link de nova senha enviado', { description: email })
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${getSiteUrl()}/redefinir-senha` })
  if (error) toast.error('Não foi possível enviar o link', { description: error.message })
  else toast.success('Link de nova senha enviado', { description: `Confira ${email} (e a caixa de spam).` })
}

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
  affiliateActive?: boolean
  affiliateCommissionRate?: number | null
}

const roleLabel = { gerente: 'Gerente', analista: 'Analista' }

/** Ações rápidas visíveis (sem menu de três pontinhos) — usadas nas linhas das listas. */
export function UserQuickActions({
  user,
  className,
  onSetActive
}: {
  user: DetailUser
  className?: string
  /** Bloqueia/libera de verdade (quando a tela tem acesso aos dados) */
  onSetActive?: (active: boolean) => void
}) {
  return (
    <div className={cn('flex items-center gap-0.5', className)} onClick={(e) => e.stopPropagation()}>
      <Button variant="ghost" size="icon-sm" aria-label="Redefinir senha" onClick={() => void sendPasswordLink(user.email)}>
        <KeyRound />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label="Encerrar sessões" disabled={isWebApp} title={isWebApp ? 'Na versão online a sessão termina quando a pessoa sai ou bloqueamos o acesso' : 'Encerrar sessões'} onClick={() => toast.success('Sessões encerradas', { description: user.name })}>
        <LogOut />
      </Button>
      {user.active ? (
        <Button variant="ghost" size="icon-sm" className="hover:text-danger" aria-label="Bloquear acesso" onClick={() => { onSetActive?.(false); toast.success('Acesso bloqueado', { description: user.name }) }}>
          <Ban />
        </Button>
      ) : (
        <Button variant="ghost" size="icon-sm" className="hover:text-success" aria-label="Desbloquear acesso" onClick={() => { onSetActive?.(true); toast.success('Acesso liberado', { description: user.name }) }}>
          <RotateCcw />
        </Button>
      )}
    </div>
  )
}

/** Conteúdo da ficha do usuário (pode ficar dentro de outro painel, com "voltar"). */
export interface UserPatch {
  name?: string
  role?: DetailUser['role']
  active?: boolean
}

export function UserDetailView({
  user,
  onBack,
  onSave,
  onRemove,
  onAffiliateChange
}: {
  user: DetailUser
  onBack?: () => void
  onSave?: (patch: UserPatch) => void
  onRemove?: () => void
  onAffiliateChange?: (active: boolean, rate: number) => void
}) {
  const [tab, setTab] = useState<'perfil' | 'acesso' | 'atividade'>('perfil')
  const [role, setRole] = useState(user.role)
  const [active, setActive] = useState(user.active)
  const [name, setName] = useState(user.name)
  const [affiliateRate, setAffiliateRate] = useState(String(user.affiliateCommissionRate ?? 10))
  const [confirmRemove, setConfirmRemove] = useState(false)

  useEffect(() => {
    setTab('perfil')
    setRole(user.role)
    setActive(user.active)
    setName(user.name)
    setAffiliateRate(String(user.affiliateCommissionRate ?? 10))
    setConfirmRemove(false)
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
            <Field label="Nome completo"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
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
            {onAffiliateChange && (
              <div className="rounded-xl border border-border p-4">
                <div className="mb-3 flex items-center gap-2">
                  <HandCoins className="size-4 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Programa de afiliados</p>
                    <p className="text-xs text-muted">Ative esta pessoa e defina a comissão sobre pagamentos aprovados.</p>
                  </div>
                </div>
                <SwitchRow
                  title={user.affiliateActive ? 'Afiliado ativo' : 'Ativar como afiliado'}
                  description={user.affiliateActive ? `Link de indicação ativo · ${user.affiliateCommissionRate ?? (Number(affiliateRate) || 10)}%` : 'A pessoa poderá compartilhar o próprio link de indicação.'}
                  checked={Boolean(user.affiliateActive)}
                  onChange={(enabled) => onAffiliateChange(enabled, Number(affiliateRate) || 10)}
                />
                <div className="mt-3 flex items-end gap-2">
                  <Field label="Comissão (%)" className="flex-1">
                    <Input type="number" min="0" max="100" step="0.5" value={affiliateRate} onChange={(event) => setAffiliateRate(event.target.value)} />
                  </Field>
                  <Button variant="outline" size="sm" disabled={!Number.isFinite(Number(affiliateRate)) || Number(affiliateRate) < 0 || Number(affiliateRate) > 100} onClick={() => onAffiliateChange(Boolean(user.affiliateActive), Number(affiliateRate))}>
                    Salvar comissão
                  </Button>
                </div>
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
            <SwitchRow title="Acesso liberado" description="Desligue para bloquear o login imediatamente" checked={active} onChange={setActive} />
          </div>
        )}

        {tab === 'atividade' && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
              <p className="font-medium text-foreground">Sem eventos de atividade disponíveis</p>
              <p className="mt-1">Conversas, sessões e histórico serão mostrados quando houver registros reais para este usuário.</p>
              <p className="mt-2">Último acesso registrado: {user.lastSeen || 'sem registro'}.</p>
            </div>
          </div>
        )}
      </div>

      {/* Ações sempre visíveis */}
      <div className="pb-safe flex flex-wrap items-center gap-2 border-t border-border p-4">
        <Button variant="ghost" size="icon" className="text-danger" aria-label="Excluir usuário" onClick={() => setConfirmRemove(true)}>
            <Trash2 />
          </Button>
        <Button variant="outline" size="sm" onClick={() => void sendPasswordLink(user.email)}>
          <KeyRound /> Redefinir senha
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onSave?.({ active: !active })
            setActive(!active)
            toast.success(active ? 'Acesso bloqueado' : 'Acesso liberado')
          }}
        >
          {active ? <Ban /> : <RotateCcw />} {active ? 'Bloquear' : 'Desbloquear'}
        </Button>
        <Button
          size="sm"
          className="ml-auto"
          disabled={!name.trim()}
          onClick={() => {
            onSave?.({ name: name.trim(), role, active })
            toast.success('Alterações salvas', { description: name })
          }}
        >
          Salvar
        </Button>
      </div>
      <Dialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Excluir usuário?"
        description={`${user.name} perde o acesso imediatamente. As conversas atendidas continuam no histórico.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmRemove(false)}>Cancelar</Button>
            <Button
              variant="danger"
              onClick={() => {
                onRemove?.()
                setConfirmRemove(false)
                toast.success('Usuário excluído', { description: user.name })
                onBack?.()
              }}
            >
              Excluir
            </Button>
          </>
        }
      >
        <span />
      </Dialog>
    </div>
  )
}

/** Ficha do usuário em painel lateral. */
export function UserDetailSheet({
  user,
  onClose,
  onSave,
  onRemove,
  onAffiliateChange
}: {
  user: DetailUser | null
  onClose: () => void
  onSave?: (patch: UserPatch) => void
  onRemove?: () => void
  onAffiliateChange?: (active: boolean, rate: number) => void
}) {
  return (
    <Sheet open={Boolean(user)} onOpenChange={(v) => !v && onClose()} title={user?.name ?? 'Usuário'} className="max-w-md">
      {user && <UserDetailView user={user} onSave={onSave} onRemove={() => { onRemove?.(); onClose() }} onAffiliateChange={onAffiliateChange} />}
    </Sheet>
  )
}

/** Convite de novo usuário (gerente ou analista) para uma empresa. */
export function NewUserDialog({
  open,
  onOpenChange,
  companies,
  fixedCompany,
  defaultRole = 'analista',
  onCreate
}: {
  onCreate?: (u: { company: string; name: string; displayName: string; email: string; role: DetailUser['role'] }) => void
  open: boolean
  onOpenChange: (v: boolean) => void
  companies?: string[]
  fixedCompany?: string
  defaultRole?: DetailUser['role']
}) {
  const [f, setF] = useState({ company: '', name: '', displayName: '', email: '', role: defaultRole })
  useEffect(() => {
    if (open) setF({ company: fixedCompany ?? companies?.[0] ?? '', name: '', displayName: '', email: '', role: defaultRole })
  }, [open, fixedCompany, companies, defaultRole])
  const valid = f.name.trim() && /^\S+@\S+\.\S+$/.test(f.email) && (fixedCompany || f.company)
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Novo usuário"
      description="O usuário recebe o convite por e-mail e cria a senha no primeiro acesso."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!valid}
            onClick={() => {
              onCreate?.({ ...f, name: f.name.trim(), displayName: f.displayName.trim() || f.name.trim().split(' ')[0] })
              onOpenChange(false)
              toast.success('Convite enviado', { description: f.email })
            }}
          >
            <UserPlus /> Criar e enviar convite
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {fixedCompany ? (
          <Field label="Empresa" className="sm:col-span-2"><Input readOnly value={fixedCompany} /></Field>
        ) : (
          <Field label="Empresa" className="sm:col-span-2">
            <Select value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })}>
              {(companies ?? []).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Nome"><Input autoFocus placeholder="Nome completo" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Nome exibido ao cliente"><Input placeholder="Ex.: Juliana" value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} /></Field>
        <Field label="E-mail de login" className="sm:col-span-2"><Input type="email" placeholder="usuario@empresa.com" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Perfil" className="sm:col-span-2" hint="Gerente administra a empresa. Analista atende pelo WhatsApp da empresa.">
          <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as DetailUser['role'] })}>
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
