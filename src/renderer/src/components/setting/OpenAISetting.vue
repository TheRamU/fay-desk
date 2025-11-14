<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessageBox, ElNotification } from 'element-plus'
import SettingCard from '@renderer/components/setting/SettingCard.vue'
import ModelDialog from '@renderer/components/setting/ModelDialog.vue'
import ModelList from '@renderer/components/setting/ModelList.vue'
import type { OpenAIModel, OpenAIConfig, PresetOption } from '@renderer/types/openai'

const config = ref<OpenAIConfig>({
  baseURL: '',
  apiKey: ''
})

const originalConfig = ref<OpenAIConfig>({
  baseURL: '',
  apiKey: ''
})

const presetOptions: PresetOption[] = [
  {
    label: 'OpenAI',
    value: 'https://api.openai.com/v1',
    tutorialUrl: 'https://platform.openai.com/api-keys'
  },
  {
    label: 'DeepSeek',
    value: 'https://api.deepseek.com',
    tutorialUrl: 'https://platform.deepseek.com/api_keys'
  },
  {
    label: '火山引擎 (豆包)',
    value: 'https://ark.cn-beijing.volces.com/api/v3',
    tutorialUrl: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey'
  },
  {
    label: '阿里云百炼 (通义千问)',
    value: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    tutorialUrl: 'https://bailian.console.aliyun.com/#/api-key'
  }
]

const currentTutorialUrl = computed(() => {
  const preset = presetOptions.find((option) => option.value === config.value.baseURL)
  return preset?.tutorialUrl || ''
})

const openTutorial = (): void => {
  if (currentTutorialUrl.value) {
    window.open(currentTutorialUrl.value, '_blank')
  }
}

const isConfigValid = computed(() => {
  return config.value.baseURL.trim() !== '' && config.value.apiKey.trim() !== ''
})

const isConfigModified = computed(() => {
  return JSON.stringify(config.value) !== JSON.stringify(originalConfig.value)
})

const isSaving = ref(false)
const models = ref<OpenAIModel[]>([])
const isLoadingModels = ref(false)
const showModelDialog = ref(false)
const modelDialogMode = ref<'add' | 'edit'>('add')
const editingModel = ref<OpenAIModel | null>(null)
const isSubmittingModel = ref(false)

const handleLoadConfig = async (): Promise<void> => {
  try {
    const result = await window.api.openai.getConfig()
    if (result.success && result.config) {
      config.value = result.config
      originalConfig.value = JSON.parse(JSON.stringify(result.config))
    }
  } catch (error: unknown) {
    console.error('加载配置失败:', error)
    ElNotification({
      type: 'error',
      customClass: 'error',
      title: '加载配置失败'
    })
  }
}

const handleLoadModels = async (): Promise<void> => {
  isLoadingModels.value = true
  try {
    const result = await window.api.openai.getModels()
    if (result.success && result.models) {
      models.value = result.models
    }
  } catch (error: unknown) {
    console.error('加载模型列表失败:', error)
  } finally {
    isLoadingModels.value = false
  }
}

const handleRefreshModels = async (): Promise<void> => {
  isLoadingModels.value = true
  try {
    const result = await window.api.openai.refreshModels()
    if (result.success && result.models) {
      models.value = result.models
    } else {
      ElNotification({
        type: 'error',
        customClass: 'error',
        title: `刷新失败: ${result.error || '未知错误'}`
      })
    }
  } catch (error: unknown) {
    console.error('刷新模型列表失败:', error)
    ElNotification({
      type: 'error',
      customClass: 'error',
      title: '刷新模型列表失败'
    })
  } finally {
    isLoadingModels.value = false
  }
}

const handleSaveConfig = async (): Promise<void> => {
  if (!isConfigValid.value) {
    ElNotification({
      type: 'warning',
      customClass: 'warn',
      title: '请填写完整的配置信息'
    })
    return
  }

  isSaving.value = true

  try {
    const result = await window.api.openai.saveConfig({
      baseURL: config.value.baseURL,
      apiKey: config.value.apiKey
    })

    if (result.success) {
      originalConfig.value = JSON.parse(JSON.stringify(config.value))
      await handleLoadModels()
    } else {
      ElNotification({
        type: 'error',
        customClass: 'error',
        title: `保存失败: ${result.error || '未知错误'}`
      })
    }
  } catch (error: unknown) {
    console.error('保存配置失败:', error)
    ElNotification({
      type: 'error',
      customClass: 'error',
      title: '保存配置失败'
    })
  } finally {
    isSaving.value = false
  }
}

const handleOpenAddDialog = (): void => {
  modelDialogMode.value = 'add'
  editingModel.value = null
  showModelDialog.value = true
}

