const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Control window chrome ────────────────────────────────────────
  controlMinimize: () => ipcRenderer.send('control-minimize'),
  controlMaximize: () => ipcRenderer.send('control-maximize'),
  controlClose:    () => ipcRenderer.send('control-close'),

  // ── Player window management ─────────────────────────────────────
  playerToggleFullscreen: ()      => ipcRenderer.send('player-toggle-fullscreen'),
  playerSetAlwaysOnTop:  (val)    => ipcRenderer.send('player-set-always-on-top', val),
  playerResize:          (w, h)   => ipcRenderer.send('player-resize', { width: w, height: h }),

  // ── Scene control (control → main → player) ──────────────────────
  pushSceneUpdate:  (scene) => ipcRenderer.send('push-scene-update', scene),
  playerReloadScene: ()     => ipcRenderer.send('player-reload-scene'),
  playerClearScene:  ()     => ipcRenderer.send('player-clear-scene'),

  // ── Playback commands ────────────────────────────────────────────
  playerPlay:  () => ipcRenderer.send('player-play'),
  playerPause: () => ipcRenderer.send('player-pause'),
  playerStop:  () => ipcRenderer.send('player-stop'),

  // ── Player-side subscriptions ────────────────────────────────────
  onSceneUpdate: (callback) => {
    const handler = (event, scene) => callback(scene)
    ipcRenderer.on('scene-update', handler)
    return () => ipcRenderer.removeListener('scene-update', handler)
  },

  onPlayerCommand: (callback) => {
    const handler = (event, data) => callback(data)
    ipcRenderer.on('player-command', handler)
    return () => ipcRenderer.removeListener('player-command', handler)
  },

  // ── File dialogs ─────────────────────────────────────────────────
  // filters: [{ name: 'Video', extensions: ['mp4','webm'] }]
  // Returns: file:// URL, or null if cancelled
  openFileDialog: (filters, title) =>
    ipcRenderer.invoke('open-file-dialog', { filters, title }),

  openProject: () => ipcRenderer.invoke('open-project'),
  saveProject: (data, currentPath) => ipcRenderer.invoke('save-project', { data, currentPath }),

  // ── Player handshake ─────────────────────────────────────────────
  playerReady: () => ipcRenderer.send('player-ready'),
})
