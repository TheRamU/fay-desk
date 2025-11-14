import { ipcMain } from 'electron'
import { trayService } from '../services/trayService'

export function registerTrayHandlers(): void {
  ipcMain.on('update-tray-menu', () => {
    trayService.updateContextMenu()
  })
}
