import { ArrowDownToLine, ArrowRight, CalendarDays, Check, ChevronDown, Globe, Menu, MessageSquare, Monitor, ShieldCheck, Sparkles, Target, Users, X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { InstagramIcon, WhatsAppIcon } from '@/components/brand'
import logo from '@/assets/logo-transparent.png'
import { openCookiePreferences } from '@/lib/consent'
import { useSeo } from '@/lib/seo'

const downloadUrl = import.meta.env.VITE_ICCHAT_DESKTOP_DOWNLOAD_URL as string | undefined

const plans = [
  { name: 'Start', price: 79, summary: 'Para organizar o atendimento e não perder nenhum contato.', features: ['Até 3 usuários', 'Caixa de entrada e contatos', 'Funil de vendas', 'Agenda e relatórios essenciais'], recommended: false },
  { name: 'Pro', price: 149, summary: 'Para equipes que querem automatizar e acompanhar resultados.', features: ['Até 10 usuários', 'Tudo do Start', 'Assistente IA e automações', 'Relatórios por canal e conversão'], recommended: true },
  { name: 'Business', price: 299, summary: 'Para operações em crescimento e mais de uma unidade.', features: ['Usuários ampliados', 'Tudo do Pro', 'Múltiplas unidades', 'Integrações e suporte prioritário'], recommended: false }
]

const faqs = [
  ['O que acontece depois do teste de 7 dias?', 'Você escolhe o plano que faz sentido para a sua empresa. Sem uma assinatura ativa, o acesso aos dados fica suspenso até a regularização — nada é apagado.'],
  ['Preciso instalar alguma coisa?', 'Não. O IC Chat funciona direto no navegador. A versão para Windows é opcional, para quem prefere um aplicativo instalado no computador.'],
  ['Meus dados ficam separados dos de outras empresas?', 'Sim. Cada empresa enxerga apenas os próprios dados, com regras de acesso aplicadas no banco de dados. Tratamos tudo conforme a LGPD.'],
  ['Posso conectar WhatsApp e Instagram?', 'O sistema organiza o atendimento multicanal. A disponibilidade de cada conexão depende da configuração das APIs oficiais da Meta e da sua conta comercial.']
]

/** Revela o conteúdo suavemente quando ele entra na tela. */
function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) { el.classList.add('is-in'); return }
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('is-in'); io.disconnect() } },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return <div ref={ref} className={`lp-reveal ${className}`} style={{ '--d': `${delay}ms` } as CSSProperties}>{children}</div>
}

const script = [
  { from: 'them', text: 'Oi! Vi vocês no Instagram. Como funciona o plano Pro?' },
  { from: 'me', text: 'Olá, Larissa! Já te explico. Quantas pessoas atendem por aí?' },
  { from: 'them', text: 'Somos 4. Dá pra ver tudo num lugar só?' },
  { from: 'me', text: 'Dá sim — e cada conversa vira uma oportunidade no funil. ✨' }
]

/** Conversa que se escreve sozinha, em loop. */
function ChatDemo() {
  const [shown, setShown] = useState(1)
  const [typing, setTyping] = useState(false)
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(script.length); return }
    let alive = true
    const timers: number[] = []
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(() => alive && fn(), ms))
    const step = (n: number) => {
      if (n >= script.length) { later(() => { setShown(1); step(1) }, 4200); return }
      setTyping(true)
      later(() => { setTyping(false); setShown(n + 1); step(n + 1) }, 1500)
    }
    later(() => step(1), 1200)
    return () => { alive = false; timers.forEach(clearTimeout) }
  }, [])
  return (
    <div className="flex flex-col gap-2.5 p-4">
      {script.slice(0, shown).map((m, i) => (
        <div key={i} className={`lp-pop max-w-[82%] rounded-2xl px-3.5 py-2 text-[12.5px] leading-5 ${m.from === 'me' ? 'self-end rounded-br-md bg-blue-600 text-white' : 'self-start rounded-bl-md bg-white text-slate-700 shadow-sm ring-1 ring-slate-100'}`}>{m.text}</div>
      ))}
      {typing && (
        <div className={`flex gap-1 rounded-2xl bg-white px-3.5 py-3 shadow-sm ring-1 ring-slate-100 ${script[shown].from === 'me' ? 'self-end' : 'self-start'}`}>
          {[0, 1, 2].map((d) => <i key={d} className="lp-dot size-1.5 rounded-full bg-slate-400" style={{ animationDelay: `${d * 160}ms` }} />)}
        </div>
      )}
    </div>
  )
}

