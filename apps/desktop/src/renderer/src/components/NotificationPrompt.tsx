import { BellRing, Check, Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNotifications } from '@/lib/notifications'
import { playSound } from '@/lib/sound'
import { isWebApp } from '@/lib/supabase'

const SNOOZE_KEY = 'icchat.notifyPrompt.until'
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000

function snoozed(): boolean {
  try { return Number(localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now() } catch { return false }
}

/**
 * Convite para ligar avisos do navegador e som. O navegador só aceita o pedido depois de um clique,
 * então a tela aparece logo após o login e um único botão faz tudo: pede a permissão, libera o som e toca um teste.
 */
export function NotificationPrompt() {
  const { desktopPermission, requestDesktopPermission, prefs } = useNotifications()
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!isWebApp || desktopPermission !== 'default' || snoozed()) return
    const t = setTimeout(() => setOpen(true), 1200)
    return () => clearTimeout(t)
  }, [desktopPermission])

  useEffect(() => {
    if (!open || desktopPermission === 'default') return
    if (desktopPermission === 'granted') {
      setDone(true)
      const t = setTimeout(() => setOpen(false), 1600)
      return () => clearTimeout(t)
    }
    setOpen(false)
  }, [desktopPermission, open])

  if (!open) return null

  const enable = () => {
    playSound(prefs.soundId, prefs.volume)
    requestDesktopPermission()
  }
  const later = () => {
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS)) } catch { /* sem armazenamento: só some agora */ }
    setOpen(false)
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="notify-prompt-title">
      <div className="w-full max-w-md animate-slide-up overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_40px_120px_-30px_rgba(2,6,23,.7)]">
        <div className="relative grid place-items-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 pt-9 pb-8 text-white">
          <span className="absolute inset-x-0 top-0 h-px bg-white/30" />
          <span className="relative grid size-16 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur">
            {done ? <Check className="size-8" /> : <BellRing className="size-8" />}
            {!done && <span className="absolute -top-1 -right-1 size-3.5 animate-ping rounded-full bg-emerald-300" />}
          </span>
        </div>
        <div className="p-6 text-center">
          <h2 id="notify-prompt-title" className="text-lg font-bold tracking-tight">{done ? 'Tudo pronto!' : 'Não perca nenhuma mensagem'}</h2>
          <p className="mt-2 text-[13.5px] leading-6 text-muted">
            {done
              ? 'Você vai receber o aviso e o som assim que um cliente responder, mesmo com o IC Chat em segundo plano.'
              : 'Ative os avisos e o som para saber na hora quando um cliente responder, um horário for marcado ou a IA transferir uma conversa para você.'}
          </p>
          {!done && (
            <>
              <ul className="mx-auto mt-4 flex max-w-xs flex-col gap-2 text-left text-[13px]">
                <li className="flex items-center gap-2.5"><BellRing className="size-4 shrink-0 text-blue-600" /> Aviso na tela, mesmo em outra aba</li>
                <li className="flex items-center gap-2.5"><Volume2 className="size-4 shrink-0 text-blue-600" /> Som discreto a cada mensagem nova</li>
              </ul>
              <button onClick={enable} className="mt-6 h-12 w-full rounded-xl bg-blue-700 text-sm font-semibold text-white shadow-lg shadow-blue-700/25 transition hover:bg-blue-800 active:scale-[.99]">
                Ativar avisos e som
              </button>
              <button onClick={later} className="mt-2 h-10 w-full rounded-xl text-[13px] font-medium text-muted transition hover:text-foreground">
                Agora não
              </button>
              <p className="mt-2 text-[11.5px] text-subtle">Na janela do navegador, escolha “Permitir”. Você muda isso quando quiser.</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
