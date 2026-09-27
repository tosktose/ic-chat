import { useEffect, useState } from 'react'
import { formatDistanceToNowStrict } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeftRight, ArrowRight, CalendarCheck, ExternalLink, KeyRound, Loader2, Mail, RefreshCw, ShieldCheck, Unplug } from 'lucide-react'
import { TODAY } from '@/data/mock'
import { toast } from 'sonner'
import { GoogleIcon } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/input'
import { Avatar, Badge, Segmented, Switch } from '@/components/ui/misc'
import { Dialog } from '@/components/ui/overlay'
import { useCompany } from '@/lib/company'
import { useGoogle, type SyncDirection } from '@/lib/google'
import { cn } from '@/lib/utils'

const ago = (t?: number) => (!t ? 'nunca' : Date.now() - t < 60_000 ? 'agora' : formatDistanceToNowStrict(t, { locale: ptBR, addSuffix: true }))

/** Botão de status do Google Agenda (usado na Agenda e em Canais) */
export function GoogleSyncButton({ className }: { className?: string }) {
  const { connectedCount, lastSync } = useGoogle()
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
        tooltip={connectedCount ? `Sincronizado ${ago(lastSync)} · clique para configurar` : 'Conectar a agenda do Google'}
      >
        <GoogleIcon className="size-4" />
        <span className="hidden sm:inline">{connectedCount ? 'Google Agenda' : 'Conectar Google Agenda'}</span>
        {connectedCount > 0 && <span className="size-2 rounded-full bg-success" />}
      </Button>
      <GoogleCalendarDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

export function GoogleCalendarDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { professionals } = useCompany()
  const g = useGoogle()
  const { config, setConfig, connect, disconnect, syncNow, lastSync } = g
  const [clientId, setClientId] = useState('')
  const [secret, setSecret] = useState('')
  const [savingCreds, setSavingCreds] = useState(false)
  const [showCreds, setShowCreds] = useState(false)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [emailFor, setEmailFor] = useState<{ id: string; email: string } | null>(null)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (!open) {
      setEmailFor(null)
      setConnecting(null)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setClientId(g.clientId)
      setSecret('')
      setShowCreds(g.real && !g.hasCredentials)
    }
  }, [open])

  const authorize = async (proId: string, email?: string) => {
    setEmailFor(null)
    setConnecting(proId)
    try {
      // App instalado: abre a tela de login do Google no navegador e volta com a autorização
      const connected = g.real ? await connect(proId) : await new Promise<string>((r) => setTimeout(() => r(connect(proId, email)), 1600))
      toast.success('Agenda conectada', { description: `${connected} · os horários já começaram a sincronizar.` })
      void g.loadDay(TODAY, true)
    } catch (e) {
      toast.error('Não foi possível conectar a agenda', { description: e instanceof Error ? e.message : String(e) })
    } finally {
      setConnecting(null)
    }
  }

  const dirOptions: { value: SyncDirection; label: string }[] = [
    { value: 'duas-vias', label: 'Nos dois sentidos' },
    { value: 'para-google', label: 'Só IC Chat → Google' },
    { value: 'do-google', label: 'Só Google → IC Chat' }
  ]

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={<span className="flex items-center gap-2"><GoogleIcon className="size-5" /> Sincronização com o Google Agenda</span>}
      description="Cada profissional conecta a própria conta Google. Agendamentos do IC Chat viram eventos no Google e compromissos do Google bloqueiam horários aqui."
      className="md:max-w-2xl"
      footer={
        <>
          <p className="mr-auto self-center text-xs text-muted">Última sincronização: {ago(lastSync)}</p>
          <Button
            variant="outline"
            disabled={syncing || !Object.keys(config.calendars).length}
            onClick={() => {
              setSyncing(true)
              void syncNow(TODAY)
                .then(() => toast.success('Agendas sincronizadas'))
                .finally(() => setSyncing(false))
            }}
          >
            {syncing ? <Loader2 className="animate-spin" /> : <RefreshCw />} Sincronizar agora
          </Button>
          <Button onClick={() => onOpenChange(false)}>Concluir</Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Credenciais do Google Cloud (app instalado) */}
        {g.real && (
          <div className="rounded-xl border border-border">
            <button onClick={() => setShowCreds((v) => !v)} className="flex w-full items-center gap-3 p-3 text-left">
              <KeyRound className="size-4 text-muted" />
              <div className="flex-1">
                <p className="text-[13.5px] font-medium">Credenciais do Google Cloud</p>
                <p className="text-xs text-muted">{g.hasCredentials ? `Configuradas · ${g.clientId.slice(0, 18)}…` : 'Necessárias uma única vez para conectar as agendas'}</p>
              </div>
              <Badge tone={g.hasCredentials ? 'success' : 'warning'}>{g.hasCredentials ? 'OK' : 'Pendente'}</Badge>
            </button>
            {showCreds && (
              <div className="flex flex-col gap-3 border-t border-border p-3">
                <ol className="flex flex-col gap-1 text-[12.5px] text-muted">
                  <li>1. Acesse o <a className="font-medium text-primary hover:underline" href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noreferrer">Google Cloud Console <ExternalLink className="inline size-3" /></a> e crie um projeto (ex.: “IC Chat”).</li>
                  <li>2. Ative a <a className="font-medium text-primary hover:underline" href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank" rel="noreferrer">Google Calendar API <ExternalLink className="inline size-3" /></a>.</li>
                  <li>3. Em <b>Tela de consentimento OAuth</b>: tipo <b>Externo</b> e adicione os e-mails dos profissionais em <b>Usuários de teste</b>.</li>
                  <li>4. Em <b>Credenciais → Criar credenciais → ID do cliente OAuth</b>, escolha <b>App para computador</b>.</li>
                  <li>5. Copie o <b>ID do cliente</b> e a <b>chave secreta</b> para os campos abaixo.</li>
                </ol>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="ID do cliente"><Input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="000000-xxxx.apps.googleusercontent.com" /></Field>
                  <Field label="Chave secreta do cliente"><Input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder={g.hasCredentials ? '•••••••• (salva)' : 'GOCSPX-…'} /></Field>
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={savingCreds || !clientId.includes('.apps.googleusercontent.com') || secret.length < 10}
                    onClick={async () => {
                      setSavingCreds(true)
                      try {
                        await g.saveCredentials(clientId, secret)
                        setShowCreds(false)
                        toast.success('Credenciais salvas', { description: 'Agora conecte a agenda de cada profissional.' })
                      } catch (e) {
                        toast.error('Não foi possível salvar', { description: e instanceof Error ? e.message : String(e) })
                      } finally {
                        setSavingCreds(false)
                      }
                    }}
                  >
                    {savingCreds && <Loader2 className="animate-spin" />} Salvar credenciais
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profissionais */}
        <div>
          <p className="mb-2 text-[13px] font-semibold">Agendas dos profissionais</p>
          <div className="flex flex-col gap-2">
            {professionals.filter((p) => p.active).map((p) => {
              const cal = config.calendars[p.id]
              const busy = connecting === p.id
              return (
                <div key={p.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={p.name} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium">{p.name}</p>
                      <p className="truncate text-xs text-muted">
                        {cal
                          ? `${cal.email} · ${cal.status === 'erro' ? 'erro na última sincronização' : `sincronizado ${ago(cal.lastSync)}`}`
                          : busy
                            ? g.real ? 'Autorize no navegador que abriu…' : 'Aguardando autorização do Google…'
                            : 'Não conectado'}
                      </p>
                    </div>
                    {cal ? (
                      <>
                        <Badge tone="success" className="hidden sm:inline-flex">Conectado</Badge>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="hover:text-danger"
                          aria-label={`Desconectar agenda de ${p.name}`}
                          onClick={() => {
                            void disconnect(p.id).then(() => toast.success('Agenda desconectada', { description: p.name }))
                          }}
                        >
                          <Unplug />
                        </Button>
                      </>
                    ) : busy ? (
                      <Loader2 className="size-5 animate-spin text-primary" />
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={g.real && !g.hasCredentials}
                        tooltip={g.real && !g.hasCredentials ? 'Cadastre as credenciais do Google primeiro' : undefined}
                        onClick={() => (g.real ? void authorize(p.id) : setEmailFor({ id: p.id, email: p.email ?? '' }))}
                      >
                        <GoogleIcon className="size-4" /> Conectar
                      </Button>
                    )}
                  </div>
                  {emailFor?.id === p.id && (
                    <div className="mt-3 flex flex-col gap-2 rounded-lg bg-surface-2 p-3 sm:flex-row sm:items-end">
                      <Field label="Conta Google do profissional" className="flex-1">
                        <Input autoFocus icon={<Mail />} type="email" value={emailFor.email} onChange={(e) => setEmailFor({ id: p.id, email: e.target.value })} placeholder="nome@gmail.com" />
                      </Field>
                      <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => setEmailFor(null)}>Cancelar</Button>
                        <Button disabled={!/^\S+@\S+\.\S+$/.test(emailFor.email)} onClick={() => void authorize(p.id, emailFor.email)}>
                          Autorizar no Google
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            <ShieldCheck className="size-3.5 text-success" /> O IC Chat só acessa as agendas; nunca e-mails ou arquivos.
          </p>
        </div>

        {/* Regras */}
        <div>
          <p className="mb-2 text-[13px] font-semibold">Como sincronizar</p>
          <Segmented className="w-full" value={config.direction} onChange={(v) => setConfig({ direction: v })} options={dirOptions} />
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
            {config.direction === 'duas-vias' ? <ArrowLeftRight className="size-4 text-primary" /> : <ArrowRight className={cn('size-4 text-primary', config.direction === 'do-google' && 'rotate-180')} />}
            {config.direction === 'duas-vias'
              ? 'Agendamentos do IC Chat vão para o Google e eventos do Google bloqueiam horários no IC Chat.'
              : config.direction === 'para-google'
                ? 'Só os agendamentos do IC Chat são enviados ao Google.'
                : 'Só os eventos do Google bloqueiam horários no IC Chat.'}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Título do evento no Google">
            <Select value={config.eventTitle} onChange={(e) => setConfig({ eventTitle: e.target.value as typeof config.eventTitle })}>
              <option value="cliente-servico">Cliente · Serviço (ex.: Maria · Escova)</option>
              <option value="servico">Só o serviço</option>
              <option value="reservado">“Reservado” (privado)</option>
            </Select>
          </Field>
          <Field label="Lembrete no Google">
            <Select value={config.reminderMin} onChange={(e) => setConfig({ reminderMin: Number(e.target.value) })}>
              <option value={0}>Sem lembrete</option>
              <option value={10}>10 minutos antes</option>
              <option value={30}>30 minutos antes</option>
              <option value={60}>1 hora antes</option>
            </Select>
          </Field>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
            <div>
              <p className="text-[13.5px] font-medium">Bloquear compromissos pessoais</p>
              <p className="text-xs text-muted">Eventos do Google ocupam o horário no IC Chat</p>
            </div>
            <Switch checked={config.blockPersonal} onCheckedChange={(v) => setConfig({ blockPersonal: v })} />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
            <div>
              <p className="text-[13.5px] font-medium">Telefone do cliente no evento</p>
              <p className="text-xs text-muted">Na descrição do evento do Google</p>
            </div>
            <Switch checked={config.includePhone} onCheckedChange={(v) => setConfig({ includePhone: v })} />
          </label>
        </div>

        <p className="flex items-start gap-2 rounded-xl bg-primary-soft p-3 text-[12.5px] text-primary">
          <CalendarCheck className="mt-0.5 size-4 shrink-0" />
          As alterações chegam em segundos: o Google avisa o IC Chat a cada mudança, e uma verificação a cada 15 minutos garante que nada se perca.
        </p>
      </div>
    </Dialog>
  )
}
