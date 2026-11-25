/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_SITE_URL?: string
  readonly VITE_ICCHAT_DESKTOP_DOWNLOAD_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** true quando o build roda na Vercel (liga o Vercel Analytics) */
declare const __ON_VERCEL__: boolean
