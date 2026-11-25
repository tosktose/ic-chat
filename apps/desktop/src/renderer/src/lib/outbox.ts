/**
 * Envio de mensagens automáticas (lembretes, retorno, sinal PIX) para um contato.
 * - App instalado com WhatsApp conectado: sai pelo número da empresa e fica registrado no Atendimento.
 * - Navegador (ou WhatsApp desconectado): abre o WhatsApp com o texto pronto, um clique por cliente.
 */
import { useCallback } from 'react'
import { useData } from '@/lib/data'
import { useWhatsApp } from '@/lib/whatsapp'

/** Data de hoje no fuso do computador (calculada na hora, não quando o app abriu) */
export function todayISO(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/** Link do WhatsApp com DDI 55 quando o número veio sem */
export function waLink(phone: string, text: string): string {
  let digits = phone.replace(/\D/g, '')
  if (digits && digits.length <= 11) digits = `55${digits}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export function useSendToContact() {
  const data = useData()
  const wa = useWhatsApp()
  const connected = wa.available && wa.state.status === 'conectado'

  /** Envia pelo app (devolve 'app') ou abre o WhatsApp com o texto (devolve 'link'). */
  const send = useCallback(
    async (contactId: string, text: string, opts: { forceLink?: boolean } = {}): Promise<'app' | 'link'> => {
      const contact = data.contacts.find((c) => c.id === contactId)
      if (!contact?.phone) throw new Error('Cliente sem celular cadastrado')
      if (connected && !opts.forceLink) {
        const convId = data.openConversation(contact.id, 'whatsapp')
        const conv = data.conversations.find((c) => c.id === convId) ?? { id: convId, waJid: undefined }
        const waId = await wa.sendText(conv as Parameters<typeof wa.sendText>[0], contact.phone, text)
        data.appendMessage(convId, { from: 'agent', author: 'Automação', kind: 'text', text, at: Date.now(), waId, status: 'sent' })
        return 'app'
      }
      window.open(waLink(contact.phone, text), '_blank', 'noopener')
      return 'link'
    },
    [data, wa, connected]
  )

  return { connected, send }
}
