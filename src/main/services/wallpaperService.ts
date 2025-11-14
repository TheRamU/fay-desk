import { BrowserWindow } from 'electron'
import { attach, detach, reset } from 'electron-as-wallpaper'
import { createWallpaperWindow } from '../window/wallpaperWindow'
import type { AvatarConfig } from '../types'
import { avatarSdkService } from './avatarSdkService'
import { avatarConfigService } from './avatarConfigService'
import { wallpaperConfigService } from './wallpaperConfigService'
import { wallpaperLoaderService } from './wallpaperLoaderService'
import { wallpaperWebSocketService } from './wallpaperWebSocketService'
import { commonConfigService } from './commonConfigService'
import type { WallpaperState } from '../types'
import { notifyWallpaperStatusChange } from '../utils/notifyWallpaperStatus'

class WallpaperService {
  private wallpaperWindow: BrowserWindow | null = null
  private avatarConnected = false
  private sdkLoaded = false
  private currentWallpaperId: string | null = null

  private ensureValidWallpaperId(preferredId?: string | null): string | null {
    if (preferredId) {
      const preferredWallpaper = wallpaperLoaderService.getWallpaperById(preferredId)
      if (preferredWallpaper && preferredWallpaper.htmlPath) {
        return preferredId
      }
    }

    const wallpapers = wallpaperLoaderService.getWallpapers()
    if (wallpapers.length > 0) {
      const fallbackId = wallpapers[0].id
      wallpaperConfigService.setSelectedWallpaperId(fallbackId)
      return fallbackId
    }

    wallpaperConfigService.setSelectedWallpaperId(null)
    return null
  }

  async start(wallpaperId?: string): Promise<void> {
    if (this.wallpaperWindow) {
      return
    }

    const savedWallpaperId = wallpaperConfigService.getSelectedWallpaperId()
    let targetWallpaperId: string | null =
      wallpaperId ?? this.ensureValidWallpaperId(savedWallpaperId)

    if (!targetWallpaperId) {
      console.error('[Wallpaper] 没有可用的壁纸')
      return
    }

    let wallpaper = wallpaperLoaderService.getWallpaperById(targetWallpaperId)
    if (!wallpaper || !wallpaper.htmlPath) {
      const fallbackId = this.ensureValidWallpaperId()
      if (!fallbackId) {
        console.error('[Wallpaper] 没有可用的壁纸')
        return
      }
      targetWallpaperId = fallbackId
      wallpaper = wallpaperLoaderService.getWallpaperById(targetWallpaperId)
      if (!wallpaper || !wallpaper.htmlPath) {
        console.error('[Wallpaper] 壁纸不存在或缺少HTML文件:', targetWallpaperId)
        return
      }
    }

    this.currentWallpaperId = targetWallpaperId
    this.wallpaperWindow = await createWallpaperWindow(wallpaper.htmlPath)

    this.wallpaperWindow.on('closed', () => {
      if (this.wallpaperWindow) {
        this.disconnectAvatar()
        this.wallpaperWindow = null
        this.currentWallpaperId = null
        wallpaperConfigService.setIsRunning(false)
        this.notifyStatusChange()
      }
    })

    this.wallpaperWindow.webContents.on('did-finish-load', () => {
      if (this.wallpaperWindow) {
        attach(this.wallpaperWindow, {
          transparent: true,
          forwardKeyboardInput: false,
          forwardMouseInput: false
        })

        wallpaperConfigService.update({
          selectedWallpaperId: targetWallpaperId,
          isRunning: true
        })

        this.notifyStatusChange()
        this.initializeAvatarSDK()
      }
    })
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.wallpaperWindow) {
        resolve()
        return
      }

