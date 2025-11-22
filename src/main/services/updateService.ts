import { autoUpdater, UpdateInfo } from 'electron-updater'
import { BrowserWindow } from 'electron'
import { commonConfigService } from './commonConfigService'
import { UpdateStatus } from '../types'

class UpdateService {
  private status: UpdateStatus = {
    checking: false,
    available: false,
    downloading: false,
    downloaded: false,
    error: null,
    info: null,
    progress: null
  }

  private initialized = false

  constructor() {
    autoUpdater.autoInstallOnAppQuit = true

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    autoUpdater.on('checking-for-update', () => {
      this.status.checking = true
      this.status.error = null
      this.broadcastStatus()
    })

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      this.status.checking = false
      this.status.available = true
      this.status.info = info
      if (autoUpdater.autoDownload) {
        this.status.downloading = true
        this.status.progress = null
      }
      this.broadcastStatus()
    })

    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      this.status.checking = false
      this.status.available = false
      this.status.info = info
      this.broadcastStatus()
    })

    autoUpdater.on('download-progress', (progressObj) => {
      this.status.downloading = true
      this.status.progress = {
        percent: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total
      }
      this.broadcastStatus()
    })

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      this.status.downloading = false
      this.status.downloaded = true
      this.status.info = info
      // 确保进度显示为 100%
      this.status.progress = {
        percent: 100,
        bytesPerSecond: 0,
        transferred: info.files?.[0]?.size || 0,
        total: info.files?.[0]?.size || 0
      }
      this.broadcastStatus()
    })

    autoUpdater.on('error', (error) => {
      console.error('[Update] 更新错误:', error)
      this.status.checking = false
      this.status.downloading = false
      this.status.error = error.message
      this.broadcastStatus()
    })
  }

  private broadcastStatus(): void {
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send('update:status-changed', this.status)
      }
    })
  }

  private updateAutoDownloadSetting(): void {
    const config = commonConfigService.get()
    autoUpdater.autoDownload = config.autoUpdate
  }

  syncAutoUpdateConfig(): void {
    this.updateAutoDownloadSetting()
  }

  initialize(): void {
    if (this.initialized) {
      return
    }

    this.initialized = true

    // 根据配置设置是否自动下载
    this.updateAutoDownloadSetting()

    const config = commonConfigService.get()
    if (config.autoUpdate) {
      this.checkForUpdates(true).catch((error) => {
        console.error('[Update] 初始化检查更新失败:', error)
      })
    }
  }

  async checkForUpdates(silent = false): Promise<UpdateInfo | null> {
    // 如果正在下载或已下载，不执行检查
    if (this.status.downloading || this.status.downloaded) {
      return null
    }

    try {
      const result = await autoUpdater.checkForUpdates()
      return result?.updateInfo || null
    } catch (error) {
      if (!silent) {
        throw error
      }
      console.error('[Update] 检查更新失败:', error)
      return null
    }
  }

  async downloadUpdate(): Promise<void> {
    if (!this.status.available || this.status.downloading || this.status.downloaded) {
      return
    }

    this.status.downloading = true
    this.status.progress = null
    this.broadcastStatus()

    try {
      await autoUpdater.downloadUpdate()
    } catch (error) {
      this.status.downloading = false
      throw error
    }
  }

  quitAndInstall(): void {
    if (!this.status.downloaded) {
      return
    }

    autoUpdater.quitAndInstall(true, true)
  }

  getStatus(): UpdateStatus {
    return { ...this.status }
  }

  destroy(): void {
    this.initialized = false
  }
}

export const updateService = new UpdateService()
