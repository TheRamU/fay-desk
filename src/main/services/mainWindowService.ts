import { BrowserWindow } from 'electron'
import { closeFloatingWindow, hasFloatingWindow } from '../window/floatingWindow'

class MainWindowService {
  private mainWindow: BrowserWindow | null = null

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  showMainWindow(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      if (hasFloatingWindow()) {
        closeFloatingWindow()
      }

      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore()
      }
      this.mainWindow.show()
      this.mainWindow.focus()
    }
  }

  hideMainWindow(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.hide()
    }
  }

  isMainWindowAvailable(): boolean {
    return this.mainWindow !== null && !this.mainWindow.isDestroyed()
  }

  clearMainWindow(): void {
    this.mainWindow = null
  }
}

export const mainWindowService = new MainWindowService()
