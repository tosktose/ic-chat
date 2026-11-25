import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Check, HeartHandshake, MessageCircle, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Avatar, Badge, Card, CardHeader, EmptyState } from '@/components/ui/misc'
import { useAppState } from '@/lib/app-state'
import { useCompany } from '@/lib/company'
import { useData } from '@/lib/data'
import { todayISO, useSendToContact } from '@/lib/outbox'
import { winbackQueue, type WinbackItem } from '@/lib/winback'

/** Clientes de volta: pós-atendimento e reativação de quem sumiu */
export function WinbackPage() {
  const { appointmentLog } = useAppState()
  const { automations, info } = useCompany()
  const { contacts, updateContact } = useData()
  const { send } = useSendToContact()
  const navigate = useNavigate()
  const settings = automations.winback
  const today = todayISO()
  const queue = useMemo(
    () => winbackQueue(contacts, appointmentLog, settings, { today, company: info.name }),
    [contacts, appointmentLog, settings, today, info.name]
  )
  const lapsed = queue.filter((q) => q.stage === 'sumido')
  const followups = queue.filter((q) => q.stage !== 'sumido')

  const mark = (item: WinbackItem) => updateContact(item.contact.id, { followups: { ...item.contact.followups, [item.stage]: Date.now() } })
  const sendOne = async (item: WinbackItem) => {
    try {
      const how = await send(item.contact.id, item.text)
      mark(item)
      toast.success(how === 'app' ? 'Mensagem enviada' : 'WhatsApp aberto com a mensagem')
    } catch (e) {
      toast.error('Não foi possível enviar', { description: (e as Error).message })
    }
  }

  const list = (items: WinbackItem[]) => (
    <ul className="divide-y divide-border border-t border-border">
      {items.map((item) => (
        <li key={`${item.contact.id}-${item.stage}`} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar name={item.contact.name} size={36} />
            <div className="min-w-0">
              <p className="truncate font-semibold">{item.contact.name}</p>
              <p className="truncate text-[13px] text-muted">Último: {item.service} · há {item.daysAway} dias</p>
              <p className="mt-1 line-clamp-2 text-[12.5px] text-subtle">{item.text}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-auto">
            <Badge tone={item.stage === 'sumido' ? 'warning' : 'primary'}>{item.label}</Badge>
            <Button size="sm" variant="ghost" aria-label={`Marcar ${item.contact.name} como enviado`} onClick={() => { mark(item); toast.success('Marcado como enviado') }}><Check /></Button>
            <Button size="sm" onClick={() => void sendOne(item)}><MessageCircle /> Enviar</Button>
          </div>
        </li>
      ))}
    </ul>
  )

  return (
    <Page
      title="Clientes de volta"
      description="Mensagem depois do atendimento e convite para quem sumiu. Cada cliente recebe uma vez por visita."
      actions={<Button variant="outline" size="sm" onClick={() => navigate('/config?tab=automacoes')}><Settings2 /> Ajustar mensagens</Button>}
    >
      {!settings.enabled ? (
        <Card className="p-6">
          <EmptyState
            icon={<HeartHandshake />}
            title="Retorno de clientes desligado"
            description="Ligue para ver quem precisa de uma mensagem hoje."
            action={<Button onClick={() => navigate('/config?tab=automacoes')}>Ligar</Button>}
          />
        </Card>
      ) : queue.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={<HeartHandshake />}
            title="Ninguém para chamar hoje"
            description={`Os clientes aparecem aqui ${settings.steps.map((s) => `${s.days}`).join(' e ')} dias depois do atendimento, e quando passam de ${settings.lapsedDays} dias sem voltar.`}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Card className="p-4"><p className="text-xs text-muted">Para chamar hoje</p><p className="mt-1 text-2xl font-bold tabular-nums">{queue.length}</p></Card>
            <Card className="p-4"><p className="text-xs text-muted">Pós-atendimento</p><p className="mt-1 text-2xl font-bold tabular-nums">{followups.length}</p></Card>
            <Card className="p-4"><p className="text-xs text-muted">Sumidos há {settings.lapsedDays}+ dias</p><p className="mt-1 text-2xl font-bold tabular-nums text-warning">{lapsed.length}</p></Card>
          </div>
          {followups.length > 0 && (
            <Card className="overflow-hidden" data-testid="winback-followups">
              <CardHeader title="Pós-atendimento" description="Pergunte como foi e convide para voltar" />
              {list(followups)}
            </Card>
          )}
          {lapsed.length > 0 && (
            <Card className="overflow-hidden" data-testid="winback-lapsed">
              <CardHeader title="Clientes que sumiram" description={`Sem voltar há mais de ${settings.lapsedDays} dias e sem horário marcado`} />
              {list(lapsed)}
            </Card>
          )}
        </div>
      )}
    </Page>
  )
}
