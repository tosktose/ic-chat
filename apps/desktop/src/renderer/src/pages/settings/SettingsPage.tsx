import { useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import {
  Building2,
  Clock,
  Database,
  KeyRound,
  MessageSquareText,
  Monitor,
  Moon,
  Palette,
  Pencil,
  Plus,
  Scissors,
  Sun,
  Tags,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Page } from '@/components/layout/Page'
import { Dialog } from '@/components/ui/overlay'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, Segmented } from '@/components/ui/misc'
import { RuleIcons, TagChip, TagEditorDialog } from '@/components/tags'
import { useAppState } from '@/lib/app-state'
import { useTags, type Tag } from '@/lib/tags'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { useCompany } from '@/lib/company'
import { CompanyTab } from './CompanyTab'
import { LicenseTab } from './LicenseTab'
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
