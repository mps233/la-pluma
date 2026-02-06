import express from 'express';
import {
  setNotificationConfig,
  getNotificationConfig,
  sendNotification,
  sendToChannel,
  testNotificationChannel,
} from '../services/notificationService.js';
import { initTelegramBot, stopTelegramBot } from '../services/telegramBotService.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// 配置文件路径
const CONFIG_DIR = join(__dirname, '../data/user-configs');
const NOTIFICATION_CONFIG_FILE = join(CONFIG_DIR, 'notification.json');

// 加载配置
async function loadConfig() {
  try {
    const data = await readFile(NOTIFICATION_CONFIG_FILE, 'utf-8');
    const config = JSON.parse(data);
    setNotificationConfig(config);
    return config;
  } catch (error) {
    console.log('通知配置文件不存在，使用默认配置');
    return null;
  }
}

// 保存配置
async function saveConfig(config) {
  try {
    await mkdir(CONFIG_DIR, { recursive: true });
    await writeFile(NOTIFICATION_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    throw new Error(`保存配置失败: ${error.message}`);
  }
}

// 导出加载配置函数供服务器启动时调用
export { loadConfig };

// 获取通知配置
router.get('/config', async (req, res) => {
  try {
    const config = getNotificationConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新通知配置
router.post('/config', async (req, res) => {
  try {
    const config = req.body;
    setNotificationConfig(config);
    await saveConfig(config);
    
    // 重启 Telegram Bot
    if (config.channels?.telegram) {
      console.log('[通知配置] 重启 Telegram Bot...');
      stopTelegramBot();
      
      // 等待一下再启动
      setTimeout(() => {
        initTelegramBot({
          enabled: config.channels.telegram.enabled,
          botToken: config.channels.telegram.botToken,
          chatId: config.channels.telegram.chatId
        });
      }, 1000);
    }
    
    res.json({ success: true, message: '配置已保存，Telegram Bot 已重启' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 测试通知渠道
router.post('/test/:channel', async (req, res) => {
  try {
    const { channel } = req.params;
    console.log(`[通知测试] 测试渠道: ${channel}`);
    
    const result = await testNotificationChannel(channel);
    console.log(`[通知测试] 结果:`, result);
    
    res.json({ success: result.success, message: result.message });
  } catch (error) {
    console.error(`[通知测试] 错误:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 发送测试通知
router.post('/send-test', async (req, res) => {
  try {
    const { title, content, level = 'info' } = req.body;
    const result = await sendNotification({
      title: title || '测试通知',
      content: content || '这是一条测试通知',
      level,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 发送通知到指定渠道
router.post('/send/:channel', async (req, res) => {
  try {
    const { channel } = req.params;
    const { title, content, level = 'info', data } = req.body;
    const result = await sendToChannel(channel, {
      title,
      content,
      level,
      data,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
