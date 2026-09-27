import { useEffect, useRef, useState } from 'react'
import {
  FileText,
  Image as ImageIcon,
  Mic,
  Paperclip,
  SendHorizontal,
  Smile,
  StickyNote,
  Trash2,
  Zap
} from 'lucide-react'
import { EmojiPopover } from '@/components/EmojiPicker'
import { Button } from '@/components/ui/button'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/overlay'
import { cn } from '@/lib/utils'
import { quickReplies } from '@/data/mock'

export function Composer({
  disabled,
  onSend,
  senderName,
  companyNumber
}: {
  disabled?: boolean
  onSend: (text: string, note: boolean) => void
  /** Nome que o cliente vê (assinatura). Sem nome = mensagem sai sem assinatura. */
  senderName?: string
  companyNumber: string
}) {
  const [text, setText] = useState('')
  const [note, setNote] = useState(false)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const ref = useRef<HTMLTextAreaElement>(null)

  // Cresce conforme o texto (até 6 linhas)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 150) + 'px'
  }, [text])

  useEffect(() => {
    if (!recording) return
    setSeconds(0)
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [recording])

  // Insere o emoji onde está o cursor (e não só no fim do texto)
  const insertAtCursor = (emoji: string) => {
    const el = ref.current
    if (!el) return setText((t) => t + emoji)
    const start = el.selectionStart ?? text.length
    const end = el.selectionEnd ?? text.length
    const next = text.slice(0, start) + emoji + text.slice(end)
    setText(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + emoji.length, start + emoji.length)
    })
  }

  const showQuick = text.startsWith('/')
  const quick = quickReplies.filter((r) => r.shortcut.startsWith(text.split(' ')[0]))

  const send = () => {
    if (!text.trim()) return
    onSend(text.trim(), note)
    setText('')
  }

  if (disabled) {
    return (
      <div className="border-t border-border bg-surface px-4 py-4 text-center text-[13px] text-muted">
        Envio pausado: licença em <b className="text-danger">modo restrito</b>. O histórico continua disponível.
      </div>
    )
  }

  return (
    <div className="pb-safe relative border-t border-border bg-surface px-3 pt-2 pb-3 md:px-4">
      {/* Respostas rápidas com "/" */}
      {showQuick && quick.length > 0 && (
        <div className="absolute right-3 bottom-full left-3 mb-2 animate-slide-up overflow-hidden rounded-xl border border-border bg-surface shadow-(--shadow-pop) md:right-4 md:left-4">
          <p className="border-b border-border px-3 py-2 text-[11px] font-semibold tracking-wider text-subtle uppercase">Respostas rápidas</p>
          {quick.map((r) => (
            <button
              key={r.shortcut}
              onClick={() => setText(r.text)}
              className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-surface-2"
            >
              <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-xs font-semibold text-primary">{r.shortcut}</span>
              <span className="line-clamp-1 flex-1 text-[13px] text-muted">{r.text}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mb-2 flex items-center gap-1">
        <button
          onClick={() => setNote(false)}
          className={cn('rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap', !note ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface-2')}
        >
          Responder
        </button>
        <button
          onClick={() => setNote(true)}
          className={cn('flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap', note ? 'bg-note text-warning' : 'text-muted hover:bg-surface-2')}
        >
          <StickyNote className="size-3.5" /> Nota interna
        </button>
        <span className="ml-auto min-w-0 truncate text-[11px] text-subtle">
          {note ? (
            'Só a equipe vê esta nota'
          ) : (
            <>
              Enviando pelo WhatsApp da empresa {companyNumber}
              {senderName && (
                <>
                  {' '}como <b className="font-semibold text-muted">{senderName}</b>
                </>
              )}
            </>
          )}
        </span>
      </div>

      {recording ? (
        <div className="flex h-12 items-center gap-3 rounded-2xl bg-danger-soft px-3">
          <span className="size-2.5 animate-pulse rounded-full bg-danger" />
          <span className="text-sm font-semibold text-danger tabular-nums">
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </span>
          <div className="flex flex-1 items-center gap-[3px] overflow-hidden">
            {Array.from({ length: 40 }).map((_, i) => (
              <span key={i} className="w-[3px] animate-pulse rounded-full bg-danger/50" style={{ height: 6 + ((i * 7) % 16), animationDelay: `${i * 40}ms` }} />
            ))}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => setRecording(false)} aria-label="Descartar áudio">
            <Trash2 />
          </Button>
          <Button size="icon" className="rounded-full" onClick={() => setRecording(false)} aria-label="Enviar áudio">
            <SendHorizontal />
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            'flex items-end gap-1 rounded-2xl border px-2 py-1.5 transition-colors focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/12',
            note ? 'border-note-border bg-note' : 'border-border bg-surface-2'
          )}
        >
          <EmojiPopover onPick={insertAtCursor}>
            <Button variant="ghost" size="icon-sm" aria-label="Emojis">
              <Smile />
            </Button>
          </EmojiPopover>
          <Menu>
            <MenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Anexar" tooltip="Anexar foto, vídeo ou documento">
                <Paperclip />
              </Button>
            </MenuTrigger>
            <MenuContent align="start">
              <MenuItem icon={<ImageIcon />}>Foto ou vídeo</MenuItem>
              <MenuItem icon={<FileText />}>Documento</MenuItem>
              <MenuItem icon={<Zap />} onSelect={() => setText('/')}>Resposta rápida</MenuItem>
            </MenuContent>
          </Menu>
          <textarea
            ref={ref}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder={note ? 'Escreva uma nota para a equipe…' : 'Digite uma mensagem'}
            className="max-h-[150px] min-h-8 flex-1 resize-none bg-transparent px-1 py-1.5 text-[14px] leading-snug outline-none placeholder:text-subtle"
          />
          {text.trim() ? (
            <Button size="icon" className="rounded-full" onClick={send} aria-label="Enviar" shortcut="Enter">
              <SendHorizontal />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setRecording(true)} aria-label="Gravar áudio" tooltip="Gravar mensagem de voz">
                <Mic />
              </Button>
          )}
        </div>
      )}
    </div>
  )
}
