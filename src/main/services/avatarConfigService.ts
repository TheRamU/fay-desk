import type { AvatarConfig } from '../types'
import { secureConfigService } from './secureConfigService'

const CONFIG_KEY = 'avatar'

class AvatarConfigService {
  private config: AvatarConfig | null = null

  load(): AvatarConfig | null {
    try {
      this.config = secureConfigService.get<AvatarConfig>(CONFIG_KEY)
      return this.config
    } catch (error) {
      console.error('[Avatar Config] 配置加载失败:', error)
      return null
    }
  }

  save(config: AvatarConfig): boolean {
    try {
      const success = secureConfigService.set(CONFIG_KEY, config)
      if (success) {
        this.config = config
      }
      return success
    } catch (error) {
      console.error('[Avatar Config] 配置保存失败:', error)
      return false
    }
  }

  get(): AvatarConfig | null {
    if (!this.config) {
      this.config = this.load()
    }
    return this.config
  }

  clear(): boolean {
    try {
      const success = secureConfigService.delete(CONFIG_KEY)
      if (success) {
        this.config = null
      }
      return success
    } catch (error) {
      console.error('[Avatar Config] 配置清除失败:', error)
      return false
    }
  }

  isValid(config: AvatarConfig | null): boolean {
    if (!config) {
      return false
    }

    return !!(config.appId && config.appSecret)
  }

  getConfigPath(): string {
    return secureConfigService.getConfigPath()
  }
}

export const avatarConfigService = new AvatarConfigService()
