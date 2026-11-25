const { contextBridge, ipcRenderer, webUtils } = require('electron')

/** Subscribe helper that returns an unsubscribe function. */
function subscribe(channel, callback) {
  const handler = (event, payload) => callback(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // ── Control window chrome ────────────────────────────────────────
  controlMinimize: () => ipcRenderer.send('control-minimize'),
  controlMaximize: () => ipcRenderer.send('control-maximize'),
  controlClose:    () => ipcRenderer.send('control-close'),
  confirmClose:    () => ipcRenderer.send('control-close-confirmed'),
  setWindowTitle:  (title) => ipcRenderer.send('set-window-title', title),
  onCloseRequested:   (cb) => subscribe('app-close-requested', cb),
  onWindowState:      (cb) => subscribe('control-window-state', cb),

  // ── Player window management ─────────────────────────────────────
  playerToggleFullscreen: ()     => ipcRenderer.send('player-toggle-fullscreen'),
  playerSetAlwaysOnTop:  (val)   => ipcRenderer.send('player-set-always-on-top', val),
  playerSetVisible:      (val)   => ipcRenderer.send('player-set-visible', val),
  playerResize:          (w, h)  => ipcRenderer.send('player-resize', { width: w, height: h }),
  requestPlayerStatus:   ()      => ipcRenderer.send('request-player-status'),
  onPlayerStatus:        (cb)    => subscribe('player-status', cb),

  // ── Displays ─────────────────────────────────────────────────────
  getDisplays:          () => ipcRenderer.invoke('get-displays'),
  playerMoveToDisplay:  (displayId, fullscreen) =>
    ipcRenderer.invoke('player-move-to-display', { displayId, fullscreen }),
  onDisplaysChanged:    (cb) => subscribe('displays-changed', cb),

  // ── Scene control (control → main → player) ──────────────────────
  pushSceneUpdate:   (scene) => ipcRenderer.send('push-scene-update', scene),
  liveSceneUpdate:   (scene) => ipcRenderer.send('live-scene-update', scene),
  playerReloadScene: ()      => ipcRenderer.send('player-reload-scene'),
  playerClearScene:  ()      => ipcRenderer.send('player-clear-scene'),

  // ── Playback commands ────────────────────────────────────────────
  playerPlay:  () => ipcRenderer.send('player-play'),
  playerPause: () => ipcRenderer.send('player-pause'),
  playerStop:  () => ipcRenderer.send('player-stop'),

  // ── Player-side subscriptions ────────────────────────────────────
  onSceneUpdate:   (cb) => subscribe('scene-update', cb),
  onPlayerCommand: (cb) => subscribe('player-command', cb),
  playerReady:     ()   => ipcRenderer.send('player-ready'),

  // ── Files & dialogs ──────────────────────────────────────────────
  // filters: [{ name: 'Video', extensions: ['mp4','webm'] }]
  // Returns { url, name, path } (or an array when multi), or null if cancelled
  openFileDialog: (filters, title, multi = false) =>
    ipcRenderer.invoke('open-file-dialog', { filters, title, multi }),

  // Drag & drop from Explorer: File → absolute path → media:// URL
  getPathForFile: (file) => {
    try { return webUtils.getPathForFile(file) } catch { return null }
  },
  pathToMediaUrl: (filePath) => ipcRenderer.invoke('path-to-media-url', filePath),
  fileExists:     (filePath) => ipcRenderer.invoke('file-exists', filePath),

  openProject: (filePath) => ipcRenderer.invoke('open-project', filePath),
  saveProject: (data, currentPath) => ipcRenderer.invoke('save-project', { data, currentPath }),
  onOpenProjectFile: (cb) => subscribe('open-project-file', cb),
  // Editor subscribed: returns a project the main process parked for it (or null)
  editorReady: () => ipcRenderer.invoke('editor-ready'),

  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),

  // ── App settings (start with Windows, start-up autoplay) ─────────
  getAppSettings: ()        => ipcRenderer.invoke('get-app-settings'),
  setAppSettings: (changes) => ipcRenderer.invoke('set-app-settings', changes),
})
