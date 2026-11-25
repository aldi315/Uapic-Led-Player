/**
 * App settings kept by the main process (userData/settings.json), so they are
 * available before any window loads — needed for start-up autoplay.
 */
const { app } = require('electron')
const fs = require('fs')
const path = require('path')

const DEFAULTS = {
  startWithWindows: false, // launch at Windows sign-in
  autoPlay: false,         // open the startup project and play it on launch
  startupProject: null,    // absolute path of the .ulp to play
  startupDelay: 10,        // seconds to wait after a Windows start-up (displays, LED sender, network)
  minimizeEditor: true,    // keep only the output visible after a Windows start-up
}

const AUTOSTART_ARG = '--autostart'

function file() {
  return path.join(app.getPath('userData'), 'settings.json')
}

function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(file(), 'utf8')) }
  } catch {
    return { ...DEFAULTS }
  }
}

function saveSettings(settings) {
  const clean = { ...DEFAULTS }
  for (const k of Object.keys(DEFAULTS)) if (settings[k] !== undefined) clean[k] = settings[k]
  clean.startupDelay = Math.min(300, Math.max(0, Math.round(Number(clean.startupDelay) || 0)))
  fs.mkdirSync(path.dirname(file()), { recursive: true })
  const tmp = file() + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(clean, null, 2))
  fs.renameSync(tmp, file())
  return clean
}

/** The .exe Windows should launch: the portable build runs from a temp copy. */
function launcherPath() {
  return process.env.PORTABLE_EXECUTABLE_FILE || process.execPath
}

/**
 * Register / remove the Windows sign-in entry. Only for the packaged app — in
 * development it would register the bare electron.exe.
 */
function applyLoginItem(settings) {
  if (!app.isPackaged) return { applied: false, reason: 'Only available in the installed app' }
  app.setLoginItemSettings({
    openAtLogin: !!settings.startWithWindows,
    path: launcherPath(),
    args: [AUTOSTART_ARG],
  })
  return { applied: true }
}

/** Is Windows currently set to start the app at sign-in? */
function loginItemEnabled() {
  if (!app.isPackaged) return false
  return app.getLoginItemSettings({ path: launcherPath(), args: [AUTOSTART_ARG] }).openAtLogin
}

function launchedAtLogin(argv = process.argv) {
  return argv.includes(AUTOSTART_ARG)
}

module.exports = { DEFAULTS, loadSettings, saveSettings, applyLoginItem, loginItemEnabled, launchedAtLogin, launcherPath }
