import { app, BrowserWindow, ipcMain, nativeTheme, shell } from 'electron'
import { join } from 'node:path'

const __dirname = import.meta.dirname

const isMac = process.platform === 'darwin'

// Sons de notificação tocam mesmo antes do primeiro clique na janela
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')


function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 380,
    minHeight: 600,
    show: false,
    title: 'IC Chat',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0b1020' : '#f5f7fb',
    // Empacotado, o Windows usa o .ico embutido no .exe; em desenvolvimento usamos o PNG transparente
    ...(app.isPackaged ? {} : { icon: join(__dirname, '../../build/icon-256.png') }),
    // Barra de título integrada ao app: no Windows os botões nativos ficam por cima (overlay),
    // no macOS os "semáforos" ficam à esquerda.
    titleBarStyle: 'hidden',
    ...(isMac
      ? { trafficLightPosition: { x: 16, y: 16 } }
      : { titleBarOverlay: { color: '#00000000', symbolColor: '#64748b', height: 48 } }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })

  win.once('ready-to-show', () => win.show())
  win.on('focus', () => win.flashFrame(false))

  // Links externos abrem no navegador padrão
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return win
}

app.whenReady().then(() => {
  app.setAppUserModelId('br.com.itacondo.icchat')


  ipcMain.on('titlebar:theme', (event, theme: 'light' | 'dark') => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || isMac) return
    win.setTitleBarOverlay({
      color: '#00000000',
      symbolColor: theme === 'dark' ? '#cbd5e1' : '#475569',
      height: 48
    })
  })

  ipcMain.on('window:flash', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win && !win.isFocused()) win.flashFrame(true)
  })

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (!isMac) app.quit()
})