const handleOpenEditDialog = (model: OpenAIModel): void => {
  modelDialogMode.value = 'edit'
  editingModel.value = model
  showModelDialog.value = true
}

const handleModelDialogConfirm = async (data: {
  modelId: string
  displayName: string
}): Promise<void> => {
  isSubmittingModel.value = true

  try {
    if (modelDialogMode.value === 'add') {
      const result = await window.api.openai.addCustomModel(data)
      if (result.success) {
        showModelDialog.value = false
        await handleLoadModels()
      } else {
        ElNotification({
          type: 'error',
          customClass: 'error',
          title: `添加失败: ${result.error || '未知错误'}`
        })
      }
    } else {
      const result = await window.api.openai.updateCustomModel(data)
      if (result.success) {
        showModelDialog.value = false
        await handleLoadModels()
      } else {
        ElNotification({
          type: 'error',
          customClass: 'error',
          title: `更新失败: ${result.error || '未知错误'}`
        })
      }
    }
  } catch (error: unknown) {
    console.error('操作模型失败:', error)
    ElNotification({
      type: 'error',
      customClass: 'error',
      title: '操作失败'
    })
  } finally {
    isSubmittingModel.value = false
  }
}

const handleDeleteModel = async (modelId: string): Promise<void> => {
  try {
    await ElMessageBox.confirm('确定要删除此模型吗？此操作不可恢复', '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger'
    })

    const result = await window.api.openai.deleteCustomModel(modelId)
    if (result.success) {
      await handleLoadModels()
    } else {
      ElNotification({
        type: 'error',
        customClass: 'error',
        title: `删除失败: ${result.error || '未知错误'}`
      })
    }
  } catch (error: unknown) {
    if (error === 'cancel') {
      return
    }
    console.error('删除模型失败:', error)
    ElNotification({
      type: 'error',
      customClass: 'error',
      title: '删除失败'
    })
  }
}

onMounted(async () => {
  await handleLoadConfig()
  await handleLoadModels()
})
</script>

<template>
  <SettingCard title="OpenAI API" description="兼容 OpenAI API 格式">
    <div class="openai-setting">
      <el-form label-position="left" label-width="200" class="config-form">
        <el-form-item class="proxy-address-item">
          <template #label>
            <div class="label-with-help">
              <span>代理地址</span>
              <el-tooltip
                v-if="currentTutorialUrl"
                effect="dark"
                content="查看配置教程"
                placement="top"
                :show-arrow="false"
                offset="4"
              >
                <div class="help-icon" @click.stop.prevent="openTutorial">
                  <span>?</span>
                </div>
              </el-tooltip>
            </div>
          </template>
          <el-select
            v-model="config.baseURL"
            filterable
            allow-create
            default-first-option
            placeholder="请输入代理地址"
            style="width: 100%"
            :show-arrow="false"
          >
            <el-option
              v-for="option in presetOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item>
          <template #label>
            <div>API Key</div>
          </template>
          <el-input
            v-model="config.apiKey"
            type="password"
            placeholder="请输入 API Key"
            show-password
          />
        </el-form-item>
      </el-form>

      <div class="actions">
        <el-button
          type="primary"
          :disabled="!isConfigValid || !isConfigModified || isSaving"
          :loading="isSaving"
          @click="handleSaveConfig"
        >
          保存
        </el-button>
      </div>

      <ModelList
        :models="models"
        :loading="isLoadingModels"
        :config-valid="isConfigValid"
        @refresh="handleRefreshModels"
        @add="handleOpenAddDialog"
        @edit="handleOpenEditDialog"
        @delete="handleDeleteModel"
      />

      <ModelDialog
        :visible="showModelDialog"
        :loading="isSubmittingModel"
        :mode="modelDialogMode"
        :initial-data="
          editingModel
            ? { modelId: editingModel.id, displayName: editingModel.displayName || editingModel.id }
            : undefined
        "
        @update:visible="showModelDialog = $event"
        @confirm="handleModelDialogConfirm"
      />
    </div>
  </SettingCard>
</template>

<style scoped lang="scss">
.openai-setting {
  display: flex;
  flex-direction: column;

  .config-form {
    flex: 1;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .proxy-address-item {
    :deep(.el-form-item__label) {
      padding: 0;
    }
  }

  .label-with-help {
    display: flex;
    align-items: center;
    gap: 8px;

    .help-icon {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #eee;
      color: #777;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s;
      flex-shrink: 0;

      &:hover {
        background: #ddd;
      }

      span {
        line-height: 1;
      }
    }
  }
}
</style>
