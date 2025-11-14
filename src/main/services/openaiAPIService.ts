import OpenAI from 'openai'
import type { OpenAIConfig, OpenAIModel } from '../types'

class OpenAIAPIService {
  async validateApiKey(config: OpenAIConfig): Promise<{
    valid: boolean
    models?: OpenAIModel[]
    error?: string
  }> {
    try {
      const client = new OpenAI({
        baseURL: config.baseURL,
        apiKey: config.apiKey,
        timeout: 10000
      })

      const response = await client.models.list()
      const models: OpenAIModel[] = response.data.map((model) => ({
        id: model.id,
        object: model.object,
        created: 0,
        owned_by: model.owned_by
      }))

      return { valid: true, models }
    } catch (error: any) {
      console.error('[OpenAI Validation] API Key 验证失败:', error)

      if (error.status === 404) {
        return { valid: true, models: [] }
      }

      let errorMessage = '验证失败'
      if (error.status === 401) {
        errorMessage = 'API Key 无效或已过期'
      } else if (error.status === 403) {
        errorMessage = '没有权限访问该 API'
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        errorMessage = '无法连接到服务器，请检查代理地址'
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = '连接超时，请检查网络连接'
      } else if (error.message) {
        errorMessage = error.message
      }

      return { valid: false, error: errorMessage }
    }
  }

  async fetchModels(config: OpenAIConfig): Promise<{
    success: boolean
    models?: OpenAIModel[]
    error?: string
  }> {
    try {
      const client = new OpenAI({
        baseURL: config.baseURL,
        apiKey: config.apiKey,
        timeout: 10000
      })

      const response = await client.models.list()
      const models: OpenAIModel[] = response.data.map((model) => ({
        id: model.id,
        object: model.object,
        created: 0,
        owned_by: model.owned_by
      }))

      return { success: true, models }
    } catch (error: any) {
      console.error('[OpenAI API] 获取模型列表失败:', error)

      if (error.status === 404) {
        return { success: true, models: [] }
      }

      let errorMessage = '获取模型列表失败'
      if (error.status === 401) {
        errorMessage = 'API Key 无效或已过期'
      } else if (error.status === 403) {
        errorMessage = '没有权限访问该 API'
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        errorMessage = '无法连接到服务器，请检查代理地址'
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = '连接超时，请检查网络连接'
      } else if (error.message) {
        errorMessage = error.message
      }

      return { success: false, error: errorMessage }
    }
  }
}

export const openaiAPIService = new OpenAIAPIService()
