import { contextBridge, ipcRenderer } from 'electron'

const api = {
  isDesktop: true,
  platform: process.platform,
  setTitleBarTheme: (theme: 'light' | 'dark') => ipcRenderer.send('titlebar:theme', theme),
  /** Pisca o ícone na barra de tarefas até a janela receber foco */
  flashFrame: () => ipcRenderer.send('window:flash'),
  /** Gera PDF (A4) do HTML, pergunta onde salvar e abre o arquivo */
  saveFile: (content: string, fileName: string, filters: { name: string; extensions: string[] }[]) =>
    ipcRenderer.invoke('file:save', { content, fileName, filters }) as Promise<
      { ok: true; path?: string } | { ok: false; canceled?: boolean; error?: string }
    >,
  exportPdf: (html: string, fileName: string) =>
    ipcRenderer.invoke('pdf:export', { html, fileName }) as Promise<
      { ok: true; path?: string } | { ok: false; canceled?: boolean; error?: string }
    >
}

contextBridge.exposeInMainWorld('icchat', api)

export type IcChatBridge = typeof api
