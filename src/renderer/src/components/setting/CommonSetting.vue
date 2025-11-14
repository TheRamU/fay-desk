<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SettingCard from '@renderer/components/setting/SettingCard.vue'

const autoStartWallpaper = ref(false)
const autoStartOnBoot = ref(true)
const avatarEnabled = ref(true)
const loading = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const loadConfig = async (): Promise<void> => {
  try {
    loading.value = true
    const response = await window.api.commonSetting.getConfig()
    if (response.success && response.config) {
      autoStartWallpaper.value = response.config.autoStartWallpaper
      autoStartOnBoot.value = response.config.autoStartOnBoot ?? true
      avatarEnabled.value = response.config.avatarEnabled ?? true
    }
  } catch (error) {
    console.error('加载通用配置失败:', error)
  } finally {
    loading.value = false
  }
}

const saveConfig = async (): Promise<void> => {
  try {
    loading.value = true
    const response = await window.api.commonSetting.saveConfig({
      autoStartWallpaper: autoStartWallpaper.value,
      autoStartOnBoot: autoStartOnBoot.value,
      avatarEnabled: avatarEnabled.value
    })
    if (!response.success) {
      console.error('通用配置保存失败:', response.error)
    }
  } catch (error) {
    console.error('保存通用配置失败:', error)
  } finally {
    loading.value = false
  }
}

const debouncedSaveConfig = (): void => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    saveConfig()
  }, 500)
}

const onAutoStartWallpaperChange = (value: boolean): void => {
  autoStartWallpaper.value = value
  debouncedSaveConfig()
}

const onAutoStartOnBootChange = async (value: boolean): Promise<void> => {
  try {
    loading.value = true
    autoStartOnBoot.value = value

    const response = await window.api.commonSetting.setAutoStartOnBoot(value)
    if (response.success) {
      debouncedSaveConfig()
    } else {
      console.error('设置开机自启动失败:', response.error)
      autoStartOnBoot.value = !value
    }
  } catch (error) {
    console.error('设置开机自启动失败:', error)
    autoStartOnBoot.value = !value
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadConfig()
})
</script>

<template>
  <SettingCard id="common-setting" title="通用设置" description="配置应用通用参数设置">
    <div class="common-setting">
      <el-form label-position="left" label-width="200" class="config-form">
        <el-form-item>
          <template #label> 开机自启动 </template>
          <div class="switch-container">
            <el-switch
              :model-value="autoStartOnBoot"
              :disabled="loading"
              @update:model-value="onAutoStartOnBootChange"
            />
          </div>
        </el-form-item>
        <el-form-item>
          <template #label>
            <div class="label-container">
              <div>自动开启壁纸</div>
              <div class="form-description">启动软件时自动开启壁纸</div>
            </div>
          </template>
          <div class="switch-container">
            <el-switch
              :model-value="autoStartWallpaper"
              :disabled="loading"
              @update:model-value="onAutoStartWallpaperChange"
            />
          </div>
        </el-form-item>
      </el-form>
    </div>
  </SettingCard>
</template>

<style scoped lang="scss">
.common-setting {
  display: flex;
  flex-direction: column;

  .config-form {
    flex: 1;
  }
}

.switch-container {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  width: 100%;

  :deep(.el-switch) {
    .el-switch__core {
      height: 20px;
      min-width: 40px;
    }

    .el-switch__action {
      width: 16px;
      height: 16px;
    }
  }
}

.label-container {
  display: flex;
  flex-direction: column;
  line-height: 16px;
  gap: 8px;
}

.form-description {
  font-size: 12px;
  color: #999;
  line-height: 1.4;
}
</style>
