import cron from 'node-cron';
import { execMaaCommand, execDynamicTask, replaceActivityCode, captureScreen } from './maaService.js';
import { sendTaskCompletionNotification, isStageOpenToday } from './notificationService.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// 存储所有定时任务
const scheduledJobs = new Map();

// 定时任务执行状态
const scheduleExecutionStatus = {
  isRunning: false,
  scheduleId: null,
  currentStep: -1,
  totalSteps: 0,
  currentTask: null,
  message: '',
  startTime: null
};

/**
 * 获取定时任务执行状态
 */
export function getScheduleExecutionStatus() {
  return { ...scheduleExecutionStatus };
}

/**
 * 更新定时任务执行状态
 */
function updateScheduleStatus(updates) {
  Object.assign(scheduleExecutionStatus, updates);
  console.log(`[定时任务状态] ${JSON.stringify(scheduleExecutionStatus)}`);
}

// Socket.io 实例（从 server.js 导入）
let io = null;

/**
 * 设置 Socket.io 实例
 */
export function setSocketIO(socketIO) {
  io = socketIO;
  console.log('Socket.io 已设置到 schedulerService');
}

/**
 * 发送任务进度事件到前端
 */
function emitTaskProgress(scheduleId, data) {
  if (io) {
    io.emit('schedule-progress', {
      scheduleId,
      ...data
    });
  }
}

// 构建 MAA 命令
function buildCommand(task) {
  if (task.taskType) {
    // MaaCore 内置任务类型
    const params = task.params || {};
    const taskConfig = {
      name: task.name,
      type: task.taskType,
      params: {}
    };
    
    // 某些字段应该保持字符串格式，不要转换为数字
    const keepAsString = ['mode'];
    
    Object.keys(params).forEach(key => {
      const value = params[key];
      if (value === undefined || value === '' || value === null) return;
      
      if (typeof value === 'boolean') {
        taskConfig.params[key] = value;
      } else if (Array.isArray(value)) {
        if (value.length > 0) {
          taskConfig.params[key] = value;
        }
      } else if (typeof value === 'string' && value.trim().startsWith('[') && value.trim().endsWith(']')) {
        taskConfig.params[key] = value.trim();
      } else if (typeof value === 'string' && value.includes(',') && !value.includes('[')) {
        taskConfig.params[key] = value.split(',').map(v => v.trim()).filter(v => v);
      } else if (typeof value === 'number') {
        taskConfig.params[key] = value;
      } else if (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '' && !keepAsString.includes(key)) {
        taskConfig.params[key] = Number(value);
      } else if (value) {
        taskConfig.params[key] = value;
      }
    });
    
    return { 
      command: 'run', 
      params: task.commandId || task.id,
      taskConfig: JSON.stringify(taskConfig)
    };
  }

  // 预定义命令
  const commandId = task.commandId || task.id.split('-')[0];
  let params = '';
  let extraArgs = [];
  
  if (commandId === 'startup' || commandId === 'closedown') {
    params = task.params.clientType || 'Official';
    if (task.params.address) {
      extraArgs.push(`-a ${task.params.address}`);
    }
  } else if (commandId === 'fight') {
    // 支持多个关卡（stages 数组，每个元素是 {stage, times}）或单个关卡（stage 字符串）
    let stages = task.params.stages || [{ stage: task.params.stage || '', times: task.params.times || '' }];
    
    // 标准化格式：将所有元素转换为 {stage, times} 对象
    stages = stages.map(s => {
      if (typeof s === 'string') {
        // 字符串格式，转换为对象
        return { stage: s, times: '' };
      } else if (typeof s === 'object' && s.stage) {
        // 已经是对象格式
        return s;
      } else {
        // 无效格式，返回空对象
        return { stage: '', times: '' };
      }
    });
    
    // 构建关卡列表，格式：stage1:times1,stage2:times2
    const stageList = stages
      .filter(s => s.stage && s.stage.trim())
      .map(s => {
        const stage = s.stage.trim();
        const times = s.times ? `:${s.times}` : '';
        return `${stage}${times}`;
      })
      .join(',');
    
    params = stageList;
    
    if (task.params.medicine !== undefined && task.params.medicine !== '' && task.params.medicine !== null) {
      params += ` -m ${task.params.medicine}`;
    }
    if (task.params.stone !== undefined && task.params.stone !== '' && task.params.stone !== null) {
      params += ` --stone ${task.params.stone}`;
    }
    if (task.params.series !== undefined && task.params.series !== '' && task.params.series !== '1') {
      params += ` --series ${task.params.series}`;
    }
  }
  
  if (extraArgs.length > 0) {
    params = `${extraArgs.join(' ')} ${params}`;
  }
  
  return { command: commandId, params };
}

