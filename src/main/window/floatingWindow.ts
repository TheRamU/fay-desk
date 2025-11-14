import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let floatingWindow: BrowserWindow | null = null

export function createFloatingWindow(): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize

  const windowWidth = 500
  const windowHeight = 80

  const x = Math.floor((screenWidth - windowWidth) / 2)
  const y = screenHeight - windowHeight - 20

  floatingWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x,
    y,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  floatingWindow.on('ready-to-show', () => {
    floatingWindow?.show()
    floatingWindow?.focus()
    floatingWindow?.webContents.focus()
  })

  floatingWindow.on('show', () => {
    floatingWindow?.focus()
    floatingWindow?.webContents.focus()
  })

  floatingWindow.webContents.on('did-finish-load', () => {
    floatingWindow?.focus()
    floatingWindow?.webContents.focus()
  })

  floatingWindow.on('closed', () => {
    floatingWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    floatingWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#floating`)
  } else {
    floatingWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: 'floating'
    })
  }

  return floatingWindow
}

export function getFloatingWindow(): BrowserWindow | null {
  return floatingWindow
}

export function closeFloatingWindow(): void {
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.close()
  }
  floatingWindow = null
}

export function hasFloatingWindow(): boolean {
  return floatingWindow !== null && !floatingWindow.isDestroyed()
}
