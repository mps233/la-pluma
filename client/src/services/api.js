// 自动检测 API 地址
// 如果是 localhost，使用 localhost
// 如果是通过 IP 访问，使用相同的 IP 地址
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  
  // 如果是 localhost 或 127.0.0.1，使用 localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3000/api';
  }
  
  // 否则使用当前访问的 IP 地址
  return `http://${hostname}:3000/api`;
};

const API_BASE_URL = getApiBaseUrl();

export const maaApi = {
  // 获取版本信息
  async getVersion() {
    const response = await fetch(`${API_BASE_URL}/maa/version`)
    return response.json()
  },

  // 获取配置目录
  async getConfigDir() {
    const response = await fetch(`${API_BASE_URL}/maa/config-dir`)
    return response.json()
  },

  // 执行 MAA 命令
  async executeCommand(command, args = [], taskConfig = null, signal = null, taskName = null, taskType = null, waitForCompletion = false) {
    try {
      const body = { command, args }
      if (taskConfig) {
        body.taskConfig = taskConfig
      }
      if (taskName) {
        body.taskName = taskName
      }
      if (taskType) {
        body.taskType = taskType
      }
      if (waitForCompletion !== undefined) {
        body.waitForCompletion = waitForCompletion
      }
      
      const fetchOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      }
      
      // 如果提供了 abort signal，添加到 fetch 选项中
      if (signal) {
        fetchOptions.signal = signal
      }
      
      const response = await fetch(`${API_BASE_URL}/maa/execute`, fetchOptions)
      return response.json()
    } catch (error) {
      throw error
    }
  },

  // 执行预定义任务
  async executePredefinedTask(taskType, params, taskConfig = null, signal = null, taskName = null, taskTypeLabel = null, waitForCompletion = false) {
    // 如果 params 包含空格，说明是多个参数，需要分割
    const args = params ? params.split(' ').filter(arg => arg.trim()) : []
    return this.executeCommand(taskType, args, taskConfig, signal, taskName, taskTypeLabel, waitForCompletion)
  },

  // 获取任务执行状态
  async getTaskStatus() {
    const response = await fetch(`${API_BASE_URL}/maa/task-status`)
    return response.json()
  },

  // 获取实时日志
  async getRealtimeLogs(lines = 100) {
    const response = await fetch(`${API_BASE_URL}/maa/realtime-logs?lines=${lines}`)
    return response.json()
  },

  // 清空实时日志
  async clearRealtimeLogs() {
    const response = await fetch(`${API_BASE_URL}/maa/realtime-logs/clear`, {
      method: 'POST',
    })
    return response.json()
  },

  // 列出所有任务
  async listTasks() {
    return this.executeCommand('list')
  },

  // 配置管理
  async getConfig(profileName = 'default') {
    const response = await fetch(`${API_BASE_URL}/maa/config/${profileName}`)
    return response.json()
  },

  async saveConfig(profileName = 'default', config) {
    const response = await fetch(`${API_BASE_URL}/maa/config/${profileName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    })
    return response.json()
  },

  // 截图功能
  async captureScreen(adbPath = '/opt/homebrew/bin/adb', address = '127.0.0.1:16384') {
    const response = await fetch(`${API_BASE_URL}/maa/screenshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ adbPath, address }),
    })
    return response.json()
  },

  // 测试 ADB 连接
  async testConnection(adbPath, address) {
    const response = await fetch(`${API_BASE_URL}/maa/test-connection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ adbPath, address }),
    })
    return response.json()
  },

  async getDebugScreenshots() {
    const response = await fetch(`${API_BASE_URL}/maa/debug-screenshots`)
    return response.json()
  },

  // 获取当前活动信息
  async getActivity(clientType = 'Official') {
    const response = await fetch(`${API_BASE_URL}/maa/activity?clientType=${clientType}`)
    return response.json()
  },

  // 终止当前任务
  async stopTask() {
    const response = await fetch(`${API_BASE_URL}/maa/stop-task`, {
      method: 'POST',
    })
    return response.json()
  },

  // 获取日志文件列表
  async getLogFiles() {
    const response = await fetch(`${API_BASE_URL}/maa/logs`)
    return response.json()
  },

  // 读取日志文件内容
  async readLogFile(filePath, lines = 1000) {
    const encodedPath = encodeURIComponent(filePath)
    const response = await fetch(`${API_BASE_URL}/maa/logs/${encodedPath}?lines=${lines}`)
    return response.json()
  },

  // 手动清理日志文件
  async cleanupLogs(maxSizeMB = 10) {
    const response = await fetch(`${API_BASE_URL}/maa/logs/cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ maxSizeMB }),
    })
    return response.json()
  },

  // 定时任务管理
  async setupSchedule(scheduleId = 'default', times, taskFlow) {
    const response = await fetch(`${API_BASE_URL}/maa/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ scheduleId, times, taskFlow }),
    })
    return response.json()
  },

  async stopSchedule(scheduleId = 'default') {
    const response = await fetch(`${API_BASE_URL}/maa/schedule/${scheduleId}`, {
      method: 'DELETE',
    })
    return response.json()
  },

  async getScheduleStatus() {
    const response = await fetch(`${API_BASE_URL}/maa/schedule/status`)
    return response.json()
  },

  async getScheduleExecutionStatus() {
    const response = await fetch(`${API_BASE_URL}/maa/schedule/execution-status`)
    return response.json()
  },

  async executeScheduleNow(scheduleId, taskFlow) {
    const response = await fetch(`${API_BASE_URL}/maa/schedule/${scheduleId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ taskFlow })
    })
    return response.json()
  },

  async executeScheduleNow(scheduleId = 'default', taskFlow) {
    const response = await fetch(`${API_BASE_URL}/maa/schedule/${scheduleId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskFlow }),
    })
    return response.json()
  },

  // 更新 MaaCore
  async updateMaaCore() {
    const response = await fetch(`${API_BASE_URL}/maa/update-core`, {
      method: 'POST',
    })
    return response.json()
  },

  // 更新 MAA CLI
  async updateMaaCli() {
    const response = await fetch(`${API_BASE_URL}/maa/update-cli`, {
      method: 'POST',
    })
    return response.json()
  },

  // 设置自动更新
  async setupAutoUpdate(config) {
    const response = await fetch(`${API_BASE_URL}/maa/auto-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    })
    return response.json()
  },

  // 获取自动更新状态
  async getAutoUpdateStatus() {
    const response = await fetch(`${API_BASE_URL}/maa/auto-update/status`)
    return response.json()
  },

  // ========== 用户配置存储 ==========
  
  // 保存用户配置到服务器
  async saveUserConfig(configType, data) {
    const response = await fetch(`${API_BASE_URL}/maa/user-config/${configType}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  // 从服务器读取用户配置
  async loadUserConfig(configType) {
    const response = await fetch(`${API_BASE_URL}/maa/user-config/${configType}`)
    return response.json()
  },

  // 获取所有用户配置
  async getAllUserConfigs() {
    const response = await fetch(`${API_BASE_URL}/maa/user-configs`)
    return response.json()
  },

  // 删除用户配置
  async deleteUserConfig(configType) {
    const response = await fetch(`${API_BASE_URL}/maa/user-config/${configType}`, {
      method: 'DELETE',
    })
    return response.json()
  },
}
