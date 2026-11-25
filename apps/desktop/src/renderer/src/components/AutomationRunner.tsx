import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router'
import { CircleAlert } from 'lucide-react'
import { useAppState } from '@/lib/app-state'
import { useCompany } from '@/lib/company'
import { APP_MODE, useData } from '@/lib/data'
import { supabase } from '@/lib/supabase'
import { useNotifications } from '@/lib/notifications'
import { useWhatsApp } from '@/lib/whatsapp'
import { awaitingReply, dueReminders, parseReply, reminderText } from '@/lib/reminders'
import { todayISO, useSendToContact } from '@/lib/outbox'

export const WA_INCOMING_EVENT = 'icchat:wa-incoming'
export interface WaIncomingDetail {
  contactId: string
  conversationId: string
  text?: string
}

/** Espera entre um lembrete e outro (evita disparo em massa pelo mesmo número) */
const GAP_MS = 6_000
const CHECK_EVERY_MS = 60_000

/**
 * Roda em segundo plano enquanto o painel está aberto:
 * - envia os lembretes de 24h e 2h pelo WhatsApp conectado (app instalado, envio automático ligado);
 * - entende a resposta do cliente ("1" confirma, "2" pede para remarcar) e atualiza a agenda.
 * Não aparece na tela.
 */
export function AutomationRunner() {
  const { appointments, updateAppointment } = useAppState()
  const { automations, info, professionalById } = useCompany()
  const data = useData()
  const { notify } = useNotifications()
  const { connected, send } = useSendToContact()
  const busy = useRef(false)
  const failures = useRef(new Map<string, number>())

  const latest = useRef({ appointments, automations, info, data, send, updateAppointment, notify, professionalById })
  latest.current = { appointments, automations, info, data, send, updateAppointment, notify, professionalById }

  // Lembretes automáticos
  useEffect(() => {
    if (!connected || !automations.reminders.enabled || !automations.reminders.autoSend) return
    const run = async () => {
      if (busy.current) return
      busy.current = true
      try {
        const { appointments: list, automations: auto, info: company, data: d } = latest.current
        const now = new Date()
        const due = dueReminders(list, auto.reminders, now, todayISO(now))
        for (const r of due) {
          const key = `${r.appointment.id}:${r.kind}`
          if ((failures.current.get(key) ?? 0) >= 3) continue
          const contact = d.contacts.find((c) => c.id === r.appointment.contactId)
          if (!contact?.phone) continue
          const text = reminderText(r, auto.reminders, {
            clientName: contact.name,
            professional: latest.current.professionalById(r.appointment.professionalId)?.name,
            company: company.name,
            now
          })
          try {
            await latest.current.send(contact.id, text)
            latest.current.updateAppointment(r.appointment.id, { reminders: { ...r.appointment.reminders, [r.kind]: Date.now() } })
          } catch (e) {
            failures.current.set(key, (failures.current.get(key) ?? 0) + 1)
            console.error('IC Chat lembrete:', e)
          }
          await new Promise((ok) => setTimeout(ok, GAP_MS))
        }
      } finally {
        busy.current = false
      }
    }
    void run()
    const t = window.setInterval(() => void run(), CHECK_EVERY_MS)
    return () => clearInterval(t)
  }, [connected, automations.reminders.enabled, automations.reminders.autoSend])

  // App instalado: cliente que agendou pelo link público vira contato local (nome e celular)
  const linkedFix = useRef(new Set<string>())
  useEffect(() => {
    if (!APP_MODE || !supabase) return
    const missing = appointments.filter((a) => a.origin === 'link' && a.contactId && !linkedFix.current.has(a.id) && !data.contacts.some((c) => c.id === a.contactId))
    if (!missing.length) return
    missing.forEach((a) => linkedFix.current.add(a.id))
    void supabase.schema('ic_chat').from('contacts').select('id, name, phone').in('id', missing.map((a) => a.contactId)).then(({ data: rows }) => {
      for (const a of missing) {
        const row = rows?.find((r) => r.id === a.contactId)
        if (!row) continue
        const d = latest.current.data
        const local = d.findContactByPhone(String(row.phone)) ?? d.addContact({ name: String(row.name), phone: String(row.phone), tags: ['Agendou online'] })
        latest.current.updateAppointment(a.id, { contactId: local.id })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, data.contacts, data.version])

  // Resposta do cliente ao lembrete
  useEffect(() => {
    const onIncoming = (e: Event) => {
      const { contactId, conversationId, text } = (e as CustomEvent<WaIncomingDetail>).detail
      const intent = parseReply(text)
      if (!intent) return
      const { appointments: list, data: d, updateAppointment: update, notify: push } = latest.current
      const now = new Date()
      const appt = awaitingReply(list, contactId, now, todayISO(now))
      if (!appt) return
      const name = d.contacts.find((c) => c.id === contactId)?.name ?? 'Cliente'
      const when = `${appt.date ? appt.date.split('-').reverse().slice(0, 2).join('/') : 'hoje'} às ${appt.start}`
      if (intent === 'confirmar') {
        update(appt.id, { reply: 'confirmar', status: appt.status === 'agendado' ? 'confirmado' : appt.status })
        d.appendMessage(conversationId, { from: 'system', kind: 'system', text: `Horário de ${when} confirmado pelo cliente.`, at: Date.now() })
        push({ kind: 'agenda', title: `${name} confirmou`, body: `${appt.service} · ${when}`, link: '/agenda' })
      } else {
        update(appt.id, { reply: 'remarcar' })
        d.appendMessage(conversationId, { from: 'system', kind: 'system', text: `Cliente pediu para remarcar o horário de ${when}.`, at: Date.now() })
        push({ kind: 'alerta', title: `${name} pediu para remarcar`, body: `${appt.service} · ${when}. Responda no Atendimento.`, link: `/inbox?c=${conversationId}` })
      }
    }
    window.addEventListener(WA_INCOMING_EVENT, onIncoming)
    return () => window.removeEventListener(WA_INCOMING_EVENT, onIncoming)
  }, [])

  return null
}

/**
 * Faixa de aviso no app instalado: WhatsApp caiu e há lembretes para sair.
 * Sem isso, o dono só descobre quando o cliente falta.
 */
export function WhatsAppDownBanner() {
  const wa = useWhatsApp()
  const { role, appointments } = useAppState()
  const { automations } = useCompany()
  const navigate = useNavigate()
  const pending = useMemo(() => {
    const now = new Date()
    return dueReminders(appointments, automations.reminders, now, todayISO(now)).length
  }, [appointments, automations.reminders])
  if (!wa.available || role === 'superadmin') return null
  if (wa.state.status === 'conectado' || wa.state.status === 'conectando' || wa.state.status === 'qr') return null
  if (!automations.reminders.enabled || !automations.reminders.autoSend) return null
  return (
    <div role="alert" className="flex items-center gap-3 border-b border-warning/30 bg-warning-soft px-4 py-2 text-[13px] font-medium text-warning">
      <CircleAlert className="size-4 shrink-0" />
      <p className="flex-1">
        WhatsApp desconectado: os lembretes automáticos estão parados{pending ? ` (${pending} para enviar agora)` : ''}.
      </p>
      <button onClick={() => navigate('/canais')} className="shrink-0 rounded-md px-2 py-1 underline-offset-2 hover:underline">
        Conectar
      </button>
    </div>
  )
}
