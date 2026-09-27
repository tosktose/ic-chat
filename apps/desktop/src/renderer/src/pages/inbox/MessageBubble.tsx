import { useState } from 'react'
import { Bot, Check, CheckCheck, Download, FileText, Pause, Play, StickyNote } from 'lucide-react'
import { Tooltip } from '@/components/ui/misc'
import { cn } from '@/lib/utils'
import type { Message } from '@/data/mock'

// Barras fixas da forma de onda (visual)
const WAVE = [4, 9, 14, 7, 18, 12, 22, 16, 9, 20, 13, 6, 15, 21, 11, 8, 17, 12, 5, 14, 19, 10, 7, 13, 16, 9, 12, 6]

export function MessageBubble({ msg }: { msg: Message }) {
  if (msg.kind === 'system') {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-full bg-surface/80 px-3 py-1 text-center text-[11.5px] font-medium text-muted shadow-sm backdrop-blur">
          {msg.text} · {msg.time}
        </span>
      </div>
    )
  }

  if (msg.kind === 'note') {
    return (
      <div className="my-1 flex justify-end">
        <div className="max-w-[min(520px,85%)] rounded-2xl rounded-br-md border border-note-border bg-note px-3.5 py-2.5 shadow-sm">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-warning">
            <StickyNote className="size-3.5" /> Nota interna · {msg.author} · só a equipe vê
          </p>
          <p className="text-[14px] leading-relaxed">{msg.text}</p>
          <p className="mt-1 text-right text-[10.5px] text-muted">{msg.time}</p>
        </div>
      </div>
    )
  }

  const outgoing = msg.from === 'agent' || msg.from === 'ai'

  return (
    <div className={cn('my-0.5 flex', outgoing ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'relative max-w-[min(520px,85%)] rounded-2xl px-3.5 py-2 shadow-sm',
          outgoing ? 'rounded-br-md bg-bubble-out' : 'rounded-bl-md bg-bubble-in',
          msg.kind === 'image' && 'p-1.5'
        )}
      >
        {msg.from === 'ai' && (
          <p className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold text-violet-600 dark:text-violet-300">
            <Bot className="size-3.5" /> Assistente IA
          </p>
        )}
        {msg.from === 'agent' && msg.author && (
          <p className="mb-0.5 text-[11px] font-semibold text-primary">{msg.author}</p>
        )}

        {msg.kind === 'text' && <p className="text-[14px] leading-relaxed break-words whitespace-pre-wrap">{msg.text}</p>}
        {msg.kind === 'audio' && <AudioPlayer duration={msg.duration ?? '0:10'} outgoing={outgoing} />}
        {msg.kind === 'image' && (
          <div>
            <div className={cn('aspect-[4/3] w-64 max-w-full rounded-xl bg-gradient-to-br', msg.imageTone)} />
            {msg.text && <p className="px-2 pt-1.5 text-[14px]">{msg.text}</p>}
          </div>
        )}
        {msg.kind === 'document' && (
          <div className="flex w-64 max-w-full items-center gap-3 rounded-xl bg-surface/60 p-2.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-danger text-white">
              <FileText className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{msg.fileName}</p>
              <p className="text-[11px] text-muted">PDF · {msg.fileSize}</p>
            </div>
            <Tooltip content="Baixar arquivo">
              <button className="rounded-md p-1.5 text-muted hover:bg-surface-2" aria-label="Baixar arquivo">
                <Download className="size-4" />
              </button>
            </Tooltip>
          </div>
        )}

        <div className={cn('mt-0.5 flex items-center justify-end gap-1 text-[10.5px] text-muted', msg.kind === 'image' && 'px-2 pb-0.5')}>
          {msg.time}
          {outgoing && msg.status === 'read' && <CheckCheck className="size-3.5 text-primary" />}
          {outgoing && msg.status === 'delivered' && <CheckCheck className="size-3.5" />}
          {outgoing && msg.status === 'sent' && <Check className="size-3.5" />}
        </div>
      </div>
    </div>
  )
}

function AudioPlayer({ duration, outgoing }: { duration: string; outgoing: boolean }) {
  const [playing, setPlaying] = useState(false)
  const progress = playing ? 0.45 : 0
  return (
    <div className="flex w-64 max-w-full items-center gap-3 py-1">
      <button
        onClick={() => setPlaying((p) => !p)}
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full text-white',
          outgoing ? 'bg-primary' : 'bg-whatsapp'
        )}
        aria-label={playing ? 'Pausar' : 'Ouvir'}
      >
        {playing ? <Pause className="size-4" fill="currentColor" /> : <Play className="ml-0.5 size-4" fill="currentColor" />}
      </button>
      <div className="flex h-7 flex-1 items-center gap-[2px]">
        {WAVE.map((h, i) => (
          <span
            key={i}
            className={cn('w-[3px] rounded-full', i / WAVE.length < progress ? 'bg-primary' : 'bg-subtle/60')}
            style={{ height: h }}
          />
        ))}
      </div>
      <span className="text-[11px] text-muted tabular-nums">{duration}</span>
    </div>
  )
}
