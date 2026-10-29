import { useEffect, useState } from 'react'
import { ArrowDownToLine, ExternalLink, Loader2, Info, Plus, QrCode, RefreshCw, ShieldAlert, ShieldCheck, Smartphone, Unplug } from 'lucide-react'
import { toast } from 'sonner'
import { ChannelBadge, GoogleIcon } from '@/components/brand'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Avatar, Badge, Card, CardHeader } from '@/components/ui/misc'
import { Dialog } from '@/components/ui/overlay'
import { cn } from '@/lib/utils'
import { useCompany } from '@/lib/company'
import { isWebApp } from '@/lib/supabase'
import { useGoogle } from '@/lib/google'
import { GoogleCalendarDialog } from '@/components/GoogleCalendarDialog'
import { useWhatsApp } from '@/lib/whatsapp'
import { formatPhone } from '@/lib/utils'

const desktopDownloadUrl = import.meta.env.VITE_ICCHAT_DESKTOP_DOWNLOAD_URL

export function ChannelsPage() {
  const { professionals, info } = useCompany()
  const google = useGoogle()
  // Estado da conexão por QR (no sistema real vem do Core/Baileys em tempo real)
  const real = useWhatsApp()
  const [demoWa, setDemoWa] = useState<'conectado' | 'reconectando' | 'desconectado'>(isWebApp ? 'desconectado' : 'conectado')
  // No app instalado o estado vem do WhatsApp de verdade; no navegador, demonstração
  const wa: 'conectado' | 'reconectando' | 'desconectado' = real.available
    ? real.state.status === 'conectado'
      ? 'conectado'
      : real.state.status === 'desconectado'
        ? 'desconectado'
        : 'reconectando'
    : demoWa
  const setWa = setDemoWa
  const waNumber = real.available && real.state.me ? formatPhone(real.state.me.phone) : info.phone
  const [confirmOff, setConfirmOff] = useState(false)
  const [official, setOfficial] = useState<{ phoneId: string } | null>(null)
  const [googleOpen, setGoogleOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [officialOpen, setOfficialOpen] = useState(false)

  return (
    <Page title="Canais" description="Conecte os canais por onde seus clientes falam com você.">
      <h3 className="mb-3 text-[13px] font-semibold tracking-wider text-subtle uppercase">WhatsApp</h3>
      <div className="grid gap-4 lg:grid-cols-2">
        {/* QR Code */}
        <Card className="flex flex-col">
          <div className="flex items-start gap-3 p-5">
            <ChannelBadge kind="whatsapp" size={44} className="ring-0" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">WhatsApp via QR Code</p>
                <Badge tone="neutral">Não oficial</Badge>
              </div>
              <p className="mt-1 text-[13px] text-muted">Use o número que você já tem. Conecta em segundos, escaneando o QR Code no celular.</p>
            </div>
          </div>
          {isWebApp && !real.available ? (
            <div className="mx-5 rounded-xl border border-dashed border-border-strong bg-surface-2 p-4 text-[13px] leading-6 text-muted">
              <b className="text-foreground">Disponível no aplicativo para Windows.</b> A conexão por QR Code roda no computador da empresa. Instale o app, entre com esta mesma conta e conecte o número por lá.
            </div>
          ) : (
          <div className="mx-5 flex items-center gap-3 rounded-xl border border-border p-3">
            <span className="relative flex size-2.5">
              {wa === 'conectado' && <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />}
              <span className={cn('relative inline-flex size-2.5 rounded-full', wa === 'conectado' ? 'bg-success' : wa === 'reconectando' ? 'bg-warning' : 'bg-danger')} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold">{real.available && !real.state.me ? 'Nenhum número conectado' : `${waNumber} · ${info.name}`}</p>
              <p className="text-xs text-muted">
                {wa === 'conectado'
                  ? real.available ? 'Conectado · recebendo e enviando mensagens' : 'Conectado · última mensagem há 1 min'
                  : wa === 'reconectando'
                    ? real.state.status === 'qr' ? 'Aguardando leitura do QR Code' : 'Conectando…'
                    : real.state.error ?? 'Desconectado: as mensagens não estão chegando'}
              </p>
            </div>
            {wa === 'desconectado' ? (
              <Button size="sm" onClick={() => setQrOpen(true)}>Conectar</Button>
            ) : real.available && real.state.status !== 'conectado' ? (
              <Button size="sm" variant="outline" onClick={() => setQrOpen(true)}>Ver QR Code</Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Reconectar"
                  disabled={wa === 'reconectando'}
                  onClick={() => {
                    if (real.available) return void real.start()
                    setWa('reconectando')
                    setTimeout(() => {
                      setWa('conectado')
                      toast.success('WhatsApp reconectado')
                    }, 2000)
                  }}
                >
                  {wa === 'reconectando' ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                </Button>
                <Button variant="ghost" size="icon-sm" className="hover:text-danger" aria-label="Desconectar" onClick={() => setConfirmOff(true)}>
                  <Unplug />
                </Button>
              </>
            )}
          </div>
          )}
          <div className="m-5 mt-3 flex gap-2.5 rounded-xl bg-warning-soft p-3 text-[12.5px] text-warning">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <p>Este método não é oficial da Meta. Envio em massa ou para quem não tem seu número salvo pode causar <b>bloqueio do número</b>. O IC Chat limita o ritmo de envio para proteger você.</p>
          </div>
          <div className="mt-auto border-t border-border p-4">
            {isWebApp && !real.available ? desktopDownloadUrl ? (
              <a href={desktopDownloadUrl} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium transition hover:bg-surface-2">
                <ArrowDownToLine className="size-4" /> Baixar aplicativo para Windows
              </a>
            ) : (
              <p className="text-center text-xs text-muted">Conecte seu WhatsApp pelo aplicativo para Windows.</p>
            ) : (
              <Button variant="outline" className="w-full" onClick={() => setQrOpen(true)}><Plus /> Conectar outro número</Button>
            )}
          </div>
        </Card>

        {/* Oficial */}
        <Card className="flex flex-col">
          <div className="flex items-start gap-3 p-5">
            <ChannelBadge kind="whatsapp_official" size={44} className="ring-0" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">WhatsApp Oficial (API da Meta)</p>
                <Badge tone="success"><ShieldCheck /> Oficial</Badge>
              </div>
              <p className="mt-1 text-[13px] text-muted">Sem risco de bloqueio, com templates aprovados e selo de empresa. Exige CNPJ e conta Meta Business.</p>
            </div>
          </div>
          <ul className="mx-5 flex flex-col gap-2 text-[13px]">
            {['Respostas em até 24h: grátis', 'Lembretes e campanhas com templates (cobrados pela Meta)', 'Pode continuar usando o app WhatsApp Business no celular'].map((t) => (
              <li key={t} className="flex items-center gap-2 text-muted">
                <span className="size-1.5 rounded-full bg-success" /> {t}
              </li>
            ))}
          </ul>
          <div className="mt-auto border-t border-border p-4 pt-4">
            {official ? (
              <div className="flex items-center gap-2">
                <Badge tone="success" size="md"><ShieldCheck /> Conectado · ID {official.phoneId}</Badge>
                <Button variant="ghost" size="sm" className="ml-auto text-danger" onClick={() => { setOfficial(null); toast.success('WhatsApp Oficial desconectado') }}>Desconectar</Button>
              </div>
            ) : (
              <Button className="w-full" disabled={isWebApp} title={isWebApp ? 'A ligação com a API oficial da Meta é feita com o suporte' : undefined} onClick={() => setOfficialOpen(true)}>{isWebApp ? 'Em breve nesta versão' : 'Conectar WhatsApp Oficial'}</Button>
            )}
          </div>
        </Card>
      </div>

      <h3 className="mt-8 mb-3 text-[13px] font-semibold tracking-wider text-subtle uppercase">Redes sociais</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SocialCard kind="instagram" title="Instagram Direct" text="Responda DMs e comentários do Instagram." badge="Em breve" />
        <SocialCard kind="messenger" title="Facebook Messenger" text="Mensagens da sua página do Facebook." badge="Em breve" />
        <SocialCard kind="tiktok" title="TikTok" text="Mensagens diretas do TikTok for Business." badge="Beta da plataforma" />
      </div>

      <h3 className="mt-8 mb-3 text-[13px] font-semibold tracking-wider text-subtle uppercase">Agenda</h3>
      <Card>
        <CardHeader
          title={<span className="flex items-center gap-2"><GoogleIcon className="size-5" /> Google Agenda</span>}
          description="Cada profissional conecta a própria agenda. Os horários sincronizam nos dois sentidos."
        />
        <div className="grid gap-2 px-5 sm:grid-cols-2">
          {professionals.filter((p) => p.active).map((p) => {
            const cal = google.config.calendars[p.id]
            return (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <Avatar name={p.name} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium">{p.name}</p>
                  <p className="truncate text-xs text-muted">{cal ? cal.email : 'Não conectado'}</p>
                </div>
                {cal ? <Badge tone="success">Sincronizado</Badge> : <Badge>Pendente</Badge>}
              </div>
            )
          })}
        </div>
        <div className="flex justify-end px-5 py-4">
          <Button onClick={() => setGoogleOpen(true)}><GoogleIcon className="size-4" /> Configurar sincronização</Button>
        </div>
      </Card>
      <GoogleCalendarDialog open={googleOpen} onOpenChange={setGoogleOpen} />

      <QrDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        real={real.available ? real : undefined}
      />
      <OfficialDialog
        open={officialOpen}
        onOpenChange={setOfficialOpen}
        onConnected={(phoneId) => {
          setOfficial({ phoneId })
          setOfficialOpen(false)
          toast.success('WhatsApp Oficial conectado', { description: `Número ${phoneId}` })
        }}
      />
      <Dialog
        open={confirmOff}
        onOpenChange={setConfirmOff}
        title="Desconectar o WhatsApp?"
        description="As mensagens param de chegar no IC Chat até você conectar de novo. O histórico continua salvo."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmOff(false)}>Cancelar</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (real.available) void real.logout()
                else setWa('desconectado')
                setConfirmOff(false)
                toast.success('WhatsApp desconectado')
              }}
            >
              <Unplug /> Desconectar
            </Button>
          </>
        }
      >
        <span />
      </Dialog>
    </Page>
  )
}

