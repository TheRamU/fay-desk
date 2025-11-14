import { BrowserWindow } from 'electron'
import { trayService } from '../services/trayService'

/**
 * 通知所有窗口壁纸状态变化
 */
export function notifyWallpaperStatusChange(isRunning: boolean): void {
  const windows = BrowserWindow.getAllWindows()
  windows.forEach((window) => {
    window.webContents.send('wallpaper-status-changed', isRunning)
  })
  trayService.updateContextMenu()
}
