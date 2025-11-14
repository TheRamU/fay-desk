import { ipcMain, app, BrowserWindow } from 'electron'
import { commonConfigService } from '../services/commonConfigService'
import type { CommonConfig } from '../types'
import { wallpaperService } from '../services/wallpaperService'

function broadcastToAllWindows(channel: string, data: any): void {
  BrowserWindow.getAllWindows().forEach((window) => {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, data)
    }
  })
}

export function registerCommonSettingHandlers(): void {
  ipcMain.handle('commonSetting:getConfig', async () => {
    try {
      const config = commonConfigService.get()
      return { success: true, config }
    } catch (error) {
      console.error('[CommonSetting Handler] 获取配置失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '未知错误' }
    }
  })

  ipcMain.handle('commonSetting:saveConfig', async (_, config: CommonConfig) => {
    try {
      const success = commonConfigService.save(config)
      return { success, error: success ? undefined : '保存配置失败' }
    } catch (error) {
      console.error('[CommonSetting Handler] 保存配置失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '未知错误' }
    }
  })

  ipcMain.handle('commonSetting:updateConfig', async (_, partialConfig: Partial<CommonConfig>) => {
    try {
      const success = commonConfigService.update(partialConfig)
      return { success, error: success ? undefined : '更新配置失败' }
    } catch (error) {
      console.error('[CommonSetting Handler] 更新配置失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '未知错误' }
    }
  })

  ipcMain.handle('commonSetting:resetConfig', async () => {
    try {
      const success = commonConfigService.reset()
      return { success, error: success ? undefined : '重置配置失败' }
    } catch (error) {
      console.error('[CommonSetting Handler] 重置配置失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '未知错误' }
    }
  })

  ipcMain.handle('commonSetting:getAutoStartWallpaper', async () => {
    try {
      const autoStartWallpaper = commonConfigService.getAutoStartWallpaper()
      return { success: true, autoStartWallpaper }
    } catch (error) {
      console.error('[CommonSetting Handler] 获取自动开启壁纸配置失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '未知错误' }
    }
  })

  ipcMain.handle('commonSetting:setAutoStartWallpaper', async (_, enabled: boolean) => {
    try {
      const success = commonConfigService.setAutoStartWallpaper(enabled)
      return { success, error: success ? undefined : '设置自动开启壁纸配置失败' }
    } catch (error) {
      console.error('[CommonSetting Handler] 设置自动开启壁纸配置失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '未知错误' }
    }
  })

  ipcMain.handle('commonSetting:getAutoStartOnBoot', async () => {
    try {
      const autoStartOnBoot = commonConfigService.getAutoStartOnBoot()
      return { success: true, autoStartOnBoot }
    } catch (error) {
      console.error('[CommonSetting Handler] 获取开机自启动配置失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '未知错误' }
    }
  })

  ipcMain.handle('commonSetting:setAutoStartOnBoot', async (_, enabled: boolean) => {
    try {
      if (!app.isPackaged) {
        return { success: false, error: '开发环境下不支持开机自启动' }
      }

      app.setLoginItemSettings({
        openAtLogin: enabled,
        path: process.execPath,
        args: enabled ? ['--startup'] : []
      })

      const configSuccess = commonConfigService.setAutoStartOnBoot(enabled)
      return { success: configSuccess, error: configSuccess ? undefined : '设置开机自启动配置失败' }
    } catch (error) {
      console.error('[CommonSetting Handler] 设置开机自启动配置失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '未知错误' }
    }
  })

  ipcMain.handle('commonSetting:getAvatarEnabled', async () => {
    try {
      const avatarEnabled = commonConfigService.getAvatarEnabled()
      return { success: true, avatarEnabled }
    } catch (error) {
      console.error('[CommonSetting Handler] 获取数字人开关配置失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '未知错误' }
    }
  })

  ipcMain.handle('commonSetting:setAvatarEnabled', async (_, enabled: boolean) => {
    try {
      const success = commonConfigService.setAvatarEnabled(enabled)
      if (success) {
        broadcastToAllWindows('commonSetting:avatarEnabled:changed', { avatarEnabled: enabled })
      }
      return { success, error: success ? undefined : '设置数字人开关配置失败' }
    } catch (error) {
      console.error('[CommonSetting Handler] 设置数字人开关配置失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '未知错误' }
    }
  })

  ipcMain.handle('commonSetting:toggleAvatarWithRestart', async (_, enabled: boolean) => {
    try {
      const configSuccess = commonConfigService.setAvatarEnabled(enabled)
      if (!configSuccess) {
        return { success: false, error: '设置数字人开关配置失败' }
      }

      broadcastToAllWindows('commonSetting:avatarEnabled:changed', { avatarEnabled: enabled })

      if (wallpaperService.isRunning()) {
        await wallpaperService.restartForAvatarToggle()
      }

      return { success: true }
    } catch (error) {
      console.error('[CommonSetting Handler] 切换数字人开关并重启壁纸失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '未知错误' }
    }
  })
}
