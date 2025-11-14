<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { OpenAIModel } from '@renderer/types/openai'
import type { ModelListProps, ModelListEmits } from '@renderer/types/common'

const props = defineProps<ModelListProps>()
const emit = defineEmits<ModelListEmits>()

const displayCount = ref(5)
const INITIAL_COUNT = 5
const LOAD_MORE_COUNT = 20

const sortedModels = computed(() => {
  return [...props.models].sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
})

const displayedModels = computed(() => {
  return sortedModels.value.slice(0, displayCount.value)
})

const showLoadMore = computed(() => {
  return props.models.length > displayCount.value
})

const loadMore = (): void => {
  displayCount.value = Math.min(displayCount.value + LOAD_MORE_COUNT, props.models.length)
}

watch(
  () => props.models.length,
  () => {
    displayCount.value = INITIAL_COUNT
  }
)

const handleRefresh = (): void => {
  emit('refresh')
}

const handleAdd = (): void => {
  emit('add')
}

const handleEdit = (model: OpenAIModel): void => {
  emit('edit', model)
}

const handleDelete = (modelId: string): void => {
  emit('delete', modelId)
}

const handleCommand = (cmd: string, model: OpenAIModel): void => {
  if (cmd === 'edit') {
    handleEdit(model)
  } else if (cmd === 'delete') {
    handleDelete(model.id)
  }
}
</script>

<template>
  <div class="models">
    <div class="models__header">
      <div class="models__title">
        <span>模型列表</span>
        <span class="models__count">共 {{ models.length }} 个</span>
      </div>
      <div class="models__actions">
        <el-button
          size="small"
          :loading="loading"
          :disabled="!configValid || loading"
          @click="handleRefresh"
        >
          获取模型列表
        </el-button>
        <el-button
          size="small"
          circle
          style="margin-left: 5px"
          :disabled="!configValid || loading"
          @click="handleAdd"
        >
          +
        </el-button>
      </div>
    </div>
    <div v-if="models.length > 0" class="models__list">
      <div v-for="model in displayedModels" :key="model.id" class="model-item">
        <div class="model-item__content">
          <div class="model-item__name">{{ model.displayName || model.id }}</div>
        </div>
        <el-dropdown trigger="click" @command="(cmd) => handleCommand(cmd, model)">
          <el-button text circle size="small" class="model-item__menu">
            <span style="font-size: 16px">⋯</span>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="edit">编辑</el-dropdown-item>
              <el-dropdown-item command="delete" class="danger-item">删除</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <div v-if="showLoadMore" class="models__load-more">
        <el-button text @click="loadMore">显示更多</el-button>
      </div>
    </div>
    <div v-else class="models__empty">
      <span>暂无模型，请先保存配置以获取模型列表</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.models {
  margin-top: 50px;

  .models__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;

    .models__title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: bold;
      color: #303133;
    }

    .models__actions {
      display: flex;
      align-items: center;
    }

    .models__count {
      margin-left: 8px;
      font-size: 12px;
      font-weight: normal;
      color: #909399;
    }

    .models__loading {
      font-size: 14px;
      color: #909399;
    }
  }

  .models__list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    &::-webkit-scrollbar {
      width: 4px;
      height: 4px;
      background-color: transparent;
    }
    &::-webkit-scrollbar-thumb {
      background-color: #ddd;
      border-radius: 4px;
    }
    &::-webkit-scrollbar-track {
      background-color: transparent;
    }

    .models__load-more {
      display: flex;
      justify-content: center;
      padding-top: 12px;
      margin-top: 8px;
      :deep(.el-button.is-text) {
        font-size: 14px;
        color: #909399;
        font-weight: normal;
        background-color: transparent !important;
      }
      :deep(.el-button.is-text:hover),
      :deep(.el-button.is-text:focus),
      :deep(.el-button.is-text:active) {
        color: #303133;
        background-color: transparent !important;
      }

      :focus {
        outline: none;
      }
    }

    .model-item {
      padding: 12px 16px;
      background: white;
      border-radius: 6px;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: space-between;

      &:hover {
        background: #f7f7f7;

        .model-item__menu {
          opacity: 1;
        }
      }

      .model-item__content {
        flex: 1;
        min-width: 0;
      }

      .model-item__name {
        font-size: 16px;
        color: #303133;
        margin-bottom: 2px;
      }

      .model-item__menu {
        opacity: 0;
        transition: opacity 0.2s;
        flex-shrink: 0;
        margin-left: 8px;
      }
    }
  }

  .models__empty {
    padding: 24px;
    text-align: center;
    color: #909399;
    font-size: 14px;
    //background: #f5f7fa;
    border-radius: 6px;
    margin-top: 20px;
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
