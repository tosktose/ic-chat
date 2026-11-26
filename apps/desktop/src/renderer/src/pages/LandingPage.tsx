import { ArrowDownToLine, ArrowRight, BarChart3, BellRing, CalendarCheck, Check, Globe, HeartHandshake, Menu, Minus, Monitor, Plus, QrCode, ShieldCheck, X } from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router'
import logo from '@/assets/logo-transparent.png'
import { openCookiePreferences } from '@/lib/consent'
import { useSeo } from '@/lib/seo'
import { HOME_FAQ, KEYWORD_PAGES, pageByPath } from '@/seo/pages'
import { usePlans, usePublicSettings } from '@/lib/platform'
import { discountedPlanPrice } from '@/lib/billing'
import { NEW_FEATURES, PLAN_FIT } from '@/data/plan-fit'
import { HeroProduct } from './landing/HeroProduct'
import { FeatureStory } from './landing/FeatureStory'

const NEW_ICONS = { lembretes: BellRing, pix: QrCode, agendar: CalendarCheck, retorno: HeartHandshake, resumo: BarChart3 } as const

const faqs = HOME_FAQ.map((f) => [f.q, f.a] as const)

const navLinks = [['#funcionalidades', 'Funcionalidades'], ['#novidades', 'Novidades'], ['#como-funciona', 'Como funciona'], ['#planos', 'Planos'], ['#baixar', 'Aplicativo'], ['#duvidas', 'Dúvidas']] as const

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** "R$ 149,00" em partes, para desenhar o símbolo e os centavos menores que o valor. */
function priceParts(value: number) {
  const parts = brl.formatToParts(value)
  const pick = (types: string[]) => parts.filter((p) => types.includes(p.type)).map((p) => p.value).join('')
  return { cur: pick(['currency']), int: pick(['integer', 'group']), dec: pick(['decimal', 'fraction']) }
}

/** Entrada do hero (uma vez por visita). Os papéis definem distância e atraso: título lidera, o resto apoia. */
const enter = (delay: number, rise = 14, dur = 700, blur = 0): CSSProperties =>
  ({ '--lp-delay': `${delay}ms`, '--lp-rise': `${rise}px`, '--lp-dur': `${dur}ms`, '--lp-blur': `${blur}px` }) as CSSProperties

function SectionHead({ index, label, title, copy, tone = 'paper' }: { index: string; label: string; title: ReactNode; copy?: string; tone?: 'paper' | 'night' }) {
  const mute = tone === 'night' ? 'text-white/55' : 'text-[var(--lp-mute)]'
  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
      <div className="lg:col-span-8">
        <span className={`lp-label flex items-center gap-3 ${mute}`}>
          <span className={tone === 'night' ? 'text-white' : 'text-[var(--lp-ink)]'}>{index}</span>
          <span className={`h-px w-8 ${tone === 'night' ? 'bg-white/20' : 'bg-[var(--lp-line-strong)]'}`} />
          {label}
        </span>
        <h2 className="lp-h2 mt-6 max-w-[18ch]">{title}</h2>
      </div>
      {copy && <p className={`max-w-sm text-[16px] leading-7 lg:col-span-4 lg:justify-self-end ${tone === 'night' ? 'text-white/65' : 'text-[var(--lp-ink-2)]'}`}>{copy}</p>}
    </div>
  )
}

