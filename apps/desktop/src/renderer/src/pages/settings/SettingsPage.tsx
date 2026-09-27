import { useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import {
  Building2,
  Clock,
  Copy,
  Database,
  KeyRound,
  Laptop,
  MessageSquareText,
  Monitor,
  Moon,
  Palette,
  Pencil,
  Plus,
  Scissors,
  Server,
  Sun,
  Tags,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Page } from '@/components/layout/Page'
import { Dialog } from '@/components/ui/overlay'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Badge, Card, CardHeader, Progress, Segmented } from '@/components/ui/misc'
import { RuleIcons, TagChip, TagEditorDialog } from '@/components/tags'
import { useAppState, type LicenseState } from '@/lib/app-state'
import { useTags, type Tag } from '@/lib/tags'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { useCompany } from '@/lib/company'
import { CompanyTab } from './CompanyTab'
import { DataTab } from './DataTab'
import { ProfessionalsTab, QuickRepliesTab, ServicesTab } from './CatalogTabs'

const TABS = [
  { id: 'empresa', label: 'Empresa', icon: Building2 },
  { id: 'profissionais', label: 'Profissionais', icon: Scissors },
  { id: 'servicos', label: 'Serviços', icon: Clock },
  { id: 'etiquetas', label: 'Etiquetas', icon: Tags },
  { id: 'respostas', label: 'Respostas rápidas', icon: MessageSquareText },
  { id: 'dados', label: 'Dados', icon: Database },
  { id: 'licenca', label: 'Licença', icon: KeyRound },
  { id: 'aparencia', label: 'Aparência', icon: Palette }
] as const
type TabId = (typeof TABS)[number]['id']

export function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const tab = (TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'empresa') as TabId
  const setTab = (t: TabId) => setParams({ tab: t }, { replace: true })
  const { info, segmentLabel } = useCompany()

  return (
    <Page title="Configurações" description={`${info.name} · ${segmentLabel}`}>
      <div className="flex flex-col gap-5 lg:flex-row">
        <nav className="scroll-thin -mx-4 flex shrink-0 gap-1 overflow-x-auto px-4 lg:mx-0 lg:w-56 lg:flex-col lg:overflow-visible lg:px-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium whitespace-nowrap',
                tab === t.id ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface-2 hover:text-foreground'
              )}
            >
              <t.icon className="size-4" /> {t.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          {tab === 'empresa' && <CompanyTab />}
          {tab === 'profissionais' && <ProfessionalsTab />}
          {tab === 'servicos' && <ServicesTab />}
          {tab === 'etiquetas' && <TagsTab />}
          {tab === 'respostas' && <QuickRepliesTab />}
          {tab === 'dados' && <DataTab />}
          {tab === 'licenca' && <LicenseTab />}
          {tab === 'aparencia' && <AppearanceTab />}
        </div>
      </div>
    </Page>
  )
}







function TagsTab() {
  const { tags, countOf } = useTags()
  const [editing, setEditing] = useState<Tag | null | 'new'>(null)
  const [deleting, setDeleting] = useState<Tag | null>(null)
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Etiquetas"
        description="Organizam os clientes e, com regras, mudam como o atendimento funciona"
        action={<Button size="sm" onClick={() => setEditing('new')}><Plus /> Nova etiqueta</Button>}
      />
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full min-w-[620px] text-[13.5px]">
          <thead>
            <tr className="border-y border-border bg-surface-2/60 text-left text-[11px] font-semibold tracking-wider text-subtle uppercase">
              <th className="px-5 py-2.5">Etiqueta</th>
              <th className="px-3 py-2.5">O que faz</th>
              <th className="px-3 py-2.5 text-right">Clientes</th>
              <th className="w-24 px-3 py-2.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((t) => (
              <tr key={t.id} onClick={() => setEditing(t)} className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-2/40">
                <td className="px-5 py-3">
                  <TagChip tag={t} size="md" />
                  {t.description && <p className="mt-1 text-xs text-muted">{t.description}</p>}
                </td>
                <td className="px-3 py-3"><RuleIcons rules={t.rules} /></td>
                <td className="px-3 py-3 text-right tabular-nums">{countOf(t.id)}</td>
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-0.5">
                    <Button variant="ghost" size="icon-sm" aria-label={`Editar ${t.name}`} onClick={() => setEditing(t)}><Pencil /></Button>
                    <Button variant="ghost" size="icon-sm" className="hover:text-danger" aria-label={`Excluir ${t.name}`} onClick={() => setDeleting(t)}><Trash2 /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TagEditorDialog tag={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />
      <DeleteTagDialog tag={deleting} onClose={() => setDeleting(null)} />
    </Card>
  )
}

