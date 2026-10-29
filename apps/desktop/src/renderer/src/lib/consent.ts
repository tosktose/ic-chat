// Consentimento de cookies (LGPD, Lei 13.709/2018): nada além do estritamente necessário
// roda antes da pessoa escolher, e a escolha pode ser revista a qualquer momento.
export type Consent = { necessary: true; analytics: boolean; marketing: boolean; savedAt: string }

const KEY = 'icchat.consent.v1'
export const CONSENT_EVENT = 'icchat:consent'
export const OPEN_PREFS_EVENT = 'icchat:open-cookie-prefs'

export function getConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Consent) : null
  } catch {
    return null
  }
}

export function saveConsent(choice: { analytics: boolean; marketing: boolean }): Consent {
  const consent: Consent = { necessary: true, ...choice, savedAt: new Date().toISOString() }
  try {
    localStorage.setItem(KEY, JSON.stringify(consent))
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: consent }))
  return consent
}

export function openCookiePreferences() {
  window.dispatchEvent(new Event(OPEN_PREFS_EVENT))
}
