import type { OpenAIConfig, OpenAIConfigData, OpenAIModel } from '../types'
import { secureConfigService } from './secureConfigService'

const CONFIG_KEY = 'openai'
const MODELS_KEY = 'openai_models'

class OpenAIConfigService {
  private config: OpenAIConfig | null = null

  load(): OpenAIConfig | null {
    try {
      this.config = secureConfigService.get<OpenAIConfig>(CONFIG_KEY)
      return this.config
    } catch (error) {
      console.error('[OpenAI Config] 配置加载失败:', error)
      return null
    }
  }

  save(config: OpenAIConfig): boolean {
    try {
      const success = secureConfigService.set(CONFIG_KEY, config)
      if (success) {
        this.config = config
      }
      return success
    } catch (error) {
      console.error('[OpenAI Config] 配置保存失败:', error)
      return false
    }
  }

  saveModels(models: OpenAIModel[]): boolean {
    try {
      const existingData = this.getModelsData()
      const currentConfig = this.get()
      if (!currentConfig) {
        console.error('[OpenAI Config] 当前配置为空，无法保存模型列表')
        return false
      }
      const configData: OpenAIConfigData = {
        config: currentConfig,
        models,
        lastUpdated: Date.now(),
        selectedModel: existingData?.selectedModel
      }
      const success = secureConfigService.set(MODELS_KEY, configData)
      return success
    } catch (error) {
      console.error('[OpenAI Config] 模型列表保存失败:', error)
      return false
    }
  }

  getModels(): OpenAIModel[] {
    try {
      const configData = secureConfigService.get<OpenAIConfigData>(MODELS_KEY)
      if (configData && configData.models) {
        return configData.models
      }
      return []
    } catch (error) {
      console.error('[OpenAI Config] 获取模型列表失败:', error)
      return []
    }
  }

  getModelsData(): OpenAIConfigData | null {
    try {
      const configData = secureConfigService.get<OpenAIConfigData>(MODELS_KEY)
      return configData || null
    } catch (error) {
      console.error('[OpenAI Config] 获取模型数据失败:', error)
      return null
    }
  }

  addCustomModel(modelId: string, displayName: string): boolean {
    try {
      const models = this.getModels()
      if (models.some((m) => m.id === modelId)) {
        return false
      }

      const newModel: OpenAIModel = {
        id: modelId,
        object: 'model',
        created: Date.now(),
        owned_by: '自定义模型',
        isCustom: true,
        displayName: displayName
      }

      models.push(newModel)
      return this.saveModels(models)
    } catch (error) {
      console.error('[OpenAI Config] 添加自定义模型失败:', error)
      return false
    }
  }

  updateCustomModel(modelId: string, displayName: string): boolean {
    try {
      const models = this.getModels()
      const modelIndex = models.findIndex((m) => m.id === modelId)
      if (modelIndex === -1) {
        return false
      }

      models[modelIndex] = {
        ...models[modelIndex],
        displayName: displayName
      }

      return this.saveModels(models)
    } catch (error) {
      console.error('[OpenAI Config] 更新自定义模型失败:', error)
      return false
    }
  }

  deleteCustomModel(modelId: string): boolean {
    try {
      const models = this.getModels()
      const filteredModels = models.filter((m) => m.id !== modelId)
      if (filteredModels.length === models.length) {
        return false
      }
      return this.saveModels(filteredModels)
    } catch (error) {
      console.error('[OpenAI Config] 删除自定义模型失败:', error)
      return false
    }
  }

  get(): OpenAIConfig | null {
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
      console.error('[OpenAI Config] 配置清除失败:', error)
      return false
    }
  }

  isValid(config: OpenAIConfig | null): boolean {
    if (!config) {
      return false
    }
    return !!(config.baseURL && config.apiKey)
  }

  getConfigPath(): string {
    return secureConfigService.getConfigPath()
  }

  saveSelectedModel(modelId: string): boolean {
    try {
      const configData = this.getModelsData()
      if (!configData) {
        return false
      }
      configData.selectedModel = modelId
      const success = secureConfigService.set(MODELS_KEY, configData)
      return success
    } catch (error) {
      console.error('[OpenAI Config] 保存选中的模型失败:', error)
      return false
    }
  }

  getSelectedModel(): string | null {
    try {
      const configData = this.getModelsData()
      if (configData && configData.selectedModel) {
        return configData.selectedModel
      }
      return null
    } catch (error) {
      console.error('[OpenAI Config] 获取选中的模型失败:', error)
      return null
    }
  }
}

export const openaiConfigService = new OpenAIConfigService()
