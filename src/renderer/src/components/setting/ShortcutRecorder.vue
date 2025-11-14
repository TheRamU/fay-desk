<template>
  <div class="shortcut-recorder">
    <el-input
      ref="inputRef"
      v-model="displayValue"
      :placeholder="placeholder"
      readonly
      @focus="startRecording"
      @blur="stopRecording"
      @keydown="handleKeyDown"
      class="shortcut-input"
    >
      <template #suffix>
        <el-icon v-if="displayValue" class="clear-icon" @click="clearShortcut">
          <Close />
        </el-icon>
      </template>
    </el-input>
    <div v-if="error" class="error-hint">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { Close } from '@element-plus/icons-vue'
import type { ShortcutRecorderProps, ShortcutRecorderEmits } from '@renderer/types/common'

const props = withDefaults(defineProps<ShortcutRecorderProps>(), {
  placeholder: '无',
  disabled: false
})

const emit = defineEmits<ShortcutRecorderEmits>()

const inputRef = ref()
const isRecording = ref(false)
const error = ref('')

const displayValue = computed({
  get: () => formatShortcutForDisplay(props.modelValue),
  set: (value: string) => {
    emit('update:modelValue', value)
    emit('change', value)
  }
})

const formatShortcutForDisplay = (shortcut: string): string => {
  if (!shortcut) return ''

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  return shortcut.replace(/CommandOrControl/g, isMac ? 'Command' : 'Ctrl')
}

const startRecording = async (): Promise<void> => {
  if (props.disabled) return

  isRecording.value = true
  error.value = ''

  await nextTick()
  inputRef.value?.focus()
}

const stopRecording = (): void => {
  isRecording.value = false
  error.value = ''
}

const clearShortcut = (): void => {
  displayValue.value = ''
  error.value = ''
}

const handleKeyDown = (event: KeyboardEvent): void => {
  if (!isRecording.value || props.disabled) return

  event.preventDefault()
  event.stopPropagation()

  if (event.key === 'Backspace') {
    clearShortcut()
    return
  }

  const modifierKeys = ['Control', 'Alt', 'Shift', 'Meta', 'Cmd', 'Command']
  if (modifierKeys.includes(event.key)) {
    return
  }

  const shortcut = buildShortcutString(event)

  if (validateShortcut(shortcut)) {
    displayValue.value = shortcut
    stopRecording()
    inputRef.value?.blur()
  }
}

const buildShortcutString = (event: KeyboardEvent): string => {
  const parts: string[] = []

  if (event.ctrlKey || event.metaKey) {
    parts.push('CommandOrControl')
  }
  if (event.altKey) {
    parts.push('Alt')
  }
  if (event.shiftKey) {
    parts.push('Shift')
  }

  let key = event.key

  const keyMap: Record<string, string> = {
    ' ': 'Space',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Delete: 'Delete',
    Insert: 'Insert',
    Home: 'Home',
    End: 'End',
    PageUp: 'PageUp',
    PageDown: 'PageDown',
    Escape: 'Escape',
    Tab: 'Tab',
    Enter: 'Return'
  }

  if (keyMap[key]) {
    key = keyMap[key]
  } else if (key.length === 1) {
    // 单个字符转为大写
    key = key.toUpperCase()
  }

  parts.push(key)

  return parts.join('+')
}

const validateShortcut = (shortcut: string): boolean => {
  error.value = ''

  if (!shortcut.includes('CommandOrControl') && !shortcut.includes('Alt')) {
    error.value = '快捷键必须包含 Ctrl 或 Alt 修饰键'
    return false
  }

  const systemShortcuts = [
    'CommandOrControl+C',
    'CommandOrControl+V',
    'CommandOrControl+X',
    'CommandOrControl+Z',
    'CommandOrControl+Y',
    'CommandOrControl+A',
    'CommandOrControl+S',
    'CommandOrControl+O',
    'CommandOrControl+N',
    'CommandOrControl+W',
    'CommandOrControl+Q',
    'CommandOrControl+R',
    'CommandOrControl+T',
    'Alt+F4',
    'Alt+Tab'
  ]

  if (systemShortcuts.includes(shortcut)) {
    error.value = '该快捷键为系统保留，请选择其他组合'
    return false
  }

  return true
}
</script>

<style scoped lang="scss">
.shortcut-recorder {
  width: 100%;

  .shortcut-input {
    width: 100%;

    :deep(.el-input__inner) {
      cursor: pointer;
      font-family: 'Courier New', monospace;

      &:focus {
        cursor: text;
      }
    }

    .clear-icon {
      cursor: pointer;
      color: #c0c4cc;

      &:hover {
        color: #909399;
      }
    }
  }

  .error-hint {
    font-size: 12px;
    color: #f56c6c;
    margin-top: 4px;
    line-height: 1.2;
  }
}
</style>
