const { app, protocol, net, session, screen } = require('electron')
const fs = require('fs')
const path = require('path')
const { pathToFileURL } = require('url')
const { createControlWindow } = require('./windows/controlWindow')
const { createPlayerWindow, getPlayerWindow } = require('./windows/playerWindow')
const { setupWindowIPC } = require('./ipc/windowIPC')
const { setupMediaIPC } = require('./ipc/mediaIPC')
const { setupDialogIPC, readProjectFile } = require('./ipc/dialogIPC')
const { setupDisplayIPC } = require('./ipc/displayIPC')

// ── Single instance ──────────────────────────────────────────────────────────
// Double-clicking a .ulp file while the app is running opens it in the
// existing instance instead of launching a second player.
if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

// ── Custom media:// protocol ─────────────────────────────────────────────────
// Must be registered before app.whenReady() so renderers can use it.
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

app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
// Allow videos with sound to start without a user gesture (signage use case)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

let controlWindow = null
let pendingProjectPath = findProjectArg(process.argv)

/** Find the first *.ulp path in a command line. */
function findProjectArg(argv) {
  const hit = (argv || []).slice(1).find((a) => /\.ulp$/i.test(a) && fs.existsSync(a))
  return hit ? path.resolve(hit) : null
}

function getControlWindow() {
  return controlWindow && !controlWindow.isDestroyed() ? controlWindow : null
}

/** Send a project file to the control window so the editor can load it. */
function openProjectInControl(filePath) {
  const win = getControlWindow()
  if (!win || !filePath) return
  const result = readProjectFile(filePath)
  const send = () => win.webContents.send('open-project-file', result)
  if (win.webContents.isLoading()) win.webContents.once('did-finish-load', send)
  else send()
}

app.on('second-instance', (event, argv) => {
  const win = getControlWindow()
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
  const file = findProjectArg(argv)
  if (file) openProjectInControl(file)
})

// macOS: file opened via Finder
app.on('open-file', (event, filePath) => {
  event.preventDefault()
  if (app.isReady()) openProjectInControl(filePath)
  else pendingProjectPath = filePath
})

app.whenReady().then(() => {
  // media:///C:/Users/foo/bar.mp4 → C:/Users/foo/bar.mp4
  session.defaultSession.protocol.handle('media', (request) => {
    let filePath = decodeURIComponent(request.url.slice('media:///'.length))
    // POSIX paths lose their leading slash when written as media:///home/...
    if (process.platform !== 'win32' && !filePath.startsWith('/')) filePath = '/' + filePath
    if (!fs.existsSync(filePath)) {
      return new Response('Not found', { status: 404 })
    }
    return net.fetch(pathToFileURL(filePath).toString(), {
      headers: request.headers, // keep Range headers so videos can seek
    })
  })

  controlWindow = createControlWindow()
  const player = createPlayerWindow()

  setupWindowIPC(getControlWindow)
  setupMediaIPC(getPlayerWindow, getControlWindow)
  setupDialogIPC(getControlWindow)
  setupDisplayIPC(getPlayerWindow, getControlWindow)

  if (pendingProjectPath) {
    openProjectInControl(pendingProjectPath)
    pendingProjectPath = null
  }

  // Closing either window quits the app
  player.on('closed', () => app.quit())
  controlWindow.on('closed', () => {
    controlWindow = null
    app.quit()
  })

  // Tell the editor when monitors are plugged / unplugged
  const notifyDisplays = () => getControlWindow()?.webContents.send('displays-changed')
  screen.on('display-added', notifyDisplays)
  screen.on('display-removed', notifyDisplays)
  screen.on('display-metrics-changed', notifyDisplays)
})

app.on('window-all-closed', () => app.quit())
