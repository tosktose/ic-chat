import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowLeft, ArrowRight, Check, Globe2, LockKeyhole, Mail } from 'lucide-react'
import { IcLogo } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { useAuth } from '@/lib/auth'
import { toast } from 'sonner'
import { useSeo } from '@/lib/seo'

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const { configured, session, signIn, signUp, signInWithGoogle, signOut } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [confirmation, setConfirmation] = useState(false)
  const signup = mode === 'signup'
  useSeo({ title: signup ? 'Teste grátis por 7 dias — IC Chat' : 'Entrar — IC Chat', description: signup ? 'Crie sua conta e teste o IC Chat por 7 dias, sem cartão de crédito.' : undefined, path: signup ? '/cadastro' : '/login', noindex: !signup })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    try {
      if (signup) {
        const result = await signUp(email.trim(), password, company)
        if (result.error) throw result.error
        if (result.needsEmailConfirmation) setConfirmation(true)
        else navigate('/dashboard', { replace: true })
      } else {
        const error = await signIn(email.trim(), password)
        if (error) throw error
        navigate('/dashboard', { replace: true })
      }
    } catch (error) {
      const raw = error instanceof Error ? error.message : ''
      const description = /invalid login credentials/i.test(raw) ? 'E-mail ou senha incorretos. Confira os dados ou crie uma conta.'
        : /email not confirmed/i.test(raw) ? 'Confirme seu e-mail pelo link que enviamos antes de entrar.'
        : /already registered/i.test(raw) ? 'Este e-mail já tem conta. Entre com ele.'
        : raw || 'Tente novamente.'
      toast.error('Não foi possível acessar sua conta', { description })
    } finally { setLoading(false) }
  }

  const google = async () => {
    setLoading(true)
    try {
      const error = await signInWithGoogle()
      if (error) throw error
    } catch (error) {
      toast.error('Não foi possível entrar com Google', { description: error instanceof Error ? error.message : 'Confira a configuração do provedor.' })
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background px-5 py-7 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"><ArrowLeft className="size-4" /> Voltar ao site</Link>
        <div className="mx-auto mt-10 grid max-w-4xl overflow-hidden rounded-3xl border border-border bg-surface shadow-xl md:grid-cols-2">
          <section className="brand-gradient hidden flex-col justify-between p-10 text-white md:flex">
            <IcLogo inverted />
            <div>
              <p className="text-sm font-semibold text-cyan-100">IC CHAT · CRM E ATENDIMENTO</p>
              <h1 className="mt-4 text-4xl leading-tight font-bold">Cada conversa pode virar uma nova venda.</h1>
              <p className="mt-4 text-sm leading-6 text-white/80">Organize contatos, acompanhe seu funil e entenda de onde vêm os clientes.</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/85"><Check className="size-4" /> 7 dias para conhecer todas as funções</div>
          </section>
          <section className="p-7 sm:p-10">
            <IcLogo className="mb-7 md:hidden" />
            <h2 className="text-2xl font-bold">{confirmation ? 'Confirme seu e-mail' : signup ? 'Comece seu teste grátis' : 'Bem-vindo de volta'}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{confirmation ? `Enviamos o link de confirmação para ${email}. Confirme seu endereço para acessar o IC Chat.` : signup ? 'Crie sua conta e tenha 7 dias para explorar o IC Chat.' : 'Entre para continuar de onde sua equipe parou.'}</p>
            {session && !confirmation && (
              <div className="mt-5 rounded-xl border border-primary/30 bg-primary-soft p-3.5 text-sm">
                <p className="text-foreground">Você já está conectado como <b className="break-all">{session.user.email}</b>.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => navigate('/dashboard')}>Continuar com esta conta</Button>
                  <Button size="sm" variant="outline" onClick={() => void signOut()}>Sair e usar outra</Button>
                </div>
              </div>
            )}
            {!confirmation && <>
              {!configured && <div className="mt-5 rounded-xl border border-warning/30 bg-warning-soft p-3 text-sm text-warning">A autenticação ainda depende da chave pública do Supabase no ambiente de implantação.</div>}
              <Button variant="outline" className="mt-6 w-full" disabled={!configured || loading} onClick={google}><Globe2 /> Continuar com Google</Button>
              <div className="my-5 flex items-center gap-3 text-xs text-subtle"><span className="h-px flex-1 bg-border" /> OU COM E-MAIL <span className="h-px flex-1 bg-border" /></div>
              <form onSubmit={submit} className="flex flex-col gap-4">
                {signup && <Field label="Nome da empresa"><Input required minLength={2} maxLength={120} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Sua empresa" /></Field>}
                <Field label="E-mail"><Input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com.br" icon={<Mail />} /></Field>
                <Field label="Senha"><Input required minLength={8} type="password" autoComplete={signup ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo de 8 caracteres" icon={<LockKeyhole />} /></Field>
                {!signup && <Link to="/esqueci-senha" className="-mt-2 self-end text-xs font-semibold text-primary hover:underline">Esqueci minha senha</Link>}
                {signup && <p className="text-xs leading-5 text-muted">Ao criar a conta, você inicia um teste de 7 dias. Depois, escolha um plano para continuar.</p>}
                {signup && (
                  <label className="flex items-start gap-2.5 text-xs leading-5 text-muted">
                    <input type="checkbox" required className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]" />
                    <span>Li e concordo com os <Link to="/termos" target="_blank" className="font-semibold text-primary hover:underline">Termos de Uso</Link> e a <Link to="/privacidade" target="_blank" className="font-semibold text-primary hover:underline">Política de Privacidade</Link>.</span>
                  </label>
                )}
                <Button type="submit" className="mt-1 w-full" size="lg" disabled={!configured || loading}>{loading ? 'Aguarde…' : signup ? 'Criar conta e testar grátis' : 'Entrar'} <ArrowRight /></Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted">{signup ? 'Já tem conta?' : 'Ainda não tem conta?'} <Link className="font-semibold text-primary hover:underline" to={signup ? '/login' : '/cadastro'}>{signup ? 'Entrar' : 'Teste grátis'}</Link></p>
            </>}
          </section>
        </div>
        <p className="mt-5 text-center text-xs text-muted">Tratamos seus dados conforme a LGPD. Veja a <Link to="/privacidade" className="underline">Política de Privacidade</Link>.</p>
      </div>
    </main>
  )
}
