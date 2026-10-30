import { CheckCircle2, Loader2, MessageCircle } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router'
import { supabase } from '@/lib/supabase'

/** Página pública (link na bio): o cliente deixa nome e WhatsApp e já cai no funil da empresa. */
export function LeadFormPage() {
  const { tenantId = '' } = useParams()
  const [company, setCompany] = useState<string | null | undefined>(undefined)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  useEffect(() => {
    document.title = 'Fale com a gente'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    if (!supabase) { setCompany(null); return }
    void supabase.schema('ic_chat').rpc('capture_page_info', { p_tenant: tenantId }).then(({ data }) => setCompany(typeof data === 'string' ? data : null))
    return () => { meta.remove() }
  }, [tenantId])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setState('sending')
    const { data, error } = await supabase.schema('ic_chat').rpc('capture_lead', { p_tenant: tenantId, p_name: name, p_phone: phone, p_message: message, p_source: 'link-na-bio' })
    setState(!error && data === true ? 'done' : 'error')
  }

  const input = 'h-12 w-full rounded-xl border border-border bg-surface px-4 text-[15px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

  return (
    <div className="grid min-h-dvh place-items-center bg-surface-2 p-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-(--shadow-pop) md:p-8">
        {company === undefined ? (
          <div className="grid place-items-center py-16"><Loader2 className="size-6 animate-spin text-muted" /></div>
        ) : company === null ? (
          <p className="py-10 text-center text-sm text-muted">Este link não está mais disponível.</p>
        ) : state === 'done' ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto size-12 text-success" />
            <h1 className="mt-4 text-xl font-bold">Recebemos seu contato!</h1>
            <p className="mt-2 text-sm text-muted">A equipe da {company} vai falar com você pelo WhatsApp em instantes.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary"><MessageCircle className="size-6" /></span>
            <h1 className="pt-2 text-xl font-bold tracking-tight">Fale com a {company}</h1>
            <p className="pb-2 text-sm text-muted">Deixe seu nome e WhatsApp. A gente responde rapidinho.</p>
            <input className={input} placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={120} autoComplete="name" aria-label="Seu nome" />
            <input className={input} placeholder="WhatsApp com DDD" value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" autoComplete="tel" aria-label="WhatsApp com DDD" />
            <textarea className={`${input} h-24 resize-none py-3`} placeholder="Como podemos ajudar? (opcional)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} aria-label="Mensagem" />
            {state === 'error' && <p role="alert" className="text-[13px] text-danger">Confira o nome e o WhatsApp com DDD e tente de novo.</p>}
            <button disabled={state === 'sending'} className="h-12 w-full rounded-xl bg-primary text-[15px] font-semibold text-white shadow-lg shadow-primary/25 transition hover:opacity-90 disabled:opacity-60">
              {state === 'sending' ? 'Enviando…' : 'Quero ser atendido'}
            </button>
            <p className="pt-1 text-center text-[11px] text-subtle">Usamos seus dados só para responder ao seu contato.</p>
          </form>
        )}
      </div>
    </div>
  )
}
