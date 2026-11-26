import { Copy, ExternalLink, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/misc'
import { getSiteUrl } from '@/lib/site-url'
import { useTenantId } from '@/lib/tenant'

/** Link público de captação: vai na bio do Instagram, no status do WhatsApp ou em anúncios. Quem preenche cai direto no funil. */
export function LeadLinkCard() {
  const tenantId = useTenantId()
  if (!tenantId) return null
  const url = `${getSiteUrl()}/c/${tenantId}`
  const copy = () => { void navigator.clipboard.writeText(url).then(() => toast.success('Link copiado'), () => toast.error('Não foi possível copiar')) }
  return (
    <Card className="mb-5 flex flex-wrap items-center gap-3 p-4">
      <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary"><Link2 className="size-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">Seu link de captação (link na bio)</p>
        <p className="truncate text-[12.5px] text-muted">{url}</p>
        <p className="mt-0.5 text-[12px] text-subtle">Coloque na bio do Instagram, no status do WhatsApp ou em anúncios: quem preencher entra direto no seu atendimento.</p>
      </div>
      <Button variant="outline" size="sm" onClick={copy}><Copy /> Copiar</Button>
      <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-muted hover:bg-surface-2 hover:text-foreground"><ExternalLink className="size-4" /> Abrir</a>
    </Card>
  )
}
