import { SDK_CONFIG } from '../types/avatar'

export function generateContainerId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${SDK_CONFIG.CONTAINER_PREFIX}${timestamp}_${random}`
}
