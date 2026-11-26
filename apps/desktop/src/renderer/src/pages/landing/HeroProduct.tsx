import { CalendarDays, Check, MessageSquare, Search, Sparkles, Target, Users } from 'lucide-react'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { InstagramIcon, WhatsAppIcon } from '@/components/brand'

const script = [
  { from: 'them', text: 'Oi! Vi vocês no Instagram. Como funciona o plano Pro?' },
  { from: 'me', text: 'Olá, Larissa! Já te explico. Quantas pessoas atendem por aí?' },
  { from: 'them', text: 'Somos 4. Dá pra ver tudo num lugar só?' },
  { from: 'me', text: 'Dá sim — e cada conversa vira uma oportunidade no funil. ✨' }
] as const

const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Conversa que se escreve sozinha. É a única animação contínua da página e tem um motivo:
 * explicar o produto (conversa → oportunidade). Pausa fora da tela e com a aba em segundo plano.
 */
function useChatLoop(target: RefObject<HTMLElement | null>) {
  const [shown, setShown] = useState(1)
  const [typing, setTyping] = useState(false)

  useEffect(() => {
    const el = target.current
    if (!el || reduceMotion()) { setShown(script.length); return }
    let alive = true
    let visible = true
    let timer = 0
    let pending: (() => void) | null = null
    let n = 1

    const run = (fn: () => void) => {
      if (!alive) return
      if (!visible || document.hidden) { pending = fn; return }
      fn()
    }
    const later = (fn: () => void, ms: number) => { window.clearTimeout(timer); timer = window.setTimeout(() => run(fn), ms) }
    const step = () => {
      if (n >= script.length) { later(() => { n = 1; setShown(1); step() }, 5200); return }
      setTyping(true)
      later(() => { setTyping(false); n += 1; setShown(n); step() }, n === 1 ? 1300 : 1600)
    }
    const resume = () => {
      if (pending && visible && !document.hidden) { const fn = pending; pending = null; fn() }
    }

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; resume() }, { threshold: 0.2 })
    io.observe(el)
    document.addEventListener('visibilitychange', resume)
    // Começa depois que a entrada do hero assentou
    later(step, 1500)
    return () => {
      alive = false
      window.clearTimeout(timer)
      io.disconnect()
      document.removeEventListener('visibilitychange', resume)
    }
  }, [target])

  return { shown, typing }
}

const inbox = [
  { i: 'LM', n: 'Larissa Martins', m: 'Como funciona o plano Pro?', t: 'agora', c: 'bg-rose-100 text-rose-700', ch: 'ig', unread: 1 },
  { i: 'RC', n: 'Rafael Costa', m: 'Pode me mandar os valores?', t: '2 min', c: 'bg-amber-100 text-amber-700', ch: 'wa', unread: 2 },
  { i: 'BF', n: 'Bruna Freitas', m: 'Obrigada pelo retorno!', t: '14 min', c: 'bg-violet-100 text-violet-700', ch: 'wa', unread: 0 },
  { i: 'TA', n: 'Tiago Alves', m: 'Queria agendar para sexta', t: '32 min', c: 'bg-emerald-100 text-emerald-700', ch: 'wa', unread: 0 },
  { i: 'JS', n: 'Júlia Santos', m: 'Vocês atendem sábado?', t: '1 h', c: 'bg-sky-100 text-sky-700', ch: 'ig', unread: 0 }
] as const

function Channel({ ch, className = 'size-3' }: { ch: 'wa' | 'ig'; className?: string }) {
  return ch === 'wa' ? <WhatsAppIcon className={`${className} text-[#25d366]`} /> : <InstagramIcon className={`${className} text-[#e1306c]`} />
}

