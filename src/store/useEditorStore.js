import { create } from 'zustand'
import defaultScene from '../data/scenes/defaultScene'

let _nextId = 1
function generateId() {
  return `obj-${Date.now()}-${_nextId++}`
}

/** Default properties shared by all media object types */
function baseObject(type, overrides = {}) {
  return {
    id: generateId(),
    type,
    name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${_nextId}`,
    src: null,
    x: 0,
    y: 0,
    width: 400,
    height: 300,
    opacity: 1,
    zIndex: _nextId,
    visible: true,
    objectFit: 'cover',
    loop: true,
    muted: true,
    autoplay: true,
    text: 'Text',
    fontSize: 48,
    fontColor: '#ffffff',
    fontFamily: 'Inter, sans-serif',
    htmlContent: '<div style="color:white;font-size:32px">HTML Content</div>',
    timezone: 'Asia/Jakarta',
    clockFormat: '24',
    weatherLocation: 'Jakarta',
    weatherUnit: 'C',
    scrollSpeed: 80,
    scrollDirection: 'left',
    color: '#1e90ff',
    // playlist-specific
    playlistItems: [],
    itemDuration: 5,
    ...overrides,
  }
}

const useEditorStore = create((set, get) => ({
  // ── Active scene ──────────────────────────────────────────────────
  scene: { ...defaultScene },
  currentFilePath: null,

  // ── Editor UI state ───────────────────────────────────────────────
  selectedObjectId: null,
  zoomLevel: 50,
  isPlaying: false,

  // ── Getters ───────────────────────────────────────────────────────
  getSelectedObject() {
    const { scene, selectedObjectId } = get()
    return scene.mediaObjects.find((o) => o.id === selectedObjectId) || null
  },

  getScene() {
    return get().scene
  },

  // ── Scene Actions ─────────────────────────────────────────────────
  setSceneName: (name) => set((state) => ({ scene: { ...state.scene, name } })),

  setCanvasSize: (width, height) => set((state) => ({
    scene: { ...state.scene, canvasSize: { width, height } },
  })),

  setWindowPosition: (x, y) => set((state) => ({
    scene: { ...state.scene, windowPosition: { x, y } },
  })),

  setBackgroundColor: (color) => set((state) => ({
    scene: { ...state.scene, backgroundColor: color },
  })),

  resetScene: () => set({
    scene: { ...defaultScene, mediaObjects: [] }, // clear objects
    currentFilePath: null,
    selectedObjectId: null,
    zoomLevel: 50,
  }),

  loadScene: (scene, filePath) => set({
    scene,
    currentFilePath: filePath,
    selectedObjectId: null,
    zoomLevel: 50,
  }),

  setCurrentFilePath: (path) => set({ currentFilePath: path }),

  setSceneDuration(duration) {
    set((s) => ({ scene: { ...s.scene, duration } }))
  },

  // ── Media object actions ──────────────────────────────────────────
  addMediaObject(type, overrides = {}) {
    const obj = baseObject(type, overrides)
    set((s) => ({
      scene: {
        ...s.scene,
        mediaObjects: [...s.scene.mediaObjects, obj],
      },
      selectedObjectId: obj.id,
    }))
    return obj
  },

  removeMediaObject(id) {
    set((s) => ({
      scene: {
        ...s.scene,
        mediaObjects: s.scene.mediaObjects.filter((o) => o.id !== id),
      },
      selectedObjectId: s.selectedObjectId === id ? null : s.selectedObjectId,
    }))
  },

  updateMediaObject(id, changes) {
    set((s) => ({
      scene: {
        ...s.scene,
        mediaObjects: s.scene.mediaObjects.map((o) =>
          o.id === id ? { ...o, ...changes } : o
        ),
      },
    }))
  },

  duplicateMediaObject(id) {
    const obj = get().scene.mediaObjects.find((o) => o.id === id)
    if (!obj) return
    const clone = { ...obj, id: generateId(), name: `${obj.name} Copy`, x: obj.x + 20, y: obj.y + 20 }
    set((s) => ({
      scene: {
        ...s.scene,
        mediaObjects: [...s.scene.mediaObjects, clone],
      },
      selectedObjectId: clone.id,
    }))
  },

  moveObjectLayer(id, direction) {
    set((s) => {
      const objects = [...s.scene.mediaObjects]
      const idx = objects.findIndex((o) => o.id === id)
      if (idx === -1) return s
      if (direction === 'up' && idx < objects.length - 1) {
        ;[objects[idx], objects[idx + 1]] = [objects[idx + 1], objects[idx]]
      } else if (direction === 'down' && idx > 0) {
        ;[objects[idx], objects[idx - 1]] = [objects[idx - 1], objects[idx]]
      }
      // Re-assign zIndex by position
      const reindexed = objects.map((o, i) => ({ ...o, zIndex: i + 1 }))
      return { scene: { ...s.scene, mediaObjects: reindexed } }
    })
  },

  // ── Selection ─────────────────────────────────────────────────────
  selectObject(id) {
    set({ selectedObjectId: id })
  },

  clearSelection() {
    set({ selectedObjectId: null })
  },

  // ── Editor UI ─────────────────────────────────────────────────────
  setZoomLevel(level) {
    set({ zoomLevel: Math.min(200, Math.max(10, level)) })
  },

  // ── Player communication ──────────────────────────────────────────
  pushToPlayer() {
    const scene = get().scene
    window.electronAPI?.pushSceneUpdate(scene)
  },

  setIsPlaying(val) {
    set({ isPlaying: val })
  },
}))

export default useEditorStore