// 执行任务流程
async function executeTaskFlow(taskFlow, scheduleId) {
  console.log(`[定时任务 ${scheduleId}] 开始执行任务流程`);
  
  // 更新状态：开始执行
  updateScheduleStatus({
    isRunning: true,
    scheduleId,
    currentStep: -1,
    totalSteps: taskFlow.filter(t => t.enabled).length,
    currentTask: null,
    message: '开始执行任务流程',
    startTime: Date.now()
  });
  
  const startTime = Date.now();
  const enabledTasks = taskFlow.filter(t => t.enabled);
  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  const errors = [];
  const skipped = [];
  const taskSummaries = []; // 收集任务总结信息
  let screenshot = null;
  let adbConfig = { adbPath: '/opt/homebrew/bin/adb', address: '127.0.0.1:16384' };
  
  for (let i = 0; i < enabledTasks.length; i++) {
    const task = enabledTasks[i];
    const commandId = task.commandId || task.id.split('-')[0];
    
    console.log(`[定时任务 ${scheduleId}] 执行任务 ${i + 1}/${enabledTasks.length}: ${task.name}`);
    
    // 更新状态：执行中
    updateScheduleStatus({
      currentStep: i,
      currentTask: task.name,
      currentTaskId: task.id, // 添加任务 ID
      message: `正在执行: ${task.name} (${i + 1}/${enabledTasks.length})`
    });
    
    // 保存 ADB 配置（从启动游戏任务中获取）
    if (commandId === 'startup' && task.params) {
      if (task.params.adbPath) adbConfig.adbPath = task.params.adbPath;
      if (task.params.address) adbConfig.address = task.params.address;
    }
    
    // 如果是关闭游戏任务，先截图
    if (commandId === 'closedown' && !screenshot) {
      try {
        console.log(`[定时任务 ${scheduleId}] 关闭游戏前截图...`);
        const screenshotResult = await captureScreen(adbConfig.adbPath, adbConfig.address);
        screenshot = screenshotResult.image;
        console.log(`[定时任务 ${scheduleId}] 截图成功`);
      } catch (error) {
        console.error(`[定时任务 ${scheduleId}] 截图失败:`, error.message);
      }
    }
    
    // 如果是启动游戏任务，添加重试机制
    if (commandId === 'startup') {
      const maxRetries = 2;
      let retryCount = 0;
      let startupSuccess = false;
      
      while (retryCount <= maxRetries && !startupSuccess) {
        try {
          if (retryCount > 0) {
            console.log(`[定时任务 ${scheduleId}] 启动游戏重试 ${retryCount}/${maxRetries}...`);
            await new Promise(resolve => setTimeout(resolve, 3000)); // 重试前等待3秒
          }
          
          const { command, params, taskConfig } = buildCommand(task);
          let args = params ? params.split(' ').filter(arg => arg) : [];
          await execMaaCommand(command, args);
          
          console.log(`[定时任务 ${scheduleId}] 启动游戏命令执行完成，等待15秒...`);
          await new Promise(resolve => setTimeout(resolve, 15000));
          
          // 检测游戏是否还在运行（通过截图）
          try {
            console.log(`[定时任务 ${scheduleId}] 检测游戏是否运行中...`);
            await captureScreen(adbConfig.adbPath, adbConfig.address);
            console.log(`[定时任务 ${scheduleId}] 游戏运行正常`);
            startupSuccess = true;
            successCount++;
          } catch (error) {
            console.error(`[定时任务 ${scheduleId}] 游戏可能已闪退: ${error.message}`);
            retryCount++;
            if (retryCount > maxRetries) {
              throw new Error('游戏启动后闪退，已达到最大重试次数');
            }
          }
        } catch (error) {
          if (retryCount >= maxRetries) {
            failedCount++;
            errors.push(task.name);
            console.error(`[定时任务 ${scheduleId}] 任务 ${task.name} 执行失败:`, error.message);
            break;
          }
          retryCount++;
        }
      }
      
      // 启动游戏任务已处理完成，继续下一个任务
      continue;
    }
    
    try {
      const { command, params, taskConfig } = buildCommand(task);
      
      if (taskConfig) {
        const taskId = params;
        // 定时任务需要等待命令完成才能获取输出
        const result = await execDynamicTask(taskId, taskConfig, task.name, null, true);
        
        // 尝试从输出中提取任务总结
        if (result.stdout) {
          const summary = parseTaskSummary(task.name, result.stdout);
          if (summary) {
            taskSummaries.push(summary);
          }
        }
      } else {
        let args = params ? params.split(' ').filter(arg => arg) : [];
        
        // 如果是 fight 命令，处理多个关卡
        if (command === 'fight' && args.length > 0) {
          const stageInput = args[0];
          const clientType = task.params.clientType || 'Official';
          
          // 解析关卡列表，格式：stage1:times1,stage2:times2 或 stage1,stage2
          const stageEntries = stageInput.split(',').map(s => {
            const parts = s.trim().split(':');
            return {
              stage: parts[0],
              times: parts[1] || ''
            };
          }).filter(s => s.stage);
          
          if (stageEntries.length > 1) {
            // 多个关卡，依次执行
            console.log(`[定时任务 ${scheduleId}] 检测到多个关卡: ${stageEntries.map(e => `${e.stage}${e.times ? `:${e.times}` : ''}`).join(', ')}`);
            
            let sanityDepleted = false; // 理智耗尽标记
            
            for (let i = 0; i < stageEntries.length; i++) {
              const { stage, times } = stageEntries[i];
              
              // 如果理智已耗尽，跳过剩余关卡
              if (sanityDepleted) {
                console.log(`[定时任务 ${scheduleId}] 理智已耗尽，跳过关卡 ${stage}`);
                skippedCount++;
                skipped.push({
                  task: `${task.name} (${stage})`,
                  reason: '理智已耗尽'
                });
                continue;
              }
              
              // 检查关卡是否开放
              const openCheck = isStageOpenToday(stage);
              if (!openCheck.isOpen) {
                console.log(`[定时任务 ${scheduleId}] 关卡 ${stage} 今日未开放: ${openCheck.reason}，跳过`);
                skippedCount++;
                skipped.push({
                  task: `${task.name} (${stage})`,
                  reason: openCheck.reason
                });
                continue; // 跳过这个关卡
              }
              
              console.log(`[定时任务 ${scheduleId}] 执行关卡 ${i + 1}/${stageEntries.length}: ${stage}${times ? ` (${times}次)` : ''}`);
              
              // 替换活动代号
              const realStage = await replaceActivityCode(stage, clientType);
              if (realStage !== stage) {
                console.log(`[定时任务 ${scheduleId}] 关卡代号已替换: ${stage} -> ${realStage}`);
              }
              
              // 构建当前关卡的参数（移除第一个参数，添加当前关卡和次数）
              const currentArgs = [realStage];
              if (times) {
                currentArgs.push('--times', times);
              }
              
              // 添加其他参数（理智药、源石等）
              // 如果填了次数，排除 --series 参数；否则保留所有参数
              let otherArgs;
              if (times) {
                // 填了次数，过滤掉 --series
                otherArgs = args.slice(1).filter((arg, index, arr) => {
                  return arg !== '--series' && (index === 0 || arr[index - 1] !== '--series');
                });
              } else {
                // 没填次数，保留所有参数（包括 --series）
                otherArgs = args.slice(1);
              }
              currentArgs.push(...otherArgs);
              
              // 执行命令
              try {
                const result = await execMaaCommand(command, currentArgs, `${task.name} (${stage})`, null, true);
                
                // 检查是否理智耗尽（传入关卡名称用于排除剿灭）
                const output = (result.stdout || '') + (result.stderr || '');
                console.log(`[定时任务 ${scheduleId}] 检查理智状态，关卡: ${stage}，输出长度: ${output.length}`);
                console.log(`[定时任务 ${scheduleId}] 输出内容预览: ${output.substring(0, 200)}`);
                
                if (checkSanityDepleted(output, stage)) {
                  console.log(`[定时任务 ${scheduleId}] ✓ 检测到理智已耗尽`);
                  sanityDepleted = true;
                } else {
                  console.log(`[定时任务 ${scheduleId}] ✗ 未检测到理智耗尽`);
                }
                
                // 提取任务总结
                if (result.stdout) {
                  const summary = parseTaskSummary(`${task.name} (${stage})`, result.stdout);
                  if (summary) {
                    taskSummaries.push(summary);
                  }
                }
              } catch (error) {
                // 检查错误信息中是否包含理智不足
                const errorMsg = error.message || '';
                const errorOutput = (error.stdout || '') + (error.stderr || '');
                
                console.log(`[定时任务 ${scheduleId}] 任务执行出错，检查是否理智不足`);
                console.log(`[定时任务 ${scheduleId}] 错误信息: ${errorMsg}`);
                
                if (checkSanityDepleted(errorOutput, stage) || errorMsg.includes('理智不足') || errorMsg.includes('sanity')) {
                  console.log(`[定时任务 ${scheduleId}] ✓ 检测到理智已耗尽（从错误信息）`);
                  sanityDepleted = true;
                  // 理智耗尽不算失败，跳过即可
                  skippedCount++;
                  skipped.push({
                    task: `${task.name} (${stage})`,
                    reason: '理智已耗尽'
                  });
                  continue;
                }
                
                // 检查是否是因为关卡未开放导致的错误
                if (errorMsg.includes('stage not open') || errorMsg.includes('关卡未开放')) {
                  console.log(`[定时任务 ${scheduleId}] 关卡 ${stage} 未开放，跳过`);
                  skippedCount++;
                  skipped.push({
                    task: `${task.name} (${stage})`,
                    reason: '关卡未开放'
                  });
                } else {
                  // 真正的错误
                  throw error;
                }
              }
              
              // 关卡之间等待2秒
              if (i < stageEntries.length - 1) {
                console.log(`[定时任务 ${scheduleId}] 等待 2 秒后继续下一个关卡...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }
            
            successCount++;
            
            // 所有关卡完成后的延迟
            let delayTime = 2000;
            console.log(`[定时任务 ${scheduleId}] 任务 ${task.name} 完成，等待 ${delayTime / 1000} 秒后继续...`);
            await new Promise(resolve => setTimeout(resolve, delayTime));
            
            continue; // 跳过后面的单关卡处理
          } else {
            // 单个关卡，检查是否开放
            const { stage, times } = stageEntries[0];
            
            // 检查关卡是否开放
            const openCheck = isStageOpenToday(stage);
            if (!openCheck.isOpen) {
              console.log(`[定时任务 ${scheduleId}] 关卡 ${stage} 今日未开放: ${openCheck.reason}，跳过`);
              skippedCount++;
              skipped.push({
                task: `${task.name} (${stage})`,
                reason: openCheck.reason
              });
              
              // 跳过后的延迟
              console.log(`[定时任务 ${scheduleId}] 任务 ${task.name} 已跳过，等待 2 秒后继续...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              continue; // 跳过这个任务
            }
            
            // 替换活动代号
            const realStage = await replaceActivityCode(stage, clientType);
            if (realStage !== stage) {
              args[0] = realStage; // 只保留关卡名，不要拼接次数
              console.log(`[定时任务 ${scheduleId}] 关卡代号已替换: ${stage} -> ${realStage}`);
            } else if (times) {
              // 如果没有替换但有次数，也要更新 args[0] 为纯关卡名
              args[0] = stage;
            }
            
            // 如果有次数，添加 --times 参数，并移除 --series 参数
            if (times && !args.includes('--times')) {
              args.splice(1, 0, '--times', times);
              
              // 移除 --series 参数（填了次数的关卡不使用连战）
              const seriesIndex = args.indexOf('--series');
              if (seriesIndex !== -1) {
                args.splice(seriesIndex, 2); // 移除 --series 和它的值
              }
            }
          }
        }
        
        // 定时任务需要等待命令完成才能获取输出
        const result = await execMaaCommand(command, args, task.name, null, true);
        
        // 尝试从输出中提取任务总结
        if (result.stdout) {
          const summary = parseTaskSummary(task.name, result.stdout);
          if (summary) {
            taskSummaries.push(summary);
          }
        }
      }
      
      successCount++;
      
      // 任务完成后的延迟时间
      // 启动游戏需要更长的等待时间，确保游戏完全启动
      let delayTime = 2000;
      if (commandId === 'startup') {
        delayTime = 15000; // 启动游戏等待15秒
      } else if (commandId === 'closedown') {
        delayTime = 3000; // 关闭游戏等待3秒
      }
      
      console.log(`[定时任务 ${scheduleId}] 任务 ${task.name} 完成，等待 ${delayTime / 1000} 秒后继续...`);
      await new Promise(resolve => setTimeout(resolve, delayTime));
    } catch (error) {
      failedCount++;
      errors.push(task.name);
      console.error(`[定时任务 ${scheduleId}] 任务 ${task.name} 执行失败:`, error.message);
      // 继续执行下一个任务
    }
  }
  
  const duration = Date.now() - startTime;
  console.log(`[定时任务 ${scheduleId}] 任务流程执行完成 - 成功: ${successCount}, 失败: ${failedCount}, 跳过: ${skippedCount}, 耗时: ${Math.floor(duration / 1000)}秒`);
  
  // 更新状态：完成
  updateScheduleStatus({
    isRunning: false,
    currentStep: enabledTasks.length,
    message: '任务流程执行完成',
    scheduleId: null,
    currentTask: null
  });
  
  // 发送完成通知
  try {
    await sendTaskCompletionNotification({
      taskName: `定时任务 ${scheduleId}`,
      totalTasks: enabledTasks.length,
      successTasks: successCount,
      failedTasks: failedCount,
      skippedTasks: skippedCount,
      duration,
      errors,
      skipped,
      summaries: taskSummaries,
      screenshot,
    });
  } catch (error) {
    console.error(`[定时任务 ${scheduleId}] 发送通知失败:`, error.message);
  }
}

/**
 * 检测理智是否耗尽
 * 通过分析 MAA 输出判断理智是否用完
 * @param {string} output - MAA 命令输出
 * @param {string} stage - 关卡名称（用于排除剿灭等特殊关卡）
 */
function checkSanityDepleted(output, stage = '') {
  if (!output) return false;
  
  const lowerOutput = output.toLowerCase();
  const lowerStage = stage.toLowerCase();
  
  // MAA 可能的理智不足提示
  const sanityDepletedPatterns = [
    'sanity is not enough',
    '理智不足',
    '理智已耗尽',
    'not enough sanity',
    'insufficient sanity',
    'no sanity',
    'sanity depleted',
  ];
  
  // 检查文本模式
  for (const pattern of sanityDepletedPatterns) {
    if (lowerOutput.includes(pattern)) {
      return true;
    }
  }
  
  // 检查是否打了 0 次（理智不足的典型表现）
  // 格式: "Fight 关卡名 0 times" 或 "Fight 0 times"
  if (/fight\s+(?:[a-z0-9-]+\s+)?0\s+times?/i.test(output)) {
    return true;
  }
  
  // 关键检测：如果有 Summary 和 [Fight] Completed，但没有 "Fight 关卡名 X times" 这一行
  // 说明理智不足，MAA 没有实际打关卡就退出了
  // 但要排除剿灭关卡（Annihilation），因为剿灭奖励领完也是这个表现
  if (output.includes('Summary') && output.includes('[Fight]') && output.includes('Completed')) {
    // 检查是否有 "Fight 关卡名 数字 times" 这样的行
    const hasFightRecord = /Fight\s+[A-Z0-9-]+\s+\d+\s+times?/i.test(output);
    if (!hasFightRecord) {
      // 如果是剿灭关卡，不判定为理智不足（可能是奖励领完了）
      if (lowerStage.includes('annihilation') || lowerStage.includes('剿灭')) {
        console.log(`[理智检测] 剿灭关卡无战斗记录，可能是奖励已领完，不判定为理智不足`);
        return false;
      }
      // 其他关卡没有战斗记录，说明理智不足
      console.log(`[理智检测] 非剿灭关卡无战斗记录，判定为理智不足`);
      return true;
    }
  }
  
  return false;
}

/**
 * 解析 MAA 任务总结信息
 */
function parseTaskSummary(taskName, output) {
  const summary = { task: taskName };
  
  // 调试：打印原始输出
  console.log(`[解析任务总结] 任务: ${taskName}`);
  console.log(`[解析任务总结] 输出长度: ${output.length} 字符`);
  console.log(`[解析任务总结] 完整输出:\n${output}`);
  
  // 解析 MAA 的实际输出格式
  // 格式示例: Fight OR-7 1 times, drops:
  
  // 提取关卡和次数
  const fightMatch = output.match(/Fight\s+([A-Z0-9-]+)\s+(\d+)\s+times?/i);
  if (fightMatch) {
    summary.stage = fightMatch[1];
    summary.times = fightMatch[2];
  }
  
  // 提取掉落信息
  // 格式: total drops: "生香" × 21, 全新装置 × 1, 龙门币 × 252
  const totalDropsMatch = output.match(/total drops:\s*(.+?)(?:\n|$)/i);
  if (totalDropsMatch) {
    const dropsText = totalDropsMatch[1].trim();
    // 解析每个物品
    const itemMatches = dropsText.matchAll(/(?:"([^"]+)"|([^\s,×]+))\s*×\s*(\d+)/g);
    const drops = [];
    for (const match of itemMatches) {
      const itemName = match[1] || match[2];
      const count = match[3];
      drops.push(`${itemName} × ${count}`);
    }
    if (drops.length > 0) {
      summary.drops = drops.join(', ');
    }
  }
  
  // 提取理智药和源石使用（如果有的话）
  const medicineMatch = output.match(/medicine[:\s]+(\d+)/i);
  if (medicineMatch) {
    summary.medicine = medicineMatch[1];
  }
  
  const stoneMatch = output.match(/stone[:\s]+(\d+)/i);
  if (stoneMatch) {
    summary.stone = stoneMatch[1];
  }
  
  // 提取执行时间
  const timeMatch = output.match(/\[Fight\]\s+([\d:]+)\s+-\s+([\d:]+)\s+\(([^)]+)\)/);
  if (timeMatch) {
    summary.duration = timeMatch[3];
  }
  
  // 解析公招总结
  if (output.includes('Recruit')) {
    const recruitMatches = output.matchAll(/Recruit[:\s]+\[([^\]]+)\]\s*->\s*(\d+)\*/gi);
    const recruits = [];
    for (const match of recruitMatches) {
      recruits.push({
        tags: match[1],
        stars: match[2]
      });
    }
    if (recruits.length > 0) {
      summary.recruits = recruits;
    }
  }
  
  // 解析基建总结
  if (output.includes('Infrast')) {
    const infrastMatch = output.match(/Infrast[:\s]+([^\n]+)/i);
    if (infrastMatch) {
      summary.infrast = infrastMatch[1].trim();
    }
  }
  
  console.log(`[解析任务总结] 解析结果:`, JSON.stringify(summary, null, 2));
  
  return Object.keys(summary).length > 1 ? summary : null;
}

