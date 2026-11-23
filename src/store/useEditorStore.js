import { create } from 'zustand'
import defaultScene from '../data/scenes/defaultScene'

export const FILE_VERSION = 2
const HISTORY_LIMIT = 100
const COALESCE_MS = 1000
const RECENT_KEY = 'uapic.recentFiles'
const PREFS_KEY = 'uapic.prefs'

let _seq = 1
export function generateId(prefix = 'obj') {
  return `${prefix}-${Date.now().toString(36)}-${(_seq++).toString(36)}`
}

export const TYPE_LABELS = {
  video: 'Video',
  image: 'Image',
  text: 'Text',
  html: 'HTML',
  youtube: 'YouTube',
  clock: 'Clock',
  weather: 'Weather',
  'running-text': 'Running Text',
  color: 'Color Block',
  playlist: 'Playlist',
}

/** Default properties shared by all media object types */
function objectDefaults(type) {
  const base = {
    type,
    name: TYPE_LABELS[type] || type,
    src: null,
    x: 0,
    y: 0,
    width: 400,
    height: 300,
    opacity: 1,
    zIndex: 1,
    visible: true,
    locked: false,
    objectFit: 'cover',
    loop: true,
    muted: true,
    volume: 1,
    autoplay: true,
    text: 'Text',
    fontSize: 48,
    fontColor: '#ffffff',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'center',
    bgColor: 'transparent',
    htmlMode: 'code', // 'code' | 'url'
    htmlContent: '<div style="color:white;font-size:32px">HTML Content</div>',
    url: 'https://example.com',
    youtubeUrl: '',
    youtubeControls: false,
    youtubeCaptions: false,
    youtubeStart: 0, // seconds (videos only)
    timezone: 'Asia/Jakarta',
    clockFormat: '24',
    showSeconds: true,
    showDate: false,
    weatherLocation: 'Jakarta',
    weatherUnit: 'C',
    weatherRefresh: 15, // minutes
    scrollSpeed: 80,
    scrollDirection: 'left',
    color: '#1e90ff',
    // playlist-specific
    playlistItems: [],
    itemDuration: 5,
    transition: 'none', // 'none' | 'fade'
  }

  // Sensible per-type starting sizes
  switch (type) {
    case 'running-text':
      return { ...base, width: 1920, height: 120, text: 'Welcome — running text goes here', fontSize: 64 }
    case 'clock':
      return { ...base, width: 480, height: 160, fontSize: 96, fontFamily: 'Consolas, monospace' }
    case 'weather':
      return { ...base, width: 420, height: 200, fontSize: 48 }
    case 'text':
      return { ...base, width: 600, height: 150 }
    case 'youtube':
      return { ...base, width: 960, height: 540, objectFit: 'contain' }
    case 'video':
    case 'image':
    case 'playlist':
      return { ...base, width: 960, height: 540 }
    default:
      return base
  }
}

/** Fill in missing fields (older .ulp files) and sanitise numbers. */
export function normalizeObject(o) {
  const type = o?.type || 'color'
  const obj = { ...objectDefaults(type), ...o, type }
  if (!obj.id) obj.id = generateId()
  for (const k of ['x', 'y', 'width', 'height', 'zIndex', 'fontSize', 'scrollSpeed', 'itemDuration']) {
    const n = Number(obj[k])
    obj[k] = Number.isFinite(n) ? n : objectDefaults(type)[k]
  }
  obj.width = Math.max(1, obj.width)
  obj.height = Math.max(1, obj.height)
  const op = Number(obj.opacity)
  obj.opacity = Number.isFinite(op) ? Math.min(1, Math.max(0, op)) : 1
  obj.playlistItems = Array.isArray(obj.playlistItems)
    ? obj.playlistItems.map((it) => ({ ...it, id: it.id || generateId('pi') }))
    : []
  return obj
}

/** Accept a parsed .ulp file (any version) and return a valid scene. */
export function normalizeScene(data) {
  const raw = data?.scene && typeof data.scene === 'object' ? data.scene : data || {}
  const { fileVersion, app, savedAt, ...rest } = raw
  const scene = {
    ...defaultScene,
    ...rest,
    canvasSize: {
      width: Math.max(1, Number(raw.canvasSize?.width) || defaultScene.canvasSize.width),
      height: Math.max(1, Number(raw.canvasSize?.height) || defaultScene.canvasSize.height),
    },
    windowPosition: {
      x: Number(raw.windowPosition?.x) || 0,
      y: Number(raw.windowPosition?.y) || 0,
    },
  }
  const seen = new Set()
  scene.mediaObjects = (Array.isArray(raw.mediaObjects) ? raw.mediaObjects : []).map((o) => {
    const obj = normalizeObject(o)
    if (seen.has(obj.id)) obj.id = generateId()
    seen.add(obj.id)
    return obj
  })
  return scene
}

