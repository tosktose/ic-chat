import { useState } from 'react'
import { Info, MessageSquarePlus, Plus, Zap } from 'lucide-react'
import { ChannelBadge } from '@/components/brand'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Badge, Switch } from '@/components/ui/misc'
import { cn } from '@/lib/utils'
import {
  LIMITES,
  capturas,
  redeLabel,
  regras as regrasIniciais,
  statusCaptura,
  taxaResposta,
  type RegraCaptacao
} from '@/data/social'

/* ------------------------------------------------------------------ */
/* Regra: comentário com gatilho vira direct                            */
/* ------------------------------------------------------------------ */
function CardRegra({ r, onToggle }: { r: RegraCaptacao; onToggle: () => void }) {
  const taxa = taxaResposta(r)
  return (
    <article
      className={cn(
        'rounded-xl border bg-surface p-4 shadow-soft transition-colors',
        r.ativa ? 'border-border' : 'border-border opacity-70'
      )}
    >
      <header className="flex items-start gap-3">
        <ChannelBadge kind={r.rede} size={36} className="ring-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{r.alvo}</p>
          <p className="truncate text-xs text-muted">{redeLabel[r.rede]}</p>
        </div>
        <Switch checked={r.ativa} onCheckedChange={onToggle} aria-label="Ligar ou pausar a regra" />
      </header>

      <div className="mt-3 space-y-2">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-subtle uppercase">Dispara quando o comentário tem</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {r.gatilhos.length ? (
              r.gatilhos.map((g) => (
                <Badge key={g} tone="primary">
                  {g}
                </Badge>
              ))
            ) : (
              <Badge tone="neutral">qualquer comentário</Badge>
            )}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-medium tracking-wide text-subtle uppercase">Direct enviado</p>
          <p className="mt-1 rounded-lg bg-surface-2 p-2.5 text-[13px] leading-snug">{r.mensagem}</p>
        </div>

        {(r.etiqueta || r.etapaFunil) && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-subtle">E ainda:</span>
            {r.etiqueta && <Badge tone="neutral">etiqueta “{r.etiqueta}”</Badge>}
            {r.etapaFunil && <Badge tone="success">entra no funil</Badge>}
          </div>
        )}
      </div>

      <footer className="mt-3 flex items-center gap-4 border-t border-border pt-3 text-xs">
        <span className="text-muted">
          <b className="tabular-nums text-foreground">{r.capturados7d}</b> capturados
        </span>
        <span className="text-muted">
          <b className="tabular-nums text-foreground">{r.respondidos7d}</b> responderam
        </span>
        <span className={cn('ml-auto font-semibold tabular-nums', taxa >= 40 ? 'text-success' : 'text-muted')}>
          {taxa}%
        </span>
      </footer>
    </article>
  )
}

/* ------------------------------------------------------------------ */
/* Página                                                               */
/* ------------------------------------------------------------------ */
export function CaptacaoPage() {
  const [regras, setRegras] = useState(regrasIniciais)

  const ativas = regras.filter((r) => r.ativa)
  const capturados = ativas.reduce((s, r) => s + r.capturados7d, 0)
  const responderam = ativas.reduce((s, r) => s + r.respondidos7d, 0)
  const taxaGeral = capturados ? Math.round((responderam / capturados) * 100) : 0

  return (
    <Page
      wide
      title="Comentário vira conversa"
      description="Quem comenta no seu post recebe um direct automático e entra no atendimento."
      actions={
        <Button>
          <Plus /> Nova regra
        </Button>
      }
    >
      {/* Indicadores */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
          <p className="text-xs font-medium text-muted">Comentários capturados</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{capturados}</p>
          <p className="mt-1 text-xs text-subtle">últimos 7 dias</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
          <p className="text-xs font-medium text-muted">Viraram conversa</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-success">{responderam}</p>
          <p className="mt-1 text-xs text-subtle">responderam o direct</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
          <p className="text-xs font-medium text-muted">Taxa de resposta</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-primary">{taxaGeral}%</p>
          <p className="mt-1 text-xs text-subtle">do comentário ao direct</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
          <p className="text-xs font-medium text-muted">Regras ligadas</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {ativas.length}
            <span className="text-base font-medium text-subtle"> / {regras.length}</span>
          </p>
          <p className="mt-1 text-xs text-subtle">em {new Set(ativas.map((r) => r.rede)).size} rede(s)</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        {/* Regras */}
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Zap className="size-4 text-primary" /> Regras
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {regras.map((r) => (
              <CardRegra
                key={r.id}
                r={r}
                onToggle={() =>
                  setRegras((atual) => atual.map((x) => (x.id === r.id ? { ...x, ativa: !x.ativa } : x)))
                }
              />
            ))}
          </div>
        </section>

        {/* Atividade e limites */}
        <aside className="space-y-5">
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <MessageSquarePlus className="size-4 text-primary" /> Capturas recentes
            </h3>
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
              {capturas.map((c) => {
                const st = statusCaptura[c.status]
                return (
                  <li key={c.id} className="p-3">
                    <div className="flex items-center gap-2">
                      <ChannelBadge kind={c.rede} size={20} className="ring-0" />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{c.autor}</span>
                      <span className="shrink-0 text-[11px] text-subtle">{c.quando}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted">“{c.comentario}”</p>
                    <div className="mt-1.5">
                      <Badge tone={st.tone} title={st.explica}>
                        {st.label}
                      </Badge>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          {/* Os limites são da Meta, não nossos: deixar isso claro evita
              promessa que o produto não pode cumprir. */}
          <section className="rounded-xl border border-border bg-surface-2 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Info className="size-4 text-muted" /> Regras da Meta
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs leading-snug text-muted">
              <li>
                <b className="text-foreground">{LIMITES.janelaDias} dias</b> para responder a um comentário.
              </li>
              <li>
                <b className="text-foreground">
                  {LIMITES.respostasPorComentario} mensagem
                </b>{' '}
                por comentário — não dá para insistir.
              </li>
              <li>
                A conversa só continua <b className="text-foreground">se a pessoa responder</b>, e aí abre uma
                janela de 24 horas.
              </li>
              <li>
                Instagram: até{' '}
                <b className="text-foreground tabular-nums">{LIMITES.instagramPorHora}</b> envios por hora.
              </li>
              <li>Exige conta profissional e aprovação do app na Meta.</li>
            </ul>
          </section>
        </aside>
      </div>
    </Page>
  )
}
