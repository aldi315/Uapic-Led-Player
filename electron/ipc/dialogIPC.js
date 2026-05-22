const { ipcMain, dialog } = require('electron')
const path = require('path')

function setupDialogIPC() {
  ipcMain.handle('open-file-dialog', async (event, { filters, title }) => {
    const result = await dialog.showOpenDialog({
      title: title || 'Open File',
      properties: ['openFile'],
      filters: filters || [{ name: 'All Files', extensions: ['*'] }],
    })

    if (result.canceled || result.filePaths.length === 0) return null

    const filePath = result.filePaths[0]
    const fileName = path.basename(filePath)

    // Convert to media:// URL (registered custom protocol) — forward slashes
    // Allows both windows to load local files without cross-origin issues.
    const normalized = filePath.replace(/\\/g, '/')
    const mediaUrl = 'media:///' + normalized

    return { url: mediaUrl, name: fileName }
  })

  ipcMain.handle('save-project', async (event, { data, currentPath }) => {
    let filePath = currentPath
    if (!filePath) {
      const result = await dialog.showSaveDialog({
        title: 'Save Project',
        defaultPath: 'scene.ulp',
        filters: [{ name: 'UAPIC Project Files', extensions: ['ulp'] }],
      })
      if (result.canceled || !result.filePath) return null
      filePath = result.filePath
    }

    try {
      require('fs').writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
      return filePath
    } catch (err) {
      console.error('Failed to save project:', err)
      return null
    }
  })

  ipcMain.handle('open-project', async (event) => {
    const result = await dialog.showOpenDialog({
      title: 'Open Project',
      properties: ['openFile'],
      filters: [{ name: 'UAPIC Project Files', extensions: ['ulp'] }],
    })

    if (result.canceled || result.filePaths.length === 0) return null

    const filePath = result.filePaths[0]
    try {
      const content = require('fs').readFileSync(filePath, 'utf-8')
      const data = JSON.parse(content)
      return { data, filePath }
    } catch (err) {
      console.error('Failed to open project:', err)
      return null
    }
  })
}

module.exports = { setupDialogIPC }
