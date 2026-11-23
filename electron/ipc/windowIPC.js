const { ipcMain } = require('electron')

function setupWindowIPC(getControlWindow) {
  ipcMain.on('control-minimize', () => getControlWindow()?.minimize())

  ipcMain.on('control-maximize', () => {
    const win = getControlWindow()
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })

  // Renderer asks to close → goes through the 'close' handler (unsaved check)
  ipcMain.on('control-close', () => getControlWindow()?.close())

  // Renderer confirmed that closing is OK (saved or discarded)
  ipcMain.on('control-close-confirmed', () => {
    const win = getControlWindow()
    if (!win) return
    win.forceClose = true
    win.close()
  })

  ipcMain.on('set-window-title', (event, title) => {
    getControlWindow()?.setTitle(String(title || 'UAPIC LED Player'))
  })
}

module.exports = { setupWindowIPC }
