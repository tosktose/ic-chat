import { contextBridge, ipcRenderer } from 'electron'

const api = {
  isDesktop: true,
  platform: process.platform,
  setTitleBarTheme: (theme: 'light' | 'dark') => ipcRenderer.send('titlebar:theme', theme)
}

contextBridge.exposeInMainWorld('icchat', api)

export type IcChatBridge = typeof api
