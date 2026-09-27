import { KeyRound, Mail, Server, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { WhatsAppIcon } from '@/components/brand'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/input'
import { Badge, Card, CardHeader, Switch } from '@/components/ui/misc'

export function AdminSystemPage() {
  return (
    <Page
      title="Configurações do sistema"
      description="Servidor de licenças, avisos automáticos e segurança do IC Chat."
      actions={<Button onClick={() => toast.success('Configurações salvas')}>Salvar</Button>}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={<span className="flex items-center gap-2"><Server className="size-4" /> Servidor de licenças</span>}
            description="Onde os apps dos clientes validam a chave"
            action={<Badge tone="success">Online</Badge>}
          />
          <div className="flex flex-col gap-4 px-5 pb-5">
            <Field label="URL do servidor">
              <Input defaultValue="https://licencas.icchat.itacondo.com.br" />
            </Field>
            <Field label="Validação online a cada">
              <Select defaultValue="6">
                <option value="1">1 hora</option>
                <option value="6">6 horas</option>
                <option value="24">24 horas</option>
              </Select>
            </Field>
            <Field label="Chave pública de assinatura (Ed25519)" hint="A chave privada fica só no servidor, nunca no app.">
              <Input readOnly defaultValue="MCowBQYDK2VwAyEA3q9…Xk2f" icon={<KeyRound />} className="font-mono text-xs" />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Avisos de vencimento" description="Enviados automaticamente aos clientes" />
          <div className="flex flex-col gap-4 px-5 pb-5">
            <Field label="WhatsApp que envia os avisos">
              <Input icon={<WhatsAppIcon />} placeholder="(11) 90000-0000" />
            </Field>
            <Field label="E-mail que envia os avisos">
              <Input icon={<Mail />} defaultValue="avisos@itacondo.com.br" />
            </Field>
            <Field label="Quando avisar" hint="Dias antes do vencimento, no dia, durante a carência e ao bloquear">
              <Input defaultValue="15, 7, 3, 1 dias antes" />
            </Field>
            <label className="flex items-center justify-between rounded-xl border border-border p-3 text-[13.5px] font-medium">
              Receber resumo diário dos clientes bloqueados
              <Switch checked onCheckedChange={() => undefined} />
            </label>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title={<span className="flex items-center gap-2"><ShieldCheck className="size-4" /> Segurança do painel</span>} />
          <div className="grid gap-3 px-5 pb-5 sm:grid-cols-3">
            <label className="flex items-center justify-between rounded-xl border border-border p-3 text-[13.5px] font-medium">
              Verificação em 2 etapas
              <Switch checked onCheckedChange={() => undefined} />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-border p-3 text-[13.5px] font-medium">
              Registrar todas as ações
              <Switch checked onCheckedChange={() => undefined} />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-border p-3 text-[13.5px] font-medium">
              Restringir por IP
              <Switch checked={false} onCheckedChange={() => undefined} />
            </label>
          </div>
        </Card>
      </div>
    </Page>
  )
}
