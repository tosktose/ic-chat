import { useRef, useState } from 'react'
import { Bell, Camera, Eye, EyeOff, KeyRound, Laptop, LogOut, Mail, Monitor, Moon, Palette, Phone, ShieldCheck, Sun, Trash2, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { roleLabel } from '@/components/layout/nav'
import { Page } from '@/components/layout/Page'
import { SoundControls } from '@/components/layout/NotificationBell'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Avatar, Badge, Card, CardHeader, Progress, Segmented, Switch } from '@/components/ui/misc'
import { useAppState } from '@/lib/app-state'
import { useNotifications } from '@/lib/notifications'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { company } from '@/data/mock'

type Tab = 'dados' | 'seguranca' | 'preferencias'

/** Tela "Meu perfil" — igual para Super Admin, Gerente e Analista (cada um edita só a própria conta). */
export function ProfilePage() {
  const { me, role, myPhoto: photo, setMyPhoto: setPhoto } = useAppState()
  const [tab, setTab] = useState<Tab>('dados')
  const fileRef = useRef<HTMLInputElement>(null)

  const pickPhoto = (file?: File) => {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return toast.error('A foto deve ter até 2 MB')
    const reader = new FileReader()
    reader.onload = () => {
      setPhoto(String(reader.result))
      toast.success('Foto atualizada')
    }
    reader.readAsDataURL(file)
  }

  const org = role === 'superadmin' ? 'itaCondo' : company.name
  const email = role === 'superadmin' ? 'luis@itacondo.com.br' : `${me.name.split(' ')[0].toLowerCase()}@studiobella.com.br`

  return (
    <Page title="Meu perfil" description="Seus dados, senha e preferências. Só você vê e altera esta tela.">
      {/* Cabeçalho */}
      <Card className="overflow-hidden">
        <div className="brand-gradient h-24" />
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end">
          <div className="relative -mt-12 w-fit">
            <div className="rounded-full ring-4 ring-surface">
              <Avatar name={me.name} src={photo} size={96} presence="online" />
            </div>
            <Button size="icon-sm" className="absolute right-0 bottom-0 rounded-full" aria-label="Trocar foto" onClick={() => fileRef.current?.click()}>
              <Camera />
            </Button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-bold">{me.name}</p>
            <p className="truncate text-sm text-muted">{email}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="primary">{roleLabel[role]}</Badge>
              <Badge tone="outline">{org}</Badge>
            </div>
          </div>
          {photo && (
            <Button
              variant="ghost"
              size="sm"
              className="self-start text-muted sm:self-end"
              onClick={() => setPhoto(undefined)}
            >
              <Trash2 /> Remover foto
            </Button>
          )}
        </div>
      </Card>

      <div className="my-4">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'dados', label: 'Dados pessoais' },
            { value: 'seguranca', label: 'Segurança' },
            { value: 'preferencias', label: 'Preferências' }
          ]}
        />
      </div>

      {tab === 'dados' && <PersonalTab email={email} />}
      {tab === 'seguranca' && <SecurityTab />}
      {tab === 'preferencias' && <PreferencesTab />}
    </Page>
  )
}

function PersonalTab({ email }: { email: string }) {
  const { me, role, myDisplayName, myPhone, updateMyProfile } = useAppState()
  const [name, setName] = useState(me.name)
  const [displayName, setDisplayName] = useState(myDisplayName)
  const [phone, setPhone] = useState(myPhone ?? '')
  const dirty = name !== me.name || displayName !== myDisplayName || phone !== (myPhone ?? '')
  const save = () => {
    if (!name.trim()) return toast.error('Informe o nome')
    updateMyProfile({ name: name.trim(), displayName: displayName.trim() || undefined, phone: phone || undefined })
    toast.success('Dados salvos', { description: 'Seu nome foi atualizado em todo o sistema.' })
  }
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><UserRound className="size-4" /> Dados pessoais</span>} />
      <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
        <Field label="Nome completo"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        {role !== 'superadmin' ? (
          <Field label="Nome exibido ao cliente" hint="Vai em negrito nas mensagens do WhatsApp da empresa">
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={name.split(' ')[0]} />
          </Field>
        ) : (
          <Field label="Cargo"><Input defaultValue="Diretor" /></Field>
        )}
        <Field label="E-mail de login" hint="Para trocar o e-mail, fale com o administrador">
          <Input icon={<Mail />} defaultValue={email} readOnly />
        </Field>
        <Field label="Celular"><Input icon={<Phone />} placeholder="(11) 90000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
      </div>
      <div className="flex justify-end border-t border-border px-5 py-3">
        <Button onClick={save} disabled={!dirty}>Salvar alterações</Button>
      </div>
    </Card>
  )
}

function strength(p: string): { score: number; label: string; tone: 'danger' | 'warning' | 'primary' | 'success' } {
  let s = 0
  if (p.length >= 8) s++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return [
    { score: 10, label: 'Muito fraca', tone: 'danger' as const },
    { score: 30, label: 'Fraca', tone: 'danger' as const },
    { score: 55, label: 'Média', tone: 'warning' as const },
    { score: 80, label: 'Boa', tone: 'primary' as const },
    { score: 100, label: 'Forte', tone: 'success' as const }
  ][s]
}