/** Serialisable project file contents. */
export function serializeScene(scene) {
  return { app: 'uapic-led-player', fileVersion: FILE_VERSION, savedAt: new Date().toISOString(), ...scene }
}

function freshScene() {
  return { ...defaultScene, id: generateId('scene'), mediaObjects: [] }
}

function loadJSON(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key))
    return v ?? fallback
  } catch {
    return fallback
  }
}

function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
}

const prefs = loadJSON(PREFS_KEY, {})

function maxZ(objects) {
  return objects.reduce((m, o) => Math.max(m, o.zIndex || 0), 0)
}

function uniqueName(objects, type) {
  const label = TYPE_LABELS[type] || type
  const used = new Set(objects.map((o) => o.name))
  let n = objects.filter((o) => o.type === type).length + 1
  while (used.has(`${label} ${n}`)) n++
  return `${label} ${n}`
}

const useEditorStore = create((set, get) => {
  /**
   * Apply a scene mutation and record it in the undo history.
   *  - key:    consecutive commits with the same key within 1s are merged
   *            (typing in an input becomes a single undo step)
   *  - record: false → mutate without a new history entry (used during drag,
   *            after snapshot() was called once at the start)
   */
  function commit(fn, { key = null, record = true } = {}) {
    set((s) => {
      const nextScene = fn(s.scene, s)
      if (!nextScene || nextScene === s.scene) return {}
      const now = Date.now()
      const coalesce = key && s._lastKey === key && now - s._lastTime < COALESCE_MS
      const push = record && !coalesce
      return {
        scene: nextScene,
        isDirty: true,
        past: push ? [...s.past, s.scene].slice(-HISTORY_LIMIT) : s.past,
        future: [],
        _lastKey: key,
        _lastTime: now,
      }
    })
  }

  const mapObjects = (scene, fn) => ({ ...scene, mediaObjects: scene.mediaObjects.map(fn) })

  return {
    // ── Active scene ────────────────────────────────────────────────
    scene: freshScene(),
    currentFilePath: null,
    isDirty: false,

    // ── History ─────────────────────────────────────────────────────
    past: [],
    future: [],
    _lastKey: null,
    _lastTime: 0,

    // ── Editor UI state ─────────────────────────────────────────────
    selectedObjectId: null,
    zoomLevel: 50,
    fitToken: 0,
    isPlaying: false,
    liveUpdate: prefs.liveUpdate ?? false,
    snapEnabled: prefs.snapEnabled ?? true,
    showGrid: prefs.showGrid ?? false,
    clipboard: null,
    recentFiles: loadJSON(RECENT_KEY, []),
    playerStatus: { connected: false, visible: true, fullscreen: false, alwaysOnTop: true, hasScene: false },
    toast: null,

    // ── Getters ─────────────────────────────────────────────────────
    getSelectedObject() {
      const { scene, selectedObjectId } = get()
      return scene.mediaObjects.find((o) => o.id === selectedObjectId) || null
    },
    getScene() {
      return get().scene
    },
    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,

    // ── History actions ─────────────────────────────────────────────
    /** Store the current scene as an undo step (call before a drag). */
    snapshot() {
      set((s) => ({ past: [...s.past, s.scene].slice(-HISTORY_LIMIT), future: [], _lastKey: null }))
    },
    undo() {
      set((s) => {
        if (!s.past.length) return {}
        const prev = s.past[s.past.length - 1]
        return {
          scene: prev,
          past: s.past.slice(0, -1),
          future: [s.scene, ...s.future].slice(0, HISTORY_LIMIT),
          isDirty: true,
          _lastKey: null,
          selectedObjectId: prev.mediaObjects.some((o) => o.id === s.selectedObjectId) ? s.selectedObjectId : null,
        }
      })
    },
    redo() {
      set((s) => {
        if (!s.future.length) return {}
        const next = s.future[0]
        return {
          scene: next,
          past: [...s.past, s.scene].slice(-HISTORY_LIMIT),
          future: s.future.slice(1),
          isDirty: true,
          _lastKey: null,
          selectedObjectId: next.mediaObjects.some((o) => o.id === s.selectedObjectId) ? s.selectedObjectId : null,
        }
      })
    },

    // ── Scene actions ───────────────────────────────────────────────
    setSceneName: (name) => commit((sc) => ({ ...sc, name }), { key: 'scene:name' }),

    setCanvasSize: (width, height) =>
      commit((sc) => ({
        ...sc,
        canvasSize: { width: Math.max(1, Math.round(width) || 1), height: Math.max(1, Math.round(height) || 1) },
      }), { key: 'scene:size' }),

    setWindowPosition: (x, y) =>
      commit((sc) => ({ ...sc, windowPosition: { x: Math.round(x) || 0, y: Math.round(y) || 0 } }), { key: 'scene:winpos' }),

    setBackgroundColor: (color) => commit((sc) => ({ ...sc, backgroundColor: color }), { key: 'scene:bg' }),

    updateScene: (changes, key = null) => commit((sc) => ({ ...sc, ...changes }), { key }),

    setSceneDuration: (duration) => commit((sc) => ({ ...sc, duration }), { key: 'scene:duration' }),

    resetScene: () => set({
      scene: freshScene(),
      currentFilePath: null,
      selectedObjectId: null,
      isDirty: false,
      past: [],
      future: [],
      fitToken: get().fitToken + 1,
    }),

    loadScene: (data, filePath) => {
      set({
        scene: normalizeScene(data),
        currentFilePath: filePath || null,
        selectedObjectId: null,
        isDirty: false,
        past: [],
        future: [],
        fitToken: get().fitToken + 1,
      })
      if (filePath) get().addRecentFile(filePath)
    },

    markSaved: (filePath) => {
      set({ currentFilePath: filePath, isDirty: false })
      get().addRecentFile(filePath)
    },

    setCurrentFilePath: (path) => set({ currentFilePath: path }),

    addRecentFile(filePath) {
      if (!filePath) return
      const list = [filePath, ...get().recentFiles.filter((p) => p !== filePath)].slice(0, 8)
      saveJSON(RECENT_KEY, list)
      set({ recentFiles: list })
    },
    removeRecentFile(filePath) {
      const list = get().recentFiles.filter((p) => p !== filePath)
      saveJSON(RECENT_KEY, list)
      set({ recentFiles: list })
    },
    clearRecentFiles() {
      saveJSON(RECENT_KEY, [])
      set({ recentFiles: [] })
    },

    // ── Media object actions ────────────────────────────────────────
    addMediaObject(type, overrides = {}) {
      const { scene } = get()
      const defaults = objectDefaults(type)
      const { width: cw, height: ch } = scene.canvasSize
      const width = Math.min(overrides.width ?? defaults.width, cw)
      const height = Math.min(overrides.height ?? defaults.height, ch)
      const obj = normalizeObject({
        ...defaults,
        id: generateId(),
        name: uniqueName(scene.mediaObjects, type),
        // centre new objects on the canvas
        x: Math.round((cw - width) / 2),
        y: Math.round((ch - height) / 2),
        zIndex: maxZ(scene.mediaObjects) + 1,
        ...overrides,
        width,
        height,
      })
      commit((sc) => ({ ...sc, mediaObjects: [...sc.mediaObjects, obj] }))
      set({ selectedObjectId: obj.id })
      return obj
    },

    removeMediaObject(id) {
      commit((sc) => ({ ...sc, mediaObjects: sc.mediaObjects.filter((o) => o.id !== id) }))
      set((s) => ({ selectedObjectId: s.selectedObjectId === id ? null : s.selectedObjectId }))
    },

    /**
     * @param {object} opts { key?: string, record?: boolean }
     *   key defaults to "<id>:<fields>" so typing in one field coalesces.
     */
    updateMediaObject(id, changes, opts = {}) {
      const key = opts.key !== undefined ? opts.key : `${id}:${Object.keys(changes).sort().join(',')}`
      commit(
        (sc) => mapObjects(sc, (o) => (o.id === id ? { ...o, ...changes } : o)),
        { key, record: opts.record }
      )
    },

    duplicateMediaObject(id) {
      const obj = get().scene.mediaObjects.find((o) => o.id === id)
      if (!obj) return
      get().pasteObject(obj)
    },

    copyObject(id) {
      const obj = get().scene.mediaObjects.find((o) => o.id === id)
      if (obj) set({ clipboard: JSON.parse(JSON.stringify(obj)) })
    },

    pasteObject(source = get().clipboard) {
      if (!source) return
      const objects = get().scene.mediaObjects
      const clone = normalizeObject({
        ...JSON.parse(JSON.stringify(source)),
        id: generateId(),
        name: `${source.name} Copy`,
        x: source.x + 20,
        y: source.y + 20,
        zIndex: maxZ(objects) + 1,
        locked: false,
        playlistItems: (source.playlistItems || []).map((it) => ({ ...it, id: generateId('pi') })),
      })
      commit((sc) => ({ ...sc, mediaObjects: [...sc.mediaObjects, clone] }))
      set({ selectedObjectId: clone.id })
    },

    /** direction: 'up' | 'down' | 'top' | 'bottom' */
    moveObjectLayer(id, direction) {
      commit((sc) => {
        const objects = [...sc.mediaObjects].sort((a, b) => a.zIndex - b.zIndex)
        const idx = objects.findIndex((o) => o.id === id)
        if (idx === -1) return sc
        const [item] = objects.splice(idx, 1)
        let target = idx
        if (direction === 'up') target = Math.min(objects.length, idx + 1)
        else if (direction === 'down') target = Math.max(0, idx - 1)
        else if (direction === 'top') target = objects.length
        else if (direction === 'bottom') target = 0
        if (target === idx) return sc
        objects.splice(target, 0, item)
        return { ...sc, mediaObjects: objects.map((o, i) => ({ ...o, zIndex: i + 1 })) }
      })
    },

    /** Move an object to an exact stack position (used by drag-reorder). */
    reorderObject(id, toIndexFromTop) {
      commit((sc) => {
        const topFirst = [...sc.mediaObjects].sort((a, b) => b.zIndex - a.zIndex)
        const idx = topFirst.findIndex((o) => o.id === id)
        if (idx === -1 || idx === toIndexFromTop) return sc
        const [item] = topFirst.splice(idx, 1)
        topFirst.splice(toIndexFromTop, 0, item)
        const n = topFirst.length
        return { ...sc, mediaObjects: topFirst.map((o, i) => ({ ...o, zIndex: n - i })) }
      })
    },

    /** Align an object relative to the canvas. */
    alignObject(id, mode) {
      const { scene } = get()
      const obj = scene.mediaObjects.find((o) => o.id === id)
      if (!obj) return
      const { width: cw, height: ch } = scene.canvasSize
      const pos = {
        left: { x: 0 },
        hcenter: { x: Math.round((cw - obj.width) / 2) },
        right: { x: cw - obj.width },
        top: { y: 0 },
        vcenter: { y: Math.round((ch - obj.height) / 2) },
        bottom: { y: ch - obj.height },
        fill: { x: 0, y: 0, width: cw, height: ch },
      }[mode]
      if (pos) get().updateMediaObject(id, pos, { key: null })
    },

    nudgeObject(id, dx, dy) {
      const obj = get().scene.mediaObjects.find((o) => o.id === id)
      if (!obj || obj.locked) return
      get().updateMediaObject(id, { x: obj.x + dx, y: obj.y + dy }, { key: `nudge:${id}` })
    },

    // ── Selection ───────────────────────────────────────────────────
    selectObject(id) {
      set({ selectedObjectId: id })
    },
    clearSelection() {
      set({ selectedObjectId: null })
    },

    // ── Editor UI ───────────────────────────────────────────────────
    setZoomLevel(level) {
      set({ zoomLevel: Math.round(Math.min(400, Math.max(5, level))) })
    },
    requestFit() {
      set((s) => ({ fitToken: s.fitToken + 1 }))
    },
    setPref(key, value) {
      set({ [key]: value })
      const { liveUpdate, snapEnabled, showGrid } = get()
      saveJSON(PREFS_KEY, { liveUpdate, snapEnabled, showGrid })
    },
    showToast(message, kind = 'info') {
      const id = Date.now()
      set({ toast: { id, message, kind } })
      setTimeout(() => {
        if (get().toast?.id === id) set({ toast: null })
      }, 3000)
    },
    setPlayerStatus(status) {
      set({ playerStatus: { ...get().playerStatus, ...status } })
    },

    // ── Player communication ────────────────────────────────────────
    pushToPlayer() {
      window.electronAPI?.pushSceneUpdate(get().scene)
    },
    setIsPlaying(val) {
      set({ isPlaying: val })
    },
  }
})

export default useEditorStore
