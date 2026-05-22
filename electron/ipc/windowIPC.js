const { ipcMain } = require('electron')

function setupWindowIPC(getControlWindow) {
  ipcMain.on('control-minimize', () => {
    const win = getControlWindow()
    if (win && !win.isDestroyed()) win.minimize()
  })

  ipcMain.on('control-maximize', () => {
    const win = getControlWindow()
    if (win && !win.isDestroyed()) {
      if (win.isMaximized()) {
        win.restore()
      } else {
        win.maximize()
      }
    }
  })

  ipcMain.on('control-close', () => {
    const win = getControlWindow()
    if (win && !win.isDestroyed()) win.close()
  })

  ipcMain.on('player-toggle-fullscreen', (event, getPlayerWindow) => {
    // Handled via direct reference in mediaIPC
  })

  ipcMain.on('player-set-always-on-top', (event, value) => {
    // Forwarded from mediaIPC
  })
}

module.exports = { setupWindowIPC }
