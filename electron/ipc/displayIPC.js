const { ipcMain } = require('electron')
const displayManager = require('../displays/displayManager')

function setupDisplayIPC(getPlayerWindow) {
  ipcMain.handle('get-displays', () => {
    const primaryId = displayManager.getPrimaryDisplay().id
    return displayManager.getAllDisplays().map((d, i) => ({
      id: d.id,
      index: i + 1,
      label: d.label || `Display ${i + 1}`,
      primary: d.id === primaryId,
      bounds: d.bounds,
      scaleFactor: d.scaleFactor,
      size: { width: Math.round(d.size.width * d.scaleFactor), height: Math.round(d.size.height * d.scaleFactor) },
    }))
  })

  // Move the output window onto a display, optionally covering it fullscreen
  ipcMain.handle('player-move-to-display', (event, { displayId, fullscreen }) => {
    const player = getPlayerWindow()
    const display = displayManager.getDisplayById(displayId)
    if (!player || !display) return false
    if (player.isFullScreen()) player.setFullScreen(false)
    if (fullscreen) {
      displayManager.setFullscreenOnDisplay(player, display)
    } else {
      displayManager.moveWindowToDisplay(player, display)
    }
    return true
  })
}

module.exports = { setupDisplayIPC }
