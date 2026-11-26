import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import QRCode from 'qrcode'
import { Check, Copy, MessageCircle, QrCode } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/overlay'
import { useCompany } from '@/lib/company'
import { buildPix } from '@/lib/pix'
import { brl } from '@/lib/utils'

/**
 * Gera o PIX copia e cola (e o QR) com o valor já preenchido, usando a chave da empresa.
 * Sem gateway e sem taxa: o dinheiro cai direto na conta da empresa.
 */
export function PixDialog({
  open,
  onClose,
  amount: initialAmount,
  description,
  txid,
  onSend,
  onPaid,
  paid
}: {
  open: boolean
  onClose: () => void
  amount: number
  description: string
  /** Identificador da cobrança (aparece no extrato do banco) */
  txid?: string
  /** Mandar o código para o cliente (WhatsApp) */
  onSend?: (code: string, amount: number) => void
  /** Marcar como pago (a conferência é manual, no app do banco) */
  onPaid?: (amount: number, code: string) => void
  paid?: boolean
}) {
  const { automations } = useCompany()
  const navigate = useNavigate()
  const pix = automations.pix
  const [amount, setAmount] = useState(initialAmount)
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open) setAmount(initialAmount)
  }, [open, initialAmount])

  const result = useMemo(() => {
    if (!pix.key) return { error: 'missing' as const }
    try {
      return { code: buildPix({ key: pix.key, name: pix.name, city: pix.city, amount: amount > 0 ? amount : undefined, txid, message: description }) }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }, [pix.key, pix.name, pix.city, amount, txid, description])

  useEffect(() => {
    if (!result.code) return setQr('')
    let alive = true
    void QRCode.toDataURL(result.code, { margin: 1, width: 220 }).then((url) => alive && setQr(url)).catch(() => alive && setQr(''))
    return () => { alive = false }
  }, [result.code])

  const copy = async () => {
    if (!result.code) return
    try {
      await navigator.clipboard.writeText(result.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
      toast.success('PIX copia e cola copiado')
    } catch {
      toast.error('Não foi possível copiar. Selecione o código e copie manualmente.')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title="Cobrar por PIX"
      description={description}
      footer={
        result.error === 'missing' ? (
          <Button onClick={() => { onClose(); navigate('/config?tab=automacoes') }}>Cadastrar chave PIX</Button>
        ) : (
          <>
            {onPaid && !paid && <Button variant="outline" disabled={!result.code} onClick={() => result.code && onPaid(amount, result.code)}><Check /> Marcar como pago</Button>}
            {onSend && <Button disabled={!result.code} onClick={() => result.code && onSend(result.code, amount)}><MessageCircle /> Enviar ao cliente</Button>}
          </>
        )
      }
    >
      {result.error === 'missing' ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <QrCode className="size-10 text-subtle" />
          <p className="font-semibold">Cadastre a chave PIX da empresa</p>
          <p className="text-sm text-muted">Em Configurações → Automações. O dinheiro cai direto na sua conta, sem taxa.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Field label="Valor (R$)">
            <Input type="number" inputMode="decimal" min={0} step="0.01" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} aria-label="Valor do PIX" />
          </Field>
          {result.error ? (
            <p className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{result.error}</p>
          ) : (
            <>
              <div className="flex flex-col items-center gap-2">
                {qr ? <img src={qr} alt="QR Code do PIX" className="size-[200px] rounded-lg border border-border bg-white p-1" /> : <div className="size-[200px] animate-pulse rounded-lg bg-surface-2" />}
                <p className="text-sm font-semibold">{amount > 0 ? brl.format(amount) : 'Valor digitado pelo cliente'}</p>
                {paid && <p className="text-sm font-medium text-success">Pago</p>}
              </div>
              <div>
                <p className="mb-1.5 text-[13px] font-medium">PIX copia e cola</p>
                <div className="flex gap-2">
                  <code data-testid="pix-code" className="min-w-0 flex-1 truncate rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs">{result.code}</code>
                  <Button variant="outline" size="sm" onClick={() => void copy()} aria-label="Copiar código PIX">{copied ? <Check /> : <Copy />}</Button>
                </div>
                <p className="mt-1.5 text-xs text-muted">Confira o pagamento no app do seu banco antes de marcar como pago.</p>
              </div>
            </>
          )}
        </div>
      )}
    </Dialog>
  )
}

/** Texto padrão para mandar o PIX ao cliente */
export function pixMessage(name: string, what: string, amount: number, code: string): string {
  return `Olá, ${name.split(' ')[0]}! Para garantir ${what}, o valor é ${brl.format(amount)}.\n\nPIX copia e cola:\n${code}\n\nÉ só colar no app do seu banco. Assim que pagar, me mande o comprovante por aqui. 😊`
}
