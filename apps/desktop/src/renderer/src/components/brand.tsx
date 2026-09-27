import { useId, type ComponentType } from 'react'
import { cn } from '@/lib/utils'

/** Ícone oficial IC Chat (balão azul com "ic") em SVG, nítido em qualquer tamanho. */
export function IcMark({ size = 32, className }: { size?: number; className?: string }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-label="IC Chat">
      <defs>
        <linearGradient id={`${id}-bg`} x1="8" y1="58" x2="60" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0036c8" />
          <stop offset="0.55" stopColor="#0a57ec" />
          <stop offset="1" stopColor="#18c8f5" />
        </linearGradient>
        <linearGradient id={`${id}-dot`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5fe3ff" />
          <stop offset="1" stopColor="#12b8ee" />
        </linearGradient>
      </defs>
      <path
        d="M16 4h32c7.7 0 12 4.3 12 12v24c0 7.7-4.3 12-12 12H23.5L10.2 59.1c-1 .5-2.1-.4-1.8-1.5L10 51C6.1 49 4 45.2 4 40V16C4 8.3 8.3 4 16 4Z"
        fill={`url(#${id}-bg)`}
      />
      <circle cx="21" cy="19.5" r="4.6" fill={`url(#${id}-dot)`} />
      <rect x="16.8" y="26" width="8.4" height="19" rx="2" fill="#fff" />
      <path
        d="M46.6 29.6a11 11 0 1 0 0 12.8l-5.4-4.1a4.6 4.6 0 1 1 0-4.6l5.4-4.1Z"
        fill="#fff"
      />
    </svg>
  )
}

/** Logo completo: ícone + "icChat" + "Powered by itaCondo" */
export function IcLogo({
  className,
  compact,
  inverted
}: {
  className?: string
  compact?: boolean
  inverted?: boolean
}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <IcMark size={compact ? 30 : 36} />
      <div className="leading-none">
        <div
          className={cn(
            'font-extrabold tracking-tight',
            compact ? 'text-[17px]' : 'text-xl',
            inverted ? 'text-white' : 'text-foreground'
          )}
        >
          ic<span className={inverted ? 'text-white' : 'text-foreground'}>Chat</span>
        </div>
        <div className={cn('mt-1 text-[10px] font-medium whitespace-nowrap', inverted ? 'text-white/70' : 'text-muted')}>
          Powered by <span className={cn('font-bold', inverted ? 'text-white' : 'text-foreground')}>itaCondo</span>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Ícones dos canais ---------------- */
export type ChannelKind = 'whatsapp' | 'whatsapp_official' | 'instagram' | 'messenger' | 'tiktok'

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91A9.86 9.86 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.23 8.23 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 8.24 8.25c0 4.55-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.49-.41-.42-.56-.43h-.48a.92.92 0 0 0-.66.31c-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.22-.16-.47-.28Z" />
    </svg>
  )
}

export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function MessengerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.14.26.35.27.57l.05 1.78c.02.57.6.94 1.12.71l1.99-.88c.17-.07.36-.09.53-.04.91.25 1.89.39 2.9.39 5.64 0 10-4.13 10-9.7S17.64 2 12 2Zm6 7.46-2.94 4.66a1.5 1.5 0 0 1-2.17.4l-2.34-1.75a.6.6 0 0 0-.72 0l-3.16 2.4c-.42.32-.97-.18-.69-.63l2.94-4.66a1.5 1.5 0 0 1 2.17-.4l2.34 1.75c.21.16.51.16.72 0l3.16-2.4c.42-.32.97.18.69.63Z" />
    </svg>
  )
}

export function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.6 2.6 0 0 1-2.6-2.6 2.6 2.6 0 0 1 3.36-2.48V9.66a5.68 5.68 0 0 0-6.45 5.64 5.69 5.69 0 0 0 5.69 5.7 5.69 5.69 0 0 0 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.25-1.48Z" />
    </svg>
  )
}

export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.98-4.32 2.98-7.35Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.24-2.5c-.9.6-2.04.95-3.38.95-2.6 0-4.8-1.76-5.59-4.12H3.07v2.58A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.41 13.91a6 6 0 0 1 0-3.82V7.51H3.07a10 10 0 0 0 0 8.98l3.34-2.58Z" />
      <path fill="#EA4335" d="M12 5.97c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.51l3.34 2.58C7.2 7.73 9.4 5.97 12 5.97Z" />
    </svg>
  )
}

const channelMeta: Record<ChannelKind, { label: string; bg: string; Icon: ComponentType<{ className?: string }> }> = {
  whatsapp: { label: 'WhatsApp', bg: 'bg-whatsapp', Icon: WhatsAppIcon },
  whatsapp_official: { label: 'WhatsApp Oficial', bg: 'bg-whatsapp', Icon: WhatsAppIcon },
  instagram: { label: 'Instagram', bg: 'bg-gradient-to-tr from-amber-400 via-pink-500 to-violet-600', Icon: InstagramIcon },
  messenger: { label: 'Messenger', bg: 'bg-messenger', Icon: MessengerIcon },
  tiktok: { label: 'TikTok', bg: 'bg-tiktok', Icon: TikTokIcon }
}

export function channelLabel(kind: ChannelKind): string {
  return channelMeta[kind].label
}

/** Selo redondo do canal (usado sobre o avatar e em listas) */
export function ChannelBadge({ kind, size = 16, className }: { kind: ChannelKind; size?: number; className?: string }) {
  const { bg, Icon } = channelMeta[kind]
  return (
    <span
      className={cn('inline-flex items-center justify-center rounded-full text-white ring-2 ring-surface', bg, className)}
      style={{ width: size, height: size }}
      title={channelMeta[kind].label}
    >
      <Icon className="size-[62%]" />
    </span>
  )
}
