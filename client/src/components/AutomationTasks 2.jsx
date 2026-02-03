import { useState, useEffect } from 'react'
import { maaApi } from '../services/api'

export default function AutomationTasks() {
  const [isRunning, setIsRunning] = useState(false)
  const [message, setMessage] = useState('')
  const [taskFlow, setTaskFlow] = useState([])
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduleTimes, setScheduleTimes] = useState(['08:00', '14:00', '20:00'])
  const [currentStep, setCurrentStep] = useState(-1)

  // 可用的任务列表
  const availableTasks = [
    { 
      id: 'startup', 
      name: '启动游戏', 
      icon: '▶️',
      description: '启动游戏并进入主界面',
      defaultParams: { clientType: 'Official' },
      paramFields: [
        { key: 'clientType', label: '客户端类型', type: 'select', options: [
          'Official', 'Bilibili', 'YoStarEN', 'YoStarJP', 'YoStarKR', 'Txwy'
        ]}
      ]
    },
    { 
      id: 'fight', 
      name: '理智作战', 
      icon: '⚔️',
      description: '自动刷关卡消耗理智',
      defaultParams: { stage: '1-7', medicine: 0, stone: 0 },
      paramFields: [
        { key: 'stage', label: '关卡', type: 'text', placeholder: '1-7' },
        { key: 'medicine', label: '理智药', type: 'number', placeholder: '0' },
        { key: 'stone', label: '源石', type: 'number', placeholder: '0' },
        { key: 'times', label: '次数', type: 'number', placeholder: '无限' },
      ]
    },
    { 
      id: 'infrast', 
      name: '基建换班', 
      icon: '🏭',
      description: '自动基建换班收菜',
      defaultParams: { 
        mode: '0',
        facility: ['Mfg', 'Trade', 'Power', 'Control', 'Reception', 'Office', 'Dorm'],
        drones: 'Money',
        threshold: '0.3',
        replenish: false
      },
      paramFields: [
        { key: 'mode', label: '换班模式', type: 'select', options: [
          { value: '0', label: '默认换班' },
          { value: '10000', label: '自定义换班' }
        ]},
        { key: 'facility', label: '设施选择', type: 'facility-select', helper: '选择要换班的设施' },
        { key: 'drones', label: '无人机用途', type: 'select', options: [
          { value: 'Money', label: '龙门币' },
          { value: 'SyntheticJade', label: '合成玉' },
          { value: 'CombatRecord', label: '作战记录' },
          { value: 'PureGold', label: '赤金' },
          { value: 'OriginStone', label: '源石碎片' },
          { value: 'Chip', label: '芯片' }
        ]},
        { key: 'threshold', label: '心情阈值', type: 'number', placeholder: '0.3', step: '0.1', min: '0', max: '1' },
        { key: 'replenish', label: '自动补货', type: 'checkbox' },
      ],
      taskType: 'Infrast'
    },
    { 
      id: 'recruit', 
      name: '自动公招', 
      icon: '👥',
      description: '自动公开招募',
      defaultParams: {
        refresh: true,
        select: [4, 5, 6],
        confirm: [3, 4],
        times: 4,
        set_time: true,
        expedite: false,
        expedite_times: 0,
        skip_robot: true
      },
      paramFields: [
        { key: 'refresh', label: '刷新标签', type: 'checkbox' },
        { key: 'select', label: '招募星级', type: 'star-select', helper: '选择要招募的干员星级' },
        { key: 'confirm', label: '确认星级', type: 'star-select', helper: '选择招募完成后自动确认的干员星级' },
        { key: 'times', label: '招募次数', type: 'number', placeholder: '4' },
        { key: 'set_time', label: '设置时间', type: 'checkbox' },
        { key: 'expedite', label: '使用加急', type: 'checkbox' },
        { key: 'expedite_times', label: '加急次数', type: 'number', placeholder: '0' },
        { key: 'skip_robot', label: '跳过小车', type: 'checkbox' },
      ],
      taskType: 'Recruit'
    },
    { 
      id: 'mall', 
      name: '信用收支', 
      icon: '💰',
      description: '访问好友、收取信用',
      defaultParams: {
        shopping: true,
        buy_first: '',
        blacklist: '',
        force_shopping_if_credit_full: false
      },
      paramFields: [
        { key: 'shopping', label: '自动购物', type: 'checkbox' },
        { key: 'buy_first', label: '优先购买', type: 'text', placeholder: '招聘许可,龙门币（逗号分隔）' },
        { key: 'blacklist', label: '黑名单', type: 'text', placeholder: '家具,碳（逗号分隔）' },
        { key: 'force_shopping_if_credit_full', label: '信用满强制购物', type: 'checkbox' },
      ],
      taskType: 'Mall'
    },
    { 
      id: 'award', 
      name: '领取奖励', 
      icon: '🎁',
      description: '领取每日/每周奖励',
      defaultParams: {
        award: true,
        mail: true,
        recruit: false,
        orundum: false,
        mining: false,
        specialaccess: false
      },
      paramFields: [
        { key: 'award', label: '每日奖励', type: 'checkbox' },
        { key: 'mail', label: '邮件奖励', type: 'checkbox' },
        { key: 'recruit', label: '公招奖励', type: 'checkbox' },
        { key: 'orundum', label: '合成玉奖励', type: 'checkbox' },
        { key: 'mining', label: '采矿奖励', type: 'checkbox' },
        { key: 'specialaccess', label: '特别通行证', type: 'checkbox' },
      ],
      taskType: 'Award'
    },
    { 
      id: 'closedown', 
      name: '关闭游戏', 
      icon: '⏹️',
      description: '关闭游戏客户端',
      defaultParams: { clientType: 'Official' },
      paramFields: [
        { key: 'clientType', label: '客户端类型', type: 'select', options: [
          'Official', 'Bilibili', 'YoStarEN', 'YoStarJP', 'YoStarKR', 'Txwy'
        ]}
      ]
    },
  ]

  const addTaskToFlow = (task) => {
    setTaskFlow([...taskFlow, {
      ...task,
      params: { ...task.defaultParams },
      enabled: true,
      id: `${task.id}-${Date.now()}`
    }])
  }

  const removeTaskFromFlow = (index) => {
    setTaskFlow(taskFlow.filter((_, i) => i !== index))
  }

  const toggleTaskEnabled = (index) => {
    const newFlow = [...taskFlow]
    newFlow[index].enabled = !newFlow[index].enabled
    setTaskFlow(newFlow)
  }

  const moveTask = (index, direction) => {
    if (direction === 'up' && index > 0) {
      const newFlow = [...taskFlow]
      ;[newFlow[index - 1], newFlow[index]] = [newFlow[index], newFlow[index - 1]]
      setTaskFlow(newFlow)
    } else if (direction === 'down' && index < taskFlow.length - 1) {
      const newFlow = [...taskFlow]
      ;[newFlow[index], newFlow[index + 1]] = [newFlow[index + 1], newFlow[index]]
      setTaskFlow(newFlow)
    }
  }

  const updateTaskParam = (index, key, value) => {
    const newFlow = [...taskFlow]
    newFlow[index].params[key] = value
    setTaskFlow(newFlow)
  }

  const buildCommand = (task) => {
    // 对于 MaaCore 内置任务类型，需要生成 TOML 格式的自定义任务
    if (task.taskType) {
      // 构建任务参数
      const params = task.params || {}
      const taskConfig = {
        name: task.name,
        type: task.taskType,
        params: {}
      }
      
      // 处理不同类型的参数
      Object.keys(params).forEach(key => {
        const value = params[key]
        if (value === undefined || value === '' || value === null) return
        
        // 处理布尔值
        if (typeof value === 'boolean') {
          taskConfig.params[key] = value
        }
        // 处理数组（如星级选择 [4,5,6]）
        else if (Array.isArray(value)) {
          if (value.length > 0) {
            taskConfig.params[key] = value
          }
        }
        // 处理数组字符串（如 "[4,5,6]"）- 保持原样传给后端
        else if (typeof value === 'string' && value.trim().startsWith('[') && value.trim().endsWith(']')) {
          taskConfig.params[key] = value.trim()
        }
        // 处理逗号分隔的列表（如 "招聘许可,龙门币"）
        else if (typeof value === 'string' && value.includes(',') && !value.includes('[')) {
          taskConfig.params[key] = value.split(',').map(v => v.trim()).filter(v => v)
        }
        // 处理数字
        else if (typeof value === 'number') {
          taskConfig.params[key] = value
        }
        else if (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '') {
          taskConfig.params[key] = Number(value)
        }
        // 处理普通字符串
        else if (value) {
          taskConfig.params[key] = value
        }
      })
      
      console.log('构建任务配置:', taskConfig)
      
      // 将任务配置转换为 JSON 字符串传递给后端
      // 后端需要将其转换为 TOML 格式并保存到临时文件
      return { 
        command: 'run', 
        params: task.id,
        taskConfig: JSON.stringify(taskConfig)
      }
    }

    // 对于预定义命令
    let params = ''
    if (task.id === 'startup' || task.id === 'closedown') {
      params = task.params.clientType || 'Official'
    } else if (task.id === 'fight') {
      params = task.params.stage || ''
      if (task.params.medicine) params += ` -m ${task.params.medicine}`
      if (task.params.stone) params += ` --stone ${task.params.stone}`
      if (task.params.times) params += ` --times ${task.params.times}`
    }
    
    return { command: task.id, params }
  }

  const executeTaskFlow = async () => {
    setIsRunning(true)
    setCurrentStep(0)
    setMessage('⏳ 开始执行任务流程...')

    const enabledTasks = taskFlow.filter(t => t.enabled)
    
    for (let i = 0; i < enabledTasks.length; i++) {
      const task = enabledTasks[i]
      setCurrentStep(i)
      setMessage(`⏳ 正在执行: ${task.name} (${i + 1}/${enabledTasks.length})`)

      try {
        const { command, params, taskConfig } = buildCommand(task)
        const result = await maaApi.executePredefinedTask(command, params, taskConfig)
        
        if (!result.success) {
          setMessage(`❌ ${task.name} 执行失败: ${result.error}`)
          setIsRunning(false)
          setCurrentStep(-1)
          return
        }
        
        // 等待一小段时间再执行下一个任务
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        setMessage(`❌ ${task.name} 网络错误: ${error.message}`)
        setIsRunning(false)
        setCurrentStep(-1)
        return
      }
    }

    setMessage(`✅ 所有任务执行完成！共执行 ${enabledTasks.length} 个任务`)
    setIsRunning(false)
    setCurrentStep(-1)
  }

  const saveTaskFlow = () => {
    localStorage.setItem('maa-task-flow', JSON.stringify(taskFlow))
    localStorage.setItem('maa-schedule', JSON.stringify({ enabled: scheduleEnabled, times: scheduleTimes }))
    setMessage('✅ 任务流程已保存')
    setTimeout(() => setMessage(''), 2000)
  }

  const loadTaskFlow = () => {
    const saved = localStorage.getItem('maa-task-flow')
    const schedule = localStorage.getItem('maa-schedule')
    if (saved) {
      setTaskFlow(JSON.parse(saved))
    }
    if (schedule) {
      const { enabled, times } = JSON.parse(schedule)
      setScheduleEnabled(enabled)
      if (times && Array.isArray(times)) {
        setScheduleTimes(times)
      }
    }
  }

  const updateScheduleTime = (index, value) => {
    const newTimes = [...scheduleTimes]
    newTimes[index] = value
    setScheduleTimes(newTimes)
  }

  // 组件加载时读取保存的任务流程
  useEffect(() => {
    loadTaskFlow()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 消息提示 */}
        {message && (
          <div className={`rounded-xl p-4 shadow-lg backdrop-blur-sm animate-in slide-in-from-top duration-300 ${
            message.includes('✅') 
              ? 'bg-emerald-50/90 text-emerald-800 border-2 border-emerald-200' 
              : message.includes('⏳') 
                ? 'bg-blue-50/90 text-blue-800 border-2 border-blue-200' 
                : 'bg-rose-50/90 text-rose-800 border-2 border-rose-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-medium">{message}</span>
              <button 
                onClick={() => setMessage('')} 
                className="text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-full p-1 transition-all"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* 页面标题 */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/10"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold flex items-center space-x-3 mb-2">
                <span className="text-4xl">🤖</span>
                <span>自动化任务流程</span>
              </h2>
              <p className="text-blue-100 text-lg">编排日常任务流程，一键执行或定时运行</p>
            </div>
            <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-md rounded-xl px-6 py-3 border border-white/20">
              <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50' : 'bg-white/50'}`}></div>
              <div className="text-right">
                <div className="text-sm text-blue-100">状态</div>
                <div className="text-lg font-bold">
                  {isRunning ? `${currentStep + 1}/${taskFlow.filter(t => t.enabled).length}` : '就绪'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-5 shadow-lg">
          <h3 className="text-sm font-bold text-amber-900 mb-3 flex items-center space-x-2">
            <span className="text-xl">💡</span>
            <span>使用说明</span>
          </h3>
          <ul className="text-sm text-amber-800 space-y-2">
            <li className="flex items-start space-x-2">
              <span className="text-amber-600 font-bold">•</span>
              <span>从左侧选择任务添加到流程中，可以添加多个相同任务</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-amber-600 font-bold">•</span>
              <span>使用 ↑↓ 按钮调整任务执行顺序</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-amber-600 font-bold">•</span>
              <span>勾选任务启用/禁用，未勾选的任务不会执行</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-amber-600 font-bold">•</span>
              <span>点击"立即执行"按顺序运行所有已启用的任务</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-amber-600 font-bold">•</span>
              <span>可以设置定时执行（功能开发中）</span>
            </li>
          </ul>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：可用任务列表 */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200/50">
              <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center space-x-2">
                <span className="text-2xl">📦</span>
                <span>可用任务</span>
              </h3>
              <div className="space-y-3">
                {availableTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => addTaskToFlow(task)}
                    disabled={isRunning}
                    className="w-full text-left p-4 bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl group-hover:scale-110 transition-transform">{task.icon}</span>
                      <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{task.name}</span>
                      {task.taskType && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">{task.taskType}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 ml-9">{task.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧：任务流程 */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200/50">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                  <span className="text-2xl">📋</span>
                  <span>任务流程</span>
                  <span className="text-sm text-gray-500 font-normal bg-gray-100 px-3 py-1 rounded-full">
                    {taskFlow.filter(t => t.enabled).length}/{taskFlow.length} 已启用
                  </span>
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={saveTaskFlow}
                    disabled={isRunning}
                    className="px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:from-gray-200 hover:to-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
                  >
                    💾 保存
                  </button>
                  <button
                    onClick={loadTaskFlow}
                    disabled={isRunning}
                    className="px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:from-gray-200 hover:to-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
                  >
                    📂 加载
                  </button>
                </div>
              </div>

              {taskFlow.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-6xl mb-4 animate-bounce">👈</div>
                  <p className="text-lg font-medium">从左侧选择任务添加到流程中</p>
                  <p className="text-sm mt-2">开始构建你的自动化工作流</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {taskFlow.map((task, index) => (
                    <div
                      key={task.id}
                      className={`border-2 rounded-xl p-5 transition-all duration-300 ${
                        currentStep === index 
                          ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg scale-[1.02]' 
                          : task.enabled 
                            ? 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md' 
                            : 'border-gray-200 bg-gray-50 opacity-60'
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                      {/* 启用复选框 */}
                      <input
                        type="checkbox"
                        checked={task.enabled}
                        onChange={() => toggleTaskEnabled(index)}
                        disabled={isRunning}
                        className="mt-1.5 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer"
                      />

                      {/* 任务信息 */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="text-2xl">{task.icon}</span>
                          <span className="font-bold text-gray-900 text-lg">{task.name}</span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">#{index + 1}</span>
                          {task.taskType && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">{task.taskType}</span>
                          )}
                          {currentStep === index && (
                            <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium animate-pulse">执行中</span>
                          )}
                        </div>

                        {/* 参数配置 */}
                        {task.paramFields && task.paramFields.length > 0 && (
                          <div className="space-y-2 mt-2">
                            {task.paramFields.map(field => (
                              <div key={field.key} className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  {field.type === 'checkbox' ? (
                                    <label className="flex items-center space-x-2 text-xs text-gray-700">
                                      <input
                                        type="checkbox"
                                        checked={task.params[field.key] || false}
                                        onChange={(e) => updateTaskParam(index, field.key, e.target.checked)}
                                        disabled={isRunning || !task.enabled}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span>{field.label}</span>
                                    </label>
                                  ) : field.type === 'star-select' ? (
                                    <div className="flex-1">
                                      <label className="text-xs text-gray-600 block mb-1">{field.label}:</label>
                                      <div className="flex items-center space-x-2">
                                        {[1, 2, 3, 4, 5, 6].map(star => {
                                          const currentValue = Array.isArray(task.params[field.key]) 
                                            ? task.params[field.key] 
                                            : [];
                                          const isChecked = currentValue.includes(star);
                                          return (
                                            <label key={star} className="flex items-center space-x-1 text-xs text-gray-700">
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                  const newValue = e.target.checked
                                                    ? [...currentValue, star].sort()
                                                    : currentValue.filter(s => s !== star);
                                                  updateTaskParam(index, field.key, newValue);
                                                }}
                                                disabled={isRunning || !task.enabled}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                              />
                                              <span>{star}⭐</span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ) : field.type === 'facility-select' ? (
                                    <div className="flex-1">
                                      <label className="text-xs text-gray-600 block mb-1">{field.label}:</label>
                                      <div className="grid grid-cols-2 gap-2">
                                        {[
                                          { value: 'Mfg', label: '制造站' },
                                          { value: 'Trade', label: '贸易站' },
                                          { value: 'Power', label: '发电站' },
                                          { value: 'Control', label: '控制中枢' },
                                          { value: 'Reception', label: '会客室' },
                                          { value: 'Office', label: '办公室' },
                                          { value: 'Dorm', label: '宿舍' }
                                        ].map(facility => {
                                          const currentValue = Array.isArray(task.params[field.key]) 
                                            ? task.params[field.key] 
                                            : [];
                                          const isChecked = currentValue.includes(facility.value);
                                          return (
                                            <label key={facility.value} className="flex items-center space-x-1 text-xs text-gray-700">
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                  const newValue = e.target.checked
                                                    ? [...currentValue, facility.value]
                                                    : currentValue.filter(f => f !== facility.value);
                                                  updateTaskParam(index, field.key, newValue);
                                                }}
                                                disabled={isRunning || !task.enabled}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                              />
                                              <span>{facility.label}</span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ) : field.type === 'select' ? (
                                    <>
                                      <label className="text-xs text-gray-600 w-24 flex-shrink-0">{field.label}:</label>
                                      <select
                                        value={task.params[field.key] || (Array.isArray(field.options) ? (field.options[0].value || field.options[0]) : '')}
                                        onChange={(e) => updateTaskParam(index, field.key, e.target.value)}
                                        disabled={isRunning || !task.enabled}
                                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      >
                                        {Array.isArray(field.options) && field.options.map(opt => {
                                          const value = typeof opt === 'object' ? opt.value : opt
                                          const label = typeof opt === 'object' ? opt.label : opt
                                          return <option key={value} value={value}>{label}</option>
                                        })}
                                      </select>
                                    </>
                                  ) : (
                                    <>
                                      <label className="text-xs text-gray-600 w-24 flex-shrink-0">{field.label}:</label>
                                      <input
                                        type={field.type}
                                        value={task.params[field.key] || ''}
                                        onChange={(e) => updateTaskParam(index, field.key, e.target.value)}
                                        placeholder={field.placeholder}
                                        step={field.step}
                                        min={field.min}
                                        max={field.max}
                                        disabled={isRunning || !task.enabled}
                                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      />
                                    </>
                                  )}
                                </div>
                                {field.helper && (
                                  <p className="text-xs text-gray-500 ml-26">{field.helper}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => moveTask(index, 'up')}
                          disabled={isRunning || index === 0}
                          className="px-3 py-2 text-sm bg-gradient-to-b from-gray-100 to-gray-200 text-gray-700 rounded-lg hover:from-gray-200 hover:to-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveTask(index, 'down')}
                          disabled={isRunning || index === taskFlow.length - 1}
                          className="px-3 py-2 text-sm bg-gradient-to-b from-gray-100 to-gray-200 text-gray-700 rounded-lg hover:from-gray-200 hover:to-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => removeTaskFromFlow(index)}
                          disabled={isRunning}
                          className="px-3 py-2 text-sm bg-gradient-to-b from-red-100 to-red-200 text-red-700 rounded-lg hover:from-red-200 hover:to-red-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 执行控制 */}
            {taskFlow.length > 0 && (
              <div className="mt-6 space-y-5">
                {/* 定时执行 */}
                <div className="border-t-2 border-gray-200 pt-6">
                  <div className="space-y-4">
                    <label className="flex items-center space-x-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={scheduleEnabled}
                        onChange={(e) => setScheduleEnabled(e.target.checked)}
                        disabled={isRunning}
                        className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 focus:ring-2 cursor-pointer"
                      />
                      <span className="text-base font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">启用定时执行</span>
                    </label>
                    
                    {scheduleEnabled && (
                      <div className="ml-8 space-y-3 bg-gradient-to-br from-indigo-50 to-purple-50 p-5 rounded-xl border-2 border-indigo-200">
                        <p className="text-sm text-indigo-900 font-medium mb-3">⏰ 设置每天自动执行的时间点：</p>
                        {scheduleTimes.map((time, index) => (
                          <div key={index} className="flex items-center space-x-3 bg-white p-3 rounded-lg shadow-sm">
                            <span className="text-sm font-semibold text-indigo-700 w-20">时间点 {index + 1}</span>
                            <input
                              type="time"
                              value={time}
                              onChange={(e) => updateScheduleTime(index, e.target.value)}
                              disabled={isRunning}
                              className="px-4 py-2 border-2 border-indigo-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <span className="text-sm text-gray-600">每天 <span className="font-bold text-indigo-600">{time}</span> 自动执行</span>
                          </div>
                        ))}
                        <p className="text-xs text-amber-700 mt-3 bg-amber-50 p-3 rounded-lg border border-amber-200">
                          💡 提示：定时功能需要保持浏览器页面打开
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 立即执行按钮 */}
                <button
                  onClick={executeTaskFlow}
                  disabled={isRunning || taskFlow.filter(t => t.enabled).length === 0}
                  className="w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white px-8 py-4 rounded-xl text-lg font-bold hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 disabled:from-gray-300 disabled:via-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl hover:scale-[1.02]"
                >
                  <span className="text-2xl">{isRunning ? '⏳' : '▶️'}</span>
                  <span>{isRunning ? '执行中...' : '立即执行任务流程'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
