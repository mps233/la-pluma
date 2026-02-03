import { useState } from 'react'
import { maaApi } from '../services/api'

export default function MaaControl() {
  const [isRunning, setIsRunning] = useState(false)
  const [selectedTask, setSelectedTask] = useState('')
  const [taskInputs, setTaskInputs] = useState({})
  const [message, setMessage] = useState('')
  const [dryRunMode, setDryRunMode] = useState({})
  const [copilotSetInfo, setCopilotSetInfo] = useState(null)
  const [isLoadingSet, setIsLoadingSet] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState('automation')
  const [showAdvanced, setShowAdvanced] = useState({})
  const [advancedParams, setAdvancedParams] = useState({})

  const taskCategories = {
    automation: {
      name: '自动化任务',
      icon: '🤖',
      description: '日常自动化流程',
      tasks: [
        { id: 'startup', name: '启动游戏', command: 'startup', placeholder: '客户端类型 (Official/Bilibili/YoStarEN)', icon: '▶️' },
        { id: 'closedown', name: '关闭游戏', command: 'closedown', placeholder: '客户端类型 (默认 Official)', icon: '⏹️' },
        { id: 'fight', name: '理智作战', command: 'fight', placeholder: '关卡名称 (如: 1-7, CE-6)', icon: '⚔️', hasAdvanced: true },
        // 注：自动公招、基建换班、领取奖励等功能需要通过自定义任务实现
        // 可以在配置目录的 tasks/ 文件夹中创建 TOML/YAML/JSON 文件来定义
        // 参考 MAA 集成文档：https://docs.maa.plus/zh-cn/manual/integration/
      ]
    },
    combat: {
      name: '自动战斗',
      icon: '🎯',
      description: '作业和特殊战斗模式',
      tasks: [
        { id: 'copilot', name: '自动抄作业', command: 'copilot', placeholder: 'maa://1234 或本地文件路径', icon: '📝', supportsDryRun: true, hasAdvanced: true },
        { id: 'ssscopilot', name: '保全派驻', command: 'ssscopilot', placeholder: 'maa://1234 或本地文件路径', icon: '🛡️', hasAdvanced: true },
        { id: 'paradoxcopilot', name: '悖论模拟', command: 'paradoxcopilot', placeholder: 'maa://1234 或本地文件路径', icon: '🔮', supportsDryRun: true },
      ]
    },
    roguelike: {
      name: '肉鸽模式',
      icon: '🎲',
      description: '集成战略和生息演算',
      tasks: [
        { id: 'roguelike', name: '集成战略', command: 'roguelike', placeholder: '主题 (Phantom/Mizuki/Sami/Sarkaz/JieGarden)', icon: '🗺️', hasAdvanced: true },
        { id: 'reclamation', name: '生息演算', command: 'reclamation', placeholder: '主题 (Tales)', icon: '🌱', hasAdvanced: true },
      ]
    }
  }

  const getAdvancedOptions = (taskId) => {
    const options = {
      fight: [
        { key: 'medicine', label: '理智药数量', type: 'number', param: '-m', placeholder: '0' },
        { key: 'stone', label: '源石数量', type: 'number', param: '--stone', placeholder: '0' },
        { key: 'times', label: '战斗次数', type: 'number', param: '--times', placeholder: '无限' },
        { key: 'series', label: '系列次数', type: 'select', param: '--series', options: [
          { value: '', label: '默认 (1次)' },
          { value: '-1', label: '禁用切换' },
          { value: '0', label: '自动最大' },
          { value: '2', label: '2次' },
          { value: '3', label: '3次' },
          { value: '4', label: '4次' },
          { value: '5', label: '5次' },
          { value: '6', label: '6次' },
        ]},
        { key: 'reportPenguin', label: '向企鹅物流报告掉落', type: 'checkbox', param: '--report-to-penguin' },
        { key: 'reportYituliu', label: '向一图流报告掉落', type: 'checkbox', param: '--report-to-yituliu' },
      ],
      copilot: [
        { key: 'ignoreRequirements', label: '忽略干员要求', type: 'checkbox', param: '--ignore-requirements' },
        { key: 'raid', label: '突袭模式', type: 'select', param: '--raid', options: [
          { value: '0', label: '普通模式' },
          { value: '1', label: '突袭模式' },
          { value: '2', label: '两次（普通+突袭）' },
        ]},
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
    
    // 处理 copilot 多行输入
    if ((task.id === 'copilot' || task.id === 'paradoxcopilot') && params.includes('\n')) {
      const uris = params.split('\n').filter(line => line.trim())
      params = uris.join(' ')
    }
    
    // 作业集自动添加 s 后缀
    if (task.id === 'copilot' && copilotSetInfo?.type === 'set' && copilotSetInfo?.autoAddS) {
      params = params.replace(/maa:\/\/(\d+)(?!s)/g, 'maa://$1s')
    }
    
    // dry-run 模式
    if (dryRunMode[task.id] && task.supportsDryRun) {
      params = params ? `${params} --dry-run` : '--dry-run'
      return params
    }
    
    // copilot 任务默认添加 --formation
    if (task.id === 'copilot' || task.id === 'paradoxcopilot') {
      params = params ? `${params} --formation` : '--formation'
    }
    
    // 添加高级参数
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
    setMessage('⏳ 正在执行命令...')
    
    try {
      const params = buildCommandParams(task)
      const result = await maaApi.executePredefinedTask(task.command, params)
      
      if (result.success) {
        setMessage(`✅ ${task.name} 执行成功`)
        console.log('执行结果:', result.data)
      } else {
        setMessage(`❌ 执行失败: ${result.error}`)
      }
    } catch (error) {
      setMessage(`❌ 网络错误: ${error.message}`)
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
      <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
        {options.map(option => (
          <div key={option.key} className="flex items-center space-x-2">
            {option.type === 'checkbox' ? (
              <label className="flex items-center space-x-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={advanced[option.key] || false}
                  onChange={(e) => handleAdvancedChange(task.id, option.key, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{option.label}</span>
              </label>
            ) : option.type === 'select' ? (
              <div className="flex items-center space-x-2 flex-1">
                <label className="text-sm text-gray-700 whitespace-nowrap">{option.label}:</label>
                <select
                  value={advanced[option.key] || option.options[0].value}
                  onChange={(e) => handleAdvancedChange(task.id, option.key, e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {option.options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center space-x-2 flex-1">
                <label className="text-sm text-gray-700 whitespace-nowrap">{option.label}:</label>
                <input
                  type={option.type}
                  value={advanced[option.key] || ''}
                  onChange={(e) => handleAdvancedChange(task.id, option.key, e.target.value)}
                  placeholder={option.placeholder}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderTaskCard = (task) => {
    const isExpanded = showAdvanced[task.id]
    
    return (
      <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl">{task.icon}</span>
            <h4 className="font-medium text-gray-900">{task.name}</h4>
          </div>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded font-mono">{task.command}</span>
        </div>
        
        {/* 主输入区域 */}
        {task.id === 'copilot' ? (
          <div className="space-y-2 mb-3">
            <div className="flex space-x-2">
              <textarea
                placeholder={task.placeholder + '\n支持多行，每行一个作业 URI'}
                value={taskInputs[task.id] || ''}
                onChange={(e) => handleInputChange(task.id, e.target.value)}
                rows="3"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
              />
              <button
                onClick={handlePreviewCopilotSet}
                disabled={isLoadingSet || !taskInputs[task.id]?.trim()}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition"
              >
                {isLoadingSet ? '⏳' : '🔍'} 预览
              </button>
            </div>
            
            {copilotSetInfo && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-semibold text-blue-900">
                        {copilotSetInfo.type === 'set' ? '📋 作业集' : '📄 单个作业'}
                      </span>
                      <span className="text-xs text-blue-700">ID: {copilotSetInfo.id}</span>
                    </div>
                    <p className="text-sm font-medium text-blue-900">{copilotSetInfo.name}</p>
                    {copilotSetInfo.type === 'set' && copilotSetInfo.note && (
                      <p className="text-xs text-blue-700 mt-1">{copilotSetInfo.note}</p>
                    )}
                    {copilotSetInfo.type === 'single' && (
                      <div className="text-xs text-blue-700 mt-1 space-y-0.5">
                        {copilotSetInfo.stage && <p>关卡: {copilotSetInfo.stage}</p>}
                        {copilotSetInfo.operators && <p>干员: {copilotSetInfo.operators}</p>}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setCopilotSetInfo(null)}
                    className="text-blue-600 hover:text-blue-800 text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (task.id === 'paradoxcopilot' || task.id === 'ssscopilot') ? (
          <textarea
            placeholder={task.placeholder}
            value={taskInputs[task.id] || ''}
            onChange={(e) => handleInputChange(task.id, e.target.value)}
            rows="2"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
          />
        ) : (
          <input
            type="text"
            placeholder={task.placeholder}
            value={taskInputs[task.id] || ''}
            onChange={(e) => handleInputChange(task.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
        
        {/* Dry Run 选项 */}
        {task.supportsDryRun && (
          <label className="flex items-center space-x-2 text-sm text-gray-700 mb-3">
            <input
              type="checkbox"
              checked={dryRunMode[task.id] || false}
              onChange={(e) => setDryRunMode({ ...dryRunMode, [task.id]: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>🔍 仅验证（不实际执行）</span>
          </label>
        )}
        
        {/* 高级选项 */}
        {task.hasAdvanced && (
          <div className="mb-3">
            <button
              onClick={() => setShowAdvanced({ ...showAdvanced, [task.id]: !isExpanded })}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <span>{isExpanded ? '▼' : '▶'}</span>
              <span>高级选项</span>
            </button>
            {isExpanded && renderAdvancedOptions(task)}
          </div>
        )}
        
        {/* 执行按钮 */}
        <button
          onClick={() => handleExecute(task)}
          disabled={isRunning}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center space-x-2"
        >
          <span>{task.icon}</span>
          <span>执行 {task.name}</span>
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 消息提示 */}
      {message && (
        <div className={`rounded-lg p-4 ${message.includes('✅') ? 'bg-green-50 text-green-800 border border-green-200' : message.includes('⏳') ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          <div className="flex items-center justify-between">
            <span>{message}</span>
            <button onClick={() => setMessage('')} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
        </div>
      )}

      {/* 状态卡片 */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">MAA 控制中心</h2>
            <p className="text-blue-100 mt-1">明日方舟自动化助手</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-white/50'}`}></div>
            <span className="text-lg font-semibold">
              {isRunning ? '运行中' : '就绪'}
            </span>
          </div>
        </div>
      </div>

      {/* 使用提示 */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-amber-900 mb-2 flex items-center space-x-2">
          <span>💡</span>
          <span>快速开始</span>
        </h3>
        <ul className="text-sm text-amber-800 space-y-1">
          <li>• <strong>自动化任务</strong>：日常流程，从启动游戏到理智作战一条龙</li>
          <li>• <strong>自动战斗</strong>：使用作业自动完成关卡（需要从 prts.maa.plus 获取作业 URI）</li>
          <li>• <strong>肉鸽模式</strong>：自动刷集成战略和生息演算</li>
          <li>• 首次使用请在"配置管理"中设置 ADB 连接地址（如: 127.0.0.1:16384）</li>
        </ul>
      </div>

      {/* 任务分类 */}
      {Object.entries(taskCategories).map(([categoryKey, category]) => (
        <div key={categoryKey} className="bg-white rounded-lg shadow">
          <button
            onClick={() => setExpandedCategory(expandedCategory === categoryKey ? null : categoryKey)}
            className="w-full px-6 py-4 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{category.icon}</span>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                <p className="text-xs text-gray-500">{category.description}</p>
              </div>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {category.tasks.length} 个任务
              </span>
            </div>
            <span className="text-gray-400 text-xl">
              {expandedCategory === categoryKey ? '▼' : '▶'}
            </span>
          </button>
          
          {expandedCategory === categoryKey && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {category.tasks.map(task => renderTaskCard(task))}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* 自定义任务 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center space-x-3">
          <span className="text-2xl">⚙️</span>
          <h3 className="text-lg font-semibold text-gray-900">自定义任务</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">任务名称</label>
              <select 
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">选择自定义任务...</option>
                <option value="daily">每日任务</option>
                <option value="weekly">周常任务</option>
              </select>
              <p className="text-xs text-gray-500 mt-2">
                💡 自定义任务需要在配置目录的 tasks/ 文件夹中创建 TOML/YAML/JSON 文件
              </p>
            </div>
            <button
              disabled={isRunning || !selectedTask}
              className="w-full bg-green-500 text-white px-4 py-2 rounded-md font-medium hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center space-x-2"
            >
              <span>▶️</span>
              <span>运行自定义任务</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
