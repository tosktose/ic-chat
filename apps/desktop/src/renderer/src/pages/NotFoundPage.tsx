import { ArrowLeft, Home } from 'lucide-react'
import { useRef, type MouseEvent } from 'react'
import { Link } from 'react-router'
import logo from '@/assets/logo-transparent.png'
import { useSeo } from '@/lib/seo'

function Robot() {
  return (
    <svg viewBox="0 0 220 240" className="lp-float w-52 sm:w-64" aria-hidden>
      <defs>
        <linearGradient id="nf-body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#dbe7ff" /></linearGradient>
        <linearGradient id="nf-brand" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#0036c8" /><stop offset=".6" stopColor="#0a57ec" /><stop offset="1" stopColor="#18c8f5" /></linearGradient>
      </defs>
      <ellipse cx="110" cy="228" rx="52" ry="7" fill="#0a4fe0" opacity=".12" />
      {/* antena */}
      <line x1="110" y1="30" x2="110" y2="10" stroke="#9db6e8" strokeWidth="4" strokeLinecap="round" />
      <circle cx="110" cy="8" r="7" fill="#18c8f5"><animate attributeName="opacity" values="1;.3;1" dur="1.6s" repeatCount="indefinite" /></circle>
      {/* cabeça */}
      <rect x="40" y="30" width="140" height="110" rx="38" fill="url(#nf-body)" stroke="#c7d6f3" strokeWidth="2" />
      <rect x="56" y="48" width="108" height="72" rx="26" fill="#0b1530" />
      {/* olhos */}
      <g>
        <ellipse cx="88" cy="82" rx="11" ry="13" fill="#4ee0ff"><animate attributeName="ry" values="13;13;1.5;13;13" keyTimes="0;.42;.47;.52;1" dur="4s" repeatCount="indefinite" /></ellipse>
        <ellipse cx="132" cy="82" rx="11" ry="13" fill="#4ee0ff"><animate attributeName="ry" values="13;13;1.5;13;13" keyTimes="0;.42;.47;.52;1" dur="4s" repeatCount="indefinite" /></ellipse>
      </g>
      <path d="M98 106 Q110 113 122 106" stroke="#4ee0ff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".7" />
      {/* corpo */}
      <rect x="62" y="146" width="96" height="68" rx="26" fill="url(#nf-brand)" />
      <text x="110" y="190" textAnchor="middle" fontSize="26" fontWeight="800" fill="#fff" fontFamily="Inter Variable, sans-serif">ic</text>
      {/* braços (o esquerdo acena) */}
      <rect x="30" y="156" width="22" height="46" rx="11" fill="#dbe7ff" stroke="#c7d6f3" strokeWidth="2" />
      <g style={{ transformOrigin: '176px 160px' }}>
        <rect x="168" y="150" width="22" height="46" rx="11" fill="#dbe7ff" stroke="#c7d6f3" strokeWidth="2" />
        <animateTransform attributeName="transform" type="rotate" values="0 176 160;-28 176 160;6 176 160;-28 176 160;0 176 160" dur="2.4s" repeatCount="indefinite" />
      </g>
    </svg>
  )
}

/** Página 404 do site. Marcada como noindex para o Google não indexar URLs inexistentes. */
export function NotFoundPage() {
  useSeo({ title: 'Página não encontrada — IC Chat', description: 'A página que você procura não existe ou foi movida.', noindex: true })
  const ref = useRef<HTMLDivElement>(null)
  const move = (e: MouseEvent) => {
    const el = ref.current
    if (!el) return
    const x = (e.clientX / window.innerWidth - 0.5) * 18
    const y = (e.clientY / window.innerHeight - 0.5) * 12
    el.style.transform = `translate(${x}px, ${y}px)`
  }
  return (
    <main onMouseMove={move} className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-[#fbfcff] text-slate-900" style={{ colorScheme: 'light' }}>
      <div className="pointer-events-none absolute inset-0">
        <div className="lp-drift absolute -top-24 -left-20 h-[420px] w-[420px] rounded-full bg-blue-300/30 blur-[110px]" />
        <div className="lp-drift absolute right-0 bottom-0 h-[380px] w-[380px] rounded-full bg-cyan-200/50 blur-[110px]" style={{ animationDelay: '-9s' }} />
        <div className="lp-grain absolute inset-0" />
      </div>
      <header className="relative mx-auto flex h-[72px] max-w-7xl items-center px-5 sm:px-8"><Link to="/" aria-label="IC Chat, início"><img src={logo} alt="IC Chat" className="h-9 w-auto" /></Link></header>
      <section className="relative mx-auto flex min-h-[calc(100%-72px)] max-w-3xl flex-col items-center justify-center px-5 pb-16 text-center">
        <div className="relative">
          <span aria-hidden className="absolute inset-x-0 -top-6 -z-10 select-none text-[170px] leading-none font-black tracking-tighter text-blue-600/[.07] sm:text-[240px]">404</span>
          <div ref={ref} className="transition-transform duration-300 ease-out"><Robot /></div>
          <div className="lp-pop absolute -top-2 -right-6 max-w-[170px] rounded-2xl rounded-bl-sm bg-white px-4 py-2.5 text-left text-xs font-medium text-slate-700 shadow-xl ring-1 ring-slate-100 sm:-right-24" style={{ animationDelay: '600ms' }}>Oi! Procurei por toda parte e não achei essa página. 🤖</div>
        </div>
        <h1 className="mt-8 text-3xl font-semibold tracking-[-.04em] sm:text-5xl">Essa conversa se perdeu no caminho.</h1>
        <p className="mt-4 max-w-md text-base leading-7 text-slate-600">O endereço pode ter mudado ou nunca ter existido. Vamos te levar de volta para onde as coisas acontecem.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to="/" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-7 text-sm font-semibold text-white transition hover:bg-blue-700"><Home className="size-4" /> Voltar ao início</Link>
          <Link to="/login" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:ring-blue-300"><ArrowLeft className="size-4" /> Entrar na minha conta</Link>
        </div>
      </section>
    </main>
  )
}
