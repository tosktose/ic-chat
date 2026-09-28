import { app, BrowserWindow, dialog, ipcMain, nativeTheme, net, protocol, session, shell, type IpcMainInvokeEvent } from 'electron'
import { unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import * as ai from './ai'
import * as db from './db'
import * as gcal from './google'
import * as wa from './whatsapp'

const __dirname = import.meta.dirname
const isMac = process.platform === 'darwin'

// Uma instância só: duas cópias abertas brigariam pela mesma sessão do WhatsApp e pelo banco
if (!app.requestSingleInstanceLock()) {
  app.quit()
}

// Sons de notificação tocam mesmo antes do primeiro clique na janela
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

// Endereço interno para as mídias salvas (fotos, áudios, documentos)
protocol.registerSchemesAsPrivileged([
  { scheme: 'icchat-media', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } }
])

let mainWindow: BrowserWindow | null = null

/** A interface só pode ter vindo do próprio app (arquivo local ou servidor de desenvolvimento) */
function isTrustedUrl(url: string | undefined): boolean {
  if (!url) return false
  if (process.env.ELECTRON_RENDERER_URL && url.startsWith(process.env.ELECTRON_RENDERER_URL)) return true
  return url.startsWith(pathToFileURL(join(__dirname, '../renderer/')).toString())
}
const trusted = (e: { senderFrame?: { url: string } | null }) => isTrustedUrl(e.senderFrame?.url)

