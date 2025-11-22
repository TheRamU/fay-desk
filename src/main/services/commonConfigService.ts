import { secureConfigService } from './secureConfigService'
import type { CommonConfig } from '../types'

const CONFIG_KEY = 'common_config'

const DEFAULT_CONFIG: CommonConfig = {
  autoStartWallpaper: false,
  autoStartOnBoot: true,
  avatarEnabled: true,
  autoUpdate: true
}

class CommonConfigService {
  private config: CommonConfig | null = null

  load(): CommonConfig {
    try {
      this.config = secureConfigService.get<CommonConfig>(CONFIG_KEY)
      if (this.config) {
        // 确保配置完整性，补充缺失的字段
        this.config = { ...DEFAULT_CONFIG, ...this.config }
      } else {
        this.config = { ...DEFAULT_CONFIG }
      }
      return this.config
    } catch (error) {
      console.error('[Common Config] 配置加载失败:', error)
      this.config = { ...DEFAULT_CONFIG }
      return this.config
    }
  }

  save(config: CommonConfig): boolean {
    try {
      // 验证配置有效性
      if (!this.isValidConfig(config)) {
        return false
      }

      const success = secureConfigService.set(CONFIG_KEY, config)
      if (success) {
        this.config = config
      }
      return success
    } catch (error) {
      console.error('[Common Config] 配置保存失败:', error)
      return false
    }
  }

  get(): CommonConfig {
    if (!this.config) {
      return this.load()
    }
    return this.config
  }

  update(partialConfig: Partial<CommonConfig>): boolean {
    try {
      const currentConfig = this.get()
      const newConfig = { ...currentConfig, ...partialConfig }
      return this.save(newConfig)
    } catch (error) {
      console.error('[Common Config] 配置更新失败:', error)
      return false
    }
  }

  reset(): boolean {
    try {
      return this.save({ ...DEFAULT_CONFIG })
    } catch (error) {
      console.error('[Common Config] 配置重置失败:', error)
      return false
    }
  }

  delete(): boolean {
    try {
      const success = secureConfigService.delete(CONFIG_KEY)
      if (success) {
        this.config = null
      }
      return success
    } catch (error) {
      console.error('[Common Config] 配置删除失败:', error)
      return false
    }
  }

  private isValidConfig(config: CommonConfig): boolean {
    if (!config || typeof config !== 'object') {
      return false
    }

    if (typeof config.autoStartWallpaper !== 'boolean') {
      return false
    }

    if (typeof config.autoStartOnBoot !== 'boolean') {
      return false
    }

    if (typeof config.avatarEnabled !== 'boolean') {
      return false
    }

    if (typeof config.autoUpdate !== 'boolean') {
      return false
    }

    return true
  }

  getAutoStartWallpaper(): boolean {
    return this.get().autoStartWallpaper
  }

  setAutoStartWallpaper(enabled: boolean): boolean {
    return this.update({ autoStartWallpaper: enabled })
  }

  getAutoStartOnBoot(): boolean {
    return this.get().autoStartOnBoot
  }

  setAutoStartOnBoot(enabled: boolean): boolean {
    return this.update({ autoStartOnBoot: enabled })
  }

  getAvatarEnabled(): boolean {
    return this.get().avatarEnabled
  }

  setAvatarEnabled(enabled: boolean): boolean {
    return this.update({ avatarEnabled: enabled })
  }

  getAutoUpdate(): boolean {
    return this.get().autoUpdate
  }

  setAutoUpdate(enabled: boolean): boolean {
    return this.update({ autoUpdate: enabled })
  }
}

export const commonConfigService = new CommonConfigService()
