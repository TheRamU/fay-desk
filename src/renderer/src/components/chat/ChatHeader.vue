<template>
  <div class="chat-header">
    <el-select
      v-model="selectedModel"
      class="chat-header-select"
      placeholder="选择模型"
      style="max-width: 220px"
      no-data-text="请先配置 OpenAI API 密钥"
      :show-arrow="false"
      @change="handleModelChange"
    >
      <el-option
        v-for="model in models"
        :key="model.id"
        :label="model.displayName || model.id"
        :value="model.id"
      />
    </el-select>

    <el-dropdown
      trigger="click"
      style="margin-left: auto"
      placement="bottom-end"
      @command="handleMenuCommand"
      :show-arrow="false"
    >
      <el-button text circle class="chat-menu-button">
        <el-icon>
          <MoreIcon />
        </el-icon>
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="settings">聊天设置</el-dropdown-item>
          <el-dropdown-item command="clear" class="danger-item">清空历史</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import MoreIcon from '@renderer/icons/MoreIcon.vue'
import type { OpenAIModel } from '@renderer/types/openai'
import type { ChatHeaderProps, ChatHeaderEmits } from '@renderer/types/chat'

const props = withDefaults(defineProps<ChatHeaderProps>(), {
  modelValue: ''
})

const emit = defineEmits<ChatHeaderEmits>()

const router = useRouter()

const models = ref<OpenAIModel[]>([])
const selectedModel = ref(props.modelValue)

const loadModels = async () => {
  try {
    const result = await window.api.openai.getModels()
    if (result.success && result.models.length > 0) {
      models.value = result.models

      const savedModelResult = await window.api.openai.getSelectedModel()
      let savedModelId = savedModelResult.success ? savedModelResult.selectedModel : null

      if (savedModelId && models.value.some((m) => m.id === savedModelId)) {
        selectedModel.value = savedModelId
        emit('update:modelValue', savedModelId)
        emit('model-changed', savedModelId)
      } else {
        if (models.value.length > 0) {
          selectedModel.value = models.value[0].id
          emit('update:modelValue', models.value[0].id)
          emit('model-changed', models.value[0].id)
          await window.api.openai.saveSelectedModel(selectedModel.value)
        }
      }
    }
  } catch (error) {
    console.error('加载模型列表失败:', error)
  }
}

const handleModelChange = (modelId: string) => {
  emit('update:modelValue', modelId)
  emit('model-changed', modelId)
}

const handleMenuCommand = async (command: string) => {
  switch (command) {
    case 'settings':
      await router.push({ path: '/setting', query: { section: 'chat-setting' } })
      break
    case 'clear':
      emit('clear-history')
      break
  }
}

watch(selectedModel, async (newModelId) => {
  if (newModelId) {
    try {
      await window.api.openai.saveSelectedModel(newModelId)
    } catch (error) {
      console.error('保存选中的模型失败:', error)
    }
  }
})

watch(
  () => props.modelValue,
  (newValue) => {
    selectedModel.value = newValue
  }
)

onMounted(async () => {
  await loadModels()
})

defineExpose({
  loadModels
})
</script>

<style scoped lang="scss">
.chat-header {
  display: flex;
  align-items: center;
  padding: 15px 10px;
  background: #fff;
}

.chat-menu-button {
  opacity: 0.7;
  transition: opacity 0.2s;
  font-size: 20px;

  &:hover {
    opacity: 1;
  }
}

.chat-header-select {
  :deep(.el-select__wrapper) {
    font-size: 16px;
    box-shadow: none !important;
    border: none !important;
  }
}

:deep(.el-dropdown-menu__item) {
  &:hover,
  &:active,
  &:focus {
    background-color: #f5f7fa !important;
  }
}

:deep(.danger-item) {
  color: #f56c6c;

  &:hover,
  &:active,
  &:focus {
    color: #f56c6c !important;
    background-color: #fef0f0 !important;
  }
}
</style>
