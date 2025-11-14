import { app, Tray, Menu, nativeImage, BrowserWindow } from 'electron'
import { join } from 'path'
import { wallpaperService } from './wallpaperService'
import { mainWindowService } from './mainWindowService'

class TrayService {
  private tray: Tray | null = null
  private mainWindowCreator: (() => BrowserWindow) | null = null

  setMainWindowCreator(creator: () => BrowserWindow): void {
    this.mainWindowCreator = creator
  }

  create(): void {
    if (this.tray) {
      return
    }

    const iconPath = join(__dirname, '../../resources/icon-tray.ico')
    const icon = nativeImage.createFromPath(iconPath)
    this.tray = new Tray(icon)
    this.tray.setToolTip('FayDesk')
    this.updateContextMenu()

    this.tray.on('click', () => {
      this.showMainWindow()
    })
  }

  updateContextMenu(): void {
    if (!this.tray) {
      return
    }

    const isRunning = wallpaperService.isRunning()

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示窗口',
        click: () => {
          this.showMainWindow()
        }
      },
      {
        label: isRunning ? '关闭壁纸' : '开启壁纸',
        click: async () => {
          if (isRunning) {
            await wallpaperService.stop()
          } else {
            wallpaperService.start()
          }
        }
      },
      {
        label: '设置',
        click: () => {
          this.showSettingsWindow()
        }
      },
      {
        type: 'separator'
      },
      {
        label: '退出',
        click: () => {
          app.quit()
        }
      }
    ])

    this.tray.setContextMenu(contextMenu)
  }

  private showMainWindow(): void {
    if (mainWindowService.isMainWindowAvailable()) {
      mainWindowService.showMainWindow()
    } else if (this.mainWindowCreator) {
      const newWindow = this.mainWindowCreator()
      mainWindowService.setMainWindow(newWindow)
    }
  }

  private showSettingsWindow(): void {
    if (mainWindowService.isMainWindowAvailable()) {
      mainWindowService.showMainWindow()
      const mainWindow = mainWindowService.getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.send('navigate-to-route', '/setting')
      }
    } else if (this.mainWindowCreator) {
      const newWindow = this.mainWindowCreator()
      mainWindowService.setMainWindow(newWindow)
      // 等待窗口加载完成后再导航
      newWindow.webContents.once('did-finish-load', () => {
        newWindow.webContents.send('navigate-to-route', '/setting')
      })
    }
  }

  destroy(): void {
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
    }
  }

  getTray(): Tray | null {
    return this.tray
  }
}

export const trayService = new TrayService()