function DeleteTagDialog({ tag, onClose }: { tag: Tag | null; onClose: () => void }) {
  const { deleteTag, countOf } = useTags()
  const n = tag ? countOf(tag.id) : 0
  return (
    <Dialog
      open={Boolean(tag)}
      onOpenChange={(v) => !v && onClose()}
      title="Excluir etiqueta?"
      description={tag ? `“${tag.name}” será removida de ${n} ${n === 1 ? 'cliente' : 'clientes'} e as regras dela deixam de valer.` : ''}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            variant="danger"
            onClick={() => {
              if (tag) deleteTag(tag.id)
              toast.success('Etiqueta excluída')
              onClose()
            }}
          >
            <Trash2 /> Excluir
          </Button>
        </>
      }
    >
      {tag && <TagChip tag={tag} size="md" />}
    </Dialog>
  )
}


function LicenseTab() {
  const { license, simulateLicense, activateLicense } = useAppState()
  const [keyOpen, setKeyOpen] = useState(false)
  const [newKey, setNewKey] = useState('')
  const keyOk = /^ICCH(-[A-Z0-9]{4}){4}$/.test(newKey.trim().toUpperCase())
  const stateCfg: Record<LicenseState, { label: string; tone: 'success' | 'primary' | 'warning' | 'danger' }> = {
    ativa: { label: 'Ativa', tone: 'success' },
    teste: { label: 'Teste grátis', tone: 'primary' },
    vencendo: { label: 'Vencendo', tone: 'warning' },
    carencia: { label: 'Em carência', tone: 'danger' },
    restrito: { label: 'Modo restrito', tone: 'danger' }
  }
  const s = stateCfg[license.state]
  const pcs = [
    { name: 'RECEPCAO-01', role: 'Servidor', last: 'agora', me: true },
    { name: 'NOTEBOOK-GERENCIA', role: 'Atendimento', last: 'há 3 h' }
  ]

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden">
        <div className="brand-gradient flex flex-col gap-4 p-5 text-white sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="text-sm text-white/75">Plano</p>
            <p className="text-2xl font-bold">IC Chat {license.plan}</p>
            <Badge className="mt-2 bg-white/20 text-white">{s.label}</Badge>
          </div>
          <div className="rounded-xl bg-white/12 px-4 py-3 backdrop-blur">
            <p className="text-xs text-white/75">{license.daysLeft >= 0 ? 'Válida até' : 'Venceu em'}</p>
            <p className="text-lg font-bold">{license.expiresAt}</p>
            <p className="text-xs text-white/75">{license.daysLeft >= 0 ? `${license.daysLeft} dias restantes` : `há ${Math.abs(license.daysLeft)} dias`}</p>
          </div>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Chave de licença">
            <Input
              readOnly
              value={license.key}
              className="font-mono tracking-wider"
              trailing={
                <button onClick={() => { void navigator.clipboard?.writeText(license.key); toast.success('Chave copiada') }} className="rounded p-1 hover:text-foreground" aria-label="Copiar">
                  <Copy className="size-4" />
                </button>
              }
            />
          </Field>
          <div className="flex flex-col gap-1.5">
            <p className="text-[13px] font-medium">Computadores</p>
            <div className="flex h-9 items-center gap-3">
              <Progress value={license.pcsMax ? (license.pcsUsed / license.pcsMax) * 100 : 5} className="flex-1" />
              <span className="text-sm font-semibold tabular-nums">{license.pcsUsed} / {license.pcsMax ?? '∞'}</span>
            </div>
          </div>
          <p className="text-xs text-muted sm:col-span-2">
            Última verificação com o servidor de licenças: {license.lastCheck}. O sistema funciona até 7 dias sem internet. Após o vencimento há 3 dias de carência antes do modo restrito.
          </p>
        </div>
        <div className="flex flex-col gap-2 border-t border-border px-5 py-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setKeyOpen(true)}><KeyRound /> Inserir nova chave</Button>
          <Button onClick={() => window.open('https://wa.me/5511900000000?text=' + encodeURIComponent(`Olá! Quero renovar a licença do IC Chat (${license.key}).`), '_blank')}>
            Falar com o suporte para renovar
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Computadores ativos" description="Para liberar uma vaga, peça ao suporte IC Chat" />
        <div className="flex flex-col">
          {pcs.map((pc) => (
            <div key={pc.name} className="flex items-center gap-3 border-t border-border px-5 py-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-surface-2 text-muted">
                {pc.role === 'Servidor' ? <Server className="size-4" /> : <Laptop className="size-4" />}
              </span>
              <div className="flex-1">
                <p className="text-[13.5px] font-medium">{pc.name} {pc.me && <span className="text-xs text-muted">(este computador)</span>}</p>
                <p className="text-xs text-muted">{pc.role} · visto {pc.last}</p>
              </div>
              <Badge tone={pc.role === 'Servidor' ? 'primary' : 'neutral'}>{pc.role}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Dialog
        open={keyOpen}
        onOpenChange={setKeyOpen}
        title="Inserir nova chave de licença"
        description="Cole a chave recebida por WhatsApp ou e-mail. Ela é validada no servidor de licenças."
        footer={
          <>
            <Button variant="outline" onClick={() => setKeyOpen(false)}>Cancelar</Button>
            <Button
              disabled={!keyOk}
              onClick={() => {
                activateLicense(newKey.trim().toUpperCase())
                setKeyOpen(false)
                setNewKey('')
                toast.success('Licença ativada', { description: 'Plano Pro válido por 30 dias.' })
              }}
            >
              <KeyRound /> Ativar
            </Button>
          </>
        }
      >
        <Field label="Chave" hint={newKey && !keyOk ? <span className="text-danger">Formato esperado: ICCH-XXXX-XXXX-XXXX-XXXX</span> : 'Formato: ICCH-XXXX-XXXX-XXXX-XXXX'}>
          <Input autoFocus value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="ICCH-XXXX-XXXX-XXXX-XXXX" className="font-mono tracking-wider uppercase" />
        </Field>
      </Dialog>

      <Card className="border-dashed">
        <CardHeader title="Pré-visualizar estados da licença" description="Apenas para demonstração do design" />
        <div className="flex flex-wrap gap-2 px-5 pb-5">
          {(Object.keys(stateCfg) as LicenseState[]).map((k) => (
            <Button key={k} size="sm" variant={license.state === k ? 'primary' : 'outline'} onClick={() => simulateLicense(k)}>
              {stateCfg[k].label}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  )
}

function AppearanceTab() {
  const { theme, setTheme, density, setDensity } = useTheme()
  const { sidebarCollapsed, setSidebarCollapsed, sidebarHidden, setSidebarHidden } = useAppState()
  const menu = sidebarHidden ? 'escondido' : sidebarCollapsed ? 'icones' : 'completo'
  const opt = (value: 'light' | 'dark' | 'system', label: string, icon: ReactNode, preview: string) => (
    <button
      onClick={() => setTheme(value)}
      className={cn('flex flex-col gap-2 rounded-xl border-2 p-2 text-left', theme === value ? 'border-primary' : 'border-border hover:border-border-strong')}
    >
      <div className={cn('h-20 rounded-lg', preview)} />
      <span className="flex items-center gap-2 px-1 text-[13px] font-medium [&_svg]:size-4">{icon} {label}</span>
    </button>
  )
  return (
    <Card>
      <CardHeader title="Aparência" description="Preferências deste computador" />
      <div className="flex flex-col gap-6 px-5 pb-5">
        <div>
          <p className="mb-2 text-[13px] font-medium">Tema</p>
          <div className="grid grid-cols-3 gap-3">
            {opt('light', 'Claro', <Sun />, 'bg-gradient-to-br from-slate-100 to-white ring-1 ring-slate-200')}
            {opt('dark', 'Escuro', <Moon />, 'bg-gradient-to-br from-slate-900 to-slate-800')}
            {opt('system', 'Sistema', <Monitor />, 'bg-[linear-gradient(135deg,#f1f5f9_50%,#0f172a_50%)]')}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[13px] font-medium">Densidade</p>
          <Segmented
            value={density}
            onChange={setDensity}
            options={[
              { value: 'comfortable', label: 'Confortável' },
              { value: 'compact', label: 'Compacta' }
            ]}
          />
          <p className="mt-1.5 text-xs text-muted">Compacta mostra mais informação por tela (bom para monitores pequenos).</p>
        </div>
        <div>
          <p className="mb-2 text-[13px] font-medium">Menu lateral</p>
          <Segmented
            value={menu}
            onChange={(v) => {
              setSidebarHidden(v === 'escondido')
              setSidebarCollapsed(v === 'icones')
            }}
            options={[
              { value: 'completo', label: 'Completo' },
              { value: 'icones', label: 'Só ícones' },
              { value: 'escondido', label: 'Escondido' }
            ]}
          />
          <p className="mt-1.5 text-xs text-muted">Atalho: Ctrl + B mostra ou esconde o menu.</p>
        </div>
      </div>
    </Card>
  )
}
