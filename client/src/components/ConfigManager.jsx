import { useState, useEffect } from 'react'
import { maaApi } from '../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import Icons from './Icons'

export default function ConfigManager() {
  const [configType, setConfigType] = useState('connection')
  const [configData, setConfigData] = useState({
    adb_path: 'adb',
    address: '127.0.0.1:5555',
    config: 'CompatMac',
  })
  const [configDir, setConfigDir] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState({ core: false, cli: false })
  const [autoUpdate, setAutoUpdate] = useState({
    enabled: false,
    time: '04:00',
    updateCore: true,
    updateCli: true
  })

  useEffect(() => {
    loadConfigDir()
    loadConfig()
    loadAutoUpdateConfig()
  }, [])

  const loadAutoUpdateConfig = async () => {
    try {
      // 优先从服务器加载配置
      const serverConfig = await maaApi.loadUserConfig('auto-update')
      if (serverConfig.success && serverConfig.data) {
        setAutoUpdate(serverConfig.data)
        localStorage.setItem('autoUpdateConfig', JSON.stringify(serverConfig.data))
        
        // 同步到后端调度器
        if (serverConfig.data.enabled) {
          await maaApi.setupAutoUpdate(serverConfig.data)
        }
        console.log('✅ 已从服务器加载自动更新配置')
        return
      }
    } catch (error) {
      console.error('从服务器加载自动更新配置失败，使用 localStorage:', error)
    }
    
    // 服务器加载失败，从 localStorage 加载配置
    try {
      const saved = localStorage.getItem('autoUpdateConfig')
      if (saved) {
        const config = JSON.parse(saved)
        setAutoUpdate(config)
        
        // 同步到后端
        if (config.enabled) {
          await maaApi.setupAutoUpdate(config)
        }
      }
    } catch (error) {
      console.error('加载自动更新配置失败:', error)
    }
  }

  const saveAutoUpdateConfig = async (config) => {
    try {
      // 保存到 localStorage
      localStorage.setItem('autoUpdateConfig', JSON.stringify(config))
      
      // 保存到服务器
      await maaApi.saveUserConfig('auto-update', config)
      
      // 同步到后端调度器
      const result = await maaApi.setupAutoUpdate(config)
      
      if (result.success) {
        setMessage(config.enabled ? `自动更新已启用，每天 ${config.time} 执行` : '自动更新已禁用')
      } else {
        setMessage(`设置失败: ${result.message}`)
      }
    } catch (error) {
      setMessage(`设置失败: ${error.message}`)
    }
  }

  const handleAutoUpdateChange = (field, value) => {
    const newConfig = { ...autoUpdate, [field]: value }
    setAutoUpdate(newConfig)
    saveAutoUpdateConfig(newConfig)
  }

  const loadConfigDir = async () => {
    try {
      const result = await maaApi.getConfigDir()
      if (result.success) {
        setConfigDir(result.data)
      }
    } catch (error) {
      console.error('获取配置目录失败:', error)
    }
  }

  const loadConfig = async () => {
    try {
      const result = await maaApi.getConfig()
      if (result.success && result.data) {
        setConfigData(result.data)
      }
    } catch (error) {
      console.error('加载配置失败:', error)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setMessage('')
    
    try {
      const result = await maaApi.saveConfig('default', { connection: configData })
      
      if (result.success) {
        setMessage('配置保存成功')
      } else {
        setMessage(`保存失败: ${result.error}`)
      }
    } catch (error) {
      setMessage(`网络错误: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setConfigData({
      adb_path: 'adb',
      address: '127.0.0.1:5555',
      config: 'CompatMac',
    })
    setMessage('已重置为默认值')
  }

  const handleUpdateCore = async () => {
    setUpdating({ ...updating, core: true })
    setMessage('正在更新 MaaCore...')
    
    try {
      const result = await maaApi.updateMaaCore()
      
      if (result.success) {
        setMessage('MaaCore 更新成功')
      } else {
        setMessage(`更新失败: ${result.error}`)
      }
    } catch (error) {
      setMessage(`网络错误: ${error.message}`)
    } finally {
      setUpdating({ ...updating, core: false })
    }
  }

  const handleUpdateCli = async () => {
    setUpdating({ ...updating, cli: true })
    setMessage('正在更新 MAA CLI...')
    
    try {
      const result = await maaApi.updateMaaCli()
      
      if (result.success) {
        setMessage('MAA CLI 更新成功')
      } else {
        setMessage(`更新失败: ${result.error}`)
      }
    } catch (error) {
      setMessage(`网络错误: ${error.message}`)
    } finally {
      setUpdating({ ...updating, cli: false })
    }
  }

  const configSections = [
    { id: 'connection', name: '连接配置', icon: '🔌' },
    { id: 'resource', name: '资源配置', icon: '📦' },
    { id: 'instance', name: '实例选项', icon: '⚡' },
  ]

  return (
    <>
      <div className="p-6 space-y-6">
        {/* 页面标题 */}
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center space-x-3">
            <Icons.CogIcon />
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 bg-clip-text text-transparent">
                配置管理
              </h2>
              <p className="text-gray-600 dark:text-gray-500 text-sm hidden sm:block">管理 MAA CLI 连接和运行配置</p>
            </div>
          </div>
          
          {/* 状态指示器 */}
          <div className="flex items-center space-x-4">
            {message && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`px-4 py-2 rounded-xl text-sm font-medium border flex items-center space-x-2 ${
                  message.includes('成功') || message.includes('已保存')
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30' 
                    : message.includes('已重置') || message.includes('警告')
                      ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30'
                      : message.includes('正在') || message.includes('处理中')
                        ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-300 dark:border-sky-500/30' 
                        : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-500/30'
                }`}
              >
                {message.includes('成功') || message.includes('已保存') ? (
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : message.includes('已重置') || message.includes('警告') ? (
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : message.includes('正在') || message.includes('处理中') ? (
                  <svg className="w-4 h-4 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span>{message}</span>
              </motion.div>
            )}
            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-900/60 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-200 dark:border-white/10 shadow-sm text-xs">
              <motion.div 
                className={`w-2 h-2 rounded-full flex-shrink-0 ${loading || updating.core || updating.cli ? 'bg-orange-400' : 'bg-gray-600 dark:bg-gray-600'}`}
                animate={loading || updating.core || updating.cli ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <div className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                {loading || updating.core || updating.cli ? '处理中' : '就绪'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* 配置目录信息 */}
        <motion.div 
          className="rounded-3xl p-6 border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">配置目录</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{configDir || '加载中...'}</p>
            </div>
            <motion.button 
              className="px-5 py-2.5 text-sm text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-500/30 rounded-xl bg-orange-50 dark:bg-transparent hover:bg-orange-100 dark:hover:bg-orange-500/10 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              打开目录
            </motion.button>
          </div>
        </motion.div>

        {/* 更新管理 */}
        <motion.div 
          className="rounded-3xl p-6 border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">更新管理</h2>
          
          {/* 自动更新设置 */}
          <div className="mb-6 rounded-2xl p-5 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800/40">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">自动更新</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">每天定时自动更新 MAA 组件</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoUpdate.enabled}
                  onChange={(e) => handleAutoUpdateChange('enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-orange-500 peer-checked:to-red-500"></div>
              </label>
            </div>
            
            {autoUpdate.enabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    更新时间
                  </label>
                  <input
                    type="time"
                    value={autoUpdate.time}
                    onChange={(e) => handleAutoUpdateChange('time', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-white/10 hover:border-orange-400 dark:hover:border-orange-500/50 rounded-xl text-gray-900 dark:text-gray-200 bg-white dark:bg-[#070707] focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={autoUpdate.updateCore}
                      onChange={(e) => handleAutoUpdateChange('updateCore', e.target.checked)}
                      className="custom-checkbox-orange cursor-pointer"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">更新 MaaCore</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={autoUpdate.updateCli}
                      onChange={(e) => handleAutoUpdateChange('updateCli', e.target.checked)}
                      className="custom-checkbox-orange cursor-pointer"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">更新 MAA CLI</span>
                  </label>
                </div>
              </motion.div>
            )}
          </div>
          
          {/* 手动更新按钮 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 更新 MaaCore */}
            <div className="rounded-2xl p-5 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800/40">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">MaaCore</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">更新 MAA 核心组件和资源文件</p>
                </div>
              </div>
              <motion.button
                onClick={handleUpdateCore}
                disabled={updating.core}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:from-orange-600 hover:to-red-600 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 disabled:shadow-none"
                whileHover={{ scale: updating.core ? 1 : 1.02 }}
                whileTap={{ scale: updating.core ? 1 : 0.98 }}
              >
                {updating.core ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>更新中...</span>
                  </>
                ) : (
                  <>
                    <Icons.Download />
                    <span>更新 MaaCore</span>
                  </>
                )}
              </motion.button>
            </div>

            {/* 更新 MAA CLI */}
            <div className="rounded-2xl p-5 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800/40">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">MAA CLI</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">通过 Homebrew 更新 MAA 命令行工具</p>
                </div>
              </div>
              <motion.button
                onClick={handleUpdateCli}
                disabled={updating.cli}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:from-orange-600 hover:to-red-600 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 disabled:shadow-none"
                whileHover={{ scale: updating.cli ? 1 : 1.02 }}
                whileTap={{ scale: updating.cli ? 1 : 0.98 }}
              >
                {updating.cli ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>更新中...</span>
                  </>
                ) : (
                  <>
                    <Icons.Download />
                    <span>更新 MAA CLI</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 配置类型选择 */}
          <div className="lg:col-span-1">
            <motion.div 
              className="rounded-3xl border border-gray-200 dark:border-white/10 overflow-hidden bg-white dark:bg-gray-900/60"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="px-5 py-4 border-b border-gray-200 dark:border-white/10">
                <h3 className="font-bold text-gray-900 dark:text-white">配置类型</h3>
              </div>
              <div className="p-3">
                {configSections.map((section, index) => (
                  <motion.button
                    key={section.id}
                    onClick={() => setConfigType(section.id)}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-left transition-all mb-2
                      ${configType === section.id
                        ? 'bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-500/20 dark:to-red-500/20 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-500/30 shadow-[0_4px_12px_rgba(251,146,60,0.15)]'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] border border-transparent'
                      }
                    `}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    whileHover={{ x: 4 }}
                  >
                    <span className="text-xl">{section.icon}</span>
                    <span className="text-sm font-medium">{section.name}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>

          {/* 配置编辑器 */}
          <div className="lg:col-span-3">
            <motion.div 
              className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {configSections.find(s => s.id === configType)?.name}
                </h3>
                <div className="flex items-center space-x-2">
                  <motion.button 
                    onClick={handleReset}
                    disabled={loading}
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 rounded-xl disabled:opacity-30 transition-all bg-gray-50 dark:bg-gray-800/60"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    重置
                  </motion.button>
                  <motion.button 
                    onClick={handleSave}
                    disabled={loading}
                    className="px-3 py-2 rounded-xl text-sm font-semibold bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-500/30 hover:bg-orange-200 dark:hover:bg-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2h2m3-4H5a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-1m-4 0V3m0 0L9 6m1.5-3L12 6" />
                    </svg>
                    <span>{loading ? '保存中...' : '保存'}</span>
                  </motion.button>
                </div>
              </div>
              <div className="p-6">
                {configType === 'connection' && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        ADB 路径
                      </label>
                      <input
                        type="text"
                        value={configData.adb_path}
                        onChange={(e) => setConfigData({ ...configData, adb_path: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-white/10 rounded-2xl text-gray-900 dark:text-gray-200 bg-white dark:bg-[#070707] focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">ADB 可执行文件的路径</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        连接地址
                      </label>
                      <input
                        type="text"
                        value={configData.address}
                        onChange={(e) => setConfigData({ ...configData, address: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-white/10 rounded-2xl text-gray-900 dark:text-gray-200 bg-white dark:bg-[#070707] focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">模拟器连接地址，格式: IP:端口</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        平台配置
                      </label>
                      <select
                        value={configData.config}
                        onChange={(e) => setConfigData({ ...configData, config: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-white/10 rounded-2xl text-gray-900 dark:text-gray-200 bg-white dark:bg-[#070707] focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                      >
                        <option value="CompatMac">CompatMac (macOS)</option>
                        <option value="CompatPOSIXShell">CompatPOSIXShell (Linux)</option>
                        <option value="General">General (Windows)</option>
                      </select>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">平台相关配置</p>
                    </div>
                  </div>
                )}
                {configType === 'resource' && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        全局资源
                      </label>
                      <select 
                        className="w-full px-4 py-3 border border-gray-300 dark:border-white/10 rounded-2xl text-gray-900 dark:text-gray-200 bg-white dark:bg-[#070707] focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                      >
                        <option value="">简体中文 (默认)</option>
                        <option value="YoStarEN">YoStarEN (国际服)</option>
                        <option value="YoStarJP">YoStarJP (日服)</option>
                        <option value="YoStarKR">YoStarKR (韩服)</option>
                      </select>
                    </div>
                    <div>
                      <label className="flex items-center space-x-2 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="custom-checkbox-orange cursor-pointer"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">启用用户自定义资源</span>
                      </label>
                    </div>
                  </div>
                )}
                {configType === 'instance' && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        触摸模式
                      </label>
                      <select 
                        className="w-full px-4 py-3 border border-gray-300 dark:border-white/10 rounded-2xl text-gray-900 dark:text-gray-200 bg-white dark:bg-[#070707] focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                      >
                        <option value="ADB">ADB</option>
                        <option value="MiniTouch">MiniTouch</option>
                        <option value="MaaTouch">MaaTouch</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-2 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="custom-checkbox-orange cursor-pointer"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">部署时暂停</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="custom-checkbox-orange cursor-pointer"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">启用 ADB Lite 模式</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="custom-checkbox-orange cursor-pointer"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">退出时关闭 ADB</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  )
}
