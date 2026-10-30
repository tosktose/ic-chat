import { Link, Navigate } from 'react-router'
import { ArrowDownToLine, ArrowLeft } from 'lucide-react'
import { IcLogo } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { useSeo } from '@/lib/seo'

const downloadUrl = 'https://github.com/tosktose/ic-chat/releases/latest/download/IC-Chat-Setup-0.6.1.exe'

export function DownloadPage() {
  const { session, loading } = useAuth()
  useSeo({ title: 'Baixar IC Chat', description: 'Baixe o aplicativo IC Chat para Windows.', path: '/download', noindex: true })

  if (loading) return <main className="grid min-h-screen place-items-center text-sm text-muted">Verificando seu acesso…</main>
  if (!session) return <Navigate to="/login" replace state={{ from: '/download' }} />

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-10">
      <section className="w-full max-w-lg rounded-3xl border border-border bg-surface p-8 text-center shadow-sm sm:p-10">
        <IcLogo className="mx-auto mb-8" />
        <h1 className="text-2xl font-bold">Aplicativo IC Chat</h1>
        <p className="mt-3 text-sm leading-6 text-muted">Conectado como <b className="break-all text-foreground">{session.user.email}</b>.</p>
        {downloadUrl ? (
          <a href={downloadUrl} className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <ArrowDownToLine className="size-4" /> Baixar para Windows
          </a>
        ) : (
          <p className="mt-7 rounded-xl bg-surface-2 p-4 text-sm text-muted">O instalador ainda não está disponível.</p>
        )}
        <p className="mt-4 text-xs text-muted">Windows 10 ou superior · versão 0.6.1</p>
        <Button asChild variant="ghost" className="mt-5"><Link to="/dashboard"><ArrowLeft /> Voltar ao IC Chat</Link></Button>
      </section>
    </main>
  )
}
