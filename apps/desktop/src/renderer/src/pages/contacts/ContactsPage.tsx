import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Download, MessageSquare, Search, Upload, UserPlus } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, Card } from '@/components/ui/misc'
import { TagChip } from '@/components/tags'
import { TAG_COLORS, useTags } from '@/lib/tags'
import { brl, cn, formatPhone } from '@/lib/utils'
import { contacts, conversations, professionalById } from '@/data/mock'

export function ContactsPage() {
  const [q, setQ] = useState('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const navigate = useNavigate()
  const { tags, tagsOf, hasTag, countOf } = useTags()
  const list = contacts.filter(
    (c) =>
      (!tagFilter || hasTag(c.id, tagFilter)) &&
      (c.name + c.phone + tagsOf(c.id).map((t) => t.name).join(' ')).toLowerCase().includes(q.toLowerCase())
  )
  const openChat = (contactId: string) => {
    const conv = conversations.find((v) => v.contactId === contactId)
    navigate(conv ? `/inbox?c=${conv.id}` : '/inbox')
  }

  return (
    <Page
      title="Contatos"
      description={`${contacts.length} clientes cadastrados`}
      actions={
        <>
          <Button variant="outline"><Upload /> <span className="hidden sm:inline">Importar</span></Button>
          <Button variant="outline"><Download /> <span className="hidden sm:inline">Exportar</span></Button>
          <Button><UserPlus /> Novo contato</Button>
        </>
      }
    >
      <div className="mb-3 max-w-md">
        <Input icon={<Search />} placeholder="Buscar por nome, telefone ou etiqueta" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="scroll-thin -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <button
          onClick={() => setTagFilter(null)}
          className={cn('h-7 shrink-0 rounded-full px-3 text-xs font-medium whitespace-nowrap', !tagFilter ? 'bg-foreground text-background' : 'bg-surface-2 text-muted hover:text-foreground')}
        >
          Todos · {contacts.length}
        </button>
        {tags.map((t) => (
          <button
            key={t.id}
            onClick={() => setTagFilter(tagFilter === t.id ? null : t.id)}
            className={cn(
              'flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium whitespace-nowrap',
              tagFilter === t.id ? 'border-primary bg-primary-soft text-primary' : 'border-border text-muted hover:text-foreground'
            )}
          >
            <span className={cn('size-2 rounded-full', TAG_COLORS[t.color].dot)} /> {t.name} · {countOf(t.id)}
          </button>
        ))}
      </div>

      {/* Tabela (tablet/desktop) */}
      <Card className="hidden overflow-hidden md:block">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-surface-2/60 text-left text-[11px] font-semibold tracking-wider text-subtle uppercase">
              <th className="px-5 py-3">Cliente</th>
              <th className="px-3 py-3">Telefone</th>
              <th className="hidden px-3 py-3 lg:table-cell">Etiquetas</th>
              <th className="hidden px-3 py-3 xl:table-cell">Profissional preferido</th>
              <th className="px-3 py-3 text-right">Visitas</th>
              <th className="px-3 py-3 text-right">Gasto</th>
              <th className="w-14 px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="group border-b border-border last:border-0 hover:bg-surface-2/50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={c.name} size={34} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.name}</p>
                      <p className="truncate text-xs text-muted">desde {c.since}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-muted tabular-nums">{formatPhone(c.phone)}</td>
                <td className="hidden px-3 py-3 lg:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {tagsOf(c.id).map((t) => (
                      <TagChip key={t.id} tag={t} />
                    ))}
                  </div>
                </td>
                <td className="hidden px-3 py-3 text-muted xl:table-cell">{professionalById(c.favoriteProfessional)?.name ?? '—'}</td>
                <td className="px-3 py-3 text-right tabular-nums">{c.visits}</td>
                <td className="px-3 py-3 text-right font-medium tabular-nums">{brl.format(c.spent)}</td>
                <td className="px-3 py-3">
                  <Button variant="ghost" size="icon-sm" onClick={() => openChat(c.id)} aria-label="Abrir conversa">
                    <MessageSquare />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Cartões (celular) */}
      <div className="flex flex-col gap-2 md:hidden">
        {list.map((c) => (
          <button key={c.id} onClick={() => openChat(c.id)} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left">
            <Avatar name={c.name} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{c.name}</p>
              <p className="text-[13px] text-muted">{formatPhone(c.phone)}</p>
              {tagsOf(c.id).length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {tagsOf(c.id).map((t) => (
                      <TagChip key={t.id} tag={t} />
                    ))}
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-[13px] font-semibold">{c.visits}</p>
              <p className="text-[11px] text-muted">visitas</p>
            </div>
          </button>
        ))}
      </div>
    </Page>
  )
}