function SocialCard({ kind, title, text, badge }: { kind: 'instagram' | 'messenger' | 'tiktok'; title: string; text: string; badge: string }) {
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center gap-3">
        <ChannelBadge kind={kind} size={40} className="ring-0" />
        <div className="flex-1">
          <p className="font-semibold">{title}</p>
          <Badge tone="neutral" className="mt-1">{badge}</Badge>
        </div>
      </div>
      <p className="mt-3 flex-1 text-[13px] text-muted">{text}</p>
      <Button variant="outline" className="mt-4" disabled>Conectar</Button>
    </Card>
  )
}

function QrDialog({
  open,
  onOpenChange,
  real
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  real?: ReturnType<typeof useWhatsApp>
}) {
  const [pairing, setPairing] = useState(false)
  // WhatsApp real: inicia a conexão ao abrir e fecha sozinho quando o celular conectar
  useEffect(() => {
    if (open && real && real.state.status === 'desconectado') void real.start()
  }, [open])
  useEffect(() => {
    if (open && real?.state.status === 'conectado') onOpenChange(false)
  }, [real?.state.status])
  const [mode, setMode] = useState<'qr' | 'codigo'>('qr')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState<string | null>(null)
  const [seconds, setSeconds] = useState(20)
  useEffect(() => {
    if (!open) {
      setMode('qr')
      setCode(null)
      setPhone('')
      return
    }
    // O código QR se renova a cada 20 segundos
    const t = setInterval(() => setSeconds((s) => (s <= 1 ? 20 : s - 1)), 1000)
    return () => clearInterval(t)
  }, [open])
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Conectar WhatsApp"
      description={mode === 'qr' ? 'Escaneie o código com o celular que tem o WhatsApp da empresa.' : 'Conecte digitando um código no celular, sem câmera.'}
      footer={
        real ? <>
          <Button variant="ghost" className="mr-auto" onClick={() => setMode(mode === 'qr' ? 'codigo' : 'qr')}>
            {mode === 'qr' ? <><Smartphone /> Conectar com código de 8 dígitos</> : <><QrCode /> Voltar para o QR Code</>}
          </Button>
        </> : <p className="text-sm text-muted">A conexão real está disponível no aplicativo para Windows.</p>
      }
    >
      {mode === 'codigo' ? (
        <div className="flex flex-col gap-4 pb-2">
          <Field label="Número do WhatsApp da empresa" hint="Com DDD. O código aparece aqui para você digitar no celular.">
            <div className="flex gap-2">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 90000-0000" />
              <Button
                disabled={pairing || phone.replace(/\D/g, '').length < 10}
                onClick={async () => {
                  if (real && window.icchat) {
                    setPairing(true)
                    const r = await window.icchat.wa.pair(phone.replace(/\D/g, '').replace(/^(?!55)/, '55'))
                    setPairing(false)
                    if (r.ok) setCode(r.data.replace(/-/g, ''))
                    else toast.error('Não foi possível gerar o código', { description: r.error })
                    return
                  }
                  toast.error('Conexão real disponível somente no aplicativo para Windows')
                }}
              >
                {pairing ? <Loader2 className="animate-spin" /> : null} Gerar código
              </Button>
            </div>
          </Field>
          {code && (
            <div className="rounded-xl bg-surface-2 p-4 text-center">
              <p className="text-xs text-muted">Digite no celular</p>
              <p className="mt-1 font-mono text-3xl font-bold tracking-[0.25em]">{code.slice(0, 4)}-{code.slice(4)}</p>
            </div>
          )}
          <ol className="flex flex-col gap-2 text-[13px] text-muted">
            <li>1. No celular, abra o WhatsApp → <b>Aparelhos conectados</b> → <b>Conectar aparelho</b></li>
            <li>2. Toque em <b>Conectar com número de telefone</b></li>
            <li>3. Digite o código acima</li>
          </ol>
        </div>
      ) : (
      <div className="flex flex-col items-center gap-6 pb-2 sm:flex-row sm:items-start">
        <div className="relative size-56 shrink-0 rounded-2xl border border-border bg-white p-3 shadow-sm">
          {real ? (
            real.state.qr ? (
              <img src={real.state.qr} alt="QR Code do WhatsApp" className="size-full" />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-2 text-center text-xs text-slate-500">
                <Loader2 className="size-6 animate-spin text-slate-400" />
                {real.state.status === 'conectado' ? 'Conectado!' : 'Gerando QR Code…'}
              </div>
            )
          ) : <p className="p-4 text-center text-xs text-slate-600">Use o aplicativo para Windows para gerar um QR Code real.</p>}
          <div className="absolute top-1/2 left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl bg-white shadow">
            <ChannelBadge kind="whatsapp" size={34} className="ring-0" />
          </div>
        </div>
        <ol className="flex flex-col gap-3 text-[13.5px]">
          {[
            'Abra o WhatsApp no celular da empresa',
            <>Toque em <b>Mais opções ⋮</b> ou <b>Configurações</b></>,
            <>Toque em <b>Aparelhos conectados</b> e depois em <b>Conectar aparelho</b></>,
            'Aponte a câmera para este código'
          ].map((t, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">{i + 1}</span>
              <span className="pt-0.5">{t}</span>
            </li>
          ))}
          <li className="mt-1 flex items-center gap-2 text-xs text-muted">
            <RefreshCw className="size-3.5 animate-spin [animation-duration:3s]" /> Novo código em {seconds}s
          </li>
        </ol>
      </div>
      )}
    </Dialog>
  )
}

