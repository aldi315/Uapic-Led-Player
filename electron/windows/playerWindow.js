const { BrowserWindow } = require('electron')
const path = require('path')

const { app } = require('electron')
const isDev = !app.isPackaged

let playerWindow = null

function createPlayerWindow() {
  playerWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    x: 0,
    y: 0,
    frame: false,
    transparent: false,
    backgroundColor: '#000000',
    icon: path.join(app.getAppPath(), 'icon.png'),
    autoHideMenuBar: true,
    movable: true,
    alwaysOnTop: true,
    roundedCorners: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      backgroundThrottling: false,
    },
  })

  playerWindow.setMenu(null)

  if (isDev) {
    playerWindow.loadURL('http://localhost:5173/player.html')
  } else {
    playerWindow.loadFile(path.join(__dirname, '../../dist/player.html'))
  }

  return playerWindow
}

function getPlayerWindow() {
  return playerWindow
}

module.exports = { createPlayerWindow, getPlayerWindow }
