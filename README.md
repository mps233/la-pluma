# MAA WebUI

Mac 上 MAA CLI 的 WebUI 界面

## 技术栈

- **前端**: React + Vite + Tailwind CSS
- **后端**: Node.js + Express + Socket.io
- **MAA CLI**: 通过子进程调用

## 前置要求

- Node.js 18+
- MAA CLI 已安装: `brew install MaaAssistantArknights/tap/maa-cli`
- 已执行 `maa install` 安装 MaaCore

## 快速开始

### 1. 安装依赖

\`\`\`bash
# 安装所有依赖（根目录、前端、后端）
npm run install:all
\`\`\`

### 2. 启动开发服务器

\`\`\`bash
# 同时启动前端和后端
npm run dev

# 或分别启动
npm run dev:client  # 前端: http://localhost:5173
npm run dev:server  # 后端: http://localhost:3000
\`\`\`

## 项目结构

\`\`\`
.
├── client/              # 前端 (React + Vite + Tailwind)
│   ├── src/
│   │   ├── components/  # UI 组件
│   │   ├── services/    # API 调用
│   │   └── App.jsx
│   └── package.json
├── server/              # 后端 (Node.js + Express)
│   ├── routes/          # API 路由
│   ├── services/        # MAA CLI 集成
│   └── server.js
├── .kiro/               # Kiro 配置和指导文档
└── package.json
\`\`\`

## 核心功能

- [x] MAA 控制
- [x] MAA 日志查看
- [x] MAA 配置管理
- [ ] MAA 资源文件管理
- [ ] MAA 任务管理

## API 接口

### 获取版本信息
\`\`\`
GET /api/maa/version
\`\`\`

### 获取配置目录
\`\`\`
GET /api/maa/config-dir
\`\`\`

### 执行命令
\`\`\`
POST /api/maa/execute
Body: { "command": "list", "args": [] }
\`\`\`

## 开发指南

详细的开发指南和 MAA CLI 参考请查看 `.kiro/steering/` 目录下的文档。
