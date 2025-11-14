import { ipcMain } from 'electron'
import {
  createFloatingWindow,
  closeFloatingWindow,
  hasFloatingWindow
} from '../window/floatingWindow'
import { mainWindowService } from '../services/mainWindowService'

export function registerFloatingHandlers(): void {
  ipcMain.handle('floating:toggle', async () => {
    try {
      if (hasFloatingWindow()) {
        closeFloatingWindow()
        mainWindowService.showMainWindow()
        return { success: true, isFloating: false }
      } else {
        mainWindowService.hideMainWindow()
        createFloatingWindow()
        return { success: true, isFloating: true }
      }
    } catch (error: any) {
      console.error('切换悬浮窗失败:', error)
      return { success: false, error: error.message || '切换悬浮窗失败' }
    }
  })

  ipcMain.handle('floating:getStatus', async () => {
    try {
      return { success: true, isFloating: hasFloatingWindow() }
    } catch (error: any) {
      console.error('获取悬浮窗状态失败:', error)
      return { success: false, error: error.message || '获取悬浮窗状态失败' }
    }
  })
}