      try {
        const windowToClose = this.wallpaperWindow
        let resolved = false

        this.disconnectAvatar()
        wallpaperWebSocketService.stop()

        this.wallpaperWindow = null
        this.currentWallpaperId = null
        this.sdkLoaded = false

        const onClosed = (): void => {
          if (!resolved) {
            resolved = true
            resolve()
          }
        }

        windowToClose.once('closed', onClosed)
        detach(windowToClose)
        windowToClose.removeAllListeners('did-finish-load')
        windowToClose.close()
        reset()

        wallpaperConfigService.setIsRunning(false)
        this.notifyStatusChange()

        setTimeout(() => {
          if (!resolved) {
            resolved = true
            resolve()
          }
        }, 1000)
      } catch (error) {
        console.error('[Wallpaper] 停止壁纸时出错:', error)
        resolve()
      }
    })
  }

  isRunning(): boolean {
    return this.wallpaperWindow !== null
  }

  getWindow(): BrowserWindow | null {
    return this.wallpaperWindow
  }

  private async initializeAvatarSDK(): Promise<void> {
    if (!this.wallpaperWindow) {
      return
    }

    const avatarEnabled = commonConfigService.getAvatarEnabled()
    if (!avatarEnabled) {
      return
    }

    try {
      await wallpaperWebSocketService.waitForConnection(10000)

      const result = await wallpaperWebSocketService.sendMessage('loadSDK')

      if (result.success) {
        this.sdkLoaded = true
        await this.autoConnectAvatar()
      } else {
        console.error('[Wallpaper] 数字人SDK加载失败:', result.error)
      }
    } catch (error) {
      console.error('[Wallpaper] 初始化数字人SDK失败:', error)
    }
  }

  private async autoConnectAvatar(): Promise<void> {
    try {
      const config = avatarConfigService.get()

      if (!config || !avatarConfigService.isValid(config)) {
        return
      }

      await this.connectAvatar(config)
    } catch (error) {
      console.error('[Wallpaper] 自动连接数字人失败:', error)
    }
  }

  async connectAvatar(config: AvatarConfig): Promise<boolean> {
    if (!this.wallpaperWindow) {
      console.error('[Wallpaper] 壁纸窗口未创建')
      return false
    }

    if (this.avatarConnected) {
      return true
    }

    try {
      const containerId = avatarSdkService.getContainerId()
      await wallpaperWebSocketService.sendMessage('createContainer', { containerId })

      const result = await wallpaperWebSocketService.sendMessage('connectAvatar', {
        containerId,
        appId: config.appId,
        appSecret: config.appSecret
      })

      if (result.success) {
        this.avatarConnected = true
        return true
      } else {
        console.error('[Wallpaper] 数字人连接失败:', result.error)
        return false
      }
    } catch (error) {
      console.error('[Wallpaper] 连接数字人失败:', error)
      return false
    }
  }

  disconnectAvatar(): void {
    if (!this.avatarConnected) {
      return
    }

    try {
      if (wallpaperWebSocketService.isConnected()) {
        wallpaperWebSocketService.sendMessage('disconnectAvatar').catch((error) => {
          console.error('[Wallpaper] 执行断开失败:', error)
        })
      }

      this.avatarConnected = false
    } catch (error) {
      console.error('[Wallpaper] 断开数字人失败:', error)
    }
  }

  async speak(text: string): Promise<boolean> {
    if (!this.wallpaperWindow || !this.avatarConnected) {
      console.error('[Wallpaper] 数字人未连接')
      return false
    }

    try {
      const result = await wallpaperWebSocketService.sendMessage('speak', { text })

      return result.success
    } catch (error) {
      console.error('[Wallpaper] 播报失败:', error)
      return false
    }
  }

  async speakStream(text: string, isStart: boolean, isEnd: boolean): Promise<boolean> {
    if (!this.wallpaperWindow || !this.avatarConnected) {
      return false
    }

    try {
      const result = await wallpaperWebSocketService.sendMessage('speakStream', {
        text,
        isStart,
        isEnd
      })

      return result.success
    } catch (error) {
      console.error('[Wallpaper] 流式播报失败:', error)
      return false
    }
  }

  // 切换到待机互动状态，打断当前播报
  async interactiveIdle(): Promise<boolean> {
    if (!this.wallpaperWindow || !this.avatarConnected) {
      return false
    }

    try {
      const result = await wallpaperWebSocketService.sendMessage('interactiveIdle')

      return result.success
    } catch (error) {
      console.error('[Wallpaper] 切换状态失败:', error)
      return false
    }
  }

  isAvatarConnected(): boolean {
    return this.avatarConnected
  }

  isSdkLoaded(): boolean {
    return this.sdkLoaded
  }

  getCurrentWallpaperId(): string | null {
    return this.currentWallpaperId
  }

  async switchWallpaper(wallpaperId: string): Promise<void> {
    if (this.currentWallpaperId === wallpaperId && this.wallpaperWindow) {
      return
    }

    if (this.wallpaperWindow) {
      await this.stop()
    }

    this.start(wallpaperId)
  }

  async toggleWallpaper(wallpaperId?: string): Promise<void> {
    if (this.isRunning()) {
      // 如果正在运行，检查是否是相同的壁纸
      if (wallpaperId && this.currentWallpaperId === wallpaperId) {
        // 停止当前壁纸
        await this.stop()
      } else if (wallpaperId) {
        // 切换到新壁纸
        await this.switchWallpaper(wallpaperId)
      } else {
        // 停止当前壁纸
        await this.stop()
      }
    } else {
      // 如果未运行，启动壁纸
      this.start(wallpaperId)
    }
  }

  getState(): WallpaperState {
    const validSelectedId = this.ensureValidWallpaperId(
      wallpaperConfigService.getSelectedWallpaperId()
    )

    return {
      isRunning: this.isRunning(),
      selectedWallpaperId: validSelectedId
    }
  }

  getWebSocketPort(): number {
    return wallpaperWebSocketService.getPort()
  }

  // 为数字人开关重启壁纸，参考switchWallpaper实现几乎无间隔的重启
  async restartForAvatarToggle(): Promise<void> {
    if (!this.wallpaperWindow) {
      return
    }

    const currentWallpaperId = this.currentWallpaperId
    if (!currentWallpaperId) {
      return
    }

    await this.stop()
    this.start(currentWallpaperId)
  }

  private notifyStatusChange(): void {
    notifyWallpaperStatusChange(this.isRunning())
  }
}

export const wallpaperService = new WallpaperService()
