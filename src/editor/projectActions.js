import useEditorStore, { serializeScene } from '../store/useEditorStore'

const api = () => window.electronAPI
const store = () => useEditorStore.getState()

export const VIDEO_EXT = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', 'ogv']
export const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif']

export function mediaTypeFromName(name) {
  const ext = String(name || '').split('.').pop().toLowerCase()
  if (VIDEO_EXT.includes(ext)) return 'video'
  if (IMAGE_EXT.includes(ext)) return 'image'
  return null
}

function stripExt(name) {
  return String(name || '').replace(/\.[^.]+$/, '')
}

/**
 * If there are unsaved changes ask the user what to do.
 * Resolves true when it is OK to continue (saved or discarded).
 */
export async function confirmDiscardChanges() {
  if (!store().isDirty) return true
  const name = store().scene.name || 'this project'
  const choice = api()?.showMessageBox
    ? await api().showMessageBox({
        type: 'warning',
        message: `Save changes to "${name}"?`,
        detail: 'Your changes will be lost if you don\'t save them.',
        buttons: ['Save', 'Don\'t Save', 'Cancel'],
        defaultId: 0,
        cancelId: 2,
      })
    : (window.confirm('Discard unsaved changes?') ? 1 : 2)
  if (choice === 0) return await saveProject()
  return choice === 1
}

export async function newProject() {
  if (!(await confirmDiscardChanges())) return
  store().resetScene()
}

export async function openProject(filePath) {
  if (!(await confirmDiscardChanges())) return
  const res = await api()?.openProject(filePath)
  handleOpenResult(res)
}

/** Load the result of an open-project call / file association. */
export function handleOpenResult(res) {
  if (!res) return
  if (res.error) {
    if (res.filePath) store().removeRecentFile(res.filePath)
    store().showToast(res.error, 'error')
    return
  }
  if (res.data) {
    store().loadScene(res.data, res.filePath)
    store().showToast(`Opened ${res.filePath.split(/[\\/]/).pop()}`)
  }
}

/** Save; returns true on success. */
export async function saveProject(saveAs = false) {
  const { scene, currentFilePath } = store()
  if (!api()) return false
  const res = await api().saveProject(serializeScene(scene), saveAs ? null : currentFilePath)
  if (!res) return false
  if (res.error) {
    store().showToast(`Save failed: ${res.error}`, 'error')
    return false
  }
  store().markSaved(res.filePath)
  store().showToast(`Saved ${res.filePath.split(/[\\/]/).pop()}`, 'success')
  return true
}

export async function requestExit() {
  if (await confirmDiscardChanges()) api()?.confirmClose()
}

/** Browse for one or more media files and add them as objects. */
export async function importMedia() {
  const files = await api()?.openFileDialog(
    [
      { name: 'Media Files', extensions: [...VIDEO_EXT, ...IMAGE_EXT] },
      { name: 'Video', extensions: VIDEO_EXT },
      { name: 'Images', extensions: IMAGE_EXT },
    ],
    'Import Media',
    true
  )
  if (!files?.length) return
  addMediaFiles(files)
}

/**
 * Add media files ([{ url, name }]) to the canvas.
 * `at` optionally places the first object at canvas coordinates.
 */
export function addMediaFiles(files, at = null) {
  let offset = 0
  for (const f of files) {
    const type = mediaTypeFromName(f.name)
    if (!type) continue
    const overrides = { src: f.url, name: stripExt(f.name) }
    if (at) {
      overrides.x = Math.round(at.x + offset)
      overrides.y = Math.round(at.y + offset)
    }
    store().addMediaObject(type, overrides)
    offset += 30
  }
}

/** Push the scene to the output and start playback. */
export function pushScene() {
  store().pushToPlayer()
  store().setIsPlaying(true)
}

/**
 * Start-up autoplay: wait `delay` seconds (displays / LED sender / network
 * coming up after a reboot), then push the loaded project and play it.
 */
export function startupPlayback(delay = 0) {
  const seconds = Math.max(0, Number(delay) || 0)
  if (seconds >= 2) store().showToast(`Auto play in ${seconds} s…`)
  setTimeout(() => {
    pushScene()
    api()?.playerPlay()
    store().showToast('Auto play started', 'success')
  }, seconds * 1000)
}
