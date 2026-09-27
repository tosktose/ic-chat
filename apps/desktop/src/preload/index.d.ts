declare global {
  interface Window {
    /** Presente só quando roda dentro do Electron. */
    icchat?: {
      isDesktop: true
      platform: NodeJS.Platform | string
      setTitleBarTheme: (theme: 'light' | 'dark') => void
      flashFrame: () => void
      exportPdf: (
        html: string,
        fileName: string
      ) => Promise<{ ok: true; path?: string } | { ok: false; canceled?: boolean; error?: string }>
    }
  }
}
export {}
