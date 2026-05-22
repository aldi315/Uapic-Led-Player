const { ipcMain } = require('electron')

let currentScene = null

function setupMediaIPC(getPlayerWindow) {
  // Push full scene state from control to player
  // Auto-resize player window to match canvas dimensions (1:1 mirror)
  ipcMain.on('push-scene-update', (event, scene) => {
    currentScene = scene
    const player = getPlayerWindow()
    if (player && !player.isDestroyed()) {
      // Resize window to exactly match canvas size
      if (scene.canvasSize?.width && scene.canvasSize?.height) {
        player.setSize(scene.canvasSize.width, scene.canvasSize.height)
      }
      // Reposition window if specified
      if (scene.windowPosition) {
        player.setPosition(scene.windowPosition.x || 0, scene.windowPosition.y || 0)
      }
      player.webContents.send('scene-update', scene)
    }
  })

  // Player signals readiness — replay last known scene
  ipcMain.on('player-ready', (event) => {
    if (currentScene) {
      event.sender.send('scene-update', currentScene)
    }
  })

  // Playback control commands forwarded to player
  ipcMain.on('player-play', () => {
    const player = getPlayerWindow()
    if (player && !player.isDestroyed()) {
      player.webContents.send('player-command', { command: 'play' })
    }
  })

  ipcMain.on('player-pause', () => {
    const player = getPlayerWindow()
    if (player && !player.isDestroyed()) {
      player.webContents.send('player-command', { command: 'pause' })
    }
  })

  ipcMain.on('player-stop', () => {
    const player = getPlayerWindow()
    if (player && !player.isDestroyed()) {
      player.webContents.send('player-command', { command: 'stop' })
    }
  })

  ipcMain.on('player-reload-scene', () => {
    const player = getPlayerWindow()
    if (player && !player.isDestroyed() && currentScene) {
      player.webContents.send('scene-update', currentScene)
    }
  })

  ipcMain.on('player-clear-scene', () => {
    currentScene = null
    const player = getPlayerWindow()
    if (player && !player.isDestroyed()) {
      player.webContents.send('player-command', { command: 'clear' })
    }
  })

  // Player window: fullscreen and always-on-top
  ipcMain.on('player-toggle-fullscreen', () => {
    const player = getPlayerWindow()
    if (player && !player.isDestroyed()) {
      player.setFullScreen(!player.isFullScreen())
    }
  })

  ipcMain.on('player-set-always-on-top', (event, value) => {
    const player = getPlayerWindow()
    if (player && !player.isDestroyed()) {
      player.setAlwaysOnTop(value)
    }
  })

  ipcMain.on('player-resize', (event, { width, height }) => {
    const player = getPlayerWindow()
    if (player && !player.isDestroyed()) {
      player.setSize(width, height)
    }
  })
}

module.exports = { setupMediaIPC }
