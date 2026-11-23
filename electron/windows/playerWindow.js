const { BrowserWindow, app } = require('electron')
const path = require('path')

const devServerUrl = process.env.VITE_DEV_SERVER_URL

let playerWindow = null

function createPlayerWindow() {
  playerWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    x: 0,
    y: 0,
    frame: false,
    transparent: false,
    backgroundColor: '#000000',
    title: 'UAPIC LED Player — Output',
    icon: path.join(app.getAppPath(), 'icon.png'),
    autoHideMenuBar: true,
    // Locked in place — position is set only from the editor (scene POS X/Y
    // or Player → Send output to display), never by dragging with the mouse.
    movable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    roundedCorners: false,
    // Allow the window to be sized exactly to the LED canvas (even tiny strips)
    minWidth: 16,
    minHeight: 16,
    enableLargerThanScreen: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      backgroundThrottling: false,
    },
  })

  playerWindow.setMenu(null)

  // Block manual moving / resizing by the user. These events only fire for
  // user-initiated changes, so setPosition / setContentSize from the editor
  // still work. (resizable:false is avoided: on Windows it makes frameless
  // windows shrink when resized programmatically.)
  playerWindow.on('will-move', (e) => e.preventDefault())
  playerWindow.on('will-resize', (e) => e.preventDefault())

  playerWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    if (input.key === 'F11') {
      playerWindow.setFullScreen(!playerWindow.isFullScreen())
      event.preventDefault()
    } else if (input.key === 'Escape' && playerWindow.isFullScreen()) {
      playerWindow.setFullScreen(false)
      event.preventDefault()
    } else if ((input.control || input.meta) && input.key.toLowerCase() === 'r' && !devServerUrl) {
      event.preventDefault()
    }
  })

  // Clicking a link inside an HTML widget must never navigate the output away
  playerWindow.webContents.on('will-navigate', (e) => e.preventDefault())
  playerWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  if (devServerUrl) {
    playerWindow.loadURL(new URL('player.html', devServerUrl).toString())
  } else {
    playerWindow.loadFile(path.join(__dirname, '../../dist/player.html'))
  }

  return playerWindow
}

function getPlayerWindow() {
  return playerWindow && !playerWindow.isDestroyed() ? playerWindow : null
}

module.exports = { createPlayerWindow, getPlayerWindow }
