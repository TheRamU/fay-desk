<template>
  <SettingCard id="shortcut-setting" title="快捷键设置" description="设置全局快捷键">
    <div class="shortcut-setting">
      <el-form label-position="left" label-width="200" class="config-form">
        <el-form-item>
          <template #label> 打开主窗口 </template>
          <div class="shortcut-container">
            <ShortcutRecorder
              v-model="shortcuts.showMainWindow"
              @change="onShortcutChange('showMainWindow', $event)"
            />
          </div>
        </el-form-item>
        <el-form-item>
          <template #label>
            <div class="label-container">
              <div>浮窗模式</div>
              <div class="form-description">打开悬浮聊天窗口</div>
            </div>
          </template>
          <div class="shortcut-container">
            <ShortcutRecorder
              v-model="shortcuts.showFloatingWindow"
              @change="onShortcutChange('showFloatingWindow', $event)"
            />
          </div>
        </el-form-item>
      </el-form>

      <div class="actions">
        <el-button @click="resetToDefault">恢复</el-button>
      </div>
    </div>
  </SettingCard>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElNotification } from 'element-plus'
import SettingCard from '@renderer/components/setting/SettingCard.vue'
import ShortcutRecorder from './ShortcutRecorder.vue'

const shortcuts = ref({
  showMainWindow: 'CommandOrControl+Shift+F',
  showFloatingWindow: 'CommandOrControl+Shift+D'
})

let saveTimer: number | null = null

const onShortcutChange = (key: keyof typeof shortcuts.value, value: string): void => {
  shortcuts.value[key] = value

  if (saveTimer) {
    clearTimeout(saveTimer)
  }

  saveTimer = window.setTimeout(() => {
    autoSaveConfig()
  }, 500)
}

const autoSaveConfig = async (): Promise<void> => {
  try {
    if (shortcuts.value.showMainWindow === shortcuts.value.showFloatingWindow) {
      ElNotification({
        type: 'error',
        customClass: 'error',
        title: '快捷键不能重复，请设置不同的组合'
      })
      return
    }

    const response = await window.api.shortcut.saveConfig({
      showMainWindow: shortcuts.value.showMainWindow,
      showFloatingWindow: shortcuts.value.showFloatingWindow
    })

    if (response.success) {
      ElNotification({ type: 'error', customClass: 'error', title: '快捷键设置已自动保存' })
    } else {
      ElNotification({
        type: 'error',
        customClass: 'error',
        title: response.error || '保存快捷键设置失败'
      })
    }
  } catch (error) {
    console.error('保存快捷键设置失败:', error)
    ElNotification({
      type: 'error',
      customClass: 'error',
      title: '保存快捷键设置失败'
    })
  }
}

const resetToDefault = async (): Promise<void> => {
  try {
    const response = await window.api.shortcut.reset()

    if (response.success) {
      await loadConfig()
    } else {
      ElNotification({
        type: 'error',
        customClass: 'error',
        title: response.error || '恢复默认设置失败'
      })
    }
  } catch (error) {
    console.error('恢复默认设置失败:', error)
    ElNotification({
      type: 'error',
      customClass: 'error',
      title: '恢复默认设置失败'
    })
  }
}

const loadConfig = async (): Promise<void> => {
  try {
    const response = await window.api.shortcut.getConfig()

    if (response.success && response.config) {
      shortcuts.value = { ...response.config }
    }
  } catch (error) {
    console.error('加载快捷键配置失败:', error)
  }
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped lang="scss">
.shortcut-setting {
  display: flex;
  flex-direction: column;

  .config-form {
    flex: 1;
  }
}

.shortcut-container {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
  width: 100%;
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

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
