import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { ArrowRight, Bot, CalendarCheck, Eye, EyeOff, Lock, Mail, MessagesSquare } from 'lucide-react'
import { IcLogo, InstagramIcon, MessengerIcon, WhatsAppIcon } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { homeByRole } from '@/components/layout/nav'
import { useAppState } from '@/lib/app-state'
import { useAuth } from '@/lib/auth'
import { toast } from 'sonner'

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn, signInWithGoogle, requestPasswordReset, configured, session, loading: authLoading } = useAuth()
  const { role } = useAppState()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [keep, setKeep] = useState(true)

  useEffect(() => {
    if (session && !authLoading) navigate(homeByRole[role], { replace: true })
  }, [session?.user.id, authLoading, role, navigate])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    try {
      const error = await signIn(email.trim(), password)
      if (error) throw error
      try { localStorage.setItem('icchat.keep', keep ? '1' : '0') } catch { /* armazenamento opcional */ }
      navigate(homeByRole.gerente)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      toast.error('Não foi possível entrar', { description: /invalid login credentials/i.test(message) ? 'E-mail ou senha incorretos.' : message || 'Confira a conexão e tente novamente.' })
    } finally { setLoading(false) }
  }

  const forgotPassword = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error('Informe um e-mail válido para recuperar a senha.')
      return
    }
    const error = await requestPasswordReset(email.trim())
    if (error) toast.error('Não foi possível solicitar a redefinição', { description: error.message })
    else toast.success('Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.')
  }

  const googleLogin = async () => {
    setLoading(true)
    try {
      const error = await signInWithGoogle()
      if (error) throw error
      toast.info('Conclua o acesso na janela do Google. O IC Chat abrirá sua conta ao retornar.')
      setLoading(false)
    } catch (error) {
      toast.error('Não foi possível entrar com Google', { description: error instanceof Error ? error.message : 'Confira a conexão e tente novamente.' })
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full overflow-y-auto bg-background">
      <div className="brand-gradient app-drag relative hidden w-[46%] max-w-[640px] flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <IcLogo inverted />
        <div className="relative">
          <h2 className="max-w-md text-4xl leading-tight font-bold tracking-tight">Todos os seus clientes. Uma só caixa de entrada.</h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/80">WhatsApp, Instagram e Messenger num só lugar, com agenda sincronizada ao Google e uma IA que atende e agenda por você.</p>
          <div className="mt-8 grid max-w-md gap-3">
            {[[MessagesSquare, 'Atendimento multicanal com vários atendentes'], [CalendarCheck, 'Agenda por profissional + Google Agenda'], [Bot, 'Assistente IA personalizado com a sua marca']].map(([Icon, text], i) => {
              const I = Icon as typeof Bot
              return <div key={i} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur"><I className="size-5 text-cyan-200" /><span className="text-sm font-medium">{text as string}</span></div>
            })}
          </div>
        </div>
        <div className="relative flex items-center gap-3 text-white/70"><WhatsAppIcon className="size-5" /><InstagramIcon className="size-5" /><MessengerIcon className="size-5" /><span className="text-xs">© 2026 ItaCondo</span></div>
      </div>

      <div className="app-drag flex flex-1 items-center justify-center p-6">
        <form className="app-no-drag w-full max-w-sm" onSubmit={submit}>
          <IcLogo className="mb-10 lg:hidden" />
          <h1 className="text-2xl font-bold tracking-tight">Bem-vindo de volta 👋</h1>
          <p className="mt-1.5 text-sm text-muted">Entre com seu e-mail e senha para acessar o IC Chat.</p>
          {!configured && <p role="status" className="mt-5 rounded-xl border border-warning/30 bg-warning-soft p-3 text-sm text-warning">A autenticação ainda não está configurada nesta instalação. Entre em contato com o suporte.</p>}
          <div className="mt-6 flex flex-col gap-4">
            <Field label="E-mail"><Input required autoFocus autoComplete="username" icon={<Mail />} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com.br" /></Field>
            <Field label="Senha"><Input required autoComplete="current-password" icon={<Lock />} type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" trailing={<button type="button" onClick={() => setShow((v) => !v)} className="rounded p-1 hover:text-foreground" aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>} /></Field>
            <div className="flex items-center justify-between text-[13px]">
              <label className="flex items-center gap-2 text-muted"><input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} className="size-4 accent-(--primary)" /> Manter conectado</label>
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => void forgotPassword()}>Esqueci a senha</button>
            </div>
            <Button type="submit" size="lg" className="mt-2 w-full" disabled={!configured || loading}>{loading ? 'Verificando…' : 'Entrar'} <ArrowRight /></Button>
            <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" /></div>
            <Button type="button" variant="outline" size="lg" className="w-full" disabled={!configured || loading} onClick={() => void googleLogin()}><span className="font-bold text-base">G</span> Entrar com Google</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
