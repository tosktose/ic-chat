import { Cookie, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getConsent, OPEN_PREFS_EVENT, saveConsent } from '@/lib/consent'

function Toggle({ checked, disabled, onChange, label }: { checked: boolean; disabled?: boolean; onChange?: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-300'} ${disabled ? 'opacity-60' : ''}`}
    >
      <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  )
}

/** Faixa de cookies da LGPD: necessários sempre ativos; análise e marketing só com aceite. */
export function CookieConsent() {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)

  useEffect(() => {
    const current = getConsent()
    if (!current) setOpen(true)
    const reopen = () => {
      const c = getConsent()
      setAnalytics(c?.analytics ?? false)
      setMarketing(c?.marketing ?? false)
      setCustom(true)
      setOpen(true)
    }
    window.addEventListener(OPEN_PREFS_EVENT, reopen)
    return () => window.removeEventListener(OPEN_PREFS_EVENT, reopen)
  }, [])

  const choose = (a: boolean, m: boolean) => {
    saveConsent({ analytics: a, marketing: m })
    setOpen(false)
    setCustom(false)
  }

  if (!open) return null
  return (
    <div role="dialog" aria-modal="false" aria-label="Preferências de cookies" className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl animate-slide-up rounded-2xl border border-slate-200 bg-white/95 p-5 text-slate-800 shadow-[0_24px_80px_-20px_rgba(15,23,42,.35)] backdrop-blur-xl sm:bottom-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span className="hidden size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 sm:grid"><Cookie className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-900">Sua privacidade importa</h2>
            {custom && <button aria-label="Fechar" onClick={() => setOpen(false)} className="-mt-1 -mr-1 rounded-lg p-1 text-slate-400 hover:text-slate-700"><X className="size-4" /></button>}
          </div>
          <p className="mt-1.5 text-[13px] leading-6 text-slate-600">
            Usamos cookies essenciais para o site funcionar e, se você permitir, cookies de análise e marketing para melhorar a experiência. Você escolhe e pode mudar de ideia quando quiser. Saiba mais na{' '}
            <Link to="/privacidade" className="font-semibold text-blue-700 underline-offset-2 hover:underline">Política de Privacidade</Link>.
          </p>

          {custom && (
            <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {[
                { label: 'Necessários', copy: 'Login, segurança e preferências do app. Sempre ativos.', checked: true, disabled: true },
                { label: 'Análise', copy: 'Ajudam a entender como o site é usado, de forma agregada.', checked: analytics, onChange: setAnalytics },
                { label: 'Marketing', copy: 'Medem campanhas e personalizam comunicações.', checked: marketing, onChange: setMarketing }
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 p-3.5">
                  <div><b className="text-[13px] text-slate-900">{row.label}</b><p className="text-xs text-slate-500">{row.copy}</p></div>
                  <Toggle label={row.label} checked={row.checked} disabled={row.disabled} onChange={row.onChange} />
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            {custom ? (
              <button onClick={() => choose(analytics, marketing)} className="h-10 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-700">Salvar preferências</button>
            ) : (
              <button onClick={() => setCustom(true)} className="h-10 rounded-xl px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">Personalizar</button>
            )}
            <button onClick={() => choose(false, false)} className="h-10 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50">Somente necessários</button>
            <button onClick={() => choose(true, true)} className="h-10 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800">Aceitar todos</button>
          </div>
        </div>
      </div>
    </div>
  )
}
