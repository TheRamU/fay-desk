<script setup lang="ts">
import packageJson from '../../../../package.json'

const version = packageJson.version

defineProps({
  light: {
    type: Boolean,
    default: false
  },
  large: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <span class="logo" :class="{ large: large }">
    <span class="logo-icon" :class="{ light: light }"></span>
    <span class="logo-content">
      <span class="logo-text">FayDesk</span>
      <span v-if="large" class="logo-version">v{{ version }}</span>
    </span>
  </span>
</template>

<style scoped lang="scss">
.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 32px;

  &.large {
    gap: 18px;
    height: 48px;
    align-items: flex-start;

    .logo-icon {
      width: 48px;
      height: 48px;
      border-radius: 9px;
    }

    .logo-text {
      font-size: 16px;
      line-height: 16px;
      margin: 0;
    }

    .logo-content {
      height: 100%;
      justify-content: space-evenly;
    }
  }

  .logo-icon {
    width: 32px;
    height: 32px;
    background: #f5f5f5;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;

    &.light {
      background: #fff;
    }

    &::after {
      content: '';
      display: block;
      width: 55%;
      height: 55%;
      border-radius: 50%;
      box-sizing: border-box;
      background-image: linear-gradient(-225deg, #20e2d7 0%, #f9fea5 100%);
    }
  }

  .logo-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .logo-text {
    font-size: 16px;
    font-weight: 500;
    color: #333;
    letter-spacing: 1px;
    margin-bottom: 3px;
  }

  .logo-version {
    font-size: 12px;
    font-weight: 400;
    color: #666;
    letter-spacing: 0.5px;
    line-height: 1;
  }
}
</style>
