import { useState, useEffect } from 'react'
import { maaApi } from '../services/api'
import { motion } from 'framer-motion'
import Icons from './Icons'

export default function RoguelikeTasks() {
  const [isRunning, setIsRunning] = useState(false)
  const [taskInputs, setTaskInputs] = useState({})
  const [message, setMessage] = useState('')
  const [advancedParams, setAdvancedParams] = useState({})

  // 页面加载时从服务器或 localStorage 加载配置和恢复执行状态
  useEffect(() => {
    // 从后端获取真实的任务执行状态
    const checkBackendStatus = async () => {
      try {
        const result = await maaApi.getTaskStatus()
        if (result.success && result.data.isRunning) {
          // 后端确实有任务在运行
          const { taskName, startTime, taskType } = result.data
          
          // 只恢复属于肉鸽模式的任务
          if (taskType === 'roguelike') {
            const elapsedMinutes = (Date.now() - startTime) / 1000 / 60
            setIsRunning(true)
            if (elapsedMinutes > 5) {
              setMessage(`${taskName} 可能已完成（已运行 ${Math.floor(elapsedMinutes)} 分钟）`)
            } else {
              setMessage(`正在执行: ${taskName}`)
            }
            
            // 启动轮询，持续检查任务状态
            const pollInterval = setInterval(async () => {
              try {
                const statusResult = await maaApi.getTaskStatus()
                if (statusResult.success && !statusResult.data.isRunning) {
                  // 任务已完成
                  setIsRunning(false)
                  setMessage('任务已完成')
                  clearInterval(pollInterval)
                  setTimeout(() => setMessage(''), 3000)
                }
              } catch (error) {
                console.error('轮询任务状态失败:', error)
                clearInterval(pollInterval)
              }
            }, 2000) // 每2秒检查一次
            
            // 组件卸载时清除轮询
            return () => clearInterval(pollInterval)
          }
        }
      } catch (error) {
        console.error('获取后端任务状态失败:', error)
      }
    }
    
    checkBackendStatus()
    
    // 加载保存的配置 - 优先从服务器加载
    const loadConfig = async () => {
      try {
        const serverConfig = await maaApi.loadUserConfig('roguelike-tasks')
        if (serverConfig.success && serverConfig.data) {
          const { taskInputs: inputs, advancedParams: advanced } = serverConfig.data
          if (inputs) {
            setTaskInputs(inputs)
            localStorage.setItem('roguelikeTaskInputs', JSON.stringify(inputs))
          }
          if (advanced) {
            setAdvancedParams(advanced)
            localStorage.setItem('roguelikeAdvancedParams', JSON.stringify(advanced))
          }
          console.log('✅ 已从服务器加载肉鸽配置')
          return
        }
      } catch (error) {
        console.error('从服务器加载肉鸽配置失败，使用 localStorage:', error)
      }
      
      // 服务器加载失败，从 localStorage 加载
      const savedInputs = localStorage.getItem('roguelikeTaskInputs')
      const savedAdvanced = localStorage.getItem('roguelikeAdvancedParams')
      
      if (savedInputs) {
        setTaskInputs(JSON.parse(savedInputs))
      }
      if (savedAdvanced) {
        setAdvancedParams(JSON.parse(savedAdvanced))
      }
    }
    
    loadConfig()
  }, [])

  // 自动保存配置
  useEffect(() => {
    localStorage.setItem('roguelikeTaskInputs', JSON.stringify(taskInputs))
    // 同时保存到服务器
    maaApi.saveUserConfig('roguelike-tasks', { taskInputs, advancedParams }).catch(err => {
      console.error('保存肉鸽配置到服务器失败:', err)
    })
  }, [taskInputs])
  
  useEffect(() => {
    localStorage.setItem('roguelikeAdvancedParams', JSON.stringify(advancedParams))
    // 同时保存到服务器
    maaApi.saveUserConfig('roguelike-tasks', { taskInputs, advancedParams }).catch(err => {
      console.error('保存肉鸽配置到服务器失败:', err)
    })
  }, [advancedParams])

  const tasks = [
    { 
      id: 'roguelike', 
      name: '集成战略', 
      command: 'roguelike', 
      placeholder: '主题 (Phantom/Mizuki/Sami/Sarkaz/JieGarden)', 
      icon: 'Map', 
      hasAdvanced: true,
      description: '自动刷集成战略（肉鸽），支持多个主题'
    },
    { 
      id: 'reclamation', 
      name: '生息演算', 
      command: 'reclamation', 
      placeholder: '主题 (Tales)', 
      icon: 'Plant', 
      hasAdvanced: true,
      description: '自动生息演算模式'
    },
  ]

  const getAdvancedOptions = (taskId) => {
    const options = {
      roguelike: [
        { key: 'mode', label: '模式', type: 'select', param: '--mode', options: [
          { value: '0', label: '刷分模式' },
          { value: '1', label: '刷源石锭' },
          { value: '4', label: '3层后退出' },
        ]},
        { key: 'squad', label: '起始分队', type: 'text', param: '--squad', placeholder: '指挥分队' },
        { key: 'coreChar', label: '核心干员', type: 'text', param: '--core-char', placeholder: '维什戴尔' },
        { key: 'startCount', label: '运行次数', type: 'number', param: '--start-count', placeholder: '无限' },
        { key: 'useSupport', label: '使用助战', type: 'checkbox', param: '--use-support' },
        { key: 'stopAtBoss', label: '最终Boss前停止', type: 'checkbox', param: '--stop-at-final-boss' },
      ],
      reclamation: [
        { key: 'mode', label: '模式', type: 'select', param: '-m', options: [
          { value: '0', label: '刷繁荣度（无存档）' },
          { value: '1', label: '制作工具刷繁荣度' },
        ]},
        { key: 'toolsToCraft', label: '制作工具名称', type: 'text', param: '-C', placeholder: '荧光棒' },
        { key: 'numBatches', label: '批次数', type: 'number', param: '--num-craft-batches', placeholder: '16' },
      ],
    }
    return options[taskId] || []
  }

  const buildCommandParams = (task) => {
    let params = taskInputs[task.id] || ''
    
    const advanced = advancedParams[task.id] || {}
    const options = getAdvancedOptions(task.id)
    
    options.forEach(option => {
      const value = advanced[option.key]
      if (value !== undefined && value !== '' && value !== false) {
        if (option.type === 'checkbox' && value === true) {
          params += ` ${option.param}`
        } else if (option.type !== 'checkbox') {
          params += ` ${option.param} ${value}`
        }
      }
    })
    
    return params
  }

  const handleExecute = async (task) => {
    setIsRunning(true)
    setMessage('正在执行命令...')
    
    try {
      const params = buildCommandParams(task)
      const result = await maaApi.executePredefinedTask(task.command, params, null, null, task.name, 'roguelike')
      
      if (result.success) {
        setMessage(`${task.name} 执行成功`)
        console.log('执行结果:', result.data)
      } else {
        setMessage(`执行失败: ${result.error}`)
      }
    } catch (error) {
      setMessage(`网络错误: ${error.message}`)
    } finally {
      setTimeout(() => {
        setIsRunning(false)
      }, 1000)
    }
  }

  const handleInputChange = (taskId, value) => {
    setTaskInputs({ ...taskInputs, [taskId]: value })
  }

  const handleAdvancedChange = (taskId, key, value) => {
    setAdvancedParams({
      ...advancedParams,
      [taskId]: {
        ...(advancedParams[taskId] || {}),
        [key]: value
      }
    })
  }

  const renderAdvancedOptions = (task) => {
    const options = getAdvancedOptions(task.id)
    if (options.length === 0) return null
    
    const advanced = advancedParams[task.id] || {}
    
    return (
      <div className="space-y-3">
        {options.map(option => (
          <div key={option.key} className="flex items-center space-x-2">
            {option.type === 'checkbox' ? (
              <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={advanced[option.key] || false}
                  onChange={(e) => handleAdvancedChange(task.id, option.key, e.target.checked)}
                  className="custom-checkbox-fuchsia cursor-pointer"
                />
                <span className="group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{option.label}</span>
              </label>
            ) : option.type === 'select' ? (
              <div className="flex items-center space-x-2 flex-1">
                <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{option.label}:</label>
                <select
                  value={advanced[option.key] || option.options[0].value}
                  onChange={(e) => handleAdvancedChange(task.id, option.key, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-white/10 hover:border-fuchsia-400 dark:hover:border-fuchsia-500/50 rounded-xl text-sm text-gray-900 dark:text-gray-200 bg-white dark:bg-[#070707] focus:outline-none focus:ring-2 focus:ring-fuchsia-500 transition-all"
                >
                  {option.options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center space-x-2 flex-1">
                <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{option.label}:</label>
                <input
                  type={option.type}
                  value={advanced[option.key] || ''}
                  onChange={(e) => handleAdvancedChange(task.id, option.key, e.target.value)}
                  placeholder={option.placeholder}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-white/10 hover:border-fuchsia-400 dark:hover:border-fuchsia-500/50 rounded-xl text-sm text-gray-900 dark:text-gray-200 bg-white dark:bg-[#070707] focus:outline-none focus:ring-2 focus:ring-fuchsia-500 transition-all"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Icons.DiceIcon />
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              肉鸽模式
            </h2>
            <p className="text-gray-600 dark:text-gray-500 text-sm hidden sm:block">集成战略和生息演算 - 所有修改自动保存</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {message && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`px-4 py-2 rounded-xl text-sm font-medium border flex items-center space-x-2 ${
                message.includes('成功') || message.includes('已保存')
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30' 
                  : message.includes('正在') || message.includes('执行中')
                    ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-300 dark:border-sky-500/30' 
                    : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-500/30'
              }`}
            >
              {(message.includes('成功') || message.includes('已保存')) ? (
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (message.includes('正在') || message.includes('执行中')) ? (
                <svg className="w-4 h-4 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span>{message.replace(/[✅❌⏳⚠️]\s*/g, '')}</span>
            </motion.div>
          )}
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-900/60 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-200 dark:border-white/10 shadow-sm text-xs">
            <motion.div 
              className={`w-2 h-2 rounded-full flex-shrink-0 ${isRunning ? 'bg-fuchsia-400' : 'bg-gray-600 dark:bg-gray-600'}`}
              animate={isRunning ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <div className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">
              {isRunning ? '运行中' : '就绪'}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl p-5 border border-amber-300 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5">
        <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-3 flex items-center space-x-2">
          <span>💡</span>
          <span>使用说明</span>
        </h3>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5">
          <li>• <strong className="text-gray-800 dark:text-gray-300">集成战略</strong>：支持 Phantom（傀影）、Mizuki（水月）、Sami（萨米）、Sarkaz（萨卡兹）、JieGarden（界园）</li>
          <li>• <strong className="text-gray-800 dark:text-gray-300">生息演算</strong>：支持 Tales（沙中之火）主题</li>
          <li>• 可以设置刷分模式或刷源石锭模式</li>
          <li>• 点击"高级选项"可以配置起始分队、核心干员、运行次数等</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tasks.map((task) => {
          const IconComponent = Icons[task.icon]
          
          return (
            <div 
              key={task.id} 
              className="rounded-3xl p-6 border border-gray-200 dark:border-white/10 hover:border-purple-400 dark:hover:border-purple-500/30 transition-all bg-white dark:bg-gray-900/60"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {IconComponent && <IconComponent />}
                  <h4 className="font-bold text-gray-900 dark:text-white text-xl">{task.name}</h4>
                  <span className="text-xs text-gray-500 dark:text-gray-500 px-3 py-1.5 rounded-full font-mono border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800/60">{task.command}</span>
                </div>
                
                <button
                  onClick={() => handleExecute(task)}
                  disabled={isRunning}
                  className="flex items-center space-x-2 px-4 sm:px-6 py-1.5 sm:py-2.5 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white rounded-xl text-xs sm:text-sm font-bold hover:from-purple-600 hover:to-fuchsia-600 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 disabled:shadow-none"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                  <span>立即执行</span>
                </button>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-5 leading-relaxed">{task.description}</p>
              
              <input
                type="text"
                placeholder={task.placeholder}
                value={taskInputs[task.id] || ''}
                onChange={(e) => handleInputChange(task.id, e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-white/10 rounded-2xl text-sm mb-5 font-medium text-gray-900 dark:text-gray-200 bg-white dark:bg-[#070707] focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition-all"
              />
              
              {task.hasAdvanced && (
                <div className="rounded-2xl p-4 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800/40">
                  <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">高级选项</h5>
                  {renderAdvancedOptions(task)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
