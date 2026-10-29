import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAppState } from '@/lib/app-state'
import { isWebApp } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface Step {
  path: string
  title: string
  what: string
  why: string
  how: string
}

/** Passo a passo do cliente: o que é cada tela, por que ela existe e como começar. */
const STEPS: Step[] = [
  { path: '/dashboard', title: 'Painel', what: 'O resumo do dia: conversas abertas, agendamentos e o que precisa da sua atenção.', why: 'Para você abrir o sistema e saber na hora onde agir, sem procurar em cada tela.', how: 'Comece por aqui toda manhã. Clique nos números para ir direto ao assunto.' },
  { path: '/canais', title: 'Canais', what: 'Onde você conecta o WhatsApp da empresa.', why: 'Sem o número conectado não há conversa para atender nem para a IA responder.', how: 'Abra a tela, escolha WhatsApp e siga as instruções na tela para conectar o número.' },
  { path: '/inbox', title: 'Atendimento', what: 'Todas as conversas dos clientes em uma caixa de entrada única, para a equipe inteira.', why: 'Evita perder cliente: ninguém responde duas vezes e você vê quem está esperando.', how: 'Escolha uma conversa, responda e use "Transferir" para passar a um colega. A IA pode assumir por você.' },
  { path: '/ia', title: 'Assistente IA', what: 'O chatbot que responde sozinho, conhece seus serviços e preços e sugere horários.', why: 'Atende 24 horas, inclusive à noite e nos fins de semana, e passa para uma pessoa quando precisa.', how: 'Preencha o que sua empresa vende e os horários. Acompanhe o saldo de créditos nesta mesma tela.' },
  { path: '/kanban', title: 'Funil de atendimento', what: 'Um quadro com as conversas em etapas: nova, IA atendendo, aguardando, precisa de humano, agendado e concluído.', why: 'Mostra de relance em que pé está cada cliente e o que está parado.', how: 'Arraste o cartão para mudar a etapa ou use "Novo cartão" para criar um atendimento na mão.' },
  { path: '/funil', title: 'Funil de vendas', what: 'Suas oportunidades de venda, do primeiro contato ao fechamento, com valores.', why: 'Para saber quanto você tem a receber e quais negócios estão esfriando.', how: 'Crie um negócio, vincule ao cliente e arraste conforme a negociação avança.' },
  { path: '/contatos', title: 'Contatos', what: 'A lista dos seus clientes com histórico, etiquetas e dados.', why: 'Seu cadastro de clientes fica organizado e reaproveitado pela IA e pela equipe.', how: 'Cadastre um contato ou importe uma planilha CSV (Excel ou Google Contatos).' },
  { path: '/agenda', title: 'Agenda', what: 'Os horários marcados, por profissional e serviço.', why: 'Evita conflito de horário e permite que a IA marque sozinha só nos horários livres.', how: 'Cadastre profissionais e serviços em Configurações e depois crie ou veja agendamentos aqui.' },
  { path: '/captacao', title: 'Captação', what: 'Campanhas e origens dos clientes novos.', why: 'Para descobrir de onde vêm os clientes e onde vale investir.', how: 'Crie uma campanha e use o link ou código dela nas suas divulgações.' },
  { path: '/relatorios', title: 'Relatórios', what: 'Números do atendimento por canal, atendente e período.', why: 'Para medir resultado e decidir com dados, não no achismo.', how: 'Escolha o período e exporte em Excel ou PDF para guardar ou mostrar à equipe.' },
  { path: '/equipe', title: 'Equipe', what: 'Os usuários da sua empresa e o que cada um pode ver.', why: 'Cada atendente entra com o próprio acesso e você controla as permissões.', how: 'Convide pelo e-mail e escolha o perfil: gerente ou analista.' },
  { path: '/config', title: 'Configurações', what: 'Dados da empresa, horários, serviços, assinatura e licença.', why: 'É aqui que o sistema aprende como sua empresa funciona e onde você cuida do plano.', how: 'Comece pelos dados da empresa, serviços e horários. Depois veja a aba de licença e assinatura.' }
]

const DONE_KEY = 'icchat.guide.done'
const read = () => { try { return localStorage.getItem(DONE_KEY) === '1' } catch { return false } }
const write = () => { try { localStorage.setItem(DONE_KEY, '1') } catch { /* sem armazenamento */ } }

