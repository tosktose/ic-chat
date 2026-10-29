const REFERRAL_CODE_KEY = 'icchat.affiliate.referral_code'
const OAUTH_REFERRAL_KEY = 'icchat.affiliate.oauth_pending'

function validCode(value: string | null): string | null {
  const code = value?.trim().toUpperCase() ?? ''
  return /^[A-Z0-9-]{4,32}$/.test(code) ? code : null
}

/** Keeps the first valid referral link through navigation and the signup form. */
export function captureAffiliateCode(): string | null {
  try {
    const fromUrl = validCode(new URLSearchParams(window.location.search).get('ref'))
    if (fromUrl) window.localStorage.setItem(REFERRAL_CODE_KEY, fromUrl)
    return validCode(window.localStorage.getItem(REFERRAL_CODE_KEY))
  } catch {
    return null
  }
}

export function prepareAffiliateOAuthSignup(): void {
  const code = captureAffiliateCode()
  if (!code) return
  try {
    window.sessionStorage.setItem(OAUTH_REFERRAL_KEY, JSON.stringify({ code, startedAt: new Date().toISOString() }))
  } catch {
    /* OAuth ainda funciona se o navegador bloquear armazenamento local. */
  }
}

export function consumeAffiliateOAuthSignup(): { code: string; startedAt: string } | null {
  try {
    const raw = window.sessionStorage.getItem(OAUTH_REFERRAL_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { code?: string; startedAt?: string }
    const code = validCode(parsed.code ?? null)
    const startedAt = parsed.startedAt ?? ''
    if (!code || !Number.isFinite(Date.parse(startedAt))) return null
    if (Date.now() - Date.parse(startedAt) > 30 * 60 * 1000) return null
    return { code, startedAt }
  } catch {
    return null
  }
}

export function clearAffiliateOAuthSignup(): void {
  try { window.sessionStorage.removeItem(OAUTH_REFERRAL_KEY) } catch { /* ignore */ }
}
