<div align="center">

![FayDesk Logo](resources/logo.png)

# FayDesk

一个集成了动态壁纸与数字人的高性能数字人桌面应用框架

[![Release](https://img.shields.io/github/v/release/TheRamU/fay-desk)](https://github.com/TheRamU/fay-desk/releases)
[![Downloads](https://img.shields.io/github/downloads/TheRamU/fay-desk/total)](https://github.com/TheRamU/fay-desk/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-38.1.2-blue.svg)](https://www.electronjs.org/)

简体中文 | [English](./README_EN.md)

<img src="docs/images/demo.gif" alt="demo" width="800">

</div>

---

## ✨ 特性概览

### 💬 对话聊天

<img src="docs/images/features/chat.jpg" alt="chat" width="800">

通过集成兼容 OpenAI API 的模型提供商，体验强大的智能对话能力。无论是工作、学习还是日常闲聊，都能在应用中随时与 Fay 进行自然流畅的交流。

浮窗模式，让你在享受动态壁纸的同时，也能便捷地进行交互对话，实现工作与娱乐的融合。

### 🎨 动态壁纸

<img src="docs/images/features/wallpapers.jpg" alt="wallpapers" width="800">

<img src="docs/images/features/wallpaper_demo.jpg" alt="wallpaper_demo" width="800">

应用内置动态壁纸资源库，所有壁纸均采用 HTML5 技术实现，可以通过简单的操作切换壁纸，也可以导入自定义的壁纸包，打造专属桌面环境。

### 🫧 数字人

<img src="docs/images/features/avatar.jpg" alt="avatar" width="800">

<img src="docs/images/features/avatar_2.jpg" alt="avatar_2" width="800">

基于 Xmov 具身驱动技术，将数字人形象融入桌面体验。通过简单的配置即可接入服务，数字人根据对话内容实时生成相应的表情和口型，营造出真实的面对面交流体验。

得益于 Xmov 的云端渲染能力，复杂的数字人渲染计算无需在本地进行，因此即使是配置较低的设备也能获得流畅、高清的数字人交互体验，无需担心本地硬件性能限制。

### 🎯 系统集成

深度集成操作系统功能，提供全局快捷键支持，可以在任何场景下快速唤醒应用或开启浮窗模式。

## 📖 使用指南

### 下载安装

- 访问 [GitHub Releases](https://github.com/TheRamU/fay-desk/releases/latest) 下载最新版本
- 下载完成后运行安装程序，按照提示完成安装

### 首次配置

**配置 OpenAI API**

- 获取兼容 OpenAI API 密钥，推荐使用 [DeepSeek](https://platform.deepseek.com/api_keys)
- 打开设置页面
- 进入 "OpenAI API" 设置
- 填入你的 `API Key` 和 **代理地址**（如使用代理，这里选择DeepSeek）

**配置 Xmov SDK（可选）**

- 获取 Xmov SDK 密钥
  - 前往 [魔珐星云](https://c.c1nd.cn/9C9WW) 创建账号
  - 进入 [应用管理](https://xingyun3d.com/workspace/application-manage?utm_campaign=1029launch&utm_source=FAYguo)，创建一个新的应用
  - 点击右上角 “App密钥” 按钮获取 `App ID` 和 `App Secret`
- 打开设置页面
- 进入 "Xmov SDK" 设置
- 填入 `App ID` 和 `App Secret`
- 配置完成后可启用数字人功能

**选择壁纸**

- 进入 "壁纸" 页面
- 选择喜欢的壁纸
- 点击播放按钮启用动态壁纸

### 功能使用

- **聊天**: 在主界面输入消息，与 AI 助手 Fay 对话
- **浮窗模式**: 使用快捷键 `Ctrl+Shift+D` 或点击对话框左侧按钮开启浮窗模式
- **壁纸控制**: 在应用界面顶部控制壁纸的播放/暂停，切换数字人显示
- **系统托盘**: 最小化后可在系统托盘找到应用图标

## 📋 开发计划

- [x] 数字人壁纸
- [x] 数字人休眠机制
- [ ] 语音交互
- [ ] AI 生成壁纸
- [ ] 仿生记忆
- [ ] MCP 支持

## 🔧 开发

### 环境要求

- Node.js v22

### 安装与运行

```bash
pnpm install
pnpm dev
```

### 构建

```bash
pnpm build:win
```

## 🧩 技术细节

### 壁纸系统

- 内置壁纸目录：`resources/wallpapers/`
- 安装环境壁纸会复制到用户数据目录并自动加载
- 手动导入：支持 zip 包导入（zip 包内根目录需包含 `wallpaper.json` 与 `index.html`）

### 安全与存储

本地敏感配置均以加密形式存储，避免明文保存，仅在必要且授权的情况下解密使用。

## 📜 许可协议

本项目采用 `MIT` 许可协议，详见 `LICENSE` 文件。

## 🙌 贡献

无论是提交 Bug、提出功能建议，还是提交 Pull Request，我们都非常欢迎。

本项目统一使用 ESLint 与 Prettier 保持代码风格一致。

## 🙏 致谢

本项目感谢以下开源项目的贡献与云服务供应商的支持：

- [Fay](https://github.com/xszyou/Fay) - 提供了数字人框架灵感
- [XmovAvatarSDK](https://github.com/xszyou/XmovAvatarSDK) - 提供了数字人的核心 SDK 示例，实现基于 Xmov 具身驱动技术
- [魔珐星云](https://c.c1nd.cn/9C9WW) - 提供了数字人 SDK 的云端渲染服务和技术支持

## ⛺ 微信交流群

<img src="docs/images/wechat.png" alt="wechat" width="500">