// 创建或更新定时任务
export function setupSchedule(scheduleId, times, taskFlow) {
  // 先停止已存在的任务
  stopSchedule(scheduleId);
  
  if (!times || times.length === 0) {
    console.log(`[定时任务 ${scheduleId}] 没有设置时间，跳过`);
    return { success: false, message: '没有设置执行时间' };
  }
  
  const jobs = [];
  
  times.forEach((time, index) => {
    if (!time) return;
    
    // 解析时间 (HH:MM)
    const [hour, minute] = time.split(':');
    if (!hour || !minute) return;
    
    // 创建 cron 表达式: 分 时 * * *
    const cronExpression = `${minute} ${hour} * * *`;
    
    try {
      const job = cron.schedule(cronExpression, () => {
        console.log(`[定时任务 ${scheduleId}-${index}] 触发执行，时间: ${time}`);
        executeTaskFlow(taskFlow, `${scheduleId}-${index}`);
      }, {
        scheduled: true,
        timezone: "Asia/Shanghai"
      });
      
      jobs.push({ time, job });
      console.log(`[定时任务 ${scheduleId}-${index}] 已设置，执行时间: ${time}`);
    } catch (error) {
      console.error(`[定时任务 ${scheduleId}-${index}] 设置失败:`, error.message);
    }
  });
  
  if (jobs.length > 0) {
    scheduledJobs.set(scheduleId, jobs);
    return { 
      success: true, 
      message: `已设置 ${jobs.length} 个定时任务`,
      times: jobs.map(j => j.time)
    };
  }
  
  return { success: false, message: '没有成功设置任何定时任务' };
}

