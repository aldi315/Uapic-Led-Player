const { app, protocol, session, screen, ipcMain } = require('electron')
const fs = require('fs')
const path = require('path')
const { handleMediaRequest } = require('./mediaProtocol')
const { setupSettingsIPC } = require('./ipc/settingsIPC')
const { loadSettings, applyLoginItem, launchedAtLogin } = require('./settings')
const { createControlWindow } = require('./windows/controlWindow')
const { createPlayerWindow, getPlayerWindow } = require('./windows/playerWindow')
const { setupWindowIPC } = require('./ipc/windowIPC')
const { setupMediaIPC } = require('./ipc/mediaIPC')
const { setupDialogIPC, readProjectFile } = require('./ipc/dialogIPC')
const { setupDisplayIPC } = require('./ipc/displayIPC')

// Referer sent with YouTube embeds when the page itself provides none
const YOUTUBE_EMBED_REFERER = 'https://uapic.co.id/'

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
      // standard: required for <video> to seek (and so loop) over a custom scheme
      standard: true,
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

/**
 * Send a project file to the control window so the editor can load it.
 * `extra` rides along, e.g. { autoPlay: true, delay: 10 } for start-up playback.
 */
function openProjectInControl(filePath, extra = {}) {
  const win = getControlWindow()
  if (!win || !filePath) return
  const result = { ...readProjectFile(filePath), ...extra }
  // Until the editor has subscribed, a sent message would be lost: park it and
  // hand it over when the editor asks (editor-ready).
  if (editorReady) win.webContents.send('open-project-file', result)
  else pendingOpen = result
}

let editorReady = false
let pendingOpen = null

ipcMain.handle('editor-ready', () => {
  editorReady = true
  const res = pendingOpen
  pendingOpen = null
  return res
})

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
  // media:///C:/Users/foo/bar.mp4 → C:/Users/foo/bar.mp4, seekable (206 ranges)
  session.defaultSession.protocol.handle('media', handleMediaRequest)

  // YouTube refuses embeds that arrive without a Referer ("Error 153 – video
  // player configuration error"). The packaged app loads its pages from
  // file://, which sends none, so give the embed player an identifying one.
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://www.youtube.com/embed/*', 'https://www.youtube-nocookie.com/embed/*'] },
    (details, callback) => {
      const headers = details.requestHeaders
      if (!headers.Referer && !headers.referer) headers.Referer = YOUTUBE_EMBED_REFERER
      callback({ requestHeaders: headers })
    }
  )

  controlWindow = createControlWindow()
  const player = createPlayerWindow()

  setupWindowIPC(getControlWindow)
  setupMediaIPC(getPlayerWindow, getControlWindow)
  setupDialogIPC(getControlWindow)
  setupDisplayIPC(getPlayerWindow, getControlWindow)

  setupSettingsIPC()

  const settings = loadSettings()
  const atLogin = launchedAtLogin()
  // Keep the Windows start-up entry pointing at this copy of the app (reinstalls, moved portable exe)
  if (settings.startWithWindows) applyLoginItem(settings)

  if (pendingProjectPath) {
    // A double-clicked .ulp wins over the start-up project
    openProjectInControl(pendingProjectPath)
    pendingProjectPath = null
  } else if (settings.autoPlay && settings.startupProject) {
    // Start-up playback: open the chosen project, then push + play it. After a
    // Windows sign-in wait a little so displays, LED senders and network are up.
    openProjectInControl(settings.startupProject, {
      autoPlay: true,
      delay: atLogin ? settings.startupDelay : 1,
    })
  }

  if (atLogin && settings.minimizeEditor) {
    controlWindow.once('show', () => controlWindow.minimize())
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
