<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SettingCard from '@renderer/components/setting/SettingCard.vue'

const historyMessageCount = ref(20)
const loading = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const loadConfig = async (): Promise<void> => {
  try {
    loading.value = true
    const response = await window.api.chat.getConfig()
    if (response.success && response.config) {
      historyMessageCount.value = response.config.historyMessageCount
    }
  } catch (error) {
    console.error('加载聊天配置失败:', error)
  } finally {
    loading.value = false
  }
}

const saveConfig = async (): Promise<void> => {
  try {
    loading.value = true
    const response = await window.api.chat.saveConfig({
      historyMessageCount: historyMessageCount.value
    })
    if (!response.success) {
      console.error('聊天配置保存失败:', response.error)
    }
  } catch (error) {
    console.error('保存聊天配置失败:', error)
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

const onHistoryCountChange = (value: number): void => {
  historyMessageCount.value = value
  debouncedSaveConfig()
}

onMounted(() => {
  loadConfig()
})
</script>

<template>
  <SettingCard id="chat-setting" title="聊天设置" description="配置聊天相关的参数设置">
    <div class="chat-setting">
      <el-form label-position="left" label-width="200" class="config-form">
        <el-form-item>
          <template #label>
            <div class="label-container">
              <div>历史消息</div>
              <div class="form-description">包含历史对话轮数</div>
            </div>
          </template>
          <div class="slider-container">
            <el-slider
              :model-value="historyMessageCount"
              :min="0"
              :max="100"
              :step="1"
              :disabled="loading"
              @update:model-value="onHistoryCountChange"
            />
          </div>
        </el-form-item>
      </el-form>
    </div>
  </SettingCard>
</template>

<style scoped lang="scss">
.chat-setting {
  display: flex;
  flex-direction: column;

  .config-form {
    flex: 1;
  }
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;

  :deep(.el-slider) {
    flex: 1;

    .el-slider__runway {
      height: 6px;
      background-color: #e4e7ed;
    }

    .el-slider__button {
      width: 16px;
      height: 16px;
      background-color: #fff;
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
