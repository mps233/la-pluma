# 通知功能设置指南

## 功能说明

定时任务执行完成后，系统会自动发送通知到配置的渠道（目前支持 Telegram，未来将支持微信、钉钉、邮件等）。

## Telegram 设置步骤

### 1. 创建 Telegram Bot

1. 在 Telegram 中搜索 `@BotFather`
2. 发送 `/newbot` 命令
3. 按提示设置 Bot 名称和用户名
4. 获取 Bot Token（格式类似：`123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`）

### 2. 获取 Chat ID

1. 在 Telegram 中搜索 `@userinfobot`
2. 点击 Start 或发送任意消息
3. Bot 会返回你的 Chat ID（纯数字，如：`123456789`）

### 3. 在 WebUI 中配置

1. 打开 La Pluma WebUI
2. 进入"自动化任务"页面
3. 在"定时执行"卡片中，点击右上角的铃铛图标 🔔
4. 启用通知功能
5. 启用 Telegram 渠道
6. 填入 Bot Token 和 Chat ID
7. 点击"发送测试通知"验证配置
8. 保存配置

## 通知内容

任务完成后，通知会包含以下信息：

- ✅ 任务完成状态（成功/部分失败）
- 📊 总任务数、成功数、失败数
- ⏱️ 执行耗时
- ❌ 失败任务列表（如果有）
- 🕐 完成时间

## 扩展其他通知渠道

系统已预留接口，未来可轻松扩展：

- 微信企业号
- 钉钉机器人
- 邮件通知
- Bark（iOS）
- Server酱
- 等等...

## 技术架构

### 后端

- `server/services/notificationService.js` - 通知服务核心
- `server/routes/notification.js` - API 路由
- `server/services/schedulerService.js` - 定时任务集成

### 前端

- `client/src/components/NotificationSettings.jsx` - 配置界面
- `client/src/components/AutomationTasks.jsx` - 集成入口

### 配置存储

- `server/data/user-configs/notification.json` - 通知配置文件

## API 接口

### 获取配置
```
GET /api/notification/config
```

### 保存配置
```
POST /api/notification/config
Body: { enabled, channels: { telegram: { enabled, botToken, chatId } } }
```

### 测试通知
```
POST /api/notification/test/:channel
```

### 发送通知
```
POST /api/notification/send-test
Body: { title, content, level }
```

## 安全说明

- Bot Token 等敏感信息存储在服务器端
- 前端显示时会隐藏敏感信息（显示为 `***已设置***`）
- 建议定期更换 Bot Token
- 不要将配置文件提交到公开仓库

## 故障排查

### 测试通知发送失败

1. 检查 Bot Token 是否正确
2. 检查 Chat ID 是否正确
3. 确保已在 Telegram 中向 Bot 发送过至少一条消息（点击 Start）
4. 检查服务器网络是否能访问 Telegram API（`api.telegram.org`）
5. 查看服务器日志获取详细错误信息

### 定时任务完成后没有收到通知

1. 检查通知功能是否已启用
2. 检查 Telegram 渠道是否已启用
3. 查看服务器日志确认是否有发送通知的记录
4. 确认 Bot 没有被 Telegram 封禁

## 开发者指南

### 添加新的通知渠道

1. 在 `notificationService.js` 中创建新的 Channel 类：

```javascript
class WeChatChannel extends NotificationChannel {
  async send(message) {
    // 实现微信发送逻辑
  }
  
  async test() {
    // 实现测试逻辑
  }
}
```

2. 在 `NotificationManager.initChannels()` 中注册：

```javascript
this.registerChannel('wechat', WeChatChannel);
```

3. 在配置中添加对应的配置项
4. 在前端 `NotificationSettings.jsx` 中添加配置界面

就这么简单！
