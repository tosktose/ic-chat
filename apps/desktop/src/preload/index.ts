import { contextBridge, ipcRenderer } from 'electron'

const api = {
  isDesktop: true,
  platform: process.platform,
  setTitleBarTheme: (theme: 'light' | 'dark') => ipcRenderer.send('titlebar:theme', theme),
  /** Pisca o ícone na barra de tarefas até a janela receber foco */
  flashFrame: () => ipcRenderer.send('window:flash')
}

contextBridge.exposeInMainWorld('icchat', api)

export type IcChatBridge = typeof api
