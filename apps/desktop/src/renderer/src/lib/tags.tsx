import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { contacts } from '@/data/mock'

export type TagColor = 'blue' | 'cyan' | 'violet' | 'emerald' | 'amber' | 'rose' | 'orange' | 'slate'

/** Cores das etiquetas: fundo suave + fio de contorno + texto; a bolinha é sólida.
 *  O contorno dá definição ao chip sem precisar saturar o fundo. */
export const TAG_COLORS: Record<TagColor, { chip: string; dot: string; label: string }> = {
  blue: { chip: 'bg-blue-500/10 text-blue-700 ring-1 ring-inset ring-blue-500/20 dark:bg-blue-400/12 dark:text-blue-200 dark:ring-blue-400/25', dot: 'bg-blue-500', label: 'Azul' },
  cyan: { chip: 'bg-cyan-500/10 text-cyan-700 ring-1 ring-inset ring-cyan-500/20 dark:bg-cyan-400/12 dark:text-cyan-200 dark:ring-cyan-400/25', dot: 'bg-cyan-500', label: 'Ciano' },
  violet: { chip: 'bg-violet-500/10 text-violet-700 ring-1 ring-inset ring-violet-500/20 dark:bg-violet-400/12 dark:text-violet-200 dark:ring-violet-400/25', dot: 'bg-violet-500', label: 'Roxo' },
  emerald: { chip: 'bg-emerald-500/10 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-400/12 dark:text-emerald-200 dark:ring-emerald-400/25', dot: 'bg-emerald-500', label: 'Verde' },
  amber: { chip: 'bg-amber-500/10 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-400/12 dark:text-amber-200 dark:ring-amber-400/25', dot: 'bg-amber-500', label: 'Amarelo' },
  rose: { chip: 'bg-rose-500/10 text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-400/12 dark:text-rose-200 dark:ring-rose-400/25', dot: 'bg-rose-500', label: 'Vermelho' },
  orange: { chip: 'bg-orange-500/10 text-orange-700 ring-1 ring-inset ring-orange-500/20 dark:bg-orange-400/12 dark:text-orange-200 dark:ring-orange-400/25', dot: 'bg-orange-500', label: 'Laranja' },
  slate: { chip: 'bg-slate-500/10 text-slate-700 ring-1 ring-inset ring-slate-500/20 dark:bg-slate-400/12 dark:text-slate-200 dark:ring-slate-400/25', dot: 'bg-slate-500', label: 'Cinza' }
}

/** O que a etiqueta FAZ no sistema (não é só visual) */
export interface TagRules {
  /** Conversa vai para o topo da lista, com destaque */
  priority: boolean
  /** A IA não responde clientes com esta etiqueta (vai direto para a equipe) */
  pauseAi: boolean
  /** Direciona a conversa para este analista (id) */
  assignTo?: string
  /** Tempo máximo para responder, em minutos (alerta quando passar) */
  slaMinutes?: number
  /** Aviso fixo que o atendente vê ao abrir a conversa */
  alert?: string
  /** Gerente é notificado quando a etiqueta é aplicada */
  notifyManager: boolean
  /** Cliente fica de fora de campanhas e promoções */
  excludeCampaigns: boolean
}

export interface Tag {
  id: string
  name: string
  color: TagColor
  description?: string
  rules: TagRules
}

const noRules: TagRules = { priority: false, pauseAi: false, notifyManager: false, excludeCampaigns: false }

const SEED: Tag[] = [
  { id: 'vip', name: 'VIP', color: 'amber', description: 'Clientes especiais', rules: { ...noRules, priority: true, slaMinutes: 10, alert: 'Cliente VIP: priorize o atendimento e ofereça café/cortesia.' } },
  { id: 'reclamacao', name: 'Reclamação', color: 'rose', description: 'Cliente insatisfeito', rules: { ...noRules, priority: true, pauseAi: true, slaMinutes: 5, notifyManager: true, excludeCampaigns: true, alert: 'Cliente com reclamação: ouça com calma e, se preciso, chame o gerente.' } },
  { id: 'novo', name: 'Novo cliente', color: 'blue', description: 'Primeiro contato', rules: { ...noRules } },
  { id: 'noiva', name: 'Noiva', color: 'violet', description: 'Pacotes de casamento', rules: { ...noRules, priority: true, assignTo: 'u2', notifyManager: true } },
  { id: 'coloracao', name: 'Coloração', color: 'orange', rules: { ...noRules } },
  { id: 'mechas', name: 'Mechas', color: 'cyan', rules: { ...noRules } },
  { id: 'tratamento', name: 'Tratamento', color: 'emerald', rules: { ...noRules } },
  { id: 'barba', name: 'Barba', color: 'slate', rules: { ...noRules } }
]

