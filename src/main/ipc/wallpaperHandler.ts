import { ipcMain } from 'electron'
import { wallpaperService } from '../services/wallpaperService'
import { wallpaperLoaderService } from '../services/wallpaperLoaderService'
import { wallpaperConfigService } from '../services/wallpaperConfigService'

export function registerWallpaperHandlers(): void {
  ipcMain.on('start-wallpaper', () => {
    wallpaperService.start()
  })

  ipcMain.on('stop-wallpaper', async () => {
    await wallpaperService.stop()
  })

  ipcMain.handle('get-wallpaper-status', () => {
    return wallpaperService.isRunning()
  })

  ipcMain.handle('get-wallpaper-state', () => {
    try {
      return { success: true, state: wallpaperService.getState() }
    } catch (error: any) {
      console.error('[IPC] 获取壁纸状态失败:', error)
      return { success: false, error: error.message || '未知错误' }
    }
  })

  ipcMain.handle('switch-wallpaper', async (_event, wallpaperId: string) => {
    try {
      const wallpaper = wallpaperLoaderService.getWallpaperById(wallpaperId)
      if (!wallpaper) {
        return { success: false, error: '壁纸不存在' }
      }
      await wallpaperService.switchWallpaper(wallpaperId)
      return { success: true }
    } catch (error: any) {
      console.error('[IPC] 切换壁纸失败:', error)
      return { success: false, error: error.message || '未知错误' }
    }
  })

  ipcMain.handle('toggle-wallpaper', async (_event, wallpaperId?: string) => {
    try {
      if (wallpaperId) {
        const wallpaper = wallpaperLoaderService.getWallpaperById(wallpaperId)
        if (!wallpaper) {
          return { success: false, error: '壁纸不存在' }
        }
      }
      await wallpaperService.toggleWallpaper(wallpaperId)
      return { success: true, state: wallpaperService.getState() }
    } catch (error: any) {
      console.error('[IPC] 切换壁纸状态失败:', error)
      return { success: false, error: error.message || '未知错误' }
    }
  })

  ipcMain.handle('set-selected-wallpaper', (_event, wallpaperId: string) => {
    try {
      const wallpaper = wallpaperLoaderService.getWallpaperById(wallpaperId)
      if (!wallpaper) {
        return { success: false, error: '壁纸不存在' }
      }
      wallpaperConfigService.setSelectedWallpaperId(wallpaperId)
      return { success: true }
    } catch (error: any) {
      console.error('[IPC] 设置选中壁纸失败:', error)
      return { success: false, error: error.message || '未知错误' }
    }
  })

  ipcMain.handle('get-wallpaper-list', () => {
    try {
      const wallpapers = wallpaperLoaderService.getWallpapers()
      return { success: true, wallpapers }
    } catch (error: any) {
      console.error('[IPC] 获取壁纸列表失败:', error)
      return { success: false, wallpapers: [], error: error.message || '未知错误' }
    }
  })

  ipcMain.handle('get-wallpaper-cover', async (_event, wallpaperId: string) => {
    try {
      const wallpaper = wallpaperLoaderService.getWallpaperById(wallpaperId)
      if (!wallpaper || !wallpaper.coverPath) {
        return { success: false, error: '壁纸不存在或没有封面' }
      }

      const fs = await import('fs')
      const imageBuffer = fs.readFileSync(wallpaper.coverPath)
      const base64Image = imageBuffer.toString('base64')
      const ext = wallpaper.coverPath.split('.').pop()?.toLowerCase() || 'jpg'
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg'

      return { success: true, data: `data:${mimeType};base64,${base64Image}` }
    } catch (error: any) {
      console.error('[IPC] 获取壁纸封面失败:', error)
      return { success: false, error: error.message || '未知错误' }
    }
  })

  ipcMain.handle('import-wallpaper', async () => {
    try {
      const result = await wallpaperLoaderService.importWallpaper()
      if (!result.success) {
        console.error('[IPC] 壁纸导入失败:', result.error)
      }
      return result
    } catch (error: any) {
      console.error('[IPC] 导入壁纸出错:', error)
      return { success: false, error: error.message || '导入失败' }
    }
  })

  ipcMain.handle('delete-wallpaper', async (_event, wallpaperId: string) => {
    try {
      const currentState = wallpaperService.getState()
      if (currentState.isRunning && currentState.selectedWallpaperId === wallpaperId) {
        await wallpaperService.stop()
      }
      const result = await wallpaperLoaderService.deleteWallpaper(wallpaperId)
      if (!result.success) {
        console.error('[IPC] 壁纸删除失败:', result.error)
      }
      return result
    } catch (error: any) {
      console.error('[IPC] 删除壁纸出错:', error)
      return { success: false, error: error.message || '删除失败' }
    }
  })
}
