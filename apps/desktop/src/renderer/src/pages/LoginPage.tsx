import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowRight, Bot, CalendarCheck, Crown, Eye, EyeOff, Headset, LayoutDashboard, Lock, Mail, MessagesSquare } from 'lucide-react'
import { IcLogo, InstagramIcon, MessengerIcon, WhatsAppIcon } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { homeByRole } from '@/components/layout/nav'
import { useAppState } from '@/lib/app-state'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Dialog } from '@/components/ui/overlay'
import type { Role } from '@/data/mock'

const DEMO: { role: Role; label: string; email: string; icon: typeof Bot; hint: string }[] = [
  { role: 'gerente', label: 'Gerente', email: 'patricia@studiobella.com.br', icon: LayoutDashboard, hint: 'Gestão da empresa' },
  { role: 'analista', label: 'Analista', email: 'juliana@studiobella.com.br', icon: Headset, hint: 'Atendimento' },
  { role: 'superadmin', label: 'Super Admin', email: 'luis@itacondo.com.br', icon: Crown, hint: 'Dono do sistema' }
]

export function LoginPage() {
  const navigate = useNavigate()
  const { role: lastRole, signIn } = useAppState()
  const [show, setShow] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [serverOpen, setServerOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [server, setServer] = useState<{ mode: 'local' | 'rede' | 'nuvem'; address: string }>(() => {
    try {
      return JSON.parse(localStorage.getItem('icchat.server') ?? '') as { mode: 'local' | 'rede' | 'nuvem'; address: string }
    } catch {
      return { mode: 'local', address: '' }
    }
  })
  const [serverDraft, setServerDraft] = useState(server)
  const serverLabel = server.mode === 'local' ? 'Este computador' : server.mode === 'rede' ? `Rede local · ${server.address}` : `Nuvem · ${server.address}`
  const [role, setRole] = useState<Role>(lastRole)
  const [keep, setKeep] = useState(() => {
    try {
      return localStorage.getItem('icchat.keep') !== '0'
    } catch {
      return true
    }
  })
  const demo = DEMO.find((d) => d.role === role)!

  return (
    <div className="flex h-full overflow-y-auto bg-background">
      {/* Painel da marca (desktop) */}
      <div className="brand-gradient app-drag relative hidden w-[46%] max-w-[640px] flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 size-[28rem] rounded-full bg-cyan-300/20 blur-3xl" />
        <IcLogo inverted />

        <div className="relative">
          <h2 className="max-w-md text-4xl leading-tight font-bold tracking-tight">
            Todos os seus clientes. Uma só caixa de entrada.
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/80">
            WhatsApp, Instagram e Messenger num só lugar, com agenda sincronizada ao Google e uma IA que atende e agenda por você.
          </p>

          <div className="mt-8 grid max-w-md gap-3">
            {[
              [MessagesSquare, 'Atendimento multicanal com vários atendentes'],
              [CalendarCheck, 'Agenda por profissional + Google Agenda'],
              [Bot, 'Assistente IA personalizado com a sua marca']
            ].map(([Icon, text], i) => {
              const I = Icon as typeof Bot
              return (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
                  <I className="size-5 text-cyan-200" />
                  <span className="text-sm font-medium">{text as string}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="relative flex items-center gap-3 text-white/70">
          <WhatsAppIcon className="size-5" />
          <InstagramIcon className="size-5" />
          <MessengerIcon className="size-5" />
          <span className="text-xs">© 2026 ItaCondo</span>
        </div>
      </div>

      {/* Formulário */}
      <div className="app-drag flex flex-1 items-center justify-center p-6">
        <form
          className="app-no-drag w-full max-w-sm"
          onSubmit={(e) => {
            e.preventDefault()
            signIn(role)
            try {
              localStorage.setItem('icchat.keep', keep ? '1' : '0')
            } catch {
              /* ignore */
            }
            navigate(homeByRole[role])
          }}
        >
          <IcLogo className="mb-10 lg:hidden" />
          <h1 className="text-2xl font-bold tracking-tight">Bem-vindo de volta 👋</h1>
          <p className="mt-1.5 text-sm text-muted">Entre com seu e-mail e senha para acessar o IC Chat.</p>

          <div className="mt-6">
            <p className="mb-2 text-[13px] font-medium">Acesso de demonstração</p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO.map((d) => (
                <button
                  type="button"
                  key={d.role}
                  onClick={() => setRole(d.role)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-2.5 text-center transition-colors',
                    role === d.role ? 'border-primary bg-primary-soft text-primary' : 'border-border text-muted hover:border-border-strong'
                  )}
                >
                  <d.icon className="size-5" />
                  <span className="text-[12.5px] font-semibold whitespace-nowrap">{d.label}</span>
                  <span className="text-[10.5px] whitespace-nowrap opacity-80">{d.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-4">
            <Field label="E-mail">
              <Input key={demo.email} icon={<Mail />} type="email" placeholder="voce@empresa.com.br" defaultValue={demo.email} autoFocus />
            </Field>
            <Field label="Senha">
              <Input
                icon={<Lock />}
                type={show ? 'text' : 'password'}
                placeholder="••••••••"
                defaultValue="demonstracao"
                trailing={
                  <button type="button" onClick={() => setShow((s) => !s)} className="rounded p-1 hover:text-foreground" aria-label="Mostrar senha">
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                }
              />
            </Field>
            <div className="flex items-center justify-between text-[13px]">
              <label className="flex items-center gap-2 text-muted">
                <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} className="size-4 accent-(--primary)" /> Manter conectado
              </label>
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => setForgotOpen(true)}>Esqueci a senha</button>
            </div>
            <Button type="submit" size="lg" className="mt-2 w-full">
              Entrar <ArrowRight />
            </Button>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-[13px]">
            <div>
              <p className="font-medium">Servidor</p>
              <p className="mt-0.5 text-muted">{role === 'superadmin' ? 'Nuvem itaCondo' : serverLabel}</p>
            </div>
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => {
                setServerDraft(server)
                setServerOpen(true)
              }}
            >
              Trocar
            </button>
          </div>
        </form>
      </div>
      <Dialog
        open={forgotOpen}
        onOpenChange={setForgotOpen}
        title="Recuperar senha"
        description="Enviaremos um link para você criar uma nova senha. Ele vale por 30 minutos."
        footer={
          <>
            <Button variant="outline" onClick={() => setForgotOpen(false)}>Cancelar</Button>
            <Button
              disabled={!/^\S+@\S+\.\S+$/.test(resetEmail)}
              onClick={() => {
                setForgotOpen(false)
                toast.success('Se o e-mail estiver cadastrado, o link chega em instantes', { description: resetEmail })
                setResetEmail('')
              }}
            >
              Enviar link
            </Button>
          </>
        }
      >
        <Field label="E-mail de login">
          <Input autoFocus type="email" icon={<Mail />} value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="voce@empresa.com.br" />
        </Field>
      </Dialog>

      <Dialog
        open={serverOpen}
        onOpenChange={setServerOpen}
        title="Onde ficam os dados"
        description="Escolha o servidor do IC Chat. Na dúvida, mantenha “Este computador”."
        footer={
          <>
            <Button variant="outline" onClick={() => setServerOpen(false)}>Cancelar</Button>
            <Button
              disabled={serverDraft.mode !== 'local' && serverDraft.address.trim().length < 4}
              onClick={() => {
                setServer(serverDraft)
                try {
                  localStorage.setItem('icchat.server', JSON.stringify(serverDraft))
                } catch {
                  /* ignore */
                }
                setServerOpen(false)
                toast.success('Servidor definido', { description: serverDraft.mode === 'local' ? 'Este computador' : serverDraft.address })
              }}
            >
              Salvar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-2">
          {([
            ['local', 'Este computador', 'Os dados ficam neste PC (SQLite). Ideal para um único computador ou para o PC servidor da empresa.'],
            ['rede', 'Servidor na rede da empresa', 'Outro PC da empresa guarda os dados e este se conecta a ele pela rede.'],
            ['nuvem', 'Nuvem (Supabase)', 'Os dados ficam na nuvem, acessíveis de qualquer lugar. Definido no contrato.']
          ] as const).map(([mode, title, desc]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setServerDraft({ ...serverDraft, mode })}
              className={cn('rounded-xl border-2 p-3 text-left', serverDraft.mode === mode ? 'border-primary bg-primary-soft/50' : 'border-border hover:border-border-strong')}
            >
              <p className="text-[13.5px] font-semibold">{title}</p>
              <p className="text-xs text-muted">{desc}</p>
            </button>
          ))}
          {serverDraft.mode !== 'local' && (
            <Field label={serverDraft.mode === 'rede' ? 'Endereço do servidor na rede' : 'Endereço do projeto na nuvem'} hint="Fornecido pelo suporte IC Chat">
              <Input
                value={serverDraft.address}
                onChange={(e) => setServerDraft({ ...serverDraft, address: e.target.value })}
                placeholder={serverDraft.mode === 'rede' ? '192.168.0.10:3210' : 'https://empresa.supabase.co'}
              />
            </Field>
          )}
          {serverDraft.mode !== 'local' && (
            <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
              Nesta versão de teste os dados continuam sendo salvos neste computador. A conexão com servidor e nuvem chega na próxima etapa.
            </p>
          )}
        </div>
      </Dialog>
    </div>
  )
}
