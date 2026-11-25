const { ipcMain, app } = require('electron')
const fs = require('fs')
const { loadSettings, saveSettings, applyLoginItem, loginItemEnabled } = require('../settings')

function describe(settings) {
  return {
    ...settings,
    startupProjectExists: !!settings.startupProject && fs.existsSync(settings.startupProject),
    loginItemActive: loginItemEnabled(),
    canStartWithWindows: app.isPackaged,
  }
}

function setupSettingsIPC() {
  ipcMain.handle('get-app-settings', () => describe(loadSettings()))

  // Merge, save, and (un)register the Windows start-up entry
  ipcMain.handle('set-app-settings', (event, changes) => {
    const saved = saveSettings({ ...loadSettings(), ...(changes || {}) })
    const login = applyLoginItem(saved)
    return { ...describe(saved), loginNote: login.applied ? null : login.reason }
  })
}

module.exports = { setupSettingsIPC }
