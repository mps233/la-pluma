/**
 * 获取明日方舟关卡数据
 * 从 Kengxxiao/ArknightsGameData 获取关卡信息
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 游戏数据仓库
const GAME_DATA_BASE = 'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata';

// 输出路径
const OUTPUT_DIR = path.join(__dirname, '../data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'stages.json');

/**
 * 获取关卡表数据
 */
async function fetchStageTable() {
  console.log('📥 正在获取关卡表数据...');
  
  try {
    const response = await fetch(`${GAME_DATA_BASE}/excel/stage_table.json`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ 关卡表数据获取成功');
    return data;
  } catch (error) {
    console.error('❌ 获取关卡表失败:', error.message);
    throw error;
  }
}

/**
 * 解析关卡数据
 */
function parseStageData(stageTable) {
  console.log('🔄 正在解析关卡数据...');
  
  const stages = {};
  const stageData = stageTable.stages || {};
  
  Object.keys(stageData).forEach(stageId => {
    const stage = stageData[stageId];
    
    // 只处理主线、活动、别传关卡
    if (!stage.code || stage.code === 'null') return;
    
    // 提取关卡信息
    const stageInfo = {
      id: stageId,
      code: stage.code,
      name: stage.name,
      difficulty: stage.difficulty,
      dangerLevel: stage.dangerLevel || '',
      dangerPoint: stage.dangerPoint || 0,
      apCost: stage.apCost || 0,
      
      // 关卡类型
      stageType: stage.stageType,
      
      // 关卡图片（使用 stageId，移除特殊后缀）
      // 移除 #f#（四星难度）、#n#（普通难度）等后缀
      thumbnail: `https://web.hycdn.cn/arknights/game/assets/stage_pic/${stageId.replace(/#[fn]#/g, '')}.png`,
      
      // 章节信息
      zoneId: stage.zoneId,
      
      // 是否是主线关卡
      isMainStage: stage.stageType === 'MAIN',
      
      // 是否是活动关卡
      isActivityStage: stage.stageType === 'ACTIVITY' || stage.stageType === 'CAMPAIGN',
      
      // 是否是资源关卡
      isResourceStage: stage.stageType === 'DAILY' || stage.stageType === 'WEEKLY',
    };
    
    // 使用 code 作为 key（如 "1-7", "14-21"）
    stages[stage.code] = stageInfo;
  });
  
  console.log(`✅ 解析完成，共 ${Object.keys(stages).length} 个关卡`);
  return stages;
}

/**
 * 保存关卡数据
 */
async function saveStageData(stages) {
  console.log('💾 正在保存关卡数据...');
  
  try {
    // 确保目录存在
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    // 保存 JSON 文件
    await fs.writeFile(
      OUTPUT_FILE,
      JSON.stringify(stages, null, 2),
      'utf-8'
    );
    
    console.log('✅ 关卡数据已保存到:', OUTPUT_FILE);
    console.log(`📊 总计 ${Object.keys(stages).length} 个关卡`);
    
    // 显示一些示例
    const examples = Object.keys(stages).slice(0, 5);
    console.log('\n示例关卡:');
    examples.forEach(code => {
      const stage = stages[code];
      console.log(`  ${code}: ${stage.name} (${stage.stageType})`);
    });
    
  } catch (error) {
    console.error('❌ 保存关卡数据失败:', error.message);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('   明日方舟关卡数据获取工具');
  console.log('========================================\n');
  
  try {
    // 1. 获取关卡表
    const stageTable = await fetchStageTable();
    
    // 2. 解析关卡数据
    const stages = parseStageData(stageTable);
    
    // 3. 保存数据
    await saveStageData(stages);
    
    console.log('\n========================================');
    console.log('   ✅ 所有任务完成！');
    console.log('========================================');
    
  } catch (error) {
    console.error('\n❌ 执行失败:', error.message);
    process.exit(1);
  }
}

// 运行
main();
