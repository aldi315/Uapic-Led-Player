const { screen } = require('electron')

/**
 * DisplayManager — future multi-monitor support for LED output.
 * Allows selecting a specific display for the player window,
 * enabling videotron and external monitor routing.
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

  /**
   * Move a BrowserWindow to a specific display.
   * @param {BrowserWindow} browserWindow
   * @param {Electron.Display} display
   */
  moveWindowToDisplay(browserWindow, display) {
    const { x, y } = display.bounds
    browserWindow.setPosition(x, y)
  }

  /**
   * Set a BrowserWindow to fullscreen on a specific display.
   * @param {BrowserWindow} browserWindow
   * @param {Electron.Display} display
   */
  setFullscreenOnDisplay(browserWindow, display) {
    const { x, y, width, height } = display.bounds
    browserWindow.setPosition(x, y)
    browserWindow.setSize(width, height)
    browserWindow.setFullScreen(true)
  }

  getDisplayById(id) {
    return screen.getAllDisplays().find((d) => d.id === id) || null
  }
}

module.exports = new DisplayManager()