// Etiquetas iniciais dos contatos (a partir dos nomes do cadastro de demonstração)
function seedContactTags(): Record<string, string[]> {
  const byName = new Map(SEED.map((t) => [t.name.toLowerCase(), t.id]))
  return Object.fromEntries(
    contacts.map((c) => [c.id, c.tags.map((n) => byName.get(n.toLowerCase())).filter(Boolean) as string[]])
  )
}

interface Ctx {
  tags: Tag[]
  tagById: (id: string) => Tag | undefined
  tagsOf: (contactId: string) => Tag[]
  hasTag: (contactId: string, tagId: string) => boolean
  toggleContactTag: (contactId: string, tagId: string) => boolean
  countOf: (tagId: string) => number
  createTag: (t: Omit<Tag, 'id'>) => Tag
  updateTag: (t: Tag) => void
  deleteTag: (id: string) => void
  /** Regras combinadas de todas as etiquetas do contato */
  rulesOf: (contactId: string) => TagRules & { alerts: { tag: Tag; text: string }[]; minSla?: number }
}

const TagsCtx = createContext<Ctx | null>(null)

export function TagsProvider({ children }: { children: ReactNode }) {
  const [tags, setTags] = useState<Tag[]>(SEED)
  const [contactTags, setContactTags] = useState<Record<string, string[]>>(seedContactTags)

  const tagById = useCallback((id: string) => tags.find((t) => t.id === id), [tags])
  const tagsOf = useCallback(
    (contactId: string) => (contactTags[contactId] ?? []).map((id) => tags.find((t) => t.id === id)).filter(Boolean) as Tag[],
    [contactTags, tags]
  )

  const value = useMemo<Ctx>(
    () => ({
      tags,
      tagById,
      tagsOf,
      hasTag: (cid, tid) => (contactTags[cid] ?? []).includes(tid),
      toggleContactTag: (cid, tid) => {
        const has = (contactTags[cid] ?? []).includes(tid)
        setContactTags((m) => ({ ...m, [cid]: has ? (m[cid] ?? []).filter((x) => x !== tid) : [...(m[cid] ?? []), tid] }))
        return !has
      },
      countOf: (tid) => Object.values(contactTags).filter((l) => l.includes(tid)).length,
      createTag: (t) => {
        const tag = { ...t, id: crypto.randomUUID() }
        setTags((l) => [...l, tag])
        return tag
      },
      updateTag: (t) => setTags((l) => l.map((x) => (x.id === t.id ? t : x))),
      deleteTag: (id) => {
        setTags((l) => l.filter((t) => t.id !== id))
        setContactTags((m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.filter((x) => x !== id)])))
      },
      rulesOf: (cid) => {
        const list = tagsOf(cid)
        const slas = list.map((t) => t.rules.slaMinutes).filter((v): v is number => typeof v === 'number')
        return {
          priority: list.some((t) => t.rules.priority),
          pauseAi: list.some((t) => t.rules.pauseAi),
          assignTo: list.find((t) => t.rules.assignTo)?.rules.assignTo,
          notifyManager: list.some((t) => t.rules.notifyManager),
          excludeCampaigns: list.some((t) => t.rules.excludeCampaigns),
          slaMinutes: slas.length ? Math.min(...slas) : undefined,
          minSla: slas.length ? Math.min(...slas) : undefined,
          alerts: list.filter((t) => t.rules.alert).map((t) => ({ tag: t, text: t.rules.alert! }))
        }
      }
    }),
    [tags, contactTags, tagById, tagsOf]
  )

  return <TagsCtx.Provider value={value}>{children}</TagsCtx.Provider>
}

export function useTags(): Ctx {
  const ctx = useContext(TagsCtx)
  if (!ctx) throw new Error('useTags fora do TagsProvider')
  return ctx
}

export const EMPTY_RULES = noRules
