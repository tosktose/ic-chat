import { useState } from 'react'
import { Database, HardDrive, Loader2, Sparkles, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Badge, Card, CardHeader } from '@/components/ui/misc'
import { Dialog } from '@/components/ui/overlay'
import { APP_MODE, REMOTE_MODE, useData } from '@/lib/data'

/** Onde os dados ficam, dados de exemplo e limpeza (útil nos testes) */
export function DataTab() {
  const { contacts, conversations, loadDemo, clearAll } = useData()
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [typed, setTyped] = useState('')
  const messages = conversations.reduce((s, c) => s + c.messages.length, 0)

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader
          title={<span className="flex items-center gap-2"><Database className="size-4" /> Banco de dados</span>}
          description="Onde ficam contatos, conversas, mensagens e agendamentos"
          action={<Badge tone={APP_MODE || REMOTE_MODE ? 'success' : 'neutral'}>{APP_MODE ? 'SQLite local' : REMOTE_MODE ? 'Supabase online' : 'Configuração pendente'}</Badge>}
        />
        <div className="grid gap-3 px-5 pb-5 sm:grid-cols-3">
          {[
            ['Contatos', contacts.length],
            ['Conversas', conversations.length],
            ['Mensagens', messages]
          ].map(([l, v]) => (
            <div key={String(l)} className="rounded-xl bg-surface-2 p-3">
              <p className="text-xs text-muted">{l}</p>
              <p className="text-xl font-bold tabular-nums">{Number(v).toLocaleString('pt-BR')}</p>
            </div>
          ))}
          <p className="flex items-start gap-2 text-xs text-muted sm:col-span-3">
            <HardDrive className="mt-0.5 size-3.5 shrink-0" />
            {APP_MODE
              ? 'Arquivo icchat.db e pasta media em %APPDATA%\\IC Chat.'
              : REMOTE_MODE ? 'Contatos e conversas desta conta ficam no Supabase, isolados por empresa.' : 'Configure o Supabase para armazenar dados online.'}
          </p>
        </div>
      </Card>

      {APP_MODE && (
        <Card>
          <CardHeader title="Dados de teste" description="Para experimentar as telas antes de usar com clientes reais" />
          <div className="flex flex-col gap-3 px-5 pb-5 sm:flex-row">
            <Button
              variant="outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                await loadDemo()
                setBusy(false)
                toast.success('Dados de exemplo carregados', { description: 'Contatos e conversas de demonstração foram adicionados.' })
              }}
            >
              {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} Carregar dados de exemplo
            </Button>
            <Button variant="outline" className="text-danger" onClick={() => setConfirm(true)}>
              <Trash2 /> Apagar todos os dados
            </Button>
          </div>
        </Card>
      )}

      <Dialog
        open={confirm}
        onOpenChange={(v) => {
          setConfirm(v)
          setTyped('')
        }}
        title="Apagar todos os dados?"
        description="Contatos, conversas, mensagens e agendamentos deste computador serão apagados. Não dá para desfazer."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(false)}>Cancelar</Button>
            <Button
              variant="danger"
              disabled={typed.trim().toUpperCase() !== 'APAGAR'}
              onClick={async () => {
                await clearAll()
                setConfirm(false)
                setTyped('')
                toast.success('Dados apagados')
              }}
            >
              <Trash2 /> Apagar tudo
            </Button>
          </>
        }
      >
        <Field label='Para confirmar, digite "APAGAR"'>
          <Input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} />
        </Field>
      </Dialog>
    </div>
  )
}
