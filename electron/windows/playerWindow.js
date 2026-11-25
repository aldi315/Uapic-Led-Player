const { BrowserWindow, app, screen } = require('electron')
const path = require('path')

const devServerUrl = process.env.VITE_DEV_SERVER_URL

let playerWindow = null

function createPlayerWindow() {
  playerWindow = new BrowserWindow({
    // Same as the default scene canvas (src/data/scenes/defaultScene.js)
    width: 600,
    height: 400,
    useContentSize: true,
    x: 0,
    y: 0,
    frame: false,
    // Windows 11 draws a 1px border along the top of frameless windows that
    // keep the resize frame, hiding the canvas's first pixel row. The output is
    // never resized by hand (see will-resize below), so drop that frame.
    thickFrame: false,
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
      toggleOutputFullscreen()
      event.preventDefault()
    } else if (input.key === 'Escape' && isOutputFullscreen()) {
      exitOutputFullscreen()
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

// ── Output fullscreen ────────────────────────────────────────────────────────
// Done by hand: with thickFrame:false, Windows' own fullscreen still resizes the
// window but isFullScreen() always answers false, so F11/Esc, the editor status
// and PUSH (which must not shrink a fullscreen output) could not rely on it.
// The window is always-on-top, so covering the display's bounds hides the taskbar.
let fullscreen = false
let restoreBounds = null

function isOutputFullscreen() {
  return !!getPlayerWindow() && fullscreen
}

/** Cover a whole display (default: the one the output is on). */
function enterOutputFullscreen(display) {
  const win = getPlayerWindow()
  if (!win) return
  if (!fullscreen) restoreBounds = win.getContentBounds()
  const target = display || screen.getDisplayMatching(win.getBounds())
  win.setBounds(target.bounds)
  if (!fullscreen) {
    fullscreen = true
    win.emit('output-fullscreen-changed', true)
  }
}

function exitOutputFullscreen() {
  const win = getPlayerWindow()
  if (!win || !fullscreen) return
  fullscreen = false
  if (restoreBounds) win.setContentBounds(restoreBounds)
  restoreBounds = null
  win.emit('output-fullscreen-changed', false)
}

function toggleOutputFullscreen() {
  if (isOutputFullscreen()) exitOutputFullscreen()
  else enterOutputFullscreen()
}

module.exports = {
  createPlayerWindow, getPlayerWindow,
  isOutputFullscreen, enterOutputFullscreen, exitOutputFullscreen, toggleOutputFullscreen,
}
