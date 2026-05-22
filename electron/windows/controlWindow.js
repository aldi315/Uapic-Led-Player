const { BrowserWindow } = require('electron')
const path = require('path')

const { app } = require('electron')
const isDev = !app.isPackaged

function createControlWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    transparent: false,
    backgroundColor: '#0c0c0c',
    icon: path.join(app.getAppPath(), 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  })

  win.setMenu(null)

  if (isDev) {
    win.loadURL('http://localhost:5173/control.html')
  } else {
    win.loadFile(path.join(__dirname, '../../dist/control.html'))
  }

  return win
}

module.exports = { createControlWindow }
