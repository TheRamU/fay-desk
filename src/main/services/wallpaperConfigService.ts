import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import type { WallpaperConfig } from '../types'

class WallpaperConfigService {
  private configPath: string
  private config: WallpaperConfig

  constructor() {
    const userDataPath = app.getPath('userData')
    this.configPath = path.join(userDataPath, 'wallpaper-config.json')
    this.config = this.load()
  }

  private load(): WallpaperConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8')
        const config = JSON.parse(data)
        return config
      }
    } catch (error) {
      console.error('[WallpaperConfig] 加载配置失败:', error)
    }

    return {
      selectedWallpaperId: null,
      isRunning: false
    }
  }

  private save(): boolean {
    try {
      const data = JSON.stringify(this.config, null, 2)
      fs.writeFileSync(this.configPath, data, 'utf-8')
      return true
    } catch (error) {
      console.error('[WallpaperConfig] 保存配置失败:', error)
      return false
    }
  }

  get(): WallpaperConfig {
    return { ...this.config }
  }

  getSelectedWallpaperId(): string | null {
    return this.config.selectedWallpaperId
  }

  setSelectedWallpaperId(wallpaperId: string | null): boolean {
    this.config.selectedWallpaperId = wallpaperId
    return this.save()
  }

  getIsRunning(): boolean {
    return this.config.isRunning
  }

  setIsRunning(isRunning: boolean): boolean {
    this.config.isRunning = isRunning
    return this.save()
  }

  update(config: Partial<WallpaperConfig>): boolean {
    this.config = {
      ...this.config,
      ...config
    }
    return this.save()
  }

  clear(): boolean {
    this.config = {
      selectedWallpaperId: null,
      isRunning: false
    }
    return this.save()
  }
}

export const wallpaperConfigService = new WallpaperConfigService()
