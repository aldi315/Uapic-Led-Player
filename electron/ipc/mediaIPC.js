const { ipcMain } = require('electron')
const { isOutputFullscreen, toggleOutputFullscreen } = require('../windows/playerWindow')

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
      fullscreen: isOutputFullscreen(),
      alwaysOnTop,
      hasScene: !!currentScene,
    })
  }

  /**
   * Keep the output above every other window. Windows drops the topmost flag
   * in some cases (fullscreen changes, other topmost apps, explorer restarts),
   * so it is re-applied on window events and on a short heartbeat.
   */
  const enforceOnTop = () => {
    const player = getPlayerWindow()
    if (!player || !alwaysOnTop || !player.isVisible()) return
    if (!player.isAlwaysOnTop()) player.setAlwaysOnTop(true, 'screen-saver')
    player.moveTop() // does not steal keyboard focus
  }

  // Keep status fresh when the player window changes by itself (F11, Esc…)
  const player = getPlayerWindow()
  if (player) {
    player.setAlwaysOnTop(alwaysOnTop, 'screen-saver')
    ;['output-fullscreen-changed', 'show', 'hide'].forEach((ev) =>
      player.on(ev, sendStatus)
    )
    ;['blur', 'show', 'restore', 'output-fullscreen-changed'].forEach((ev) =>
      player.on(ev, () => setTimeout(enforceOnTop, 50))
    )
    const heartbeat = setInterval(enforceOnTop, 1500)
    player.on('closed', () => clearInterval(heartbeat))
    player.webContents.on('did-start-loading', () => { playerReady = false; sendStatus() })
  }

  /** Size/position the output window to match the scene (unless fullscreen). */
  function applyWindowGeometry(scene) {
    const player = getPlayerWindow()
    if (!player || isOutputFullscreen()) return
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
    if (player) toggleOutputFullscreen()
  })

  ipcMain.on('player-set-always-on-top', (event, value) => {
    alwaysOnTop = !!value
    getPlayerWindow()?.setAlwaysOnTop(alwaysOnTop, 'screen-saver')
    enforceOnTop()
    sendStatus()
  })

  ipcMain.on('player-set-visible', (event, value) => {
    const player = getPlayerWindow()
    if (!player) return
    if (value) { player.showInactive(); enforceOnTop() }
    else player.hide()
  })

  ipcMain.on('player-resize', (event, { width, height }) => {
    const player = getPlayerWindow()
    if (player && width > 0 && height > 0) setPlayerContentSize(player, width, height)
  })
}

module.exports = { setupMediaIPC }
