import { ipcMain, BrowserWindow } from 'electron'
import { wallpaperService } from '../services/wallpaperService'
import { avatarConfigService } from '../services/avatarConfigService'
import type { AvatarConfig } from '../types'

function broadcastToAllWindows(channel: string, data: any): void {
  BrowserWindow.getAllWindows().forEach((window) => {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, data)
    }
  })
}

export function registerAvatarHandlers(): void {
  ipcMain.handle('avatar:connect', async (_event, config: AvatarConfig) => {
    try {
      if (!avatarConfigService.isValid(config)) {
        return { success: false, error: '配置无效：请提供appId和appSecret' }
      }
      avatarConfigService.save(config)
      const success = await wallpaperService.connectAvatar(config)
      return { success, error: success ? null : '连接失败' }
    } catch (error: any) {
      console.error('[IPC] 连接数字人失败:', error)
      return { success: false, error: error.message || '未知错误' }
    }
  })

  ipcMain.handle('avatar:disconnect', async () => {
    try {
      wallpaperService.disconnectAvatar()
      return { success: true }
    } catch (error: any) {
      console.error('[IPC] 断开数字人失败:', error)
      return { success: false, error: error.message || '未知错误' }
    }
  })

  ipcMain.handle('avatar:speak', async (_event, text: string) => {
    try {
      if (!text || text.trim().length === 0) {
        return { success: false, error: '文本不能为空' }
      }
      const success = await wallpaperService.speak(text)
      return { success, error: success ? null : '播报失败' }
    } catch (error: any) {
      console.error('[IPC] 播报失败:', error)
      return { success: false, error: error.message || '未知错误' }
    }
  })

  ipcMain.handle('avatar:getStatus', async () => {
    try {
      const connected = wallpaperService.isAvatarConnected()
      return { success: true, connected }
    } catch (error: any) {
      console.error('[IPC] 获取状态失败:', error)
      return { success: false, connected: false, error: error.message || '未知错误' }
    }
  })

  ipcMain.handle('avatar:getConfig', async () => {
    try {
      const config = avatarConfigService.get()
      return { success: true, config }
    } catch (error: any) {
      console.error('[IPC] 获取配置失败:', error)
      return { success: false, config: null, error: error.message || '未知错误' }
    }
  })

  ipcMain.handle('avatar:saveConfig', async (_event, config: AvatarConfig) => {
    try {
      if (!avatarConfigService.isValid(config)) {
        return { success: false, error: '配置无效：请提供appId和appSecret' }
      }
      const success = avatarConfigService.save(config)
      if (success) {
        broadcastToAllWindows('avatar:config:updated', { config, hasValidConfig: true })
      }
      return { success, error: success ? null : '保存失败' }
    } catch (error: any) {
      console.error('[IPC] 保存配置失败:', error)
      return { success: false, error: error.message || '未知错误' }
    }
  })

  ipcMain.handle('avatar:clearConfig', async () => {
    try {
      const success = avatarConfigService.clear()
      if (success) {
        broadcastToAllWindows('avatar:config:updated', { config: null, hasValidConfig: false })
      }
      return { success, error: success ? null : '清除失败' }
    } catch (error: any) {
      console.error('[IPC] 清除配置失败:', error)
      return { success: false, error: error.message || '未知错误' }
    }
  })
}
