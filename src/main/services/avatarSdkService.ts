import { generateContainerId } from '../utils/avatarSdkLoader'

class AvatarSdkService {
  private containerId: string

  constructor() {
    this.containerId = generateContainerId()
  }

  getContainerId(): string {
    return this.containerId
  }
}

export const avatarSdkService = new AvatarSdkService()
