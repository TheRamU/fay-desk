<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ElNotification } from 'element-plus'
import type { ModelDialogProps, ModelDialogEmits } from '@renderer/types/common'

const props = withDefaults(defineProps<ModelDialogProps>(), {
  mode: 'add'
})
const emit = defineEmits<ModelDialogEmits>()

const modelId = ref('')
const displayName = ref('')

const dialogTitle = computed(() => {
  return props.mode === 'edit' ? '编辑模型' : '添加自定义模型'
})

const handleClose = (): void => {
  emit('update:visible', false)
}

const handleConfirm = (): void => {
  if (!modelId.value.trim()) {
    ElNotification({
      type: 'warning',
      customClass: 'warn',
      title: '请输入模型ID'
    })
    return
  }

  if (!displayName.value.trim()) {
    ElNotification({
      type: 'warning',
      customClass: 'warn',
      title: '请输入显示名称'
    })
    return
  }

  emit('confirm', {
    modelId: modelId.value.trim(),
    displayName: displayName.value.trim()
  })
}

watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      if (props.mode === 'edit' && props.initialData) {
        modelId.value = props.initialData.modelId
        displayName.value = props.initialData.displayName
      } else {
        modelId.value = ''
        displayName.value = ''
      }
    } else {
      modelId.value = ''
      displayName.value = ''
    }
  }
)
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="dialogTitle"
    width="400px"
    align-center
    @update:model-value="handleClose"
  >
    <el-form label-position="left" label-width="80">
      <el-form-item label="模型ID">
        <el-input
          v-model="modelId"
          placeholder="请输入模型ID"
          :disabled="mode === 'edit'"
          @keyup.enter="handleConfirm"
        />
      </el-form-item>
      <el-form-item label="显示名称">
        <el-input v-model="displayName" placeholder="请输入显示名称" @keyup.enter="handleConfirm" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleConfirm"> 确定 </el-button>
    </template>
  </el-dialog>
</template>
