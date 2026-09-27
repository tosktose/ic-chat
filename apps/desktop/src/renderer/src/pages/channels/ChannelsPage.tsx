import { useState } from 'react'
import { ExternalLink, Info, Plus, QrCode, RefreshCw, ShieldAlert, ShieldCheck, Smartphone, Unplug } from 'lucide-react'
import { toast } from 'sonner'
import { ChannelBadge, GoogleIcon } from '@/components/brand'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Avatar, Badge, Card, CardHeader } from '@/components/ui/misc'
import { Dialog } from '@/components/ui/overlay'
import { useCompany } from '@/lib/company'

export function ChannelsPage() {
  const { professionals } = useCompany()
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
          <div className="mx-5 flex items-center gap-3 rounded-xl border border-border p-3">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-success" />
            </span>
            <div className="flex-1">
              <p className="text-[13.5px] font-semibold">(11) 98765-4321 · Studio Bella</p>
              <p className="text-xs text-muted">Conectado há 12 dias · última mensagem há 1 min</p>
            </div>
            <Button variant="ghost" size="icon-sm" aria-label="Reconectar"><RefreshCw /></Button>
            <Button variant="ghost" size="icon-sm" aria-label="Desconectar"><Unplug /></Button>
          </div>
          <div className="m-5 mt-3 flex gap-2.5 rounded-xl bg-warning-soft p-3 text-[12.5px] text-warning">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <p>Este método não é oficial da Meta. Envio em massa ou para quem não tem seu número salvo pode causar <b>bloqueio do número</b>. O IC Chat limita o ritmo de envio para proteger você.</p>
          </div>
          <div className="mt-auto border-t border-border p-4">
            <Button variant="outline" className="w-full" onClick={() => setQrOpen(true)}><Plus /> Conectar outro número</Button>
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
            <Button className="w-full" onClick={() => setOfficialOpen(true)}>Conectar WhatsApp Oficial</Button>
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
        <div className="grid gap-2 px-5 pb-5 sm:grid-cols-2">
          {professionals.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <Avatar name={p.name} size={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium">{p.name}</p>
                <p className="truncate text-xs text-muted">{i < 3 ? `${p.name.split(' ')[0].toLowerCase()}@gmail.com` : 'Não conectado'}</p>
              </div>
              {i < 3 ? <Badge tone="success">Sincronizado</Badge> : <Button size="sm" variant="outline">Conectar</Button>}
            </div>
          ))}
        </div>
      </Card>

      <QrDialog open={qrOpen} onOpenChange={setQrOpen} />
      <OfficialDialog open={officialOpen} onOpenChange={setOfficialOpen} />
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

/** QR "falso" só para a demonstração do layout */
function FakeQr() {
  const n = 29
  const cells: [number, number][] = []
  let seed = 7
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      seed = (seed * 9301 + 49297) % 233280
      const finder = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9)
      if (!finder && seed / 233280 > 0.52) cells.push([x, y])
    }
  const Finder = ({ x, y }: { x: number; y: number }) => (
    <g>
      <rect x={x} y={y} width={7} height={7} fill="#0f172a" rx={1.2} />
      <rect x={x + 1} y={y + 1} width={5} height={5} fill="#fff" rx={0.8} />
      <rect x={x + 2} y={y + 2} width={3} height={3} fill="#0f172a" rx={0.6} />
    </g>
  )
  return (
    <svg viewBox={`-1 -1 ${n + 2} ${n + 2}`} className="size-full" shapeRendering="crispEdges">
      <rect x={-1} y={-1} width={n + 2} height={n + 2} fill="#fff" />
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#0f172a" />
      ))}
      <Finder x={0} y={0} />
      <Finder x={n - 7} y={0} />
      <Finder x={0} y={n - 7} />
    </svg>
  )
}

function QrDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Conectar WhatsApp" description="Escaneie o código com o celular que tem o WhatsApp da empresa.">
      <div className="flex flex-col items-center gap-6 pb-2 sm:flex-row sm:items-start">
        <div className="relative size-56 shrink-0 rounded-2xl border border-border bg-white p-3 shadow-sm">
          <FakeQr />
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
            <RefreshCw className="size-3.5 animate-spin [animation-duration:3s]" /> O código atualiza a cada 20 segundos
          </li>
          <button className="flex items-center gap-2 text-left text-[13px] font-medium text-primary hover:underline">
            <Smartphone className="size-4" /> Prefiro conectar com código de 8 dígitos
          </button>
        </ol>
      </div>
    </Dialog>
  )
}

function OfficialDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Conectar WhatsApp Oficial"
      description="Cole os dados do seu app na Meta for Developers."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => { onOpenChange(false); toast.success('Conexão testada com sucesso') }}>Testar e conectar</Button>
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
          <Input type="password" placeholder="EAAG…" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ID do número (Phone Number ID)">
            <Input placeholder="1234567890" />
          </Field>
          <Field label="ID da conta (WABA ID)">
            <Input placeholder="9876543210" />
          </Field>
        </div>
        <Field label="URL do webhook (copie para a Meta)">
          <Input readOnly value="https://hooks.icchat.itacondo.com.br/wa/studio-bella" icon={<QrCode />} />
        </Field>
      </div>
    </Dialog>
  )
}
