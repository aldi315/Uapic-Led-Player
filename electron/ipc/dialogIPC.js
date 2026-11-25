const { ipcMain, dialog } = require('electron')
const fs = require('fs')
const path = require('path')

const PROJECT_FILTERS = [{ name: 'UAPIC Project Files', extensions: ['ulp'] }]

/** Absolute file path → media:// URL understood by both renderers. */
const { toMediaUrl } = require('../mediaProtocol')

/** Read + parse a .ulp file. Returns { data, filePath } or { error }. */
function readProjectFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content)
    return { data, filePath }
  } catch (err) {
    console.error('Failed to open project:', err)
    return { error: `Could not open "${path.basename(filePath)}": ${err.message}`, filePath }
  }
}

function setupDialogIPC(getControlWindow) {
  const parent = () => getControlWindow() || undefined

  // Returns { url, name } or null — or an array of them when multi === true
  ipcMain.handle('open-file-dialog', async (event, { filters, title, multi } = {}) => {
    const result = await dialog.showOpenDialog(parent(), {
      title: title || 'Open File',
      properties: multi ? ['openFile', 'multiSelections'] : ['openFile'],
      filters: filters || [{ name: 'All Files', extensions: ['*'] }],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const files = result.filePaths.map((p) => ({ url: toMediaUrl(p), name: path.basename(p), path: p }))
    return multi ? files : files[0]
  })

  // Convert dropped file paths into media:// URLs
  ipcMain.handle('path-to-media-url', (event, filePath) => toMediaUrl(filePath))

  // Returns { filePath } on success, { error } on failure, null if cancelled
  ipcMain.handle('save-project', async (event, { data, currentPath }) => {
    let filePath = currentPath
    if (!filePath) {
      const safeName = String(data?.name || 'scene').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'scene'
      const result = await dialog.showSaveDialog(parent(), {
        title: 'Save Project',
        defaultPath: `${safeName}.ulp`,
        filters: PROJECT_FILTERS,
      })
      if (result.canceled || !result.filePath) return null
      filePath = result.filePath
    }

    try {
      // Write atomically so a crash mid-save never corrupts the project
      const tmp = `${filePath}.tmp`
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8')
      fs.renameSync(tmp, filePath)
      return { filePath }
    } catch (err) {
      console.error('Failed to save project:', err)
      return { error: err.message }
    }
  })

  ipcMain.handle('open-project', async (event, filePath) => {
    if (!filePath) {
      const result = await dialog.showOpenDialog(parent(), {
        title: 'Open Project',
        properties: ['openFile'],
        filters: PROJECT_FILTERS,
      })
      if (result.canceled || result.filePaths.length === 0) return null
      filePath = result.filePaths[0]
    }
    return readProjectFile(filePath)
  })

  // Generic message box: returns the index of the clicked button
  ipcMain.handle('show-message-box', async (event, options) => {
    const { response } = await dialog.showMessageBox(parent(), {
      type: options?.type || 'question',
      title: options?.title || 'UAPIC LED Player',
      message: options?.message || '',
      detail: options?.detail,
      buttons: options?.buttons || ['OK'],
      defaultId: options?.defaultId ?? 0,
      cancelId: options?.cancelId ?? (options?.buttons?.length ? options.buttons.length - 1 : 0),
      noLink: true,
    })
    return response
  })

  ipcMain.handle('file-exists', (event, filePath) => {
    try { return fs.existsSync(filePath) } catch { return false }
  })
}

module.exports = { setupDialogIPC, readProjectFile, toMediaUrl }
