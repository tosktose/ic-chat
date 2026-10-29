import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, Mail } from 'lucide-react'
import { toast } from 'sonner'
import logo from '@/assets/logo-transparent.png'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { useAuth } from '@/lib/auth'
import { useSeo } from '@/lib/seo'

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-5 py-7 sm:px-8">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"><ArrowLeft className="size-4" /> Voltar ao login</Link>
          <img src={logo} alt="IC Chat" className="h-9 w-auto rounded bg-white px-1" />
        </div>
        <div className="mt-10 rounded-3xl border border-border bg-surface p-7 shadow-xl sm:p-9">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{subtitle}</p>
          {children}
        </div>
      </div>
    </main>
  )
}

/** Passo 1: pede o e-mail e dispara a mensagem de redefinição. */
export function ForgotPasswordPage() {
  useSeo({ title: 'Esqueci minha senha — IC Chat', noindex: true })
  const { configured, requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const error = await requestPasswordReset(email.trim())
    setLoading(false)
    // Mesma resposta exista a conta ou não: não revela quais e-mails têm cadastro.
    if (error && !/user not found/i.test(error.message)) {
      toast.error('Não foi possível enviar o e-mail', { description: /rate limit|seconds/i.test(error.message) ? 'Aguarde um minuto antes de pedir outro link.' : error.message })
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <Shell title="Confira seu e-mail" subtitle={`Se existir uma conta para ${email}, enviamos um link para criar uma nova senha. Ele vale por tempo limitado.`}>
        <div className="mt-6 flex items-center gap-2 rounded-xl bg-success-soft p-3 text-sm text-success"><CheckCircle2 className="size-4" /> Link enviado. Veja também a caixa de spam.</div>
        <Button variant="outline" className="mt-5 w-full" onClick={() => setSent(false)}>Usar outro e-mail</Button>
      </Shell>
    )
  }
  return (
    <Shell title="Esqueceu a senha?" subtitle="Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.">
      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <Field label="E-mail"><Input required type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com.br" icon={<Mail />} /></Field>
        <Button type="submit" size="lg" className="w-full" disabled={!configured || loading}>{loading ? 'Enviando…' : 'Enviar link de redefinição'} <ArrowRight /></Button>
      </form>
    </Shell>
  )
}

/** Passo 2: a pessoa chega pelo link do e-mail e define a nova senha. */
export function ResetPasswordPage() {
  useSeo({ title: 'Nova senha — IC Chat', noindex: true })
  const { session, loading: authLoading, updatePassword, signOut } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const mismatch = confirm.length > 0 && confirm !== password

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirm) return
    setLoading(true)
    const error = await updatePassword(password)
    setLoading(false)
    if (error) {
      toast.error('Não foi possível trocar a senha', { description: /different from the old/i.test(error.message) ? 'A nova senha precisa ser diferente da atual.' : error.message })
      return
    }
    toast.success('Senha alterada', { description: 'Entre com a nova senha.' })
    await signOut()
    navigate('/login', { replace: true })
  }

  if (authLoading) return <Shell title="Validando link…" subtitle="Só um instante." children={null} />
  if (!session) {
    return (
      <Shell title="Link inválido ou expirado" subtitle="Peça um novo link de redefinição para continuar.">
        <Button className="mt-6 w-full" size="lg" onClick={() => navigate('/esqueci-senha')}>Pedir novo link</Button>
      </Shell>
    )
  }
  return (
    <Shell title="Crie uma nova senha" subtitle={`Conta: ${session.user.email}`}>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <Field label="Nova senha" hint="Mínimo de 8 caracteres"><Input required minLength={8} type="password" autoComplete="new-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} icon={<LockKeyhole />} /></Field>
        <Field label="Confirmar nova senha" hint={mismatch ? <span className="text-danger">As senhas não conferem</span> : undefined}><Input required minLength={8} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} icon={<LockKeyhole />} /></Field>
        <Button type="submit" size="lg" className="w-full" disabled={loading || mismatch || password.length < 8}>{loading ? 'Salvando…' : 'Salvar nova senha'}</Button>
      </form>
    </Shell>
  )
}
