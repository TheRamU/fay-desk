import { ipcMain } from 'electron'
import { ShortcutConfigService } from '../services/shortcutConfigService'
import type { ShortcutConfig, ShortcutConfigResponse, ShortcutUpdateResponse } from '../types'
import { globalShortcutService } from '../services/globalShortcutService'

const shortcutConfigService = ShortcutConfigService.getInstance()

export function registerShortcutHandlers(): void {
  ipcMain.handle('shortcut:getConfig', async (): Promise<ShortcutConfigResponse> => {
    try {
      const config = shortcutConfigService.get()
      return { success: true, config }
    } catch (error) {
      console.error('[ShortcutHandler] 获取快捷键配置失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取快捷键配置失败'
      }
    }
  })

  ipcMain.handle(
    'shortcut:saveConfig',
    async (_, config: ShortcutConfig): Promise<ShortcutUpdateResponse> => {
      try {
        const success = shortcutConfigService.save(config)
        if (success) {
          globalShortcutService.updateShortcuts()
          return { success: true }
        } else {
          return { success: false, error: '保存快捷键配置失败' }
        }
      } catch (error) {
        console.error('[ShortcutHandler] 保存快捷键配置失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '保存快捷键配置失败'
        }
      }
    }
  )

  ipcMain.handle(
    'shortcut:updateShortcut',
    async (_, key: keyof ShortcutConfig, value: string): Promise<ShortcutUpdateResponse> => {
      try {
        const success = shortcutConfigService.updateShortcut(key, value)
        if (success) {
          globalShortcutService.updateShortcuts()
          return { success: true }
        } else {
          return { success: false, error: '更新快捷键失败' }
        }
      } catch (error) {
        console.error('[ShortcutHandler] 更新快捷键失败:', error)
        return { success: false, error: error instanceof Error ? error.message : '更新快捷键失败' }
      }
    }
  )

  ipcMain.handle('shortcut:getShowMainWindow', async (): Promise<string> => {
    try {
      return shortcutConfigService.getShowMainWindow()
    } catch (error) {
      console.error('[ShortcutHandler] 获取显示主窗口快捷键失败:', error)
      return 'CommandOrControl+Shift+F'
    }
  })

  ipcMain.handle(
    'shortcut:setShowMainWindow',
    async (_, shortcut: string): Promise<ShortcutUpdateResponse> => {
      try {
        const success = shortcutConfigService.setShowMainWindow(shortcut)
        if (success) {
          globalShortcutService.updateShortcuts()
          return { success: true }
        } else {
          return { success: false, error: '设置显示主窗口快捷键失败' }
        }
      } catch (error) {
        console.error('[ShortcutHandler] 设置显示主窗口快捷键失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '设置显示主窗口快捷键失败'
        }
      }
    }
  )

  ipcMain.handle('shortcut:getShowFloatingWindow', async (): Promise<string> => {
    try {
      return shortcutConfigService.getShowFloatingWindow()
    } catch (error) {
      console.error('[ShortcutHandler] 获取显示悬浮窗快捷键失败:', error)
      return 'CommandOrControl+Shift+D'
    }
  })

  ipcMain.handle(
    'shortcut:setShowFloatingWindow',
    async (_, shortcut: string): Promise<ShortcutUpdateResponse> => {
      try {
        const success = shortcutConfigService.setShowFloatingWindow(shortcut)
        if (success) {
          globalShortcutService.updateShortcuts()
          return { success: true }
        } else {
          return { success: false, error: '设置显示悬浮窗快捷键失败' }
        }
      } catch (error) {
        console.error('[ShortcutHandler] 设置显示悬浮窗快捷键失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '设置显示悬浮窗快捷键失败'
        }
      }
    }
  )

  ipcMain.handle('shortcut:reset', async (): Promise<ShortcutUpdateResponse> => {
    try {
      const success = shortcutConfigService.reset()
      if (success) {
        globalShortcutService.updateShortcuts()
        return { success: true }
      } else {
        return { success: false, error: '重置快捷键配置失败' }
      }
    } catch (error) {
      console.error('[ShortcutHandler] 重置快捷键配置失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '重置快捷键配置失败'
      }
    }
  })
}
