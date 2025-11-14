import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { WallpaperInfo } from '@renderer/types/wallpaper'

export const useWallpaperStore = defineStore('wallpaper', () => {
  const selectedWallpaperId = ref<string | null>(null)
  const isRunning = ref(false)
  const wallpapers = ref<WallpaperInfo[]>([])

  const initialize = async (): Promise<any> => {
    try {
      const stateResponse = await window.api.wallpaper.getState()
      if (stateResponse.success && stateResponse.state) {
        selectedWallpaperId.value = stateResponse.state.selectedWallpaperId
        isRunning.value = stateResponse.state.isRunning
      }

      const listResponse = await window.api.wallpaper.getList()
      if (listResponse.success) {
        wallpapers.value = listResponse.wallpapers

        // 如果没有选中的壁纸且有可用壁纸，选中第一个
        if (!selectedWallpaperId.value && wallpapers.value.length > 0) {
          selectedWallpaperId.value = wallpapers.value[0].id
          await window.api.wallpaper.setSelectedWallpaper(selectedWallpaperId.value)
        }
      }
    } catch (error) {
      console.error('[WallpaperStore] 初始化失败:', error)
    }
  }

  const setSelectedWallpaper = async (wallpaperId: string): Promise<any> => {
    try {
      const response = await window.api.wallpaper.setSelectedWallpaper(wallpaperId)
      if (response.success) {
        selectedWallpaperId.value = wallpaperId
      }
      return response
    } catch (error) {
      console.error('[WallpaperStore] 设置选中壁纸失败:', error)
      return { success: false, error: '设置失败' }
    }
  }

  const switchWallpaper = async (wallpaperId: string): Promise<any> => {
    try {
      const response = await window.api.wallpaper.switchWallpaper(wallpaperId)
      if (response.success) {
        selectedWallpaperId.value = wallpaperId
        isRunning.value = true
      }
      return response
    } catch (error) {
      console.error('[WallpaperStore] 切换壁纸失败:', error)
      return { success: false, error: '切换失败' }
    }
  }

  const toggleWallpaper = async (wallpaperId?: string): Promise<any> => {
    try {
      const response = await window.api.wallpaper.toggleWallpaper(wallpaperId)
      if (response.success && response.state) {
        selectedWallpaperId.value = response.state.selectedWallpaperId
        isRunning.value = response.state.isRunning
      }
      return response
    } catch (error) {
      console.error('[WallpaperStore] 切换壁纸状态失败:', error)
      return { success: false, error: '切换失败' }
    }
  }

  const startWallpaper = (): void => {
    window.api.wallpaper.start()
    isRunning.value = true
  }

  const stopWallpaper = (): void => {
    window.api.wallpaper.stop()
    isRunning.value = false
  }

  const refreshWallpapers = async (): Promise<any> => {
    try {
      const response = await window.api.wallpaper.getList()
      if (response.success) {
        wallpapers.value = response.wallpapers
      }
      return response
    } catch (error) {
      console.error('[WallpaperStore] 刷新壁纸列表失败:', error)
      return { success: false, error: '刷新失败' }
    }
  }

  const isSelected = (wallpaperId: string): boolean => {
    return selectedWallpaperId.value === wallpaperId
  }

  const isWallpaperRunning = (wallpaperId: string): boolean => {
    return isRunning.value && selectedWallpaperId.value === wallpaperId
  }

  return {
    selectedWallpaperId,
    isRunning,
    wallpapers,
    initialize,
    setSelectedWallpaper,
    switchWallpaper,
    toggleWallpaper,
    startWallpaper,
    stopWallpaper,
    refreshWallpapers,
    isSelected,
    isWallpaperRunning
  }
})