export function LandingPage() {
  const seo = pageByPath('/')!
  useSeo({ title: seo.title, description: seo.description, path: '/' })
  const plans = usePlans()
  const contact = usePublicSettings()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  return (
    // O app é "tela cheia" (body sem rolagem); a landing tem a própria área rolável.
    <main
      onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 12)}
      className="lp fixed inset-0 overflow-x-hidden overflow-y-auto"
      style={{ colorScheme: 'light' }}
    >
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
        <div data-scrolled={scrolled || menuOpen} className="lp-header-bar mx-auto data-[scrolled=true]:backdrop-blur-xl data-[scrolled=true]:backdrop-saturate-150 flex h-14 max-w-[1320px] items-center justify-between rounded-2xl pr-2 pl-3 sm:pl-4">
          <Link to="/" aria-label="IC Chat, início" className="shrink-0"><img src={logo} alt="IC Chat" className="h-8 w-auto sm:h-9" /></Link>
          <nav className="hidden items-center gap-8 text-[13px] font-medium text-[var(--lp-ink-2)] md:flex">
            {navLinks.map(([h, l]) => <a key={h} href={h} className="lp-link">{l}</a>)}
          </nav>
          <div className="hidden items-center gap-1 md:flex">
            <Link to="/login" className="lp-link rounded-lg px-3 py-2 text-[13px] font-semibold text-[var(--lp-ink-2)]">Entrar</Link>
            <Link to="/cadastro" className="lp-btn lp-btn-ink h-10 px-4 text-[13px]">Teste grátis <ArrowRight className="lp-arrow size-3.5" /></Link>
          </div>
          <button className="rounded-lg p-2 text-[var(--lp-ink)] md:hidden" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
        {menuOpen && (
          <nav className="mx-auto mt-2 grid max-w-[1320px] animate-fade-in gap-1 rounded-2xl bg-white p-3 text-[15px] shadow-[0_0_0_1px_var(--lp-line),0_24px_48px_-24px_rgb(12_14_19/.35)] md:hidden">
            {navLinks.map(([h, l]) => <a key={h} onClick={() => setMenuOpen(false)} href={h} className="rounded-lg px-3 py-2.5 font-medium">{l}</a>)}
            <Link to="/login" className="rounded-lg px-3 py-2.5 font-medium">Entrar</Link>
            <Link to="/cadastro" className="lp-btn lp-btn-ink mt-1 h-12 text-sm">Testar grátis por 7 dias</Link>
          </nav>
        )}
      </header>

      {/* HERO */}
      <section className="relative isolate -mt-[68px] overflow-hidden pt-[68px]">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div className="lp-glow absolute inset-0" />
          <div className="lp-gridlines absolute inset-x-0 top-0 h-[900px]" />
        </div>

        <div className="mx-auto max-w-[1320px] px-5 pt-14 sm:px-8 sm:pt-20 lg:pt-24">
          <div className="lp-enter inline-flex items-center gap-2.5 rounded-full bg-white/80 py-1.5 pr-4 pl-2 text-[12.5px] font-medium text-[var(--lp-ink-2)] shadow-[0_0_0_1px_var(--lp-line)] backdrop-blur" style={enter(0, 0, 500)}>
            <span className="grid size-5 place-items-center rounded-full bg-emerald-50"><span className="size-1.5 rounded-full bg-[var(--lp-live)]" /></span>
            Atendimento, contatos e vendas em um só lugar
          </div>

          <h1 className="lp-display lp-enter mt-8 max-w-[15ch] sm:max-w-[17ch]" style={enter(60, 22, 1000, 10)}>
            Automatize seu atendimento no WhatsApp com IA <span className="lp-serif text-[var(--lp-blue)]">e não perca nenhuma venda.</span>
          </h1>

          <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="lp-enter max-w-[46ch] text-[17px] leading-8 text-[var(--lp-ink-2)] sm:text-[18px]" style={enter(220, 12, 800)}>
                Organize contatos, acompanhe cada oportunidade e descubra quais canais realmente trazem clientes — com a leveza de um app que sua equipe quer usar.
              </p>
              <div className="lp-enter mt-8 flex flex-col gap-3 sm:flex-row" style={enter(300, 10, 800)}>
                <Link to="/cadastro" className="lp-btn lp-btn-ink h-14 px-7 text-[15px]">Experimentar grátis por 7 dias <ArrowRight className="lp-arrow size-4" /></Link>
                <a href="#baixar" className="lp-btn lp-btn-ghost h-14 px-7 text-[15px]"><ArrowDownToLine className="size-4" /> Baixar o app</a>
              </div>
            </div>
            <ul className="lp-enter flex flex-wrap gap-x-6 gap-y-2 text-[13px] font-medium text-[var(--lp-ink-2)] lg:col-span-5 lg:justify-self-end" style={enter(360, 0, 600)}>
              <li className="inline-flex items-center gap-1.5"><Check className="size-4 text-[var(--lp-live)]" /> Sem cartão no teste</li>
              <li className="inline-flex items-center gap-1.5"><ShieldCheck className="size-4 text-[var(--lp-blue)]" /> Em conformidade com a LGPD</li>
            </ul>
          </div>
        </div>

        <div className="lp-enter mx-auto mt-16 max-w-[1320px] px-3 pb-24 sm:mt-20 sm:px-8 sm:pb-32" style={enter(380, 48, 1100)}>
          <HeroProduct />
        </div>
      </section>

      {/* FATOS (substitui a faixa rolante: informação parada, lida de relance) */}
      <section aria-label="Destaques" className="border-y border-[var(--lp-line)]">
        <dl className="mx-auto grid max-w-[1320px] grid-cols-2 lg:grid-cols-4">
          {[
            ['7 dias', 'para testar tudo, sem cartão de crédito'],
            ['WhatsApp e Instagram', 'conversas e contatos em uma só caixa'],
            ['24 horas', 'a IA responde dúvidas frequentes a qualquer hora'],
            ['LGPD', 'dados separados por empresa e acesso por equipe']
          ].map(([t, d], i) => (
            <div key={t} className={`flex flex-col gap-1.5 px-5 py-8 sm:px-8 sm:py-10 ${i % 2 ? 'border-l border-[var(--lp-line)]' : ''} ${i === 2 ? 'border-t border-[var(--lp-line)] lg:border-t-0 lg:border-l' : ''} ${i === 3 ? 'border-t border-[var(--lp-line)] lg:border-t-0' : ''}`}>
              <dt className="text-[19px] font-semibold tracking-[-0.03em] sm:text-[24px]">{t}</dt>
              <dd className="max-w-[26ch] text-[13.5px] leading-6 text-[var(--lp-mute)]">{d}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* FUNCIONALIDADES */}
      <section id="funcionalidades" className="px-5 pt-24 pb-12 sm:px-8 sm:pt-36">
        <div className="mx-auto max-w-[1320px]">
          <SectionHead index="01" label="Funcionalidades" title={<>Sistema de atendimento, CRM e chatbot com IA <span className="lp-serif">em um só lugar.</span></>} copy="Atenda com contexto, transforme interesse em oportunidade e acompanhe o que está funcionando." />
          <div className="mt-16 sm:mt-24"><FeatureStory /></div>
        </div>
      </section>

      {/* NOVIDADES: menos faltas, mais retorno */}
      <section id="novidades" className="px-5 pt-12 pb-24 sm:px-8 sm:pb-36">
        <div className="mx-auto max-w-[1320px]">
          <SectionHead index="02" label="Novidades em todos os planos" title={<>Menos faltas, <span className="lp-serif">mais clientes voltando.</span></>} copy="Ferramentas que trabalham por você entre um atendimento e outro, sem depender de nenhum serviço pago à parte." />
          <ul className="mt-16 grid border-t border-[var(--lp-line)] sm:mt-20 sm:grid-cols-2 lg:grid-cols-5">
            {NEW_FEATURES.map((f, i) => {
              const Icon = NEW_ICONS[f.key]
              return (
                <li key={f.key} className={`flex flex-col gap-4 border-b border-[var(--lp-line)] py-8 sm:px-6 lg:border-b-0 lg:py-10 ${i % 2 ? 'sm:border-l' : ''} ${i > 0 ? 'lg:border-l' : ''} lg:first:pl-0`}>
                  <span className="grid size-10 place-items-center rounded-xl bg-white text-[var(--lp-ink)] shadow-[0_0_0_1px_var(--lp-line)]"><Icon className="size-[18px]" /></span>
                  <h3 className="text-[18px] leading-tight font-semibold tracking-[-0.02em]">{f.title}</h3>
                  <p className="text-[14px] leading-6 text-[var(--lp-ink-2)]">{f.copy}</p>
                </li>
              )
            })}
          </ul>
          <p className="mt-8 max-w-3xl rounded-2xl bg-[var(--lp-paper-2)] px-5 py-4 text-[14px] leading-6 text-[var(--lp-ink-2)]">
            <strong className="font-semibold text-[var(--lp-ink)]">Como o lembrete chega ao cliente:</strong> com o aplicativo para Windows e o seu WhatsApp conectado, os lembretes saem sozinhos. Na versão online, eles ficam numa lista e cada envio é um clique.
          </p>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="lp-night relative isolate overflow-hidden px-5 py-24 sm:px-8 sm:py-36">
        <div className="lp-night-glow pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <div className="mx-auto max-w-[1320px]">
          <SectionHead tone="night" index="03" label="Como funciona" title={<>Do primeiro oi a uma <span className="lp-serif text-[var(--lp-cyan)]">visão clara</span> do negócio.</>} copy="Sem planilhas espalhadas e sem conversa perdida: três passos simples para organizar o atendimento." />
          <ol className="mt-16 grid border-t border-[var(--lp-night-line)] sm:mt-24 md:grid-cols-3">
            {[['Centralize', 'Reúna contatos e organize as conversas por canal e responsável.'], ['Acompanhe', 'Registre origem, interesse e o próximo passo de cada oportunidade.'], ['Melhore', 'Use o funil e os indicadores para priorizar retornos e entender resultados.']].map(([t, c], i) => (
              <li key={t} className={`flex flex-col gap-4 border-[var(--lp-night-line)] py-10 md:min-h-[320px] md:px-8 md:py-12 ${i > 0 ? 'border-t md:border-t-0 md:border-l' : ''} md:first:pl-0`}>
                <span className="lp-serif text-[88px] leading-[0.8] text-white/90 sm:text-[112px]" aria-hidden>{i + 1}</span>
                <h3 className="mt-auto text-[24px] font-semibold tracking-[-0.03em]">{t}</h3>
                <p className="max-w-[32ch] text-[15px] leading-7 text-white/60">{c}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex md:justify-end">
            <Link to="/cadastro" className="lp-btn lp-btn-paper h-12 px-6 text-sm">Quero experimentar <ArrowRight className="lp-arrow size-4" /></Link>
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="px-5 py-24 sm:px-8 sm:py-36">
        <div className="mx-auto max-w-[1320px]">
          <SectionHead index="04" label="Planos" title={<>Comece no seu <span className="lp-serif">ritmo.</span></>} copy="Teste todas as funcionalidades por 7 dias, sem cartão de crédito. Veja os prós e contras de cada plano para escolher sem erro." />
          <div className="mt-16 grid items-stretch gap-3 sm:mt-20 lg:grid-cols-3">
            {plans.map((plan) => {
              const dark = plan.recommended
              const price = discountedPlanPrice(plan)
              const p = priceParts(price)
              return (
                <article key={plan.name} className={`relative flex h-full flex-col rounded-[28px] p-7 sm:p-9 ${dark ? 'lp-night shadow-[0_40px_80px_-40px_rgb(10_79_224/.55)]' : 'bg-[var(--lp-card)] shadow-[0_0_0_1px_var(--lp-line)]'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[20px] font-semibold tracking-[-0.02em]">{plan.name}</h3>
                    {dark && <span className="lp-label rounded-full bg-white/10 px-2.5 py-1 text-[10px] text-[var(--lp-cyan)]">Mais escolhido</span>}
                  </div>
                  <p className={`mt-2 min-h-12 text-[14px] leading-6 ${dark ? 'text-white/60' : 'text-[var(--lp-ink-2)]'}`}>{plan.summary}</p>
                  <div className="mt-8">
                    {price < plan.price && <span className={`lp-num text-sm line-through ${dark ? 'text-white/40' : 'text-[var(--lp-mute)]'}`}>{brl.format(plan.price)}</span>}
                    <p className="lp-num flex items-start leading-none">
                      <span className={`mt-2 mr-1.5 text-[16px] font-medium ${dark ? 'text-white/60' : 'text-[var(--lp-mute)]'}`}>{p.cur}</span>
                      <span className="text-[64px] font-semibold tracking-[-0.05em]">{p.int}</span>
                      <span className="mt-2 text-[20px] font-semibold tracking-tight">{p.dec}</span>
                      <span className={`mt-auto mb-2 ml-1.5 text-sm ${dark ? 'text-white/50' : 'text-[var(--lp-mute)]'}`}>/mês</span>
                    </p>
                    {price < plan.price && <p className={`mt-2 text-xs ${dark ? 'text-[var(--lp-cyan)]' : 'text-[var(--lp-blue)]'}`}>{plan.discount_label || 'Oferta especial'}{plan.discount_ends_at ? ` · até ${new Date(plan.discount_ends_at).toLocaleDateString('pt-BR')}` : ' · preço promocional permanente'}</p>}
                    <p className={`mt-2 text-xs ${dark ? 'text-white/45' : 'text-[var(--lp-mute)]'}`}>após os 7 dias de teste</p>
                  </div>
                  <Link to={`/cadastro?plano=${plan.id}`} className={`lp-btn mt-8 h-12 px-5 text-sm ${dark ? 'lp-btn-paper' : 'lp-btn-ink'}`}>Testar por 7 dias <ArrowRight className="lp-arrow size-4" /></Link>
                  <ul className={`mt-8 flex flex-col gap-3 border-t pt-7 ${dark ? 'border-white/10' : 'border-[var(--lp-line)]'}`}>
                    {plan.features.map((f) => <li key={f} className={`flex items-start gap-2.5 text-[14px] ${dark ? 'text-white/80' : 'text-[var(--lp-ink-2)]'}`}><Check className={`mt-0.5 size-4 shrink-0 ${dark ? 'text-[var(--lp-cyan)]' : 'text-[var(--lp-live)]'}`} />{f}</li>)}
                  </ul>
                  {PLAN_FIT[plan.id] && (
                    <div data-testid={`plan-fit-${plan.id}`} className={`mt-7 rounded-2xl p-5 text-[13px] leading-5 ${dark ? 'bg-white/[.06] shadow-[inset_0_0_0_1px_rgb(255_255_255/.08)]' : 'bg-[var(--lp-paper)] shadow-[inset_0_0_0_1px_var(--lp-line)]'}`}>
                      <p className="font-semibold">Para quem é</p>
                      <p className={`mt-1 ${dark ? 'text-white/65' : 'text-[var(--lp-ink-2)]'}`}>{PLAN_FIT[plan.id].ideal}</p>
                      <p className={`lp-label mt-4 ${dark ? 'text-[var(--lp-cyan)]' : 'text-[var(--lp-live)]'}`}>Prós</p>
                      <ul className="mt-2 flex flex-col gap-1.5">{PLAN_FIT[plan.id].pros.map((p) => <li key={p} className={`flex gap-2 ${dark ? 'text-white/80' : 'text-[var(--lp-ink-2)]'}`}><Check className="mt-0.5 size-3.5 shrink-0" />{p}</li>)}</ul>
                      <p className={`lp-label mt-4 ${dark ? 'text-amber-300' : 'text-amber-700'}`}>Contras</p>
                      <ul className="mt-2 flex flex-col gap-1.5">{PLAN_FIT[plan.id].cons.map((c) => <li key={c} className={`flex gap-2 ${dark ? 'text-white/65' : 'text-[var(--lp-mute)]'}`}><Minus className="mt-0.5 size-3.5 shrink-0" />{c}</li>)}</ul>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
          <p className="mt-6 text-xs text-[var(--lp-mute)]">Valores e limites iniciais. Condições finais podem ser ajustadas antes da cobrança.</p>
        </div>
      </section>

      {/* DUAS FORMAS DE USAR / DOWNLOAD */}
      <section id="baixar" className="px-5 pb-24 sm:px-8 sm:pb-36">
        <div className="mx-auto max-w-[1320px]">
          <SectionHead index="05" label="Duas formas de usar" title={<>No navegador ou no seu <span className="lp-serif">computador.</span></>} copy="Mesma conta, mesmos dados. Escolha o que combina com a rotina da sua equipe." />
          <div className="mt-16 grid gap-3 sm:mt-20 md:grid-cols-2">
            <article className="flex min-h-[340px] flex-col justify-between rounded-[28px] bg-[var(--lp-card)] p-8 shadow-[0_0_0_1px_var(--lp-line)] sm:p-10">
              <div>
                <span className="grid size-12 place-items-center rounded-2xl bg-[#eef3ff] text-[var(--lp-blue)]"><Globe className="size-6" /></span>
                <h3 className="mt-8 text-[28px] font-semibold tracking-[-0.035em]">Versão online</h3>
                <p className="mt-2 max-w-sm text-[15px] leading-7 text-[var(--lp-ink-2)]">Crie sua conta e comece agora, de qualquer lugar. Nada para instalar, sempre atualizado.</p>
              </div>
              <Link to="/cadastro" className="lp-btn lp-btn-ink mt-10 h-12 w-fit px-6 text-sm">Criar conta grátis <ArrowRight className="lp-arrow size-4" /></Link>
            </article>
            <article className="lp-night relative isolate flex min-h-[340px] flex-col justify-between overflow-hidden rounded-[28px] p-8 sm:p-10">
              <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_70%_at_100%_0%,rgb(10_79_224/.45),transparent_70%)]" aria-hidden />
              <div>
                <span className="grid size-12 place-items-center rounded-2xl bg-white/10 text-white"><Monitor className="size-6" /></span>
                <h3 className="mt-8 text-[28px] font-semibold tracking-[-0.035em]">Aplicativo para Windows</h3>
                <p className="mt-2 max-w-sm text-[15px] leading-7 text-white/65">Instale no computador, receba notificações e mantenha o atendimento sempre à mão. Entre com a mesma conta da versão online.</p>
              </div>
              <div className="mt-10">
                <Link to="/download" className="lp-btn lp-btn-paper h-12 px-6 text-sm"><ArrowDownToLine className="size-4" /> Entrar para baixar</Link>
                <p className="lp-num mt-3 text-xs text-white/45">Windows 10 ou superior · versão 0.6.3</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="duvidas" className="border-t border-[var(--lp-line)] px-5 py-24 sm:px-8 sm:py-36">
        <div className="mx-auto grid max-w-[1320px] gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <span className="lp-label flex items-center gap-3 text-[var(--lp-mute)]"><span className="text-[var(--lp-ink)]">06</span><span className="h-px w-8 bg-[var(--lp-line-strong)]" />Perguntas frequentes</span>
            <h2 className="lp-h2 mt-6">Ficou com alguma <span className="lp-serif">dúvida?</span></h2>
            {contact.support_email && <p className="mt-6 text-[15px] leading-7 text-[var(--lp-ink-2)]">Fale com a gente em <a href={`mailto:${contact.support_email}`} className="lp-link font-medium text-[var(--lp-ink)] underline decoration-[var(--lp-line-strong)] underline-offset-4">{contact.support_email}</a></p>}
          </div>
          <div className="border-b border-[var(--lp-line)] lg:col-span-7">
            {faqs.map(([q, a]) => (
              <details key={q} className="lp-faq group border-t border-[var(--lp-line)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-left text-[17px] font-semibold tracking-[-0.015em]">
                  {q}
                  <span className="grid size-8 shrink-0 place-items-center rounded-full shadow-[inset_0_0_0_1px_var(--lp-line-strong)]"><Plus className="lp-plus size-4" /></span>
                </summary>
                <p className="lp-answer -mt-1 max-w-[60ch] pr-12 pb-7 text-[15px] leading-7 text-[var(--lp-ink-2)]">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="px-3 pb-3 sm:px-5 sm:pb-5">
        <div className="lp-night relative isolate mx-auto max-w-[1360px] overflow-hidden rounded-[32px] px-6 py-20 sm:rounded-[40px] sm:px-12 sm:py-32">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_60%_at_50%_0%,rgb(10_79_224/.4),transparent_75%)]" aria-hidden />
          <div className="lp-gridlines pointer-events-none absolute inset-0 -z-10 opacity-40 invert" aria-hidden />
          <div className="mx-auto max-w-[1100px] text-center">
            <h2 className="lp-display mx-auto max-w-[14ch]" style={{ fontSize: 'clamp(2.5rem, 1.2rem + 5vw, 5.5rem)' }}>Pronto para não perder mais <span className="lp-serif text-[var(--lp-cyan)]">nenhuma venda?</span></h2>
            <p className="mx-auto mt-6 max-w-md text-[17px] text-white/60">7 dias para conhecer tudo. Sem cartão de crédito.</p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/cadastro" className="lp-btn lp-btn-paper h-14 px-8 text-[15px]">Começar agora <ArrowRight className="lp-arrow size-4" /></Link>
              <a href="#planos" className="lp-btn lp-link h-14 px-6 text-[15px] text-white/75">Ver planos</a>
            </div>
          </div>
        </div>
      </section>

      <footer className="px-5 pt-16 pb-10 sm:px-8">
        <div className="mx-auto grid max-w-[1320px] gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <img src={logo} alt="IC Chat de ItaCondo" className="h-10 w-auto" />
            <p className="mt-4 max-w-sm text-[14px] leading-6 text-[var(--lp-ink-2)]">Atendimento que conecta. <span className="lp-serif text-[17px]">Relacionamento que vende.</span></p>
          </div>
          <nav aria-label="Rodapé" className="grid grid-cols-2 gap-8 text-[14px] sm:grid-cols-3 md:col-span-7">
            <div className="flex flex-col gap-3">
              <span className="lp-label text-[var(--lp-mute)]">Produto</span>
              {KEYWORD_PAGES.map((p) => <Link key={p.path} to={p.path} className="lp-link text-[var(--lp-ink-2)]">{p.crumb}</Link>)}
              <a href="#planos" className="lp-link text-[var(--lp-ink-2)]">Planos</a>
            </div>
            <div className="flex flex-col gap-3">
              <span className="lp-label text-[var(--lp-mute)]">Conta</span>
              <Link to="/login" className="lp-link text-[var(--lp-ink-2)]">Entrar</Link>
              <Link to="/cadastro" className="lp-link text-[var(--lp-ink-2)]">Teste grátis</Link>
            </div>
            <div className="flex flex-col items-start gap-3">
              <span className="lp-label text-[var(--lp-mute)]">Legal</span>
              <Link to="/privacidade" className="lp-link text-[var(--lp-ink-2)]">Política de Privacidade</Link>
              <Link to="/termos" className="lp-link text-[var(--lp-ink-2)]">Termos de Uso</Link>
              <button onClick={openCookiePreferences} className="lp-link text-left text-[var(--lp-ink-2)]">Preferências de cookies</button>
            </div>
          </nav>
        </div>
        <p className="mx-auto mt-16 max-w-[1320px] border-t border-[var(--lp-line)] pt-6 text-xs text-[var(--lp-mute)]"><span style={{ fontFamily: 'Inter Variable, sans-serif' }}>©</span> 2026 ItaCondo. Todos os direitos reservados.{contact.support_email && <> · <a href={`mailto:${contact.support_email}`} className="lp-link">{contact.support_email}</a></>}</p>
      </footer>
    </main>
  )
}
