import { app, BrowserWindow, dialog, ipcMain, nativeTheme, shell } from 'electron'
import { unlink, writeFile } from 'node:fs/promises'
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

  // Salvar arquivos gerados pelo app (ex.: planilhas CSV dos relatórios)
  ipcMain.handle(
    'file:save',
    async (event, { content, fileName, filters }: { content: string; fileName: string; filters: { name: string; extensions: string[] }[] }) => {
      const parent = BrowserWindow.fromWebContents(event.sender) ?? undefined
      const choice = await dialog.showSaveDialog(parent!, { defaultPath: join(app.getPath('documents'), fileName), filters })
      if (choice.canceled || !choice.filePath) return { ok: false, canceled: true }
      try {
        await writeFile(choice.filePath, content, 'utf8')
        void shell.openPath(choice.filePath)
        return { ok: true, path: choice.filePath }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) }
      }
    }
  )

  // Relatórios em PDF: renderiza o HTML numa janela invisível e imprime em A4
  ipcMain.handle('pdf:export', async (event, { html, fileName }: { html: string; fileName: string }) => {
    const parent = BrowserWindow.fromWebContents(event.sender) ?? undefined
    const choice = await dialog.showSaveDialog(parent!, {
      title: 'Salvar relatório em PDF',
      defaultPath: join(app.getPath('documents'), fileName),
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (choice.canceled || !choice.filePath) return { ok: false, canceled: true }

    const tmp = join(app.getPath('temp'), `icchat-relatorio-${Date.now()}.html`)
    const win = new BrowserWindow({ show: false, webPreferences: { javascript: false, sandbox: true } })
    try {
      await writeFile(tmp, html, 'utf8')
      await win.loadFile(tmp)
      const pdf = await win.webContents.printToPDF({
        // Margens vêm do CSS (@page): a capa encosta no topo e as demais páginas têm respiro
        preferCSSPageSize: true,
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `<div style="width:100%;padding:0 14mm;display:flex;justify-content:space-between;font-family:Segoe UI,Arial,sans-serif;font-size:7.5px;color:#94a3b8">
          <span>IC Chat · Powered by itaCondo · Relatório confidencial</span>
          <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`
      })
      await writeFile(choice.filePath, pdf)
      void shell.openPath(choice.filePath)
      return { ok: true, path: choice.filePath }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    } finally {
      win.destroy()
      void unlink(tmp).catch(() => undefined)
    }
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
