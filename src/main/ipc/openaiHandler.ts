import { ipcMain } from 'electron'
import { openaiConfigService } from '../services/openaiConfigService'
import { openaiAPIService } from '../services/openaiAPIService'
import type { OpenAIConfig, OpenAIModel } from '../types'

// 检查是否为火山引擎豆包服务
function isVolcesService(baseURL: string): boolean {
  try {
    const url = new URL(baseURL)
    return url.hostname.includes('volces.com')
  } catch {
    return false
  }
}

// 为火山引擎豆包服务添加预设模型
// created 设置为 0 确保用户自定义模型始终在最上面
function addVolcesModels(models: OpenAIModel[]): OpenAIModel[] {
  const volcesModels: OpenAIModel[] = [
    {
      id: 'doubao-seed-1-6-251015',
      object: 'model',
      created: 0,
      owned_by: '火山引擎',
      displayName: 'Doubao-Seed-1.6'
    },
    {
      id: 'doubao-seed-1-6-lite-251015',
      object: 'model',
      created: 0,
      owned_by: '火山引擎',
      displayName: 'Doubao-Seed-1.6-lite'
    },
    {
      id: 'doubao-seed-1-6-flash-250828',
      object: 'model',
      created: 0,
      owned_by: '火山引擎',
      displayName: 'Doubao-Seed-1.6-flash'
    }
  ]

  const existingIds = new Set(models.map((m) => m.id))
  const result = [...models]

  for (const model of volcesModels) {
    if (!existingIds.has(model.id)) {
      result.push(model)
    }
  }

  return result
}

