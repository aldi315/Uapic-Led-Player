const { app, globalShortcut, protocol, net, session } = require('electron')
const { pathToFileURL } = require('url')
const { createControlWindow } = require('./windows/controlWindow')
const { createPlayerWindow, getPlayerWindow } = require('./windows/playerWindow')
const { setupWindowIPC } = require('./ipc/windowIPC')
const { setupMediaIPC } = require('./ipc/mediaIPC')
const { setupDialogIPC } = require('./ipc/dialogIPC')

// ── Custom media:// protocol ─────────────────────────────────────────────────
// Must be registered before app.whenReady() so renderers can use it.
// This allows both windows to load local files (video/image) via media://
// without cross-origin / webSecurity restrictions from http://localhost:5173.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      bypassCSP: true,
      stream: true,
      supportFetchAPI: true,
      secure: true,
      corsEnabled: true,
    },
  },
])

let controlWindow = null

app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')

app.whenReady().then(() => {
  // Register media:// handler — resolves local file paths for both windows
  session.defaultSession.protocol.handle('media', (request) => {
    // URL: media:///C:/Users/foo/bar.mp4 → strip scheme → C:/Users/foo/bar.mp4
    const filePath = decodeURIComponent(request.url.slice('media:///'.length))
    return net.fetch(pathToFileURL(filePath).toString())
  })

  controlWindow = createControlWindow()
  createPlayerWindow()

  setupWindowIPC(() => controlWindow)
  setupMediaIPC(getPlayerWindow)
  setupDialogIPC()

  controlWindow.on('focus', () => {
    globalShortcut.register('F11', () => {
      if (controlWindow && !controlWindow.isDestroyed()) {
        controlWindow.setFullScreen(!controlWindow.isFullScreen())
      }
    })
    globalShortcut.register('CommandOrControl+R', () => {})
  })

  controlWindow.on('blur', () => {
    globalShortcut.unregisterAll()
  })

  const player = getPlayerWindow()
  if (player) {
    player.on('closed', () => { app.quit() })
  }

  if (controlWindow) {
    controlWindow.on('closed', () => { app.quit() })
  }

  app.on('activate', () => {
    if (!controlWindow || controlWindow.isDestroyed()) {
      controlWindow = createControlWindow()
    }
  })
})

app.on('window-all-closed', () => { app.quit() })
app.on('will-quit', () => { globalShortcut.unregisterAll() })