function SecurityTab() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const st = strength(next)
  const mismatch = confirm.length > 0 && confirm !== next
  const canSave = current.length > 0 && next.length >= 8 && next === confirm

  const eye = (
    <button type="button" onClick={() => setShow((s) => !s)} className="rounded p-1 hover:text-foreground" aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>
      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  )

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title={<span className="flex items-center gap-2"><KeyRound className="size-4" /> Alterar senha</span>} />
        <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
          <Field label="Senha atual" className="sm:col-span-2">
            <Input type={show ? 'text' : 'password'} value={current} onChange={(e) => setCurrent(e.target.value)} trailing={eye} />
          </Field>
          <Field label="Nova senha" hint="Mínimo 8 caracteres, com letras, números e símbolo">
            <Input type={show ? 'text' : 'password'} value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
          <Field label="Confirmar nova senha" hint={mismatch ? <span className="text-danger">As senhas não conferem</span> : undefined}>
            <Input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={cn(mismatch && 'border-danger')} />
          </Field>
          {next && (
            <div className="sm:col-span-2">
              <Progress value={st.score} tone={st.tone} />
              <p className="mt-1 text-xs text-muted">Força da senha: <b>{st.label}</b></p>
            </div>
          )}
        </div>
        <div className="flex justify-end border-t border-border px-5 py-3">
          <Button
            disabled={!canSave}
            onClick={() => {
              setCurrent('')
              setNext('')
              setConfirm('')
              toast.success('Senha alterada', { description: 'As outras sessões foram encerradas.' })
            }}
          >
            Alterar senha
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title={<span className="flex items-center gap-2"><ShieldCheck className="size-4" /> Proteção da conta</span>} />
        <div className="flex flex-col gap-2 px-5 pb-5">
          <ToggleRow title="Verificação em 2 etapas" description="Código por e-mail ao entrar em um computador novo" defaultOn />
          <ToggleRow title="Avisar por e-mail em novo acesso" description="Receba um alerta quando sua conta for usada em outro PC" defaultOn />
        </div>
      </Card>

      <Card>
        <CardHeader
          title={<span className="flex items-center gap-2"><Laptop className="size-4" /> Sessões ativas</span>}
          action={<Button variant="outline" size="sm" onClick={() => toast.success('Outras sessões encerradas')}><LogOut /> Sair das outras</Button>}
        />
        <div className="flex flex-col">
          {[
            { pc: 'RECEPCAO-01', info: 'Windows 11 · IC Chat 0.1.0', when: 'Este computador', me: true },
            { pc: 'NOTEBOOK-CASA', info: 'Windows 10 · IC Chat 0.1.0', when: 'há 2 dias' }
          ].map((s) => (
            <div key={s.pc} className="flex items-center gap-3 border-t border-border px-5 py-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-surface-2 text-muted"><Laptop className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium">{s.pc}</p>
                <p className="truncate text-xs text-muted">{s.info} · {s.when}</p>
              </div>
              {s.me ? <Badge tone="success">Atual</Badge> : (
                <Button variant="ghost" size="icon-sm" aria-label="Encerrar sessão" onClick={() => toast.success('Sessão encerrada')}><LogOut /></Button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function PreferencesTab() {
  const { theme, setTheme, density, setDensity } = useTheme()
  const { prefs, setPrefs, desktopPermission, requestDesktopPermission } = useNotifications()
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title={<span className="flex items-center gap-2"><Palette className="size-4" /> Aparência</span>} />
        <div className="flex flex-col gap-4 px-5 pb-5">
          <div>
            <p className="mb-2 text-[13px] font-medium">Tema</p>
            <Segmented
              className="w-full"
              value={theme}
              onChange={setTheme}
              options={[
                { value: 'light', label: <span className="flex items-center gap-1.5"><Sun className="size-4" /> Claro</span> },
                { value: 'dark', label: <span className="flex items-center gap-1.5"><Moon className="size-4" /> Escuro</span> },
                { value: 'system', label: <span className="flex items-center gap-1.5"><Monitor className="size-4" /> Sistema</span> }
              ]}
            />
          </div>
          <div>
            <p className="mb-2 text-[13px] font-medium">Densidade</p>
            <Segmented
              value={density}
              onChange={setDensity}
              options={[
                { value: 'comfortable', label: 'Confortável' },
                { value: 'compact', label: 'Compacta' }
              ]}
            />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title={<span className="flex items-center gap-2"><Bell className="size-4" /> Notificações</span>} />
        <div className="flex flex-col gap-1 px-3 pb-4">
          <SwitchRow title="Aviso na tela" checked={prefs.toast} onChange={(v) => setPrefs({ ...prefs, toast: v })} />
          <SwitchRow title="Som de notificação" checked={prefs.sound} onChange={(v) => setPrefs({ ...prefs, sound: v })} />
          {prefs.sound && <SoundControls />}
          <SwitchRow
            title="Notificação do Windows"
            description={desktopPermission === 'denied' ? 'Bloqueada nas configurações do sistema' : 'Quando o IC Chat estiver em segundo plano'}
            checked={prefs.desktop}
            onChange={(v) => {
              setPrefs({ ...prefs, desktop: v })
              if (v && desktopPermission === 'default') requestDesktopPermission()
            }}
          />
        </div>
      </Card>
    </div>
  )
}

function SwitchRow({ title, description, checked, onChange }: { title: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-2.5 py-2.5 hover:bg-surface-2">
      <div>
        <p className="text-[13.5px] font-medium">{title}</p>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

function ToggleRow({ title, description, defaultOn }: { title: string; description: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(Boolean(defaultOn))
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border p-3">
      <div>
        <p className="text-[13.5px] font-medium">{title}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>
      <Switch checked={on} onCheckedChange={setOn} />
    </label>
  )
}
