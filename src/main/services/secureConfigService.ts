import { app, safeStorage } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

import type { ConfigStore } from '../types'

const CONFIG_FILE_NAME = 'app-config.dat'
const CONFIG_VERSION = 1

class SecureConfigService {
  private store: ConfigStore = {}
  private configPath: string = ''
  private isInitialized = false

  private initialize(): void {
    if (this.isInitialized) {
      return
    }

    const userDataPath = app.getPath('userData')
    this.configPath = path.join(userDataPath, CONFIG_FILE_NAME)
    this.loadStore()
    this.isInitialized = true
  }

  private loadStore(): void {
    try {
      if (!fs.existsSync(this.configPath)) {
        this.store = {}
        return
      }

      const data = fs.readFileSync(this.configPath, 'utf-8')
      this.store = JSON.parse(data)
    } catch (error) {
      console.error('[SecureConfig] 配置文件加载失败:', error)
      this.store = {}
    }
  }

  private saveStore(): boolean {
    try {
      const data = JSON.stringify(this.store, null, 2)
      fs.writeFileSync(this.configPath, data, 'utf-8')
      return true
    } catch (error) {
      console.error('[SecureConfig] 配置文件保存失败:', error)
      return false
    }
  }

  private encrypt(data: string): string {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const buffer = safeStorage.encryptString(data)
        return buffer.toString('base64')
      } else {
        // 降级方案：使用 base64 编码（不安全，但至少不是明文）
        return Buffer.from(data).toString('base64')
      }
    } catch (error) {
      console.error('[SecureConfig] 加密失败:', error)
      throw new Error('加密失败')
    }
  }

  private decrypt(encrypted: string): string {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const buffer = Buffer.from(encrypted, 'base64')
        return safeStorage.decryptString(buffer)
      } else {
        // 降级方案：使用 base64 解码
        return Buffer.from(encrypted, 'base64').toString('utf-8')
      }
    } catch (error) {
      console.error('[SecureConfig] 解密失败:', error)
      throw new Error('解密失败')
    }
  }

  set<T>(key: string, value: T): boolean {
    this.initialize()

    try {
      const jsonStr = JSON.stringify(value)
      const encrypted = this.encrypt(jsonStr)

      this.store[key] = {
        encrypted,
        version: CONFIG_VERSION
      }

      return this.saveStore()
    } catch (error) {
      console.error(`[SecureConfig] 保存配置失败 [${key}]:`, error)
      return false
    }
  }

  get<T>(key: string): T | null {
    this.initialize()

    try {
      const item = this.store[key]
      if (!item) {
        return null
      }

      const decrypted = this.decrypt(item.encrypted)
      return JSON.parse(decrypted) as T
    } catch (error) {
      console.error(`[SecureConfig] 获取配置失败 [${key}]:`, error)
      return null
    }
  }

  delete(key: string): boolean {
    this.initialize()

    try {
      if (this.store[key]) {
        delete this.store[key]
        return this.saveStore()
      }
      return true
    } catch (error) {
      console.error(`[SecureConfig] 删除配置失败 [${key}]:`, error)
      return false
    }
  }

  has(key: string): boolean {
    this.initialize()
    return !!this.store[key]
  }

  clear(): boolean {
    this.initialize()

    try {
      this.store = {}
      return this.saveStore()
    } catch (error) {
      console.error('[SecureConfig] 清空配置失败:', error)
      return false
    }
  }

  getConfigPath(): string {
    this.initialize()
    return this.configPath
  }

  isEncryptionAvailable(): boolean {
    return safeStorage.isEncryptionAvailable()
  }
}

export const secureConfigService = new SecureConfigService()
