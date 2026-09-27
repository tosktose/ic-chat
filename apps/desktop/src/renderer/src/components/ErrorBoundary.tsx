import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RotateCcw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = { children: ReactNode; /** muda quando a pessoa troca de tela: limpa o erro */ resetKey?: string; full?: boolean }
type State = { error: Error | null }

/** Se uma tela falhar, mostra um aviso com opção de tentar de novo em vez de deixar o app em branco */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[IC Chat] Erro na tela:', error, info.componentStack)
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className={this.props.full ? 'flex h-screen items-center justify-center bg-background p-6' : 'flex h-full items-center justify-center p-6'}>
        <div role="alert" className="flex max-w-md flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
            <TriangleAlert className="size-6" />
          </span>
          <p className="text-lg font-semibold">Algo deu errado nesta tela</p>
          <p className="text-sm text-muted">
            Seus dados estão salvos. Tente de novo; se continuar, feche e abra o IC Chat.
          </p>
          <code className="max-w-full truncate rounded-lg bg-surface-2 px-2 py-1 text-xs text-muted">{error.message}</code>
          <div className="mt-2 flex gap-2">
            <Button variant="outline" onClick={() => (window.location.hash = '#/')}>Ir para o início</Button>
            <Button onClick={() => this.setState({ error: null })}>
              <RotateCcw /> Tentar de novo
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
