const { screen } = require('electron')

/**
 * DisplayManager — multi-monitor support for LED output.
 * Lets the editor route the player window to a specific display
 * (videotron, external monitor, LED controller input…).
 */
class DisplayManager {
  getAllDisplays() {
    return screen.getAllDisplays()
  }

  getPrimaryDisplay() {
    return screen.getPrimaryDisplay()
  }

  getExternalDisplays() {
    const primary = screen.getPrimaryDisplay()
    return screen.getAllDisplays().filter((d) => d.id !== primary.id)
  }

  getDisplayById(id) {
    return screen.getAllDisplays().find((d) => String(d.id) === String(id)) || null
  }

  /** Move a BrowserWindow to the top-left corner of a display. */
  moveWindowToDisplay(browserWindow, display) {
    const { x, y } = display.bounds
    browserWindow.setPosition(x, y)
  }
}

module.exports = new DisplayManager()
