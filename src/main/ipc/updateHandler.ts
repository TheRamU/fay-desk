import { ipcMain } from 'electron'
import { updateService } from '../services/updateService'
import { commonConfigService } from '../services/commonConfigService'

export function registerUpdateHandlers(): void {
  ipcMain.handle('update:check', async () => {
    try {
      const info = await updateService.checkForUpdates(false)
      return {
        success: true,
        info,
        status: updateService.getStatus()
      }
    } catch (error) {
      console.error('[Update Handler] 检查更新失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '检查更新失败'
      }
    }
  })

  ipcMain.handle('update:download', async () => {
    try {
      await updateService.downloadUpdate()
      return { success: true }
    } catch (error) {
      console.error('[Update Handler] 下载更新失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '下载更新失败'
      }
    }
  })

  ipcMain.handle('update:quitAndInstall', async () => {
    try {
      updateService.quitAndInstall()
      return { success: true }
    } catch (error) {
      console.error('[Update Handler] 安装更新失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '安装更新失败'
      }
    }
  })

  ipcMain.handle('update:getStatus', async () => {
    try {
      const status = updateService.getStatus()
      return { success: true, status }
    } catch (error) {
      console.error('[Update Handler] 获取更新状态失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取更新状态失败'
      }
    }
  })

  ipcMain.handle('update:getAutoUpdate', async () => {
    try {
      const autoUpdate = commonConfigService.getAutoUpdate()
      return { success: true, autoUpdate }
    } catch (error) {
      console.error('[Update Handler] 获取自动更新配置失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取自动更新配置失败'
      }
    }
  })

  ipcMain.handle('update:setAutoUpdate', async (_, enabled: boolean) => {
    try {
      const success = commonConfigService.setAutoUpdate(enabled)
      if (success) {
        updateService.syncAutoUpdateConfig()
        if (enabled) {
          updateService.checkForUpdates(true).catch((error) => {
            console.error('[Update Handler] 检查更新失败:', error)
          })
        }
      }
      return { success, error: success ? undefined : '设置自动更新配置失败' }
    } catch (error) {
      console.error('[Update Handler] 设置自动更新配置失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '设置自动更新配置失败'
      }
    }
  })
}
