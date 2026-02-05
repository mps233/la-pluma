import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Icons from './Icons'

// API 基础 URL
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  const port = window.location.port || '3000';
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://localhost:${port}`;
  }
  return `http://${hostname}:${port}`;
};

const API_BASE_URL = getApiBaseUrl();

export default function NotificationSettings({ isOpen, onClose }) {
  const [config, setConfig] = useState({
    enabled: false,
    channels: {
      telegram: {
        enabled: false,
        botToken: '',
        chatId: '',
      }
    }
  })
  const [message, setMessage] = useState('')
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadConfig()
    }
  }, [isOpen])

  const loadConfig = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notification/config`)
      const result = await response.json()
      if (result.success) {
        setConfig(result.data)
      }
    } catch (error) {
      console.error('加载通知配置失败:', error)
    }
  }

  const saveConfig = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notification/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      })
      const result = await response.json()
      if (result.success) {
        setMessage('✅ 配置已保存')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage(`❌ 保存失败: ${result.error}`)
      }
    } catch (error) {
      setMessage(`❌ 保存失败: ${error.message}`)
    }
  }

  const testNotification = async (channel) => {
    setTesting(true)
    setMessage('正在发送测试通知...')
    try {
      const response = await fetch(`${API_BASE_URL}/api/notification/test/${channel}`, {
        method: 'POST',
      })
      const result = await response.json()
      if (result.success) {
        setMessage('✅ 测试通知已发送，请检查您的 Telegram')
      } else {
        setMessage(`❌ 测试失败: ${result.message}`)
      }
    } catch (error) {
      setMessage(`❌ 测试失败: ${error.message}`)
    } finally {
      setTesting(false)
      setTimeout(() => setMessage(''), 5000)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-[rgba(15,15,15,0.95)] rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 标题 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="text-orange-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">通知设置</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 消息提示 */}
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-4 p-3 rounded-xl text-sm ${
                message.includes('✅') 
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                  : message.includes('❌')
                    ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30'
                    : 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-300 dark:border-sky-500/30'
              }`}
            >
              {message}
            </motion.div>
          )}

          {/* 全局开关 */}
          <div className="mb-6 p-4 rounded-2xl bg-gray-50 dark:bg-[rgba(20,20,20,0.6)] border border-gray-200 dark:border-white/10">
            <label className="flex items-center justify-between cursor-pointer group">
              <div className="flex items-center space-x-3">
                <div className="text-orange-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">启用通知</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">定时任务完成后自动发送通知</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="custom-checkbox-orange cursor-pointer"
              />
            </label>
          </div>

          {/* Telegram 配置 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">📱</span>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Telegram</h3>
              </div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <span className="text-sm text-gray-600 dark:text-gray-400">启用</span>
                <input
                  type="checkbox"
                  checked={config.channels.telegram.enabled}
                  onChange={(e) => setConfig({
                    ...config,
                    channels: {
                      ...config.channels,
                      telegram: {
                        ...config.channels.telegram,
                        enabled: e.target.checked
                      }
                    }
                  })}
                  className="custom-checkbox-orange cursor-pointer"
                />
              </label>
            </div>

            {config.channels.telegram.enabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bot Token
                  </label>
                  <input
                    type="text"
                    value={config.channels.telegram.botToken}
                    onChange={(e) => setConfig({
                      ...config,
                      channels: {
                        ...config.channels,
                        telegram: {
                          ...config.channels.telegram,
                          botToken: e.target.value
                        }
                      }
                    })}
                    placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#070707] text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    从 <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600">@BotFather</a> 获取
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Chat ID
                  </label>
                  <input
                    type="text"
                    value={config.channels.telegram.chatId}
                    onChange={(e) => setConfig({
                      ...config,
                      channels: {
                        ...config.channels,
                        telegram: {
                          ...config.channels.telegram,
                          chatId: e.target.value
                        }
                      }
                    })}
                    placeholder="123456789"
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#070707] text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    从 <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600">@userinfobot</a> 获取
                  </p>
                </div>

                <button
                  onClick={() => testNotification('telegram')}
                  disabled={testing || !config.channels.telegram.botToken || !config.channels.telegram.chatId}
                  className="w-full px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {testing ? '发送中...' : '发送测试通知'}
                </button>
              </motion.div>
            )}
          </div>

          {/* 未来扩展提示 */}
          <div className="mt-6 p-4 rounded-2xl bg-gray-50 dark:bg-[rgba(20,20,20,0.6)] border border-dashed border-gray-300 dark:border-white/20">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              💡 更多通知渠道（微信、钉钉、邮件等）即将推出
            </p>
          </div>

          {/* 底部按钮 */}
          <div className="flex space-x-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 font-medium transition-all"
            >
              取消
            </button>
            <button
              onClick={saveConfig}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold hover:from-orange-600 hover:to-red-600 transition-all shadow-[0_4px_12px_rgb(249,115,22,0.3)]"
            >
              保存配置
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
