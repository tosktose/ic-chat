import { useState } from 'react'
import { CalendarDays, Check, Info } from 'lucide-react'
import { GoogleIcon } from '@/components/brand'
import { GoogleCalendarDialog } from '@/components/GoogleCalendarDialog'
import { Button } from '@/components/ui/button'
import { Badge, Card, CardHeader } from '@/components/ui/misc'
import { useGoogle } from '@/lib/google'
import { isWebApp } from '@/lib/supabase'

/** Google Agenda: conectar a agenda de cada profissional para os horários não baterem. */
export function GoogleTab() {
  const google = useGoogle()
  const [open, setOpen] = useState(false)
  const connected = google.connectedCount > 0
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Card>
        <CardHeader
          title={<span className="flex items-center gap-2"><GoogleIcon className="size-4" /> Google Agenda</span>}
          description="Compromissos pessoais do profissional bloqueiam o horário no IC Chat, e os agendamentos feitos aqui aparecem no Google."
          action={connected ? <Badge tone="success"><Check className="size-3" /> Conectado</Badge> : <Badge>Não conectado</Badge>}
        />
        <div className="flex flex-col gap-4 px-5 pb-5 text-sm leading-6 text-muted">
          <ol className="list-decimal space-y-1 pl-5">
            <li>Cadastre os profissionais em <b>Configurações → Profissionais</b>.</li>
            <li>Conecte a agenda Google de cada um.</li>
            <li>Na <b>Agenda</b>, os horários ocupados no Google ficam bloqueados e a IA só oferece horários livres.</li>
          </ol>
          {isWebApp ? (
            <div className="flex gap-2.5 rounded-xl bg-surface-2 p-3.5 text-[13px]">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" />
              <p>
                Na versão online, a conexão com o Google depende de uma credencial que o administrador do IC Chat cadastra uma vez em
                <b> Configurações do sistema → Google Agenda</b>. Enquanto isso não for feito, a conexão fica desligada. No aplicativo instalado a conexão já funciona hoje.
              </p>
            </div>
          ) : (
            <div><Button onClick={() => setOpen(true)}><CalendarDays /> {connected ? 'Gerenciar agendas' : 'Conectar Google Agenda'}</Button></div>
          )}
        </div>
      </Card>
      {!isWebApp && <GoogleCalendarDialog open={open} onOpenChange={setOpen} />}
    </div>
  )
}
