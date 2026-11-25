import { Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Card, CardHeader, Switch } from '@/components/ui/misc'
import { useCompany } from '@/lib/company'
import { normalizePixKey, PIX_KIND_LABEL } from '@/lib/pix'
import { DEFAULT_REMINDERS } from '@/lib/reminders'
import { DEFAULT_WINBACK } from '@/lib/winback'
import { getSiteUrl } from '@/lib/site-url'

function Toggle({ label, hint, checked, onChange, id }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <p className="text-[13.5px] font-medium">{label}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  )
}

const VARS = 'Use {nome}, {servico}, {quando}, {hora}, {data}, {profissional} e {empresa}.'

/** Lembretes, PIX, retorno de clientes e agendamento online */
export function AutomationsTab() {
  const { automations, updateAutomations, tenantId } = useCompany()
  const { reminders, winback, pix, booking } = automations
  const pixKey = pix.key ? normalizePixKey(pix.key) : null
  const bookingUrl = tenantId ? `${getSiteUrl()}/agendar/${tenantId}` : ''

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title="Lembretes de horário" description="O cliente recebe a mensagem no WhatsApp e responde 1 para confirmar ou 2 para remarcar." />
        <div className="flex flex-col gap-4 px-5 pb-5">
          <Toggle id="rem-on" label="Lembretes ligados" checked={reminders.enabled} onChange={(v) => updateAutomations('reminders', { enabled: v })} />
          {reminders.enabled && (
            <>
              <Toggle id="rem-24" label="24 horas antes" checked={reminders.before24h} onChange={(v) => updateAutomations('reminders', { before24h: v })} />
              <Toggle id="rem-2" label="2 horas antes" checked={reminders.before2h} onChange={(v) => updateAutomations('reminders', { before2h: v })} />
              <Toggle
                id="rem-auto"
                label="Enviar sozinho pelo WhatsApp conectado"
                hint="No app instalado. No navegador, os lembretes ficam na tela Lembretes para enviar com um clique."
                checked={reminders.autoSend}
                onChange={(v) => updateAutomations('reminders', { autoSend: v })}
              />
              <Field label="Mensagem de 24 horas" hint={VARS}>
                <Textarea rows={4} value={reminders.template24h} onChange={(e) => updateAutomations('reminders', { template24h: e.target.value })} />
              </Field>
              <Field label="Mensagem de 2 horas">
                <Textarea rows={3} value={reminders.template2h} onChange={(e) => updateAutomations('reminders', { template2h: e.target.value })} />
              </Field>
              <div>
                <Button variant="ghost" size="sm" onClick={() => updateAutomations('reminders', { template24h: DEFAULT_REMINDERS.template24h, template2h: DEFAULT_REMINDERS.template2h })}>Voltar às mensagens padrão</Button>
              </div>
            </>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="PIX da empresa" description="Para cobrar sinal no agendamento e enviar cobranças. Sem taxa: o dinheiro cai direto na sua conta." />
        <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
          <Field
            label="Chave PIX"
            className="sm:col-span-2"
            hint={pix.key ? (pixKey ? `Chave reconhecida: ${PIX_KIND_LABEL[pixKey.kind]}` : 'Chave inválida. Use CPF, CNPJ, e-mail, celular ou chave aleatória.') : 'CPF, CNPJ, e-mail, celular ou chave aleatória'}
          >
            <Input value={pix.key} aria-invalid={Boolean(pix.key && !pixKey)} onChange={(e) => updateAutomations('pix', { key: e.target.value })} placeholder="ex.: 12.345.678/0001-90" />
          </Field>
          <Field label="Nome de quem recebe" hint="Como aparece no banco do cliente">
            <Input value={pix.name} maxLength={25} onChange={(e) => updateAutomations('pix', { name: e.target.value })} />
          </Field>
          <Field label="Cidade">
            <Input value={pix.city} maxLength={15} onChange={(e) => updateAutomations('pix', { city: e.target.value })} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Clientes de volta" description="Mensagem depois do atendimento e convite para quem sumiu." />
        <div className="flex flex-col gap-4 px-5 pb-5">
          <Toggle id="wb-on" label="Retorno de clientes ligado" checked={winback.enabled} onChange={(v) => updateAutomations('winback', { enabled: v })} />
          {winback.enabled && (
            <>
              {winback.steps.map((step, i) => (
                <div key={i} className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[120px_1fr]">
                  <Field label="Dias depois">
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={step.days}
                      onChange={(e) => {
                        const days = Math.max(1, Math.min(365, Number(e.target.value) || 1))
                        updateAutomations('winback', { steps: winback.steps.map((s, j) => (j === i ? { ...s, days } : s)) })
                      }}
                    />
                  </Field>
                  <Field label={step.label}>
                    <Textarea rows={2} value={step.template} onChange={(e) => updateAutomations('winback', { steps: winback.steps.map((s, j) => (j === i ? { ...s, template: e.target.value } : s)) })} />
                  </Field>
                </div>
              ))}
              <div className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[120px_1fr]">
                <Field label="Sumido após">
                  <Input type="number" min={15} max={730} value={winback.lapsedDays} onChange={(e) => updateAutomations('winback', { lapsedDays: Math.max(15, Math.min(730, Number(e.target.value) || 60)) })} />
                </Field>
                <Field label="Mensagem para quem sumiu" hint="Use {nome}, {servico} e {empresa}.">
                  <Textarea rows={2} value={winback.lapsedTemplate} onChange={(e) => updateAutomations('winback', { lapsedTemplate: e.target.value })} />
                </Field>
              </div>
              <div>
                <Button variant="ghost" size="sm" onClick={() => updateAutomations('winback', { steps: DEFAULT_WINBACK.steps, lapsedDays: DEFAULT_WINBACK.lapsedDays, lapsedTemplate: DEFAULT_WINBACK.lapsedTemplate })}>Voltar ao padrão</Button>
              </div>
            </>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Agendamento online" description="Link para o cliente escolher serviço, profissional e horário sozinho. Coloque na bio do Instagram e no status." />
        <div className="flex flex-col gap-4 px-5 pb-5">
          <Toggle id="bk-on" label="Página de agendamento ligada" checked={booking.enabled} onChange={(v) => updateAutomations('booking', { enabled: v })} />
          {booking.enabled && (
            <>
              {bookingUrl ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-2 p-3">
                  <code data-testid="booking-url" className="min-w-0 flex-1 truncate text-[13px]">{bookingUrl}</code>
                  <Button size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(bookingUrl).then(() => toast.success('Link copiado'), () => toast.error('Não foi possível copiar'))}><Copy /> Copiar</Button>
                  <Button size="sm" variant="outline" onClick={() => window.open(bookingUrl, '_blank', 'noopener')}><ExternalLink /> Abrir</Button>
                </div>
              ) : (
                <p className="rounded-xl bg-surface-2 p-3 text-[13px] text-muted">O link aparece quando a conta da empresa estiver conectada (entre pelo site ou pelo app com a sua conta).</p>
              )}
              <Field label="Até quantos dias à frente" hint="O cliente só vê horários dentro desse prazo">
                <Input type="number" min={1} max={90} value={booking.daysAhead} onChange={(e) => updateAutomations('booking', { daysAhead: Math.max(1, Math.min(90, Number(e.target.value) || 30)) })} />
              </Field>
              <Field label="Aviso na página (opcional)" hint="ex.: Tolerância de 10 minutos. Sinal por PIX para horários acima de 1 hora.">
                <Textarea rows={2} maxLength={300} value={booking.note} onChange={(e) => updateAutomations('booking', { note: e.target.value })} />
              </Field>
              <p className="text-xs text-muted">A página mostra só os serviços, profissionais e horários livres. Nenhum dado de cliente fica visível.</p>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
