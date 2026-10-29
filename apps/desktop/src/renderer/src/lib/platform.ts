import { useEffect, useState } from 'react'
import { PLAN_FALLBACK, type PublicPlan } from './billing'
import { supabase } from './supabase'
import type { PublicSettings } from './admin-api'

const EMPTY: PublicSettings = { company_name: 'ItaCondo', support_email: '', support_whatsapp: '', site_url: '' }

let settingsCache: PublicSettings | null = null
let plansCache: PublicPlan[] | null = null

/** Contato de suporte e endereço do site, definidos pelo Super Admin no banco (nada fixo no código). */
export function usePublicSettings(): PublicSettings {
  const [s, setS] = useState<PublicSettings>(settingsCache ?? EMPTY)
  useEffect(() => {
    if (settingsCache || !supabase) return
    let alive = true
    void supabase.schema('ic_chat').rpc('public_settings').then(({ data }) => {
      if (!alive || !data) return
      settingsCache = { ...EMPTY, ...(data as Partial<PublicSettings>) }
      setS(settingsCache)
    })
    return () => { alive = false }
  }, [])
  return s
}

/** Link do WhatsApp do suporte (ou vazio se ainda não foi cadastrado). */
export const whatsappLink = (number: string, text?: string) => {
  const digits = number.replace(/\D/g, '')
  if (!digits) return ''
  const full = digits.length <= 11 ? `55${digits}` : digits
  return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

/** Planos e preços vindos do banco (o mesmo que o checkout cobra). Sem conexão, usa os valores padrão. */
export function usePlans(): PublicPlan[] {
  const [plans, setPlans] = useState<PublicPlan[]>(plansCache ?? PLAN_FALLBACK)
  useEffect(() => {
    if (plansCache || !supabase) return
    let alive = true
    void supabase.schema('ic_chat').from('plans').select('*').eq('active', true).order('sort').then(({ data }) => {
      if (!alive || !data?.length) return
      plansCache = data.map((p) => ({
        id: p.id, name: p.name, price: Number(p.price), summary: p.summary ?? '',
        features: Array.isArray(p.features) ? p.features : [], recommended: Boolean(p.highlight), days: p.days ?? 30,
        discount_type: p.discount_type ?? null, discount_value: Number(p.discount_value ?? 0), discount_label: p.discount_label ?? '', discount_ends_at: p.discount_ends_at ?? null
      })) as PublicPlan[]
      setPlans(plansCache)
    })
    return () => { alive = false }
  }, [])
  return plans
}
