declare global {
  interface Window {
    /** Presente só quando roda dentro do Electron. */
    icchat?: {
      isDesktop: true
      platform: NodeJS.Platform | string
      setTitleBarTheme: (theme: 'light' | 'dark') => void
    }
  }
}
export {}