// 停止定时任务
export function stopSchedule(scheduleId) {
  const jobs = scheduledJobs.get(scheduleId);
  if (jobs) {
    jobs.forEach(({ time, job }) => {
      job.stop();
      console.log(`[定时任务 ${scheduleId}] 已停止，时间: ${time}`);
    });
    scheduledJobs.delete(scheduleId);
    return { success: true, message: '定时任务已停止' };
  }
  return { success: false, message: '没有找到该定时任务' };
}

// 获取所有定时任务状态
export function getScheduleStatus() {
  const status = [];
  scheduledJobs.forEach((jobs, scheduleId) => {
    status.push({
      scheduleId,
      times: jobs.map(j => j.time),
      count: jobs.length
    });
  });
  return status;
}

// 立即执行一次定时任务（用于测试）
export async function executeScheduleNow(scheduleId, taskFlow) {
  console.log(`[定时任务 ${scheduleId}] 手动触发执行`);
  await executeTaskFlow(taskFlow, scheduleId);
  return { success: true, message: '任务执行完成' };
}

// 自动更新任务
export function setupAutoUpdate(config) {
  const { enabled, time, updateCore, updateCli } = config;
  
  // 先停止已存在的自动更新任务
  stopSchedule('auto-update');
  
  if (!enabled || !time) {
    console.log('[自动更新] 未启用或未设置时间');
    return { success: false, message: '自动更新未启用' };
  }
  
  // 解析时间 (HH:MM)
  const [hour, minute] = time.split(':');
  if (!hour || !minute) {
    return { success: false, message: '时间格式错误' };
  }
  
  // 创建 cron 表达式: 分 时 * * *
  const cronExpression = `${minute} ${hour} * * *`;
  
  try {
    const job = cron.schedule(cronExpression, async () => {
      console.log(`[自动更新] 触发执行，时间: ${time}`);
      
      try {
        if (updateCore) {
          console.log('[自动更新] 开始更新 MaaCore...');
          await execMaaCommand('update', []);
          console.log('[自动更新] MaaCore 更新完成');
        }
        
        if (updateCli) {
          console.log('[自动更新] 开始更新 MAA CLI...');
          await execAsync('brew upgrade maa-cli');
          console.log('[自动更新] MAA CLI 更新完成');
        }
        
        console.log('[自动更新] 所有更新任务完成');
      } catch (error) {
        console.error('[自动更新] 更新失败:', error.message);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Shanghai"
    });
    
    scheduledJobs.set('auto-update', [{ time, job }]);
    console.log(`[自动更新] 已设置，执行时间: ${time}`);
    
    return { 
      success: true, 
      message: `自动更新已设置，每天 ${time} 执行`,
      config
    };
  } catch (error) {
    console.error('[自动更新] 设置失败:', error.message);
    return { success: false, message: `设置失败: ${error.message}` };
  }
}

// 获取自动更新状态
export function getAutoUpdateStatus() {
  const jobs = scheduledJobs.get('auto-update');
  if (jobs && jobs.length > 0) {
    return {
      enabled: true,
      time: jobs[0].time
    };
  }
  return {
    enabled: false,
    time: null
  };
}