/** Composição do produto no hero: caixa de entrada, conversa ao vivo e o cartão da oportunidade. */
export function HeroProduct() {
  const root = useRef<HTMLDivElement>(null)
  const { shown, typing } = useChatLoop(root)
  const converted = shown >= script.length && !typing

  return (
    <div ref={root} className="relative" aria-label="Demonstração do IC Chat: uma conversa do Instagram vira oportunidade no funil" role="img">
      <div className="lp-window overflow-hidden" aria-hidden>
        {/* Barra da janela */}
        <div className="flex h-10 items-center gap-3 border-b border-[var(--lp-line)] px-4">
          <div className="flex gap-1.5"><i className="size-2.5 rounded-full bg-[#ff5f57]/80" /><i className="size-2.5 rounded-full bg-[#febc2e]/80" /><i className="size-2.5 rounded-full bg-[#28c840]/80" /></div>
          <div className="mx-auto flex h-6 w-full max-w-[280px] items-center justify-center gap-1.5 rounded-md bg-[var(--lp-paper)] text-[10.5px] text-[var(--lp-mute)]"><Search className="size-3" /> Buscar contato, conversa ou etiqueta</div>
          <div className="w-[42px]" />
        </div>

        <div className="grid h-[360px] grid-cols-1 sm:h-[420px] sm:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:h-[460px] lg:grid-cols-[52px_minmax(0,0.95fr)_minmax(0,1.4fr)_minmax(0,0.85fr)]">
          {/* Trilho de navegação */}
          <nav className="hidden flex-col items-center gap-2 border-r border-[var(--lp-line)] bg-[var(--lp-paper)]/60 py-4 lg:flex">
            {[MessageSquare, Target, Users, CalendarDays, Sparkles].map((I, k) => (
              <span key={k} className={`grid size-8 place-items-center rounded-lg ${k === 0 ? 'bg-white text-[var(--lp-blue)] shadow-[0_0_0_1px_var(--lp-line)]' : 'text-[var(--lp-mute)]'}`}><I className="size-4" /></span>
            ))}
          </nav>

          {/* Caixa de entrada */}
          <div className="hidden min-w-0 flex-col border-r border-[var(--lp-line)] sm:flex">
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
              <b className="text-[13px] font-semibold tracking-tight">Atendimento</b>
              <span className="lp-num rounded-full bg-[var(--lp-blue)] px-2 py-0.5 text-[10px] font-semibold text-white">12 novas</span>
            </div>
            <div className="flex gap-1 px-3 pb-2 text-[10.5px] font-medium">
              {['Todas', 'Minhas', 'Sem resposta'].map((t, k) => <span key={t} className={`rounded-md px-2 py-1 ${k === 0 ? 'bg-[var(--lp-ink)] text-white' : 'text-[var(--lp-mute)]'}`}>{t}</span>)}
            </div>
            <ul className="flex flex-col gap-0.5 px-2">
              {inbox.map((r, k) => (
                <li key={r.n} className={`flex items-center gap-2.5 rounded-xl px-2 py-2 ${k === 0 ? 'bg-[#eef3ff]' : ''}`}>
                  <span className={`relative grid size-8 shrink-0 place-items-center rounded-full text-[10px] font-bold ${r.c}`}>
                    {r.i}
                    <span className="absolute -right-0.5 -bottom-0.5 grid size-3.5 place-items-center rounded-full bg-white"><Channel ch={r.ch} className="size-2.5" /></span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2"><b className="truncate text-[11.5px] font-semibold">{r.n}</b><small className="lp-num shrink-0 text-[9.5px] text-[var(--lp-mute)]">{r.t}</small></div>
                    <p className="truncate text-[10.5px] text-[var(--lp-mute)]">{r.m}</p>
                  </div>
                  {r.unread > 0 && <span className="lp-num grid size-4 shrink-0 place-items-center rounded-full bg-[var(--lp-live)] text-[9px] font-bold text-white">{r.unread}</span>}
                </li>
              ))}
            </ul>
          </div>

          {/* Conversa */}
          <div className="lp-chat-bg flex min-w-0 flex-col">
            <div className="flex items-center gap-2.5 border-b border-[var(--lp-line)] bg-white px-4 py-2.5">
              <span className="grid size-8 place-items-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-700">LM</span>
              <div className="min-w-0"><b className="block truncate text-[12px] font-semibold">Larissa Martins</b><span className="inline-flex items-center gap-1 text-[10px] text-[var(--lp-mute)]"><Channel ch="ig" /> Instagram · atendida por você</span></div>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[9.5px] font-semibold text-emerald-700"><i className="size-1.5 rounded-full bg-emerald-500" />Em atendimento</span>
            </div>
            <div className="flex flex-1 flex-col justify-end gap-2 overflow-hidden p-4">
              {script.slice(0, shown).map((m, i) => (
                <div key={i} data-from={m.from} className={`lp-bubble max-w-[84%] rounded-2xl px-3 py-2 text-[12px] leading-[1.45] ${m.from === 'me' ? 'self-end rounded-br-md bg-[var(--lp-ink)] text-white' : 'self-start rounded-bl-md bg-white text-[var(--lp-ink-2)] shadow-[0_0_0_1px_var(--lp-line)]'}`}>{m.text}</div>
              ))}
              {typing && shown < script.length && (
                <div className={`lp-bubble flex gap-1 rounded-2xl bg-white px-3 py-2.5 shadow-[0_0_0_1px_var(--lp-line)] ${script[shown].from === 'me' ? 'self-end' : 'self-start'}`} data-from={script[shown].from}>
                  {[0, 1, 2].map((d) => <i key={d} className="lp-dot size-1.5 rounded-full bg-slate-400" style={{ animationDelay: `${d * 140}ms` }} />)}
                </div>
              )}
            </div>
            <div className="mx-3 mb-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[11px] text-[var(--lp-mute)] shadow-[0_0_0_1px_var(--lp-line)]">
              <Sparkles className="size-3.5 text-[var(--lp-blue)]" /> Sugestão da IA pronta para enviar
              <span className="ml-auto rounded-md bg-[var(--lp-paper)] px-1.5 py-0.5 text-[9.5px] font-semibold text-[var(--lp-ink-2)]">Tab</span>
            </div>
          </div>

          {/* Oportunidade: muda de estado quando a conversa termina */}
          <aside className="lp-deal hidden min-w-0 flex-col gap-3 border-l border-[var(--lp-line)] p-4 lg:flex" data-on={converted}>
            <span className="lp-label text-[var(--lp-mute)]">Contato</span>
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-full bg-rose-100 text-[11px] font-bold text-rose-700">LM</span>
              <div className="min-w-0"><b className="block truncate text-[12px] font-semibold">Larissa Martins</b><span className="text-[10px] text-[var(--lp-mute)]">Origem: Instagram</span></div>
            </div>
            <div className="flex flex-wrap gap-1">
              {['Plano Pro', '4 pessoas'].map((t) => <span key={t} className="rounded-md bg-[var(--lp-paper)] px-1.5 py-0.5 text-[9.5px] font-medium text-[var(--lp-ink-2)]">{t}</span>)}
            </div>
            <div className="mt-1 h-px bg-[var(--lp-line)]" />
            <span className="lp-label text-[var(--lp-mute)]">Funil</span>
            <div className="flex flex-col gap-1.5 text-[10.5px]">
              {['Novo contato', 'Proposta', 'Fechado'].map((s, k) => (
                <div key={s} data-deal className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${k === (converted ? 1 : 0) ? 'bg-[var(--lp-ink)] font-semibold text-white' : 'text-[var(--lp-mute)]'}`}>
                  <span className={`size-1.5 rounded-full ${k === (converted ? 1 : 0) ? 'bg-[var(--lp-cyan)]' : 'bg-[var(--lp-line-strong)]'}`} />{s}
                </div>
              ))}
            </div>
            <div data-deal="appear" className="mt-auto rounded-xl bg-[var(--lp-paper)] p-3">
              <span className="text-[9.5px] text-[var(--lp-mute)]">Valor estimado</span>
              <b className="lp-num block text-[18px] font-semibold tracking-tight">R$ 4.800</b>
              <span className="inline-flex items-center gap-1 text-[9.5px] font-medium text-emerald-700"><Check className="size-3" /> Próximo passo: enviar proposta</span>
            </div>
          </aside>
        </div>
      </div>

      {/* Aviso que nasce da conversa (sincronizado com a última mensagem) */}
      <div className="lp-toast absolute -bottom-12 left-4 z-10 flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 shadow-[0_0_0_1px_var(--lp-line),0_18px_40px_-18px_rgb(12_14_19/.35)] sm:left-auto sm:right-6 lg:right-[calc(21%+12px)]" data-on={converted} aria-hidden>
        <span className="grid size-8 place-items-center rounded-xl bg-[#eef3ff] text-[var(--lp-blue)]"><Target className="size-4" /></span>
        <span><b className="lp-num block text-[12px] font-semibold">+ R$ 4.800 no funil</b><small className="text-[10.5px] text-[var(--lp-mute)]">Oportunidade criada agora</small></span>
      </div>
    </div>
  )
}