function OfficialDialog({ open, onOpenChange, onConnected }: { open: boolean; onOpenChange: (v: boolean) => void; onConnected: (phoneId: string) => void }) {
  const [token, setToken] = useState('')
  const [phoneId, setPhoneId] = useState('')
  const [waba, setWaba] = useState('')
  const [testing, setTesting] = useState(false)
  const valid = token.trim().length > 20 && /^\d{6,}$/.test(phoneId.trim()) && /^\d{6,}$/.test(waba.trim())
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Conectar WhatsApp Oficial"
      description="Cole os dados do seu app na Meta for Developers."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!valid || testing}
            onClick={() => {
              setTesting(true)
              setTimeout(() => {
                setTesting(false)
                onConnected(phoneId.trim())
              }, 1500)
            }}
          >
            {testing ? <Loader2 className="animate-spin" /> : null} Testar e conectar
          </Button>
        </>
      }
    >
      <div className="mb-4 flex gap-2.5 rounded-xl bg-primary-soft p-3 text-[12.5px] text-primary">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          É necessário ter <b>CNPJ</b> e uma conta no <b>Meta Business</b> verificada.{' '}
          <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-semibold underline">
            Ver passo a passo <ExternalLink className="size-3" />
          </a>
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <Field label="Token de acesso permanente" hint="Gerado em Usuários do sistema no Meta Business">
          <Input type="password" placeholder="EAAG…" value={token} onChange={(e) => setToken(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ID do número (Phone Number ID)">
            <Input placeholder="1234567890" value={phoneId} onChange={(e) => setPhoneId(e.target.value)} />
          </Field>
          <Field label="ID da conta (WABA ID)">
            <Input placeholder="9876543210" value={waba} onChange={(e) => setWaba(e.target.value)} />
          </Field>
        </div>
        <Field label="URL do webhook (copie para a Meta)">
          <Input readOnly value="https://hooks.icchat.itacondo.com.br/wa/studio-bella" icon={<QrCode />} />
        </Field>
      </div>
    </Dialog>
  )
}