/** Links externos: só web, e-mail e telefone (nunca file:, data:, javascript:) */
function openExternalSafe(url: string) {
  try {
    const u = new URL(url)
    if (['https:', 'http:', 'mailto:', 'tel:'].includes(u.protocol)) void shell.openExternal(u.toString())
  } catch {
    /* URL inválida: ignora */
  }
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 380,
    minHeight: 600,
    show: false,
    title: 'IC Chat',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0b1020' : '#f5f7fb',
    // Ícone da janela e da barra de tarefas (empacotado: .ico copiado para resources; desenvolvimento: PNG)
    icon: app.isPackaged ? join(process.resourcesPath, 'icon.ico') : join(__dirname, '../../build/icon-256.png'),
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
      nodeIntegration: false,
      webviewTag: false,
      spellcheck: true
    }
  })

  win.once('ready-to-show', () => win.show())
  win.on('focus', () => win.flashFrame(false))

  // Novas janelas nunca abrem dentro do app: links vão para o navegador (se forem seguros)
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternalSafe(url)
    return { action: 'deny' }
  })
  // A janela do app não pode ser levada para outro endereço
  win.webContents.on('will-navigate', (e, url) => {
    if (!isTrustedUrl(url)) {
      e.preventDefault()
      openExternalSafe(url)
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
  mainWindow = win
  return win
}

app.on('second-instance', () => {
  // Abriu o atalho de novo: traz a janela existente para a frente
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
})

app.whenReady().then(() => {
  app.setAppUserModelId('br.com.itacondo.icchat')
  db.open()

  // Permissões: só microfone (áudios), notificações e área de transferência
  const allowed = (perm: string, details?: { mediaTypes?: string[] }) =>
    perm === 'notifications' ||
    perm === 'clipboard-sanitized-write' ||
    perm === 'fullscreen' ||
    (perm === 'media' && (details?.mediaTypes ?? ['audio']).every((t) => t === 'audio'))
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb, details) =>
    cb(isTrustedUrl(wc.getURL()) && allowed(perm, details as { mediaTypes?: string[] }))
  )
  session.defaultSession.setPermissionCheckHandler((wc, perm) => (wc ? isTrustedUrl(wc.getURL()) : false) && allowed(perm))

  // Mídias salvas: icchat-media://m/<arquivo> → arquivo em %APPDATA%/IC Chat/media
  protocol.handle('icchat-media', async (req) => {
    try {
      const file = await net.fetch(pathToFileURL(db.mediaPath(req.url)).toString())
      const headers = new Headers(file.headers)
      headers.set('Access-Control-Allow-Origin', '*')
      headers.set('X-Content-Type-Options', 'nosniff')
      return new Response(file.body, { status: file.status, headers })
    } catch {
      return new Response('Não encontrado', { status: 404 })
    }
  })

  ipcMain.on('titlebar:theme', (event, theme: 'light' | 'dark') => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || isMac || !trusted(event)) return
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
      if (!trusted(event)) return { ok: false, error: 'Origem não autorizada' }
      if (typeof content !== 'string' || content.length > 50_000_000) return { ok: false, error: 'Arquivo grande demais' }
      const parent = BrowserWindow.fromWebContents(event.sender) ?? undefined
      const choice = await dialog.showSaveDialog(parent!, { defaultPath: join(app.getPath('documents'), String(fileName)), filters })
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

  // Relatórios em PDF: renderiza o HTML numa janela invisível (sem JavaScript) e imprime em A4
  ipcMain.handle('pdf:export', async (event, { html, fileName }: { html: string; fileName: string }) => {
    if (!trusted(event)) return { ok: false, error: 'Origem não autorizada' }
    if (typeof html !== 'string' || html.length > 40_000_000) return { ok: false, error: 'Relatório grande demais' }
    const parent = BrowserWindow.fromWebContents(event.sender) ?? undefined
    const choice = await dialog.showSaveDialog(parent!, {
      title: 'Salvar relatório em PDF',
      defaultPath: join(app.getPath('documents'), String(fileName)),
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (choice.canceled || !choice.filePath) return { ok: false, canceled: true }

    const tmp = join(app.getPath('temp'), `icchat-relatorio-${Date.now()}.html`)
    const win = new BrowserWindow({ show: false, webPreferences: { javascript: false, sandbox: true } })
    // O documento do relatório não pode sair para a internet
    win.webContents.session.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_d, cb) => cb({ cancel: true }))
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

  // ---------------- Banco, WhatsApp e Google Agenda ----------------
  // Toda chamada devolve { ok, data } ou { ok: false, error } e só aceita a interface do próprio app
  const handle = (name: string, fn: (...args: never[]) => unknown) =>
    ipcMain.handle(name, async (event: IpcMainInvokeEvent, ...args) => {
      if (!trusted(event)) return { ok: false, error: 'Origem não autorizada' }
      try {
        return { ok: true, data: await (fn as (...a: unknown[]) => unknown)(...args) }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    })
  const b64 = (s: unknown) => {
    if (typeof s !== 'string') throw new Error('Arquivo inválido')
    if (s.length > db.MAX_MEDIA_BYTES * 1.4) throw new Error('Arquivo maior que 16 MB')
    return Buffer.from(s, 'base64')
  }

  handle('db:load', () => db.loadAll())
  handle('db:upsert', (kind: string, id: string, data: unknown, parent?: string) => db.upsert(kind, id, data, parent))
  handle('db:remove', (kind: string, id: string) => db.remove(kind, id))
  handle('db:clear', () => db.clearAll())
  handle('media:save', (base64: string, mime: string, fileName?: string) => db.saveMedia(b64(base64), String(mime), fileName))

  handle('wa:start', () => wa.start())
  handle('wa:state', () => wa.getState())
  handle('wa:logout', () => wa.logout())
  handle('wa:pair', (phone: string) => wa.pairingCode(String(phone)))
  handle('wa:check', (phone: string) => wa.checkNumber(String(phone)))
  handle('wa:sendText', (to: string, text: string) => {
    if (typeof text !== 'string' || !text.trim() || text.length > 65_000) throw new Error('Mensagem inválida')
    return wa.sendText(String(to), text)
  })
  handle('wa:sendMedia', (to: string, media: wa.OutMedia) => {
    b64(media?.base64)
    return wa.sendMedia(String(to), media)
  })
  handle('ai:status', () => ai.status())
  handle('ai:setKey', (provider: unknown, key: unknown) => ai.setKey(provider, key))
  handle('ai:clearKey', (provider: unknown) => ai.clearKey(provider))
  handle('ai:test', (provider: unknown, model: unknown) => ai.test(provider, model))
  handle('ai:reply', (provider: unknown, model: unknown, system: unknown, turns: unknown) => ai.reply(provider, model, system, turns))

  handle('gcal:status', () => gcal.status())
  handle('gcal:setCredentials', (id: string, secret: string) => gcal.setCredentials(String(id), String(secret)))
  handle('gcal:connect', (proId: string) => gcal.connect(String(proId)))
  handle('gcal:disconnect', (proId: string) => gcal.disconnect(String(proId)))
  handle('gcal:createEvent', (proId: string, ev: gcal.NewEvent) => gcal.createEvent(String(proId), ev))
  handle('gcal:deleteEvent', (proId: string, id: string) => gcal.deleteEvent(String(proId), String(id)))
  handle('gcal:listDay', (proId: string, date: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) throw new Error('Data inválida')
    return gcal.listDay(String(proId), date)
  })

  ipcMain.on('window:flash', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win && trusted(event) && !win.isFocused()) win.flashFrame(true)
  })

  createWindow()
  // Sessão do WhatsApp salva: reconecta sozinho ao abrir o app
  void wa.hasSession().then((has) => {
    if (has) void wa.start()
  })
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => wa.stop())

app.on('window-all-closed', () => {
  if (!isMac) app.quit()
})
