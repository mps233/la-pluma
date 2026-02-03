import express from 'express';
import { execMaaCommand, getMaaVersion, getMaaConfigDir, getConfig, saveConfig, execDynamicTask, captureScreen, getDebugScreenshots, getTaskStatus, getCurrentActivity, replaceActivityCode, stopCurrentTask, getLogFiles, readLogFile, getRealtimeLogs, clearRealtimeLogs, cleanupLogs, testAdbConnection } from '../services/maaService.js';
import { setupSchedule, stopSchedule, getScheduleStatus, executeScheduleNow, setupAutoUpdate, getAutoUpdateStatus, getScheduleExecutionStatus } from '../services/schedulerService.js';
import { saveUserConfig, loadUserConfig, getAllUserConfigs, deleteUserConfig } from '../services/configStorageService.js';

const router = express.Router();

// 获取任务执行状态
router.get('/task-status', async (req, res) => {
  try {
    const status = getTaskStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取实时日志
router.get('/realtime-logs', async (req, res) => {
  try {
    const { lines = 100 } = req.query;
    const logs = getRealtimeLogs(parseInt(lines));
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 清空实时日志
router.post('/realtime-logs/clear', async (req, res) => {
  try {
    clearRealtimeLogs();
    res.json({ success: true, message: '实时日志已清空' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 终止当前任务
router.post('/stop-task', async (req, res) => {
  try {
    const stopped = stopCurrentTask();
    if (stopped) {
      res.json({ success: true, message: '任务已终止' });
    } else {
      res.json({ success: false, message: '没有正在运行的任务' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取 MAA 版本信息
router.get('/version', async (req, res) => {
  try {
    const version = await getMaaVersion();
    res.json({ success: true, data: version });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取配置目录
router.get('/config-dir', async (req, res) => {
  try {
    const configDir = await getMaaConfigDir();
    res.json({ success: true, data: configDir });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取配置
router.get('/config/:profileName', async (req, res) => {
  try {
    const { profileName } = req.params;
    const config = await getConfig(profileName);
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 保存配置
router.post('/config/:profileName', async (req, res) => {
  try {
    const { profileName } = req.params;
    const config = req.body;
    await saveConfig(profileName, config);
    res.json({ success: true, message: '配置保存成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 执行 MAA 命令
router.post('/execute', async (req, res) => {
  try {
    let { command, args = [], taskConfig, taskName, taskType, waitForCompletion = false } = req.body;
    
    console.log(`[DEBUG] 收到执行请求: command=${command}, args=${JSON.stringify(args)}, taskConfig=${taskConfig ? '有' : '无'}`);
    
    // 如果是 fight 命令，检查并替换活动代号，并检查资源本是否开放
    if (command === 'fight' && args.length > 0) {
      const stageInput = args[0];
      console.log(`[DEBUG] fight 命令，原始关卡: ${stageInput}`);
      
      // 检查是否是多个关卡（逗号分隔）
      const stages = stageInput.split(',').map(s => s.trim()).filter(s => s);
      
      if (stages.length > 1) {
        // 多个关卡，逐个检查
        console.log(`[DEBUG] 检测到多个关卡: ${stages.join(', ')}`);
        const validStages = [];
        
        for (const stage of stages) {
          // 检查资源本是否开放
          const { isStageOpenToday } = await import('../services/notificationService.js');
          const openCheck = isStageOpenToday(stage);
          if (!openCheck.isOpen) {
            console.log(`[DEBUG] 关卡 ${stage} 今日未开放: ${openCheck.reason}，跳过`);
            continue; // 跳过未开放的关卡
          }
          
          // 替换活动代号
          const clientType = 'Official'; // 简化处理
          const realStage = await replaceActivityCode(stage, clientType);
          validStages.push(realStage);
          
          if (realStage !== stage) {
            console.log(`[DEBUG] 关卡代号已替换: ${stage} -> ${realStage}`);
          }
        }
        
        if (validStages.length === 0) {
          // 所有关卡都被跳过
          return res.json({ 
            success: false, 
            error: '所有关卡今日均未开放，已全部跳过',
            skipped: true,
            reason: '所有关卡今日均未开放'
          });
        }
        
        // 更新为有效的关卡列表
        args[0] = validStages.join(',');
        console.log(`[DEBUG] 有效关卡列表: ${args[0]}`);
      } else {
        // 单个关卡
        const stage = stages[0];
        
        // 检查资源本是否开放
        const { isStageOpenToday } = await import('../services/notificationService.js');
        const openCheck = isStageOpenToday(stage);
        if (!openCheck.isOpen) {
          console.log(`[DEBUG] 关卡 ${stage} 今日未开放: ${openCheck.reason}`);
          return res.json({ 
            success: false, 
            error: `${openCheck.reason}，已跳过`,
            skipped: true,
            reason: openCheck.reason
          });
        }
        
        // 替换活动代号
        const clientType = 'Official';
        const realStage = await replaceActivityCode(stage, clientType);
        if (realStage !== stage) {
          args[0] = realStage;
          console.log(`[DEBUG] 关卡代号已替换: ${stage} -> ${realStage}`);
        } else {
          console.log(`[DEBUG] 关卡代号未替换: ${stage}`);
        }
      }
    }
    
    console.log(`[DEBUG] 最终参数: args=${JSON.stringify(args)}`);
    
    // 如果有 taskConfig，说明是动态任务，需要创建临时文件
    if (taskConfig) {
      const taskId = args[0]; // 任务 ID
      const result = await execDynamicTask(taskId, taskConfig, taskName, taskType, waitForCompletion);
      res.json({ success: true, data: result });
    } else {
      const result = await execMaaCommand(command, args, taskName, taskType, waitForCompletion);
      res.json({ success: true, data: result });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取当前活动信息
router.get('/activity', async (req, res) => {
  try {
    const { clientType = 'Official' } = req.query;
    const activityInfo = await getCurrentActivity(clientType);
    res.json({ 
      success: true, 
      data: { 
        code: activityInfo.code,
        name: activityInfo.name,
        available: !!activityInfo.code,
        message: activityInfo.code 
          ? `当前活动: ${activityInfo.name || activityInfo.code}` 
          : '当前没有活动或无法获取活动信息'
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取模拟器截图 (GET)
router.get('/screenshot', async (req, res) => {
  try {
    const { adbPath, address } = req.query;
    const screenshot = await captureScreen(adbPath, address);
    res.json({ success: true, screenshot });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取模拟器截图 (POST)
router.post('/screenshot', async (req, res) => {
  try {
    const { adbPath, address } = req.body;
    const screenshot = await captureScreen(adbPath, address);
    res.json({ success: true, data: screenshot });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 测试 ADB 连接
router.post('/test-connection', async (req, res) => {
  try {
    const { adbPath, address } = req.body;
    const result = await testAdbConnection(adbPath, address);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取 MAA 调试截图列表
router.get('/debug-screenshots', async (req, res) => {
  try {
    const screenshots = await getDebugScreenshots();
    res.json({ success: true, data: screenshots });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 设置定时任务
router.post('/schedule', async (req, res) => {
  try {
    const { scheduleId = 'default', times, taskFlow } = req.body;
    const result = setupSchedule(scheduleId, times, taskFlow);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 停止定时任务
router.delete('/schedule/:scheduleId', async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const result = stopSchedule(scheduleId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取定时任务状态
router.get('/schedule/status', async (req, res) => {
  try {
    const status = getScheduleStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取定时任务执行状态
router.get('/schedule/execution-status', async (req, res) => {
  try {
    const status = getScheduleExecutionStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 立即执行定时任务（测试用）
router.post('/schedule/:scheduleId/execute', async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { taskFlow } = req.body;
    const result = await executeScheduleNow(scheduleId, taskFlow);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取日志文件列表
router.get('/logs', async (req, res) => {
  try {
    const files = await getLogFiles();
    res.json({ success: true, data: files });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 读取日志文件内容
router.get('/logs/:filePath(*)', async (req, res) => {
  try {
    const { filePath } = req.params;
    const { lines = 1000 } = req.query;
    
    // 解码文件路径
    const decodedPath = decodeURIComponent(filePath);
    
    const result = await readLogFile(decodedPath, parseInt(lines));
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 手动清理日志文件
router.post('/logs/cleanup', async (req, res) => {
  try {
    const { maxSizeMB = 10 } = req.body;
    const result = await cleanupLogs(maxSizeMB);
    res.json({ 
      success: true, 
      message: `已清理 ${result.deletedCount} 个日志文件，释放 ${(result.freedSpace / 1024 / 1024).toFixed(2)} MB 空间`,
      data: result 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新 MaaCore
router.post('/update-core', async (req, res) => {
  try {
    const result = await execMaaCommand('update', []);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新 MAA CLI (通过 Homebrew)
router.post('/update-cli', async (req, res) => {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const { stdout, stderr } = await execAsync('brew upgrade maa-cli');
    res.json({ 
      success: true, 
      data: { 
        output: stdout || stderr,
        message: '更新完成'
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 设置自动更新
router.post('/auto-update', async (req, res) => {
  try {
    const config = req.body;
    const result = setupAutoUpdate(config);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取自动更新状态
router.get('/auto-update/status', async (req, res) => {
  try {
    const status = getAutoUpdateStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 用户配置存储 API ==========

// 保存用户配置
router.post('/user-config/:configType', async (req, res) => {
  try {
    const { configType } = req.params;
    const data = req.body;
    const result = await saveUserConfig(configType, data);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 读取用户配置
router.get('/user-config/:configType', async (req, res) => {
  try {
    const { configType } = req.params;
    const result = await loadUserConfig(configType);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取所有用户配置
router.get('/user-configs', async (req, res) => {
  try {
    const result = await getAllUserConfigs();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除用户配置
router.delete('/user-config/:configType', async (req, res) => {
  try {
    const { configType } = req.params;
    const result = await deleteUserConfig(configType);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