function Robot({ small }: { small?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('shrink-0', small ? 'size-8' : 'size-14')} aria-hidden>
      <line x1="32" y1="6" x2="32" y2="13" stroke="#1d4ed8" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="5" r="3.5" fill="#34d399" />
      <rect x="10" y="13" width="44" height="34" rx="12" fill="#2563eb" />
      <rect x="15" y="19" width="34" height="22" rx="8" fill="#0f172a" />
      <circle cx="25" cy="30" r="4" fill="#67e8f9" />
      <circle cx="39" cy="30" r="4" fill="#67e8f9" />
      <path d="M26 36 q6 4 12 0" stroke="#67e8f9" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <rect x="20" y="47" width="24" height="10" rx="5" fill="#1d4ed8" />
      <rect x="5" y="25" width="5" height="12" rx="2.5" fill="#1d4ed8" />
      <rect x="54" y="25" width="5" height="12" rx="2.5" fill="#1d4ed8" />
    </svg>
  )
}

/**
 * Robozinho que ensina o sistema. No primeiro acesso oferece o tour; depois fica no canto como botão "Guia"
 * e mostra a explicação da tela em que o cliente está.
 */
export function GuideBot() {
  const { role } = useAppState()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [invite, setInvite] = useState(false)
  const [i, setI] = useState(0)

  const here = useMemo(() => STEPS.findIndex((s) => pathname.startsWith(s.path)), [pathname])

  useEffect(() => {
    if (!isWebApp || role !== 'gerente' || read()) return
    const t = setTimeout(() => setInvite(true), 6000)
    return () => clearTimeout(t)
  }, [role])

  if (!isWebApp || role === 'superadmin') return null

  const start = () => { setInvite(false); setI(0); setOpen(true); navigate(STEPS[0].path) }
  const finish = () => { write(); setInvite(false); setOpen(false) }
  const go = (n: number) => { const c = Math.min(Math.max(n, 0), STEPS.length - 1); setI(c); navigate(STEPS[c].path) }
  const step = open ? STEPS[i] : here >= 0 ? STEPS[here] : null

  return (
    <div className="pointer-events-none fixed right-3 bottom-20 z-[80] flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-2 md:right-5 md:bottom-5">
      {(open || invite) && (
        <div className="pointer-events-auto w-[22rem] max-w-full animate-slide-up rounded-2xl border border-border bg-surface p-4 shadow-(--shadow-pop)" role="dialog" aria-label="Guia do IC Chat">
          <div className="flex items-start gap-3">
            <Robot />
            <div className="min-w-0 flex-1">
              {invite && !open ? (
                <>
                  <p className="text-sm font-bold">Oi! Eu sou o guia do IC Chat 👋</p>
                  <p className="mt-1 text-[13px] leading-5 text-muted">Posso te mostrar em 2 minutos o que é cada tela, para que serve e como começar?</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={start} className="h-9 rounded-lg bg-primary px-4 text-[13px] font-semibold text-white hover:opacity-90">Começar o tour</button>
                    <button onClick={finish} className="h-9 rounded-lg px-3 text-[13px] font-medium text-muted hover:text-foreground">Agora não</button>
                  </div>
                </>
              ) : (
                step && (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold">{step.title}</p>
                      <button onClick={finish} aria-label="Fechar guia" className="-mt-1 -mr-1 rounded-md p-1 text-subtle hover:text-foreground"><X className="size-4" /></button>
                    </div>
                    <dl className="mt-1.5 space-y-1.5 text-[12.5px] leading-5">
                      <div><dt className="inline font-semibold">O que é: </dt><dd className="inline text-muted">{step.what}</dd></div>
                      <div><dt className="inline font-semibold">Para quê: </dt><dd className="inline text-muted">{step.why}</dd></div>
                      <div><dt className="inline font-semibold">Como usar: </dt><dd className="inline text-muted">{step.how}</dd></div>
                    </dl>
                  </>
                )
              )}
            </div>
          </div>
          {open && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[11.5px] text-subtle tabular-nums">{i + 1} de {STEPS.length}</span>
              <div className="ml-auto flex gap-1.5">
                <button onClick={() => go(i - 1)} disabled={i === 0} aria-label="Passo anterior" className="grid size-9 place-items-center rounded-lg border border-border disabled:opacity-40"><ChevronLeft className="size-4" /></button>
                {i < STEPS.length - 1 ? (
                  <button onClick={() => go(i + 1)} className="flex h-9 items-center gap-1 rounded-lg bg-primary px-4 text-[13px] font-semibold text-white hover:opacity-90">Próximo <ChevronRight className="size-4" /></button>
                ) : (
                  <button onClick={finish} className="h-9 rounded-lg bg-primary px-4 text-[13px] font-semibold text-white hover:opacity-90">Concluir</button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {!open && !invite && step && (
        <button
          onClick={() => { setI(here >= 0 ? here : 0); setOpen(true) }}
          className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-surface py-1 pr-4 pl-1 text-[13px] font-semibold shadow-(--shadow-soft) transition hover:shadow-md"
          aria-label="Abrir o guia desta tela"
        >
          <span className="grid size-9 place-items-center rounded-full bg-primary-soft"><Robot small /></span>
          Guia
        </button>
      )}
    </div>
  )
}
