import { ArrowRight, Check } from 'lucide-react'
import { Link } from 'react-router'
import logo from '@/assets/logo-transparent.png'
import { openCookiePreferences } from '@/lib/consent'
import { useSeo } from '@/lib/seo'
import { CTA_LABEL, KEYWORD_PAGES, pageByPath } from '@/seo/pages'

/** Página de conteúdo por palavra-chave (chatbot com IA, CRM para WhatsApp, automatizar atendimento). Texto vem de seo/pages.ts. */
export function SeoLanding({ path }: { path: string }) {
  const page = pageByPath(path)!
  useSeo({ title: page.title, description: page.description, path })
  const others = KEYWORD_PAGES.filter((p) => p.path !== path)

  return (
    <main className="fixed inset-0 overflow-x-hidden overflow-y-auto bg-[#fbfcff] text-slate-900 selection:bg-blue-200" style={{ colorScheme: 'light' }}>
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Link to="/" aria-label="IC Chat, início"><img src={logo} alt="IC Chat" className="h-9 w-auto" /></Link>
          <div className="flex items-center gap-2">
            <Link to="/login" className="px-3 py-2 text-[13px] font-semibold text-slate-700 hover:text-blue-700">Entrar</Link>
            <Link to="/cadastro" className="inline-flex h-10 items-center gap-2 rounded-full bg-slate-950 px-5 text-[13px] font-semibold text-white transition hover:bg-blue-700">{CTA_LABEL} <ArrowRight className="size-3.5" /></Link>
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 pt-14 pb-20">
        <nav aria-label="Você está em" className="text-xs text-slate-500">
          <Link to="/" className="hover:text-blue-700">IC Chat</Link> <span aria-hidden>›</span> <span>{page.crumb}</span>
        </nav>
        <h1 className="mt-4 text-4xl leading-[1.08] font-semibold tracking-[-.04em] text-slate-950 sm:text-5xl">{page.h1}</h1>
        <p className="mt-5 text-lg leading-8 text-slate-600">{page.lead}</p>
        <Link to="/cadastro" className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-slate-950 px-7 text-sm font-semibold text-white transition hover:bg-blue-700">{CTA_LABEL} <ArrowRight className="size-4" /></Link>
        <p className="mt-3 text-xs text-slate-500">Sem cartão de crédito. Planos a partir de R$ 79/mês depois do teste.</p>

        {page.sections.map((s) => (
          <section key={s.h2} className="mt-14">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{s.h2}</h2>
            {s.p && <p className="mt-3 leading-7 text-slate-600">{s.p}</p>}
            {s.items && (
              <ul className="mt-4 grid gap-3">
                {s.items.map((i) => <li key={i} className="flex items-start gap-3 rounded-2xl bg-white p-4 text-[15px] leading-6 text-slate-700 ring-1 ring-slate-200/80"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />{i}</li>)}
              </ul>
            )}
          </section>
        ))}

        {page.faq.length > 0 && (
          <section className="mt-14">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Perguntas frequentes</h2>
            <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
              {page.faq.map((f) => (
                <details key={f.q} className="group py-4">
                  <summary className="cursor-pointer list-none text-[15px] font-semibold text-slate-900">{f.q}</summary>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <section className="mt-14 rounded-3xl bg-slate-950 p-8 text-center text-white">
          <h2 className="text-2xl font-semibold tracking-tight">Pronto para atender melhor e vender mais?</h2>
          <p className="mt-2 text-slate-400">Teste o IC Chat por 7 dias, sem cartão de crédito.</p>
          <Link to="/cadastro" className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">Criar conta grátis <ArrowRight className="size-4" /></Link>
        </section>

        <nav aria-label="Veja também" className="mt-12">
          <p className="text-sm font-semibold text-slate-900">Veja também</p>
          <ul className="mt-3 grid gap-2 text-[15px]">
            {others.map((p) => <li key={p.path}><Link to={p.path} className="text-blue-700 hover:underline">{p.h1}</Link></li>)}
            <li><Link to="/" className="text-blue-700 hover:underline">Conheça o IC Chat: sistema de atendimento, CRM e chatbot com IA</Link></li>
          </ul>
        </nav>
      </article>

      <footer className="border-t border-slate-200/80 bg-white px-5 py-8 text-[13px] text-slate-600">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2">
          <span>© 2026 ItaCondo</span>
          <Link to="/privacidade" className="hover:text-blue-700">Política de Privacidade</Link>
          <Link to="/termos" className="hover:text-blue-700">Termos de Uso</Link>
          <button onClick={openCookiePreferences} className="hover:text-blue-700">Preferências de cookies</button>
        </div>
      </footer>
    </main>
  )
}
