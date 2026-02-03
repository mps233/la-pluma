import { useState, useEffect } from 'react'
import { maaApi } from '../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import Icons from './Icons'

export default function CombatTasks() {
  const [isRunning, setIsRunning] = useState(false)
  const [taskInputs, setTaskInputs] = useState({})
  const [message, setMessage] = useState('')
  const [copilotSetInfo, setCopilotSetInfo] = useState(null)
  const [isLoadingSet, setIsLoadingSet] = useState(false)
  const [advancedParams, setAdvancedParams] = useState({})
  const [autoFormation, setAutoFormation] = useState({ copilot: true, paradoxcopilot: true })

  // 页面加载时从服务器或 localStorage 加载配置和恢复执行状态
  useEffect(() => {
    // 从后端获取真实的任务执行状态
    const checkBackendStatus = async () => {
      try {
        const result = await maaApi.getTaskStatus()
        if (result.success && result.data.isRunning) {
          // 后端确实有任务在运行
          const { taskName, startTime, taskType } = result.data
          
          // 只恢复属于自动战斗的任务
          if (taskType === 'combat') {
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
        const serverConfig = await maaApi.loadUserConfig('combat-tasks')
        if (serverConfig.success && serverConfig.data) {
          const { taskInputs: inputs, advancedParams: advanced, autoFormation: formation } = serverConfig.data
          if (inputs) {
            setTaskInputs(inputs)
            localStorage.setItem('combatTaskInputs', JSON.stringify(inputs))
          }
          if (advanced) {
            setAdvancedParams(advanced)
            localStorage.setItem('combatAdvancedParams', JSON.stringify(advanced))
          }
          if (formation) {
            setAutoFormation(formation)
            localStorage.setItem('combatAutoFormation', JSON.stringify(formation))
          }
          console.log('✅ 已从服务器加载战斗配置')
          return
        }
      } catch (error) {
        console.error('从服务器加载战斗配置失败，使用 localStorage:', error)
      }
      
      // 服务器加载失败，从 localStorage 加载
      const savedInputs = localStorage.getItem('combatTaskInputs')
      const savedAdvanced = localStorage.getItem('combatAdvancedParams')
      const savedFormation = localStorage.getItem('combatAutoFormation')
      
      if (savedInputs) {
        setTaskInputs(JSON.parse(savedInputs))
      }
      if (savedAdvanced) {
        setAdvancedParams(JSON.parse(savedAdvanced))
      }
      if (savedFormation) {
        setAutoFormation(JSON.parse(savedFormation))
      }
    }
    
    loadConfig()
  }, [])
  
  // 自动保存配置
  useEffect(() => {
    localStorage.setItem('combatTaskInputs', JSON.stringify(taskInputs))
    // 同时保存到服务器
    maaApi.saveUserConfig('combat-tasks', { taskInputs, advancedParams, autoFormation }).catch(err => {
      console.error('保存战斗配置到服务器失败:', err)
    })
  }, [taskInputs])
  
  useEffect(() => {
    localStorage.setItem('combatAdvancedParams', JSON.stringify(advancedParams))
    // 同时保存到服务器
    maaApi.saveUserConfig('combat-tasks', { taskInputs, advancedParams, autoFormation }).catch(err => {
      console.error('保存战斗配置到服务器失败:', err)
    })
  }, [advancedParams])
  
  useEffect(() => {
    localStorage.setItem('combatAutoFormation', JSON.stringify(autoFormation))
    // 同时保存到服务器
    maaApi.saveUserConfig('combat-tasks', { taskInputs, advancedParams, autoFormation }).catch(err => {
      console.error('保存战斗配置到服务器失败:', err)
    })
  }, [autoFormation])
  
  // 手动清除执行状态（任务完成后）
  const handleClearExecutionState = () => {
    setIsRunning(false)
    setMessage('')
    localStorage.removeItem('combat-execution-state')
  }

  const tasks = [
    { 
      id: 'copilot', 
      name: '自动抄作业', 
      command: 'copilot', 
      placeholder: 'maa://1234 或本地文件路径', 
      icon: <Icons.Document />, 
      hasAdvanced: true,
      description: '使用作业自动完成关卡，支持单个作业和作业集'
    },
    { 
      id: 'ssscopilot', 
      name: '保全派驻', 
      command: 'ssscopilot', 
      placeholder: 'maa://1234 或本地文件路径', 
      icon: <Icons.Shield />, 
      hasAdvanced: true,
      description: '自动保全派驻作业'
    },
    { 
      id: 'paradoxcopilot', 
      name: '悖论模拟', 
      command: 'paradoxcopilot', 
      placeholder: 'maa://1234 或本地文件路径', 
      icon: <Icons.Puzzle />, 
      description: '自动悖论模拟作业'
    },
  ]

  const getAdvancedOptions = (taskId) => {
    const options = {
      copilot: [
        { key: 'ignoreRequirements', label: '忽略干员要求', type: 'checkbox', param: '--ignore-requirements' },
        { key: 'formationIndex', label: '编队选择', type: 'select', param: '--formation-index', options: [
          { value: '', label: '当前编队' },
          { value: '1', label: '编队 1' },
          { value: '2', label: '编队 2' },
          { value: '3', label: '编队 3' },
          { value: '4', label: '编队 4' },
        ]},
        { key: 'addTrust', label: '按信赖值填充空位', type: 'checkbox', param: '--add-trust' },
        { key: 'useSanityPotion', label: '理智不足时使用理智药', type: 'checkbox', param: '--use-sanity-potion' },
        { key: 'supportUsage', label: '助战使用模式', type: 'select', param: '--support-unit-usage', options: [
          { value: '0', label: '不使用助战' },
          { value: '1', label: '缺一个时使用' },
          { value: '2', label: '使用指定助战' },
          { value: '3', label: '使用随机助战' },
        ]},
        { key: 'supportName', label: '助战干员名称', type: 'text', param: '--support-unit-name', placeholder: '干员名称' },
      ],
      ssscopilot: [
        { key: 'loopTimes', label: '循环次数', type: 'number', param: '--loop-times', placeholder: '1' },
      ],
    }
    return options[taskId] || []
  }

  const buildCommandParams = (task) => {
    let params = taskInputs[task.id] || ''
    
    // 处理多行输入
    if ((task.id === 'copilot' || task.id === 'paradoxcopilot') && params.includes('\n')) {
      const uris = params.split('\n').filter(line => line.trim())
      params = uris.join(' ')
    }
    
    // 作业集自动添加 s 后缀
    if (task.id === 'copilot' && copilotSetInfo?.type === 'set' && copilotSetInfo?.autoAddS) {
      params = params.replace(/maa:\/\/(\d+)(?!s)/g, 'maa://$1s')
    }
    
    // copilot 任务根据开关决定是否添加 --formation
    if ((task.id === 'copilot' || task.id === 'paradoxcopilot') && autoFormation[task.id]) {
      params = params ? `${params} --formation` : '--formation'
    }
    
    // 添加高级参数
    const advanced = advancedParams[task.id] || {}
    const options = getAdvancedOptions(task.id)
    
    // 先处理突袭模式（如果有）
    if (task.id === 'copilot' && advanced.raid !== undefined && advanced.raid !== '0') {
      params += ` --raid ${advanced.raid}`
    }
    
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
    setMessage(`正在执行: ${task.name}`)
    
    try {
      const params = buildCommandParams(task)
      const result = await maaApi.executePredefinedTask(task.command, params, null, null, task.name, 'combat')
      
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
    if (taskId === 'copilot') {
      setCopilotSetInfo(null)
    }
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

  const handlePreviewCopilotSet = async () => {
    const input = taskInputs['copilot'] || ''
    const match = input.trim().match(/^maa:\/\/(\d+)(s?)$/)
    
    if (!match) {
      setMessage('❌ 请输入有效的作业 URI（如: maa://26766）')
      return
    }
    
    const copilotId = match[1]
    const hasS = match[2] === 's'
    setIsLoadingSet(true)
    setMessage('⏳ 正在获取作业信息...')
    
    try {
      const copilotResponse = await fetch(`https://prts.maa.plus/copilot/get/${copilotId}`)
      
      if (copilotResponse.ok) {
        const copilotData = await copilotResponse.json()
        if (copilotData.status_code === 200 && copilotData.data) {
          const content = JSON.parse(copilotData.data.content)
          setCopilotSetInfo({
            type: 'single',
            id: copilotId,
            name: content.doc?.title || '未命名作业',
            stage: content.stage_name,
            operators: content.opers?.map(op => op.name).join('、') || '未知'
          })
          setMessage(`✅ 找到作业：${content.doc?.title || content.stage_name}`)
        } else if (copilotData.status_code === 404) {
          setCopilotSetInfo({
            type: 'set',
            id: copilotId,
            name: '作业集',
            note: '这是一个作业集，包含多个关卡。执行时会自动添加 "s" 后缀。',
            autoAddS: !hasS
          })
          setMessage(`✅ 识别为作业集 ID: ${copilotId}${!hasS ? '（将自动添加 s 后缀）' : ''}`)
        } else {
          setMessage('❌ 作业不存在')
        }
      } else {
        setCopilotSetInfo({
          type: 'set',
          id: copilotId,
          name: '作业集',
          note: '这是一个作业集，包含多个关卡。执行时会自动添加 "s" 后缀。',
          autoAddS: !hasS
        })
        setMessage(`✅ 识别为作业集 ID: ${copilotId}${!hasS ? '（将自动添加 s 后缀）' : ''}`)
      }
    } catch (error) {
      setMessage(`❌ 网络错误: ${error.message}`)
    } finally {
      setIsLoadingSet(false)
    }
  }

  const renderAdvancedOptions = (task) => {
    const options = getAdvancedOptions(task.id)
    if (options.length === 0) return null
    
    const advanced = advancedParams[task.id] || {}
    
    return (
      <motion.div 
        className="mt-4 space-y-3 border-t border-gray-200 dark:border-white/10 pt-4"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        transition={{ duration: 0.3 }}
      >
        {options.map(option => (
          <div key={option.key} className="flex items-center space-x-2">
            {option.type === 'checkbox' ? (
              <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={advanced[option.key] || false}
                  onChange={(e) => handleAdvancedChange(task.id, option.key, e.target.checked)}
                  className="custom-checkbox-emerald cursor-pointer"
                />
                <span className="group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{option.label}</span>
              </label>
            ) : option.type === 'select' ? (
              <div className="flex items-center space-x-2 flex-1">
                <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{option.label}:</label>
                <select
                  value={advanced[option.key] || option.options[0].value}
                  onChange={(e) => handleAdvancedChange(task.id, option.key, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-white/10 hover:border-emerald-400 dark:hover:border-emerald-500/50 rounded-xl text-sm text-gray-900 dark:text-gray-200 bg-white dark:bg-[#070707] focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
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
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-white/10 hover:border-emerald-400 dark:hover:border-emerald-500/50 rounded-xl text-sm text-gray-900 dark:text-gray-200 bg-white dark:bg-[#070707] focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>
            )}
          </div>
        ))}
      </motion.div>
    )
  }

  return (
    <>
      <div className="p-6 space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Icons.TargetIcon />
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent">
                自动战斗
              </h2>
              <p className="text-gray-600 dark:text-gray-500 text-sm hidden sm:block">使用作业自动完成关卡 - 所有修改自动保存</p>
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
                  message.includes('成功') || message.includes('已保存') || message.includes('找到') || message.includes('识别为')
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30' 
                    : message.includes('正在') || message.includes('执行中') || message.includes('可能')
                      ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-300 dark:border-sky-500/30' 
                      : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-500/30'
                }`}
              >
                {(message.includes('成功') || message.includes('已保存') || message.includes('找到') || message.includes('识别为')) ? (
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (message.includes('正在') || message.includes('执行中') || message.includes('可能')) ? (
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
            {/* 清除状态按钮 - 当检测到恢复的执行状态时显示 */}
            {isRunning && message.includes('可能') && (
              <motion.button
                onClick={handleClearExecutionState}
                className="px-3 py-2 rounded-xl text-sm font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-all flex items-center space-x-1.5"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>确认完成</span>
              </motion.button>
            )}
            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-900/60 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-200 dark:border-white/10 shadow-sm text-xs">
              <motion.div 
                className={`w-2 h-2 rounded-full flex-shrink-0 ${isRunning ? 'bg-emerald-400' : 'bg-gray-600 dark:bg-gray-600'}`}
                animate={isRunning ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <div className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                {isRunning ? '运行中' : '就绪'}
              </div>
            </div>
          </div>
        </div>

        {/* 使用提示 */}
        {/* 任务列表 */}
        <div className="space-y-6">
          {/* 自动抄作业 - 单独一行 */}
          {tasks.filter(task => task.id === 'copilot').map((task) => {
            return (
              <div 
                key={task.id} 
                className="rounded-3xl p-6 border border-gray-200 dark:border-white/10 hover:border-emerald-400 dark:hover:border-emerald-500/30 transition-all bg-white dark:bg-gray-900/60"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {task.icon}
                    <h4 className="font-bold text-gray-900 dark:text-white text-xl">{task.name}</h4>
                    <span className="text-xs text-gray-500 dark:text-gray-500 px-3 py-1.5 rounded-full font-mono border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800/60">{task.command}</span>
                  </div>
                  
                  {/* 执行按钮 - 右上角 */}
                  <button
                    onClick={() => handleExecute(task)}
                    disabled={isRunning}
                    className="flex items-center space-x-2 px-4 sm:px-6 py-1.5 sm:py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-xs sm:text-sm font-bold hover:from-emerald-600 hover:to-teal-600 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 disabled:shadow-none"
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                    <span>立即执行</span>
                  </button>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-5 leading-relaxed">{task.description}</p>
              
                {/* 左右布局 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-5">
                  {/* 左侧：输入区域 */}
                  <div className="space-y-3">
                    <div className="flex flex-col space-y-3">
                      <textarea
                        placeholder={task.placeholder + '\n支持多行，每行一个作业 URI'}
                        value={taskInputs[task.id] || ''}
                        onChange={(e) => handleInputChange(task.id, e.target.value)}
                        rows="3"
                        className="flex-1 px-4 py-3 border border-gray-300 dark:border-white/10 rounded-2xl text-sm font-medium text-gray-900 dark:text-gray-200 bg-white dark:bg-[#070707] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none font-mono transition-all"
                      />
                      <motion.button
                        onClick={handlePreviewCopilotSet}
                        disabled={isLoadingSet || !taskInputs[task.id]?.trim()}
                        className="w-full px-5 py-3 backdrop-blur-sm text-gray-700 dark:text-gray-200 rounded-2xl text-sm font-medium hover:shadow-[0_4px_12px_rgb(0,0,0,0.2)] disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800/60"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {isLoadingSet ? '⏳ 加载中' : '🔍 预览'}
                      </motion.button>
                    </div>
                    
                    {copilotSetInfo && (
                      <motion.div 
                        className="backdrop-blur-sm rounded-2xl p-4 border border-sky-300 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/5"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-xs font-semibold text-sky-700 dark:text-sky-400">
                                {copilotSetInfo.type === 'set' ? '📋 作业集' : '📄 单个作业'}
                              </span>
                              <span className="text-xs text-sky-600 dark:text-sky-300">ID: {copilotSetInfo.id}</span>
                            </div>
                            <p className="text-sm font-medium text-sky-800 dark:text-sky-200">{copilotSetInfo.name}</p>
                            {copilotSetInfo.type === 'set' && copilotSetInfo.note && (
                              <p className="text-xs text-sky-700 dark:text-sky-400 mt-1.5">{copilotSetInfo.note}</p>
                            )}
                            {copilotSetInfo.type === 'single' && (
                              <div className="text-xs text-sky-700 dark:text-sky-400 mt-1.5 space-y-0.5">
                                {copilotSetInfo.stage && <p>关卡: {copilotSetInfo.stage}</p>}
                                {copilotSetInfo.operators && <p>干员: {copilotSetInfo.operators}</p>}
                              </div>
                            )}
                          </div>
                          <motion.button
                            onClick={() => setCopilotSetInfo(null)}
                            className="text-sky-700 dark:text-sky-400 hover:text-sky-600 dark:hover:text-sky-300 text-sm"
                            whileHover={{ scale: 1.1, rotate: 90 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            ✕
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                    
                    {/* 使用说明 */}
                    <div className="rounded-2xl p-4 border border-amber-300 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5">
                      <h3 className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center space-x-1.5">
                        <Icons.Lightbulb />
                        <span>使用说明</span>
                      </h3>
                      <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        <li>• 访问 <a href="https://zoot.plus/" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline transition-colors">zoot.plus</a> 获取作业 URI</li>
                        <li>• <strong className="text-gray-800 dark:text-gray-300">单个作业</strong>：maa://1234</li>
                        <li>• <strong className="text-gray-800 dark:text-gray-300">作业集</strong>：maa://1234s</li>
                        <li>• 支持多行输入，每行一个 URI</li>
                        <li>• 点击"预览"查看作业信息</li>
                      </ul>
                    </div>
                  </div>

                  {/* 右侧：选项和高级选项 */}
                  <div className="space-y-4">
                    {/* 基础选项 */}
                    <div className="rounded-2xl p-4 border border-gray-200 dark:border-white/10 space-y-3 bg-gray-50 dark:bg-gray-800/40">
                      {/* 自动编队 */}
                      <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={autoFormation[task.id] !== false}
                          onChange={(e) => setAutoFormation({ ...autoFormation, [task.id]: e.target.checked })}
                          className="custom-checkbox-emerald cursor-pointer"
                        />
                        <span className="group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">自动编队</span>
                      </label>
                      
                      {/* 突袭模式 */}
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap flex items-center space-x-1.5">
                          <Icons.Swords />
                          <span>突袭模式:</span>
                        </label>
                        <select
                          value={advancedParams[task.id]?.raid || '0'}
                          onChange={(e) => handleAdvancedChange(task.id, 'raid', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-white/10 hover:border-emerald-400 dark:hover:border-emerald-500/50 rounded-xl text-sm text-gray-900 dark:text-gray-200 bg-white dark:bg-[#070707] focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                        >
                          <option value="0">普通模式</option>
                          <option value="1">突袭模式</option>
                          <option value="2">两次（普通+突袭）</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* 高级选项 */}
                    {task.hasAdvanced && (
                      <div className="rounded-2xl p-4 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800/40">
                        <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">高级选项</h5>
                        {renderAdvancedOptions(task)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* 保全派驻和悖论模拟 - 两个卡片在一行 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {tasks.filter(task => task.id !== 'copilot').map((task) => {
              return (
                <div 
                  key={task.id} 
                  className="rounded-3xl p-6 border border-gray-200 dark:border-white/10 hover:border-emerald-400 dark:hover:border-emerald-500/30 transition-all bg-white dark:bg-gray-900/60"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {task.icon}
                      <h4 className="font-bold text-gray-900 dark:text-white text-xl">{task.name}</h4>
                      <span className="text-xs text-gray-500 dark:text-gray-500 px-3 py-1.5 rounded-full font-mono border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800/60">{task.command}</span>
                    </div>
                    
                    {/* 执行按钮 - 右上角 */}
                    <button
                      onClick={() => handleExecute(task)}
                      disabled={isRunning}
                      className="flex items-center space-x-2 px-4 sm:px-5 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-xs sm:text-sm font-bold hover:from-emerald-600 hover:to-teal-600 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 disabled:shadow-none"
                    >
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                      <span>立即执行</span>
                    </button>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-5 leading-relaxed">{task.description}</p>
                
                  {/* 左右布局 */}
                  <div className="grid grid-cols-1 gap-4 mb-5">
                    {/* 输入区域 */}
                    <textarea
                      placeholder={task.placeholder + '\n支持多行，每行一个作业 URI'}
                      value={taskInputs[task.id] || ''}
                      onChange={(e) => handleInputChange(task.id, e.target.value)}
                      rows="2"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-white/10 rounded-2xl text-sm font-medium text-gray-900 dark:text-gray-200 bg-white dark:bg-[#070707] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none font-mono transition-all"
                    />
                    
                    {/* 选项区域 */}
                    <div className="space-y-3">
                      {/* 自动编队选项 - 仅悖论模拟显示 */}
                      {task.id === 'paradoxcopilot' && (
                        <div className="rounded-2xl p-3 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800/40">
                          <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={autoFormation[task.id] !== false}
                              onChange={(e) => setAutoFormation({ ...autoFormation, [task.id]: e.target.checked })}
                              className="custom-checkbox-emerald cursor-pointer"
                            />
                            <span className="group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">自动编队</span>
                          </label>
                        </div>
                      )}
                      
                      {/* 高级选项 */}
                      {task.hasAdvanced && (
                        <div className="rounded-2xl p-3 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800/40">
                          <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">高级选项</h5>
                          {renderAdvancedOptions(task)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