function Mockup() {
  const ref = useRef<HTMLDivElement>(null)
  const move = (e: MouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(1400px) rotateY(${x * 7}deg) rotateX(${-y * 6}deg)`
  }
  const leave = () => { if (ref.current) ref.current.style.transform = 'perspective(1400px) rotateY(0) rotateX(0)' }
  const bars = [38, 56, 44, 72, 60, 88, 76]
  return (
    <div className="relative mx-auto w-full max-w-[640px]" onMouseMove={move} onMouseLeave={leave}>
      <div className="lp-float-slow absolute -top-6 -left-4 z-20 hidden items-center gap-2.5 rounded-2xl bg-white/90 px-3.5 py-2.5 shadow-xl ring-1 ring-slate-100 backdrop-blur sm:flex">
        <span className="grid size-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><WhatsAppIcon className="size-4" /></span>
        <span><b className="block text-xs text-slate-900">Nova mensagem</b><small className="text-[10px] text-slate-500">Rafael pediu os valores</small></span>
      </div>
      <div className="lp-float absolute -right-3 -bottom-5 z-20 hidden items-center gap-2.5 rounded-2xl bg-white/90 px-3.5 py-2.5 shadow-xl ring-1 ring-slate-100 backdrop-blur sm:flex">
        <span className="grid size-8 place-items-center rounded-xl bg-blue-50 text-blue-700"><Target className="size-4" /></span>
        <span><b className="block text-xs text-slate-900">+ R$ 4.800 no funil</b><small className="text-[10px] text-slate-500">Oportunidade criada agora</small></span>
      </div>

      <div ref={ref} className="rounded-[26px] bg-white/70 p-2 shadow-[0_50px_120px_-40px_rgba(30,64,175,.45)] ring-1 ring-slate-200/80 backdrop-blur transition-transform duration-300 ease-out will-change-transform">
        <div className="overflow-hidden rounded-[20px] bg-slate-50 ring-1 ring-slate-100">
          <div className="flex h-9 items-center gap-1.5 border-b border-slate-100 bg-white px-4"><i className="size-2.5 rounded-full bg-slate-200" /><i className="size-2.5 rounded-full bg-slate-200" /><i className="size-2.5 rounded-full bg-slate-200" /></div>
          <div className="grid sm:grid-cols-[1fr_1.15fr]">
            <div className="hidden border-r border-slate-100 bg-white p-3.5 sm:block">
              <div className="mb-3 flex items-center justify-between"><b className="text-xs text-slate-800">Atendimento</b><span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-semibold text-blue-700">12 novas</span></div>
              {[['LM', 'Larissa M.', 'Como funciona o plano Pro?', 'bg-pink-100 text-pink-700'], ['RC', 'Rafael C.', 'Pode me mandar os valores?', 'bg-amber-100 text-amber-700'], ['BF', 'Bruna F.', 'Obrigada pelo retorno!', 'bg-violet-100 text-violet-700'], ['TA', 'Tiago A.', 'Queria agendar para sexta', 'bg-emerald-100 text-emerald-700']].map(([i, n, m, c], k) => (
                <div key={n} className={`flex items-center gap-2.5 rounded-xl p-2 ${k === 0 ? 'bg-blue-50' : ''}`}>
                  <span className={`grid size-8 shrink-0 place-items-center rounded-full text-[10px] font-bold ${c}`}>{i}</span>
                  <div className="min-w-0"><b className="block truncate text-[11px] text-slate-800">{n}</b><p className="truncate text-[10px] text-slate-500">{m}</p></div>
                </div>
              ))}
              <div className="mt-4 rounded-xl border border-slate-100 p-3">
                <span className="text-[9px] font-semibold tracking-wider text-slate-400">LEADS NA SEMANA</span>
                <div className="mt-2 flex h-14 items-end gap-1.5">{bars.map((h, i) => <i key={i} className="lp-bar flex-1 rounded-t bg-gradient-to-t from-blue-600 to-cyan-400" style={{ height: `${h}%`, animationDelay: `${i * 90 + 400}ms` }} />)}</div>
              </div>
            </div>
            <div className="flex min-h-[340px] flex-col bg-[#eef2f8]">
              <div className="flex items-center gap-2.5 border-b border-slate-200/70 bg-white px-4 py-3">
                <span className="grid size-8 place-items-center rounded-full bg-pink-100 text-[10px] font-bold text-pink-700">LM</span>
                <div><b className="block text-xs text-slate-800">Larissa Martins</b><span className="inline-flex items-center gap-1 text-[10px] text-slate-500"><InstagramIcon className="size-3 text-pink-500" /> Instagram</span></div>
                <span className="ml-auto rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">Em atendimento</span>
              </div>
              <ChatDemo />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ eyebrow, title, copy }: { eyebrow: string; title: string; copy?: string }) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <span className="text-[11px] font-bold tracking-[.22em] text-blue-700 uppercase">{eyebrow}</span>
      <h2 className="mt-4 text-3xl font-semibold tracking-[-.035em] text-slate-950 sm:text-[42px] sm:leading-[1.1]">{title}</h2>
      {copy && <p className="mt-4 text-base leading-7 text-slate-600">{copy}</p>}
    </Reveal>
  )
}

export function LandingPage() {
  useSeo({ title: 'IC Chat — Atendimento que vira venda', description: 'Atenda pelo WhatsApp e Instagram, organize contatos e acompanhe oportunidades em um CRM simples. Experimente o IC Chat por 7 dias grátis.', path: '/' })
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const scroller = useRef<HTMLElement>(null)

  return (
    // O app é "tela cheia" (body sem rolagem); a landing tem a própria área rolável.
    <main
      ref={scroller}
      onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 12)}
      className="lp-scroll fixed inset-0 overflow-x-hidden overflow-y-auto bg-[#fbfcff] text-slate-950 selection:bg-blue-200"
      style={{ colorScheme: 'light' }}
    >
      <header className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? 'border-b border-slate-200/70 bg-white/80 backdrop-blur-xl' : 'border-b border-transparent'}`}>
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/" aria-label="IC Chat, início"><img src={logo} alt="IC Chat" className="h-9 w-auto sm:h-10" /></Link>
          <nav className="hidden items-center gap-9 text-[13px] font-medium text-slate-600 md:flex">
            {[['#funcionalidades', 'Funcionalidades'], ['#como-funciona', 'Como funciona'], ['#planos', 'Planos'], ['#baixar', 'Aplicativo'], ['#duvidas', 'Dúvidas']].map(([h, l]) => <a key={h} href={h} className="transition hover:text-blue-700">{l}</a>)}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Link to="/login" className="rounded-lg px-3 py-2 text-[13px] font-semibold text-slate-700 transition hover:text-blue-700">Entrar</Link>
            <Link to="/cadastro" className="inline-flex h-10 items-center gap-2 rounded-full bg-slate-950 px-5 text-[13px] font-semibold text-white transition hover:bg-blue-700">Teste grátis <ArrowRight className="size-3.5" /></Link>
          </div>
          <button className="rounded-lg p-2 text-slate-700 md:hidden" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
        {menuOpen && (
          <nav className="grid gap-1 border-t border-slate-100 bg-white px-5 py-3 text-sm md:hidden">
            {[['#funcionalidades', 'Funcionalidades'], ['#como-funciona', 'Como funciona'], ['#planos', 'Planos'], ['#baixar', 'Aplicativo'], ['#duvidas', 'Dúvidas']].map(([h, l]) => <a key={h} onClick={() => setMenuOpen(false)} href={h} className="rounded-lg px-3 py-2.5">{l}</a>)}
            <Link to="/login" className="rounded-lg px-3 py-2.5">Entrar</Link>
            <Link to="/cadastro" className="mt-1 rounded-full bg-slate-950 px-3 py-3 text-center font-semibold text-white">Testar grátis por 7 dias</Link>
          </nav>
        )}
      </header>

      {/* HERO */}
      <section className="relative isolate overflow-hidden px-5 pt-14 pb-24 sm:px-8 sm:pt-20 lg:pt-24">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="lp-drift absolute -top-32 -left-24 h-[460px] w-[460px] rounded-full bg-blue-300/30 blur-[110px]" />
          <div className="lp-drift absolute top-10 right-0 h-[420px] w-[420px] rounded-full bg-cyan-200/50 blur-[110px]" style={{ animationDelay: '-8s' }} />
          <div className="lp-drift absolute bottom-0 left-1/3 h-[340px] w-[340px] rounded-full bg-violet-200/40 blur-[110px]" style={{ animationDelay: '-14s' }} />
          <div className="lp-grain absolute inset-0" />
        </div>
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[.95fr_1.05fr] lg:gap-10">
          <div className="relative z-10 max-w-xl">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200/80 backdrop-blur"><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative size-2 rounded-full bg-emerald-500" /></span> Atendimento, contatos e vendas em um só lugar</div>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="mt-7 text-[40px] leading-[1.04] font-semibold tracking-[-.05em] text-slate-950 sm:text-6xl lg:text-[68px]">A conversa começa no chat. <span className="bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400 bg-clip-text text-transparent">A venda não se perde.</span></h1>
            </Reveal>
            <Reveal delay={180}>
              <p className="mt-6 max-w-lg text-[17px] leading-8 text-slate-600">Organize contatos, acompanhe cada oportunidade e descubra quais canais realmente trazem clientes — com a leveza de um app que sua equipe quer usar.</p>
            </Reveal>
            <Reveal delay={270}>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to="/cadastro" className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-slate-950 px-8 text-sm font-semibold text-white shadow-2xl shadow-slate-900/20 transition hover:bg-blue-700">Experimentar grátis por 7 dias <ArrowRight className="size-4 transition group-hover:translate-x-1" /></Link>
                <a href="#baixar" className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:ring-blue-300"><ArrowDownToLine className="size-4" /> Baixar o app</a>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-500"><span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-emerald-600" /> Sem cartão no teste</span><span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-blue-600" /> Em conformidade com a LGPD</span></div>
            </Reveal>
          </div>
          <Reveal delay={200}><Mockup /></Reveal>
        </div>
      </section>

      {/* FAIXA DE CANAIS */}
      <section aria-label="Canais" className="overflow-hidden border-y border-slate-200/70 bg-white/60 py-6">
        <div className="lp-marquee flex w-max items-center gap-14 pr-14 text-sm font-medium text-slate-400">
          {[0, 1].map((k) => (
            <div key={k} className="flex shrink-0 items-center gap-14" aria-hidden={k === 1}>
              {[[WhatsAppIcon, 'WhatsApp'], [InstagramIcon, 'Instagram'], [CalendarDays, 'Agenda'], [Target, 'Funil de vendas'], [Sparkles, 'Assistente de IA'], [Users, 'Contatos'], [MessageSquare, 'Caixa de entrada']].map(([Icon, label]) => {
                const I = Icon as typeof Target
                return <span key={`${k}-${label as string}`} className="inline-flex items-center gap-2.5"><I className="size-[18px]" /> {label as string}</span>
              })}
            </div>
          ))}
        </div>
      </section>

      {/* FUNCIONALIDADES (bento) */}
      <section id="funcionalidades" className="px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <SectionTitle eyebrow="Funcionalidades" title="Tudo o que sua equipe precisa, sem o excesso." copy="Atenda com contexto, transforme interesse em oportunidade e acompanhe o que está funcionando." />
          <div className="mt-16 grid gap-4 lg:grid-cols-6">
            <Reveal className="lg:col-span-3"><article className="group relative h-full overflow-hidden rounded-[28px] bg-white p-8 ring-1 ring-slate-200/80 transition duration-500 hover:shadow-2xl hover:shadow-blue-900/10">
              <span className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-700"><MessageSquare className="size-5" /></span>
              <h3 className="mt-6 text-xl font-semibold tracking-tight">Uma caixa de entrada para a equipe toda</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">Conversas, histórico e responsável de cada contato num só lugar, com respostas rápidas e notas internas.</p>
              <div className="pointer-events-none absolute -right-10 -bottom-10 size-48 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 opacity-70 blur-2xl transition duration-700 group-hover:scale-125" />
            </article></Reveal>
            <Reveal delay={80} className="lg:col-span-3"><article className="group relative h-full overflow-hidden rounded-[28px] bg-slate-950 p-8 text-white transition duration-500 hover:shadow-2xl hover:shadow-blue-900/30">
              <span className="grid size-11 place-items-center rounded-2xl bg-white/10 text-cyan-300"><Target className="size-5" /></span>
              <h3 className="mt-6 text-xl font-semibold tracking-tight">Funil visual de oportunidades</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">Veja valor, etapa e próxima ação de cada negociação e arraste cards conforme a venda avança.</p>
              <div className="mt-6 flex gap-2">{['Novo', 'Proposta', 'Fechado'].map((s, i) => <span key={s} className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-slate-200 transition group-hover:bg-white/15" style={{ transitionDelay: `${i * 70}ms` }}>{s}</span>)}</div>
            </article></Reveal>
            {[
              { icon: Users, t: 'Contatos com contexto', c: 'Origem, preferências e histórico sempre à mão.' },
              { icon: CalendarDays, t: 'Agenda conectada', c: 'Horários, profissionais e compromissos dos clientes.' },
              { icon: Sparkles, t: 'Assistente de IA', c: 'Apoio para dúvidas frequentes e tarefas repetitivas.' },
              { icon: ShieldCheck, t: 'Dados protegidos', c: 'Acesso por equipe e dados separados por empresa.' }
            ].map(({ icon: Icon, t, c }, i) => (
              <Reveal key={t} delay={i * 70} className="lg:col-span-3"><article className="group flex h-full items-start gap-4 rounded-[28px] bg-white p-6 ring-1 ring-slate-200/80 transition duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/5">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-slate-50 text-slate-700 transition group-hover:bg-blue-600 group-hover:text-white"><Icon className="size-5" /></span>
                <div><h3 className="font-semibold tracking-tight">{t}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{c}</p></div>
              </article></Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="relative overflow-hidden bg-slate-950 px-5 py-24 text-white sm:px-8 sm:py-32">
        <div className="pointer-events-none absolute -top-40 right-0 size-[520px] rounded-full bg-blue-600/25 blur-[130px]" />
        <div className="relative mx-auto grid max-w-7xl gap-16 lg:grid-cols-[.8fr_1.2fr]">
          <Reveal>
            <span className="text-[11px] font-bold tracking-[.22em] text-cyan-300 uppercase">Como funciona</span>
            <h2 className="mt-4 max-w-md text-3xl font-semibold tracking-[-.035em] sm:text-[42px] sm:leading-[1.1]">Do primeiro oi a uma visão clara do negócio.</h2>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-400">Sem planilhas espalhadas e sem conversa perdida: três passos simples para organizar o atendimento.</p>
            <Link to="/cadastro" className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">Quero experimentar <ArrowRight className="size-4" /></Link>
          </Reveal>
          <div className="relative grid gap-4">
            <div className="absolute top-6 bottom-6 left-[27px] hidden w-px bg-gradient-to-b from-blue-500/60 via-cyan-400/30 to-transparent sm:block" />
            {[['01', 'Centralize', 'Reúna contatos e organize as conversas por canal e responsável.'], ['02', 'Acompanhe', 'Registre origem, interesse e o próximo passo de cada oportunidade.'], ['03', 'Melhore', 'Use o funil e os indicadores para priorizar retornos e entender resultados.']].map(([n, t, c], i) => (
              <Reveal key={n} delay={i * 110}><div className="relative flex gap-5 rounded-3xl bg-white/[.04] p-6 ring-1 ring-white/10 transition duration-500 hover:bg-white/[.07]">
                <span className="relative z-10 grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 text-sm font-bold text-white shadow-lg shadow-blue-600/30">{n}</span>
                <div><h3 className="text-lg font-semibold">{t}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{c}</p></div>
              </div></Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <SectionTitle eyebrow="Planos" title="Comece no seu ritmo." copy="Teste todas as funcionalidades por 7 dias, sem cartão de crédito." />
          <div className="mt-16 grid items-stretch gap-5 lg:grid-cols-3">
            {plans.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 90}><article className={`relative flex h-full flex-col rounded-[28px] p-8 transition duration-500 hover:-translate-y-1 ${plan.recommended ? 'bg-slate-950 text-white shadow-2xl shadow-blue-900/25' : 'bg-white ring-1 ring-slate-200/80 hover:shadow-xl hover:shadow-blue-900/5'}`}>
                {plan.recommended && <span className="absolute -top-3 left-8 rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 px-3 py-1 text-[10px] font-bold tracking-wide text-white uppercase">Mais escolhido</span>}
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className={`mt-2 min-h-12 text-sm leading-6 ${plan.recommended ? 'text-slate-400' : 'text-slate-600'}`}>{plan.summary}</p>
                <p className="mt-6 flex items-baseline gap-1"><span className="text-5xl font-semibold tracking-tight">R$ {plan.price}</span><span className={`text-sm ${plan.recommended ? 'text-slate-400' : 'text-slate-500'}`}>/mês</span></p>
                <p className={`mt-1 text-xs ${plan.recommended ? 'text-slate-500' : 'text-slate-500'}`}>após os 7 dias de teste</p>
                <Link to={`/cadastro?plano=${plan.name.toLowerCase()}`} className={`mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition ${plan.recommended ? 'bg-white text-slate-950 hover:bg-cyan-300' : 'bg-slate-950 text-white hover:bg-blue-700'}`}>Testar por 7 dias <ArrowRight className="size-4" /></Link>
                <ul className={`mt-8 flex flex-col gap-3 border-t pt-7 ${plan.recommended ? 'border-white/10' : 'border-slate-100'}`}>
                  {plan.features.map((f) => <li key={f} className={`flex items-start gap-2.5 text-sm ${plan.recommended ? 'text-slate-200' : 'text-slate-700'}`}><Check className={`mt-0.5 size-4 shrink-0 ${plan.recommended ? 'text-cyan-300' : 'text-emerald-600'}`} />{f}</li>)}
                </ul>
              </article></Reveal>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">Valores e limites iniciais. Condições finais podem ser ajustadas antes da cobrança.</p>
        </div>
      </section>

      {/* DUAS FORMAS DE USAR / DOWNLOAD */}
      <section id="baixar" className="px-5 pb-24 sm:px-8 sm:pb-32">
        <div className="mx-auto max-w-7xl">
          <SectionTitle eyebrow="Duas formas de usar" title="No navegador ou no seu computador." copy="Mesma conta, mesmos dados. Escolha o que combina com a rotina da sua equipe." />
          <div className="mt-14 grid gap-5 md:grid-cols-2">
            <Reveal><article className="flex h-full flex-col justify-between rounded-[28px] bg-white p-8 ring-1 ring-slate-200/80 sm:p-10">
              <div>
                <span className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Globe className="size-6" /></span>
                <h3 className="mt-6 text-2xl font-semibold tracking-tight">Versão online</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Crie sua conta e comece agora, de qualquer lugar. Nada para instalar, sempre atualizado.</p>
              </div>
              <Link to="/cadastro" className="mt-8 inline-flex h-12 w-fit items-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-blue-700">Criar conta grátis <ArrowRight className="size-4" /></Link>
            </article></Reveal>
            <Reveal delay={100}><article className="relative flex h-full flex-col justify-between overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-8 text-white sm:p-10">
              <div className="pointer-events-none absolute -top-16 -right-16 size-64 rounded-full bg-white/15 blur-3xl" />
              <div className="relative">
                <span className="grid size-12 place-items-center rounded-2xl bg-white/15"><Monitor className="size-6" /></span>
                <h3 className="mt-6 text-2xl font-semibold tracking-tight">Aplicativo para Windows</h3>
                <p className="mt-2 text-sm leading-6 text-blue-50/90">Instale no computador, receba notificações e mantenha o atendimento sempre à mão. Entre com a mesma conta da versão online.</p>
              </div>
              <div className="relative mt-8">
                {downloadUrl
                  ? <a href={downloadUrl} className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-blue-800 transition hover:bg-cyan-100"><ArrowDownToLine className="size-4" /> Baixar para Windows</a>
                  : <span className="inline-flex h-12 items-center gap-2 rounded-full bg-white/15 px-6 text-sm font-semibold ring-1 ring-white/30"><ArrowDownToLine className="size-4" /> Download disponível em breve</span>}
                <p className="mt-3 text-xs text-blue-100/80">Windows 10 ou superior · versão 0.6.0</p>
              </div>
            </article></Reveal>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="duvidas" className="px-5 pb-28 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <SectionTitle eyebrow="Perguntas frequentes" title="Ficou com alguma dúvida?" />
          <Reveal className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
            {faqs.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-[15px] font-semibold text-slate-900">{q}<ChevronDown className="size-4 shrink-0 text-slate-400 transition duration-300 group-open:rotate-180" /></summary>
                <p className="mt-3 max-w-2xl pr-8 text-sm leading-7 text-slate-600">{a}</p>
              </details>
            ))}
          </Reveal>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="px-5 pb-24 sm:px-8">
        <Reveal><div className="relative mx-auto max-w-7xl overflow-hidden rounded-[36px] bg-slate-950 px-6 py-16 text-center text-white sm:py-20">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[640px] -translate-x-1/2 rounded-full bg-blue-600/40 blur-[110px]" />
          <h2 className="relative mx-auto max-w-2xl text-3xl font-semibold tracking-[-.035em] sm:text-5xl sm:leading-[1.08]">Pronto para não perder mais nenhuma venda?</h2>
          <p className="relative mx-auto mt-4 max-w-md text-slate-400">7 dias para conhecer tudo. Sem cartão de crédito.</p>
          <Link to="/cadastro" className="relative mt-8 inline-flex h-14 items-center gap-2 rounded-full bg-white px-8 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">Começar agora <ArrowRight className="size-4" /></Link>
        </div></Reveal>
      </section>

      <footer className="border-t border-slate-200/80 bg-white px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <img src={logo} alt="IC Chat de ItaCondo" className="h-10 w-auto" />
            <p className="mt-3 max-w-xs text-xs leading-5 text-slate-500">Atendimento que conecta. Relacionamento que vende.</p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-[13px] text-slate-600">
            <Link to="/login" className="hover:text-blue-700">Entrar</Link>
            <Link to="/cadastro" className="hover:text-blue-700">Teste grátis</Link>
            <a href="#planos" className="hover:text-blue-700">Planos</a>
            <Link to="/privacidade" className="hover:text-blue-700">Política de Privacidade</Link>
            <Link to="/termos" className="hover:text-blue-700">Termos de Uso</Link>
            <button onClick={openCookiePreferences} className="hover:text-blue-700">Preferências de cookies</button>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-7xl text-xs text-slate-400">© 2026 ItaCondo. Todos os direitos reservados.</p>
      </footer>
    </main>
  )
}
