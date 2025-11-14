import { secureConfigService } from './secureConfigService'
import type { ShortcutConfig } from '../types'

export class ShortcutConfigService {
  private static instance: ShortcutConfigService
  private readonly configKey = 'shortcut_config'

  private constructor() {
    /* empty */
  }

  public static getInstance(): ShortcutConfigService {
    if (!ShortcutConfigService.instance) {
      ShortcutConfigService.instance = new ShortcutConfigService()
    }
    return ShortcutConfigService.instance
  }

  private getDefaultConfig(): ShortcutConfig {
    return {
      showMainWindow: 'CommandOrControl+Shift+F',
      showFloatingWindow: 'CommandOrControl+Shift+D'
    }
  }

  private validateConfig(config: any): config is ShortcutConfig {
    return (
      config &&
      typeof config === 'object' &&
      typeof config.showMainWindow === 'string' &&
      typeof config.showFloatingWindow === 'string'
    )
  }

  public get(): ShortcutConfig {
    try {
      const config = secureConfigService.get(this.configKey)

      if (this.validateConfig(config)) {
        return config
      }

      const defaultConfig = this.getDefaultConfig()
      this.save(defaultConfig)
      return defaultConfig
    } catch (error) {
      console.error('[ShortcutConfigService] 获取配置失败:', error)
      return this.getDefaultConfig()
    }
  }

  public save(config: ShortcutConfig): boolean {
    try {
      if (!this.validateConfig(config)) {
        return false
      }

      secureConfigService.set(this.configKey, config)
      return true
    } catch (error) {
      console.error('[ShortcutConfigService] 保存配置失败:', error)
      return false
    }
  }

  public updateShortcut(key: keyof ShortcutConfig, value: string): boolean {
    try {
      const config = this.get()
      config[key] = value
      return this.save(config)
    } catch (error) {
      console.error('[ShortcutConfigService] 更新快捷键失败:', error)
      return false
    }
  }

  public getShowMainWindow(): string {
    return this.get().showMainWindow
  }

  public setShowMainWindow(shortcut: string): boolean {
    return this.updateShortcut('showMainWindow', shortcut)
  }

  public getShowFloatingWindow(): string {
    return this.get().showFloatingWindow
  }

  public setShowFloatingWindow(shortcut: string): boolean {
    return this.updateShortcut('showFloatingWindow', shortcut)
  }

  public reset(): boolean {
    try {
      const defaultConfig = this.getDefaultConfig()
      return this.save(defaultConfig)
    } catch (error) {
      console.error('[ShortcutConfigService] 重置配置失败:', error)
      return false
    }
  }
}
