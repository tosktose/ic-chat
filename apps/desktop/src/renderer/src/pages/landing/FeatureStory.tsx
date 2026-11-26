import { CalendarDays, Check, Lock, MessageSquare, ShieldCheck, Sparkles, Target, UserRound, Users, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { InstagramIcon, WhatsAppIcon } from '@/components/brand'

/* -------------------------------------------------------------------
   Cenas: pequenas telas do produto, desenhadas em HTML (nítidas, leves
   e sem imagem). Cada uma mostra a funcionalidade em vez de descrevê-la.
-------------------------------------------------------------------- */
const card = 'rounded-2xl bg-white shadow-[0_0_0_1px_var(--lp-line),0_12px_32px_-20px_rgb(12_14_19/.3)]'

function InboxScene() {
  const rows = [
    { i: 'RC', n: 'Rafael Costa', m: 'Pode me mandar os valores?', who: 'Ana', c: 'bg-amber-100 text-amber-700', wa: true },
    { i: 'BF', n: 'Bruna Freitas', m: 'Obrigada pelo retorno!', who: 'Você', c: 'bg-violet-100 text-violet-700', wa: true },
    { i: 'JS', n: 'Júlia Santos', m: 'Vocês atendem sábado?', who: 'Caio', c: 'bg-sky-100 text-sky-700', wa: false }
  ]
  return (
    <div className="flex w-full max-w-[420px] flex-col gap-3">
      <div className={`${card} p-2`}>
        {rows.map((r, k) => (
          <div key={r.n} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${k === 0 ? 'bg-[#eef3ff]' : ''}`}>
            <span className={`grid size-9 shrink-0 place-items-center rounded-full text-[11px] font-bold ${r.c}`}>{r.i}</span>
            <div className="min-w-0 flex-1">
              <b className="flex items-center gap-1.5 text-[13px] font-semibold">{r.n} {r.wa ? <WhatsAppIcon className="size-3 text-[#25d366]" /> : <InstagramIcon className="size-3 text-[#e1306c]" />}</b>
              <p className="truncate text-[12px] text-[var(--lp-mute)]">{r.m}</p>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--lp-paper)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--lp-ink-2)]">{r.who}</span>
          </div>
        ))}
      </div>
      <div className="ml-8 rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-[12px] leading-5 text-amber-900">
        <b className="mb-0.5 block text-[10.5px] font-semibold tracking-wide text-amber-700 uppercase">Nota interna · Ana</b>
        Cliente prefere retorno à tarde. Já enviei a tabela.
      </div>
      <div className={`${card} mr-10 flex items-center gap-2 px-3 py-2.5 text-[12px]`}>
        <span className="rounded-md bg-[var(--lp-ink)] px-1.5 py-0.5 font-mono text-[11px] text-white">/valores</span>
        <span className="truncate text-[var(--lp-mute)]">Resposta rápida: tabela de preços atualizada</span>
      </div>
    </div>
  )
}

function FunnelScene() {
  const cols = [
    { t: 'Novo', v: 'R$ 6.200', cards: [['Júlia Santos', 'R$ 1.400'], ['Tiago Alves', 'R$ 4.800']] },
    { t: 'Proposta', v: 'R$ 9.300', cards: [['Larissa Martins', 'R$ 4.800'], ['Rafael Costa', 'R$ 4.500']] },
    { t: 'Fechado', v: 'R$ 3.900', cards: [['Bruna Freitas', 'R$ 3.900']] }
  ]
  return (
    <div className="grid w-full max-w-[520px] grid-cols-3 gap-2.5">
      {cols.map((c, ci) => (
        <div key={c.t} className="flex flex-col gap-2 rounded-2xl bg-white/60 p-2 shadow-[0_0_0_1px_var(--lp-line)]">
          <div className="flex flex-wrap items-baseline justify-between gap-x-1 px-1.5 pt-1">
            <b className="text-[12px] font-semibold">{c.t}</b>
            <small className="lp-num text-[10.5px] text-[var(--lp-mute)]">{c.v}</small>
          </div>
          {c.cards.map(([n, v], k) => {
            const lifted = ci === 1 && k === 0
            return (
              <div key={n} className={`${card} p-2.5 ${lifted ? 'relative z-10 -translate-y-1 rotate-[-2deg] shadow-[0_0_0_1px_var(--lp-line-strong),0_24px_40px_-18px_rgb(10_79_224/.45)]' : ''}`}>
                <b className="block truncate text-[11.5px] font-semibold">{n}</b>
                <span className="lp-num text-[11px] text-[var(--lp-ink-2)]">{v}</span>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--lp-paper)]"><div className="h-full rounded-full bg-[var(--lp-blue)]" style={{ width: `${30 + ci * 35}%` }} /></div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function ContactScene() {
  return (
    <div className={`${card} w-full max-w-[400px] p-5`}>
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-full bg-emerald-100 text-[13px] font-bold text-emerald-700">TA</span>
        <div><b className="block text-[15px] font-semibold tracking-tight">Tiago Alves</b><span className="text-[12px] text-[var(--lp-mute)]">(11) 9 •••• 2041</span></div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {['Origem: WhatsApp', 'Cliente recorrente', 'Prefere sexta'].map((t) => <span key={t} className="rounded-md bg-[var(--lp-paper)] px-2 py-1 text-[11px] font-medium text-[var(--lp-ink-2)]">{t}</span>)}
      </div>
      <ol className="relative mt-5 flex flex-col gap-4 border-l border-[var(--lp-line-strong)] pl-5 text-[12.5px]">
        {[['Agendou horário para sexta', 'hoje'], ['Pediu os valores do pacote', 'ontem'], ['Primeiro contato pelo WhatsApp', 'há 3 semanas']].map(([t, d], k) => (
          <li key={t} className="relative">
            <span className={`absolute top-1 -left-[25px] size-2.5 rounded-full ring-4 ring-white ${k === 0 ? 'bg-[var(--lp-blue)]' : 'bg-[var(--lp-line-strong)]'}`} />
            <b className="block font-medium">{t}</b><small className="text-[11px] text-[var(--lp-mute)]">{d}</small>
          </li>
        ))}
      </ol>
    </div>
  )
}

function AgendaScene() {
  const slots: [string, string, string, 'busy' | 'free' | 'ai'][] = [
    ['09:00', 'Tiago Alves', 'com Ana', 'busy'],
    ['10:30', 'Horário livre', 'sugerido pela IA', 'ai'],
    ['13:00', 'Bruna Freitas', 'com Caio', 'busy'],
    ['15:30', 'Horário livre', '', 'free']
  ]
  return (
    <div className={`${card} w-full max-w-[400px] p-4`}>
      <div className="flex items-center justify-between px-1 pb-3">
        <b className="text-[14px] font-semibold tracking-tight">Sexta-feira</b>
        <span className="text-[11px] text-[var(--lp-mute)]">3 profissionais</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {slots.map(([h, t, s, kind]) => (
          <div key={h} className="flex items-stretch gap-3">
            <span className="lp-num w-11 shrink-0 pt-2.5 text-[11.5px] text-[var(--lp-mute)]">{h}</span>
            <div className={`flex-1 rounded-xl px-3 py-2.5 text-[12.5px] ${kind === 'busy' ? 'bg-[var(--lp-ink)] text-white' : kind === 'ai' ? 'bg-[#eef3ff] text-[var(--lp-blue)] shadow-[inset_0_0_0_1px_rgb(10_79_224/.25)]' : 'border border-dashed border-[var(--lp-line-strong)] text-[var(--lp-mute)]'}`}>
              <b className="flex items-center gap-1.5 font-semibold">{kind === 'ai' && <Sparkles className="size-3.5" />}{t}</b>
              {s && <small className={`text-[11px] ${kind === 'busy' ? 'text-white/60' : ''}`}>{s}</small>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AiScene() {
  return (
    <div className="lp-chat-bg flex w-full max-w-[420px] flex-col gap-2.5 rounded-2xl p-4 shadow-[0_0_0_1px_var(--lp-line)]">
      <div className="max-w-[80%] self-start rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-[13px] text-[var(--lp-ink-2)] shadow-[0_0_0_1px_var(--lp-line)]">Vocês atendem sábado? Quanto fica o corte?</div>
      <div className="max-w-[86%] self-end">
        <div className="rounded-2xl rounded-br-md bg-[var(--lp-ink)] px-3.5 py-2.5 text-[13px] leading-5 text-white">Atendemos sim, das 9h às 13h. O corte sai por R$ 60. Quer que eu reserve às 10h30?</div>
        <span className="mt-1.5 flex items-center justify-end gap-1 text-[10.5px] font-medium text-[var(--lp-blue)]"><Sparkles className="size-3" /> Respondido pela IA com os dados da sua empresa</span>
      </div>
      <div className="max-w-[80%] self-start rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-[13px] text-[var(--lp-ink-2)] shadow-[0_0_0_1px_var(--lp-line)]">Pode ser! Mas queria falar com alguém sobre um pacote.</div>
      <div className="mt-1 flex items-center gap-2 self-center rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-[var(--lp-ink-2)] shadow-[0_0_0_1px_var(--lp-line)]">
        <UserRound className="size-3.5" /> Conversa passada para Ana, da equipe
      </div>
    </div>
  )
}

function DataScene() {
  const rows: [string, boolean, boolean][] = [['Ver conversas da equipe', true, false], ['Editar o funil', true, true], ['Exportar contatos', true, false], ['Configurar a IA', true, false]]
  return (
    <div className={`${card} w-full max-w-[420px] p-5`}>
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-xl bg-[var(--lp-ink)] text-white"><Lock className="size-4" /></span>
        <div><b className="block text-[14px] font-semibold tracking-tight">Permissões da equipe</b><span className="text-[11.5px] text-[var(--lp-mute)]">Dados separados por empresa</span></div>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto_auto] items-center gap-x-5 gap-y-2.5 text-[12.5px]">
        <span />
        <span className="lp-label text-[var(--lp-mute)]">Gerente</span>
        <span className="lp-label text-[var(--lp-mute)]">Atendente</span>
        {rows.map(([t, a, b]) => (
          <div key={t} className="contents">
            <span className="text-[var(--lp-ink-2)]">{t}</span>
            {[a, b].map((on, k) => (
              <span key={k} className={`mx-auto grid size-5 place-items-center rounded-md ${on ? 'bg-[var(--lp-blue)] text-white' : 'shadow-[inset_0_0_0_1px_var(--lp-line-strong)]'}`}>{on && <Check className="size-3" />}</span>
            ))}
          </div>
        ))}
      </div>
      <p className="mt-5 flex items-center gap-1.5 border-t border-[var(--lp-line)] pt-3.5 text-[11.5px] text-[var(--lp-mute)]"><ShieldCheck className="size-3.5 text-emerald-600" /> Tratamento de dados conforme a LGPD</p>
    </div>
  )
}

type Feature = { k: string; icon: LucideIcon; t: string; c: string; scene: ReactNode }

const features: Feature[] = [
  { k: 'Caixa de entrada', icon: MessageSquare, t: 'Uma caixa de entrada para a equipe toda', c: 'Conversas do WhatsApp e do Instagram, histórico e responsável de cada contato num só lugar, com respostas rápidas e notas internas.', scene: <InboxScene /> },
  { k: 'Funil de vendas', icon: Target, t: 'Funil visual de oportunidades', c: 'Veja valor, etapa e próxima ação de cada negociação e arraste os cards conforme a venda avança.', scene: <FunnelScene /> },
  { k: 'Contatos', icon: Users, t: 'Contatos com contexto', c: 'Origem, preferências e histórico sempre à mão, para ninguém da equipe começar a conversa do zero.', scene: <ContactScene /> },
  { k: 'Agenda', icon: CalendarDays, t: 'Agenda conectada', c: 'Horários, profissionais e compromissos dos clientes no mesmo lugar em que a conversa acontece.', scene: <AgendaScene /> },
  { k: 'Assistente de IA', icon: Sparkles, t: 'Uma IA que conhece o seu negócio', c: 'Responde dúvidas frequentes a qualquer hora com seus serviços, preços e horários, e passa a conversa para a equipe quando o cliente pede.', scene: <AiScene /> },
  { k: 'Segurança', icon: ShieldCheck, t: 'Dados protegidos', c: 'Acesso por equipe, permissões por função e dados separados por empresa.', scene: <DataScene /> }
]

/**
 * Funcionalidades em "história": no desktop, a cena fixa à direita troca quando o texto
 * correspondente passa pelo centro da tela. No celular, cada texto traz a própria cena.
 */
export function FeatureStory() {
  const [active, setActive] = useState(0)
  const items = useRef<(HTMLLIElement | null)[]>([])

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index))
      },
      // Uma linha no meio da tela: quem a cruza vira a funcionalidade ativa
      { rootMargin: '-50% 0px -50% 0px', threshold: 0 }
    )
    items.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div className="grid grid-cols-1 gap-x-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <ol className="flex flex-col">
        {features.map((f, i) => (
          <li
            key={f.k}
            ref={(el) => { items.current[i] = el }}
            data-index={i}
            data-active={active === i}
            className="lp-story-item flex flex-col justify-center border-t border-[var(--lp-line)] py-10 lg:min-h-[62vh] lg:py-16"
          >
            <span className="lp-label flex items-center gap-3 text-[var(--lp-mute)]">
              <span className="grid size-7 place-items-center rounded-lg bg-white text-[var(--lp-ink)] shadow-[0_0_0_1px_var(--lp-line)]"><f.icon className="size-3.5" /></span>
              {f.k}
            </span>
            <h3 className="mt-5 max-w-md text-[28px] leading-[1.05] font-semibold tracking-[-0.035em] sm:text-[34px]">{f.t}</h3>
            <p className="mt-4 max-w-md text-[16px] leading-7 text-[var(--lp-ink-2)]">{f.c}</p>
            {/* No celular, a cena vem logo abaixo do texto */}
            <div className="mt-8 flex justify-center rounded-3xl bg-[var(--lp-paper-2)] px-4 py-8 lg:hidden" aria-hidden>{f.scene}</div>
          </li>
        ))}
      </ol>

      <div className="hidden lg:block" aria-hidden>
        <div className="sticky top-[14vh] h-[72vh] overflow-hidden rounded-[32px] bg-[var(--lp-paper-2)]">
          <div className="lp-gridlines absolute inset-0 opacity-70" style={{ maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, #000 20%, transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, #000 20%, transparent 80%)' }} />
          {features.map((f, i) => (
            <div key={f.k} data-active={active === i} className="lp-scene absolute inset-0 grid place-items-center p-10">{f.scene}</div>
          ))}
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-1.5">
            {features.map((f, i) => <span key={f.k} className={`h-1 w-5 rounded-full transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${active === i ? 'bg-[var(--lp-ink)]' : 'scale-x-[.3] bg-[var(--lp-line-strong)]'}`} />)}
          </div>
        </div>
      </div>
    </div>
  )
}
