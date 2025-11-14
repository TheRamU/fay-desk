import { secureConfigService } from './secureConfigService'
import type { ChatConfig } from '../types'

const CONFIG_KEY = 'chat_config'

const DEFAULT_CONFIG: ChatConfig = {
  historyMessageCount: 20
}

class ChatConfigService {
  private config: ChatConfig | null = null

  load(): ChatConfig {
    try {
      this.config = secureConfigService.get<ChatConfig>(CONFIG_KEY)
      if (this.config) {
        // 确保配置完整性，补充缺失的字段
        this.config = { ...DEFAULT_CONFIG, ...this.config }
      } else {
        this.config = { ...DEFAULT_CONFIG }
      }
      return this.config
    } catch (error) {
      console.error('[Chat Config] 配置加载失败:', error)
      this.config = { ...DEFAULT_CONFIG }
      return this.config
    }
  }

  save(config: ChatConfig): boolean {
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
      console.error('[Chat Config] 配置保存失败:', error)
      return false
    }
  }

  get(): ChatConfig {
    if (!this.config) {
      return this.load()
    }
    return this.config
  }

  update(partialConfig: Partial<ChatConfig>): boolean {
    try {
      const currentConfig = this.get()
      const newConfig = { ...currentConfig, ...partialConfig }
      return this.save(newConfig)
    } catch (error) {
      console.error('[Chat Config] 配置更新失败:', error)
      return false
    }
  }

  reset(): boolean {
    try {
      return this.save({ ...DEFAULT_CONFIG })
    } catch (error) {
      console.error('[Chat Config] 配置重置失败:', error)
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
      console.error('[Chat Config] 配置删除失败:', error)
      return false
    }
  }

  private isValidConfig(config: ChatConfig): boolean {
    if (!config || typeof config !== 'object') {
      return false
    }

    if (
      typeof config.historyMessageCount !== 'number' ||
      config.historyMessageCount < 0 ||
      config.historyMessageCount > 100
    ) {
      return false
    }

    return true
  }

  getHistoryMessageCount(): number {
    return this.get().historyMessageCount
  }

  setHistoryMessageCount(count: number): boolean {
    if (count < 0 || count > 100) {
      return false
    }
    return this.update({ historyMessageCount: count })
  }
}

export const chatConfigService = new ChatConfigService()
