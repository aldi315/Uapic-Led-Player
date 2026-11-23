const { ipcMain } = require('electron')

let currentScene = null
let playerReady = false
let alwaysOnTop = true

function setPlayerContentSize(player, width, height) {
  player.setContentSize(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)))
}

function setupMediaIPC(getPlayerWindow, getControlWindow) {
  const sendToPlayer = (channel, payload) => {
    const player = getPlayerWindow()
    if (player) player.webContents.send(channel, payload)
    return player
  }

  const sendStatus = () => {
    const player = getPlayerWindow()
    getControlWindow()?.webContents.send('player-status', {
      connected: !!player && playerReady,
      visible: !!player && player.isVisible(),
      fullscreen: !!player && player.isFullScreen(),
      alwaysOnTop,
      hasScene: !!currentScene,
    })
  }

  // Keep status fresh when the player window changes by itself (F11, Esc…)
  const player = getPlayerWindow()
  if (player) {
    ;['enter-full-screen', 'leave-full-screen', 'show', 'hide'].forEach((ev) =>
      player.on(ev, sendStatus)
    )
    player.webContents.on('did-start-loading', () => { playerReady = false; sendStatus() })
  }

  /** Size/position the output window to match the scene (unless fullscreen). */
  function applyWindowGeometry(scene) {
    const player = getPlayerWindow()
    if (!player || player.isFullScreen()) return
    const scaleMode = scene.scaleMode || 'none'
    if (scaleMode === 'none' && scene.canvasSize?.width && scene.canvasSize?.height) {
      setPlayerContentSize(player, scene.canvasSize.width, scene.canvasSize.height)
    }
    if (scene.windowPosition) {
      player.setPosition(Math.round(scene.windowPosition.x || 0), Math.round(scene.windowPosition.y || 0))
    }
  }

  // Push full scene state from control to player
  ipcMain.on('push-scene-update', (event, scene) => {
    if (!scene) return
    currentScene = scene
    applyWindowGeometry(scene)
    sendToPlayer('scene-update', scene)
    sendStatus()
  })

  // Lightweight live update — same as push but never moves/resizes the window
  ipcMain.on('live-scene-update', (event, scene) => {
    if (!scene) return
    const sizeChanged =
      !currentScene ||
      currentScene.canvasSize?.width !== scene.canvasSize?.width ||
      currentScene.canvasSize?.height !== scene.canvasSize?.height ||
      currentScene.windowPosition?.x !== scene.windowPosition?.x ||
      currentScene.windowPosition?.y !== scene.windowPosition?.y ||
      currentScene.scaleMode !== scene.scaleMode
    currentScene = scene
    if (sizeChanged) applyWindowGeometry(scene)
    sendToPlayer('scene-update', scene)
  })

  // Player signals readiness — replay last known scene
  ipcMain.on('player-ready', (event) => {
    playerReady = true
    if (currentScene) {
      applyWindowGeometry(currentScene) // window may not have been ready at push time
      event.sender.send('scene-update', currentScene)
    }
    sendStatus()
  })

  ipcMain.on('request-player-status', sendStatus)

  // Playback control commands forwarded to player
  for (const command of ['play', 'pause', 'stop']) {
    ipcMain.on(`player-${command}`, () => sendToPlayer('player-command', { command }))
  }

  ipcMain.on('player-reload-scene', () => {
    if (currentScene) sendToPlayer('scene-update', currentScene)
  })

  ipcMain.on('player-clear-scene', () => {
    currentScene = null
    sendToPlayer('player-command', { command: 'clear' })
    sendStatus()
  })

  // Player window management
  ipcMain.on('player-toggle-fullscreen', () => {
    const player = getPlayerWindow()
    if (player) player.setFullScreen(!player.isFullScreen())
  })

  ipcMain.on('player-set-always-on-top', (event, value) => {
    alwaysOnTop = !!value
    getPlayerWindow()?.setAlwaysOnTop(alwaysOnTop, 'screen-saver')
    sendStatus()
  })

  ipcMain.on('player-set-visible', (event, value) => {
    const player = getPlayerWindow()
    if (!player) return
    if (value) player.showInactive()
    else player.hide()
  })

  ipcMain.on('player-resize', (event, { width, height }) => {
    const player = getPlayerWindow()
    if (player && width > 0 && height > 0) setPlayerContentSize(player, width, height)
  })
}

module.exports = { setupMediaIPC }
