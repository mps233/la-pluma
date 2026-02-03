# 技术栈

## 构建系统
npm + Vite

## 技术栈
- **前端框架**: React 18 + Vite
- **UI 框架**: Tailwind CSS
- **后端**: Node.js + Express
- **实时通信**: Socket.io
- **MAA CLI 集成**: 通过子进程调用 maa CLI 命令

## 依赖库
- express: Web 服务器框架
- cors: 跨域资源共享
- socket.io: WebSocket 实时通信
- tailwindcss: CSS 框架

## 项目常用命令

### 安装依赖
```bash
npm run install:all  # 安装所有依赖（根目录、前端、后端）
```

### 开发环境运行
```bash
npm run dev          # 同时启动前端和后端
npm run dev:client   # 仅启动前端 (http://localhost:5173)
npm run dev:server   # 仅启动后端 (http://localhost:3000)
```

### 构建
```bash
cd client && npm run build
```

## MAA CLI 环境

### 前置要求
- macOS 系统
- 已通过 Homebrew 安装 maa-cli: `brew install MaaAssistantArknights/tap/maa-cli`
- 已执行 `maa install` 安装 MaaCore 及资源

### 快速参考
```bash
maa version          # 查看版本
maa dir config       # 获取配置目录
maa list             # 列出所有任务
maa run <task>       # 运行自定义任务
```

详细的 MAA CLI 命令和配置说明请参考 `maa-cli-reference.md`

## 开发工具
- VS Code / Cursor
- MAA CLI 官方文档: https://docs.maa.plus/zh-cn/manual/cli/
