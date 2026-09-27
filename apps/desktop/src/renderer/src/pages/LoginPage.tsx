import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowRight, Bot, CalendarCheck, Crown, Eye, EyeOff, Headset, LayoutDashboard, Lock, Mail, MessagesSquare } from 'lucide-react'
import { IcLogo, InstagramIcon, MessengerIcon, WhatsAppIcon } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { homeByRole } from '@/components/layout/nav'
import { useAppState } from '@/lib/app-state'
import { cn } from '@/lib/utils'
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
  const [role, setRole] = useState<Role>(lastRole)
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
                <input type="checkbox" defaultChecked className="size-4 accent-(--primary)" /> Manter conectado
              </label>
              <button type="button" className="font-medium text-primary hover:underline">Esqueci a senha</button>
            </div>
            <Button type="submit" size="lg" className="mt-2 w-full">
              Entrar <ArrowRight />
            </Button>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-[13px]">
            <div>
              <p className="font-medium">Servidor</p>
              <p className="mt-0.5 text-muted">{role === 'superadmin' ? 'Nuvem itaCondo' : 'Este computador · Studio Bella'}</p>
            </div>
            <button type="button" className="text-xs font-medium text-primary hover:underline">Trocar</button>
          </div>
        </form>
      </div>
    </div>
  )
}
