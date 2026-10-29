const CANONICAL_SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://www.icchat.com.br').replace(/\/$/, '')

/** Use o domínio oficial no site publicado e preserve a origem local durante desenvolvimento. */
export function getSiteUrl(): string {
  if (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return window.location.origin
  }
  return CANONICAL_SITE_URL
}