export function registerOpenAIHandlers(): void {
  ipcMain.handle('openai:getConfig', async () => {
    try {
      const config = openaiConfigService.get()
      return {
        success: true,
        config
      }
    } catch (error: any) {
      console.error('[OpenAI IPC] 获取配置失败:', error)
      return {
        success: false,
        config: null,
        error: error.message || '未知错误'
      }
    }
  })

  // 保存配置
  ipcMain.handle('openai:saveConfig', async (_event, config: OpenAIConfig) => {
    try {
      if (!openaiConfigService.isValid(config)) {
        return { success: false, error: '配置无效：请提供 baseURL 和 apiKey' }
      }

      const validationResult = await openaiAPIService.validateApiKey(config)
      if (!validationResult.valid) {
        return { success: false, error: validationResult.error || 'API Key 验证失败' }
      }
      const prevData = openaiConfigService.getModelsData()
      const prevBaseURL = prevData?.config?.baseURL
      const success = openaiConfigService.save(config)
      if (!success) {
        return { success: false, error: '保存配置失败' }
      }

      // 未切换代理地址时合并保留自定义模型
      if (validationResult.models) {
        let modelsToSave = validationResult.models
        if (isVolcesService(config.baseURL)) {
          modelsToSave = addVolcesModels(modelsToSave)
        }
        if (prevBaseURL && prevBaseURL === config.baseURL && prevData?.models) {
          const customModels = prevData.models.filter((m) => m.isCustom)
          if (customModels.length > 0) {
            const apiIds = new Set(modelsToSave.map((m) => m.id))
            const merged = [...modelsToSave]
            for (const cm of customModels) {
              if (!apiIds.has(cm.id)) merged.push(cm)
            }
            modelsToSave = merged
          }
        }
        const modelsSuccess = openaiConfigService.saveModels(modelsToSave)
        if (!modelsSuccess) {
          console.warn('[OpenAI IPC] 模型列表保存失败，但配置已保存')
        }
      }
      return { success: true, error: null }
    } catch (error: any) {
      console.error('[OpenAI IPC] 保存配置失败:', error)
      return { success: false, error: error.message || '未知错误' }
    }
  })

  ipcMain.handle('openai:clearConfig', async () => {
    try {
      const success = openaiConfigService.clear()
      return { success, error: success ? null : '清除失败' }
    } catch (error: any) {
      console.error('[OpenAI IPC] 清除配置失败:', error)
      return { success: false, error: error.message || '未知错误' }
    }
  })

  ipcMain.handle('openai:getModels', async () => {
    try {
      const models = openaiConfigService.getModels()
      return { success: true, models }
    } catch (error: any) {
      console.error('[OpenAI IPC] 获取模型列表失败:', error)
      return { success: false, models: [], error: error.message || '未知错误' }
    }
  })

  ipcMain.handle('openai:refreshModels', async () => {
    try {
      const config = openaiConfigService.get()
      if (!config || !openaiConfigService.isValid(config)) {
        return { success: false, models: [], error: '请先配置 OpenAI API' }
      }

      const result = await openaiAPIService.fetchModels(config)
      if (!result.success) {
        return { success: false, models: [], error: result.error || '获取模型列表失败' }
      }

      // 未切换代理地址时合并保留自定义模型
      let modelsToReturn = result.models || []
      if (result.models) {
        const prevData = openaiConfigService.getModelsData()
        let modelsToSave = result.models
        if (isVolcesService(config.baseURL)) {
          modelsToSave = addVolcesModels(modelsToSave)
        }
        if (prevData?.config?.baseURL === config.baseURL && prevData.models) {
          const customModels = prevData.models.filter((m) => m.isCustom)
          if (customModels.length > 0) {
            const apiIds = new Set(modelsToSave.map((m) => m.id))
            const merged = [...modelsToSave]
            for (const cm of customModels) {
              if (!apiIds.has(cm.id)) merged.push(cm)
            }
            modelsToSave = merged
          }
        }
        const saveSuccess = openaiConfigService.saveModels(modelsToSave)
        if (!saveSuccess) {
          console.warn('[OpenAI IPC] 模型列表保存失败')
        }
        modelsToReturn = modelsToSave
      }
      return { success: true, models: modelsToReturn }
    } catch (error: any) {
      console.error('[OpenAI IPC] 刷新模型列表失败:', error)
      return { success: false, models: [], error: error.message || '未知错误' }
    }
  })

  ipcMain.handle(
    'openai:addCustomModel',
    async (_event, data: { modelId: string; displayName: string }) => {
      try {
        if (!data.modelId || data.modelId.trim() === '') {
          return { success: false, error: '模型ID不能为空' }
        }
        if (!data.displayName || data.displayName.trim() === '') {
          return { success: false, error: '显示名称不能为空' }
        }
        const success = openaiConfigService.addCustomModel(
          data.modelId.trim(),
          data.displayName.trim()
        )
        if (!success) {
          return { success: false, error: '模型添加失败，可能模型已存在' }
        }
        return { success: true, error: null }
      } catch (error: any) {
        console.error('[OpenAI IPC] 添加自定义模型失败:', error)
        return { success: false, error: error.message || '未知错误' }
      }
    }
  )

  ipcMain.handle(
    'openai:updateCustomModel',
    async (_event, data: { modelId: string; displayName: string }) => {
      try {
        if (!data.modelId || data.modelId.trim() === '') {
          return { success: false, error: '模型ID不能为空' }
        }
        if (!data.displayName || data.displayName.trim() === '') {
          return { success: false, error: '显示名称不能为空' }
        }
        const success = openaiConfigService.updateCustomModel(
          data.modelId.trim(),
          data.displayName.trim()
        )
        if (!success) {
          return { success: false, error: '模型更新失败，模型不存在' }
        }
        return { success: true, error: null }
      } catch (error: any) {
        console.error('[OpenAI IPC] 更新自定义模型失败:', error)
        return { success: false, error: error.message || '未知错误' }
      }
    }
  )

  ipcMain.handle('openai:deleteCustomModel', async (_event, modelId: string) => {
    try {
      if (!modelId || modelId.trim() === '') {
        return { success: false, error: '模型ID不能为空' }
      }
      const success = openaiConfigService.deleteCustomModel(modelId.trim())
      if (!success) {
        return { success: false, error: '模型删除失败，模型不存在' }
      }
      return { success: true, error: null }
    } catch (error: any) {
      console.error('[OpenAI IPC] 删除自定义模型失败:', error)
      return { success: false, error: error.message || '未知错误' }
    }
  })

  ipcMain.handle('openai:saveSelectedModel', async (_event, modelId: string) => {
    try {
      if (!modelId || modelId.trim() === '') {
        return { success: false, error: '模型ID不能为空' }
      }
      const success = openaiConfigService.saveSelectedModel(modelId.trim())
      return { success, error: success ? null : '保存选中模型失败' }
    } catch (error: any) {
      console.error('[OpenAI IPC] 保存选中模型失败:', error)
      return { success: false, error: error.message || '未知错误' }
    }
  })

  ipcMain.handle('openai:getSelectedModel', async () => {
    try {
      const selectedModel = openaiConfigService.getSelectedModel()
      return { success: true, selectedModel }
    } catch (error: any) {
      console.error('[OpenAI IPC] 获取选中模型失败:', error)
      return { success: false, selectedModel: null, error: error.message || '未知错误' }
    }
  })
}
