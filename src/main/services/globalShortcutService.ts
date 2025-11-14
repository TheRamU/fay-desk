import { globalShortcut } from 'electron'
import { ShortcutConfigService } from './shortcutConfigService'
import { mainWindowService } from './mainWindowService'
import { createMainWindow } from '../window/mainWindow'
import {
  createFloatingWindow,
  closeFloatingWindow,
  hasFloatingWindow
} from '../window/floatingWindow'
import { commonConfigService } from './commonConfigService'
import { avatarConfigService } from './avatarConfigService'
import { wallpaperService } from './wallpaperService'
import { wallpaperLoaderService } from './wallpaperLoaderService'

export class GlobalShortcutService {
  private static instance: GlobalShortcutService
  private shortcutConfigService: ShortcutConfigService
  private registeredShortcuts: Set<string> = new Set()

  private constructor() {
    this.shortcutConfigService = ShortcutConfigService.getInstance()
  }

  public static getInstance(): GlobalShortcutService {
    if (!GlobalShortcutService.instance) {
      GlobalShortcutService.instance = new GlobalShortcutService()
    }
    return GlobalShortcutService.instance
  }

  public registerAll(): void {
    try {
      const config = this.shortcutConfigService.get()

      this.registerShortcut(config.showMainWindow, () => {
        this.handleShowMainWindow()
      })

      this.registerShortcut(config.showFloatingWindow, () => {
        this.handleShowFloatingWindow().catch((error) => {
          console.error('[GlobalShortcutService] 处理悬浮窗快捷键失败:', error)
        })
      })
    } catch (error) {
      console.error('[GlobalShortcutService] 注册全局快捷键失败:', error)
    }
  }

  private registerShortcut(accelerator: string, callback: () => void): void {
    try {
      if (!accelerator) {
        return
      }

      if (this.registeredShortcuts.has(accelerator)) {
        globalShortcut.unregister(accelerator)
        this.registeredShortcuts.delete(accelerator)
      }

      const success = globalShortcut.register(accelerator, callback)

      if (success) {
        this.registeredShortcuts.add(accelerator)
      } else {
        console.error(
          `[GlobalShortcutService] 快捷键 ${accelerator} 注册失败，可能已被其他应用占用`
        )
      }
    } catch (error) {
      console.error(`[GlobalShortcutService] 注册快捷键 ${accelerator} 时发生错误:`, error)
    }
  }

  private handleShowMainWindow(): void {
    try {
      if (!mainWindowService.isMainWindowAvailable()) {
        const newWindow = createMainWindow()
        mainWindowService.setMainWindow(newWindow)
      } else {
        mainWindowService.showMainWindow()
      }
    } catch (error) {
      console.error('[GlobalShortcutService] 处理显示主窗口失败:', error)
    }
  }

  private async handleShowFloatingWindow(): Promise<void> {
    try {
      if (!this.canShowFloatingWindow()) {
        return
      }

      const wallpaperState = wallpaperService.getState()

      if (!wallpaperState.isRunning) {
        const wallpapers = wallpaperLoaderService.getWallpapers()

        if (wallpapers.length === 0) {
          return
        }

        const selectedWallpaperId = wallpaperState.selectedWallpaperId || wallpapers[0].id

        try {
          await wallpaperService.toggleWallpaper(selectedWallpaperId)
        } catch (error) {
          console.error('[GlobalShortcutService] 启动壁纸失败:', error)
          return
        }
      }

      if (hasFloatingWindow()) {
        closeFloatingWindow()
        mainWindowService.showMainWindow()
      } else {
        mainWindowService.hideMainWindow()
        createFloatingWindow()
      }
    } catch (error) {
      console.error('[GlobalShortcutService] 处理显示悬浮窗失败:', error)
    }
  }

  private canShowFloatingWindow(): boolean {
    try {
      const commonConfig = commonConfigService.get()
      if (!commonConfig.avatarEnabled) {
        return false
      }

      const avatarConfig = avatarConfigService.get()
      if (!avatarConfig || !avatarConfig.appId || !avatarConfig.appSecret) {
        return false
      }

      const wallpapers = wallpaperLoaderService.getWallpapers()
      if (wallpapers.length === 0) {
        return false
      }

      return true
    } catch (error) {
      console.error('[GlobalShortcutService] 检查悬浮窗可用性失败:', error)
      return false
    }
  }

  public updateShortcuts(): void {
    try {
      this.unregisterAll()
      this.registerAll()
    } catch (error) {
      console.error('[GlobalShortcutService] 更新快捷键配置失败:', error)
    }
  }

  public unregisterAll(): void {
    try {
      for (const accelerator of this.registeredShortcuts) {
        globalShortcut.unregister(accelerator)
      }
      this.registeredShortcuts.clear()
    } catch (error) {
      console.error('[GlobalShortcutService] 取消注册快捷键失败:', error)
    }
  }

  public isRegistered(accelerator: string): boolean {
    return globalShortcut.isRegistered(accelerator)
  }

  public getRegisteredShortcuts(): string[] {
    return Array.from(this.registeredShortcuts)
  }
}

export const globalShortcutService = GlobalShortcutService.getInstance()
