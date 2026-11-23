const { BrowserWindow, app } = require('electron')
const path = require('path')

const devServerUrl = process.env.VITE_DEV_SERVER_URL

function createControlWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    show: false,
    transparent: false,
    backgroundColor: '#0c0c0c',
    title: 'UAPIC LED Player',
    icon: path.join(app.getAppPath(), 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  })

  win.setMenu(null)
  win.once('ready-to-show', () => win.show())

  // Keyboard handling local to this window (no system-wide global shortcuts)
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    const key = input.key.toLowerCase()
    if (input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen())
      event.preventDefault()
    } else if ((input.control || input.meta) && key === 'r' && !devServerUrl) {
      // Block accidental reloads in production (would lose unsaved work)
      event.preventDefault()
    } else if (input.key === 'F12' && devServerUrl) {
      win.webContents.toggleDevTools()
      event.preventDefault()
    }
  })

  // Keep the renderer's maximize icon in sync
  const sendState = () => win.webContents.send('control-window-state', { maximized: win.isMaximized() })
  win.on('maximize', sendState)
  win.on('unmaximize', sendState)

  // Ask the renderer before closing so it can warn about unsaved changes.
  win.forceClose = false
  win.on('close', (e) => {
    if (win.forceClose) return
    e.preventDefault()
    win.webContents.send('app-close-requested')
  })

  if (devServerUrl) {
    win.loadURL(new URL('control.html', devServerUrl).toString())
  } else {
    win.loadFile(path.join(__dirname, '../../dist/control.html'))
  }

  return win
}

module.exports = { createControlWindow }
