/**
 * 关卡数据服务
 * 提供关卡信息查询功能
 */

import { readJsonFile } from '../utils/fileHelper.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('StageDataService');

class StageDataService {
  constructor() {
    this.stagesPath = 'data/stages.json';
    this.stages = null;
    this.loadStages();
  }

  /**
   * 加载关卡数据
   */
  async loadStages() {
    try {
      this.stages = await readJsonFile(this.stagesPath);
      logger.info(`[StageData] 已加载 ${Object.keys(this.stages).length} 个关卡数据`);
    } catch (error) {
      logger.error('[StageData] 加载关卡数据失败:', error.message);
      this.stages = {};
    }
  }

  /**
   * 根据关卡代号获取关卡信息
   * @param {string} code - 关卡代号，如 "1-7", "14-21"
   * @returns {object|null} 关卡信息
   */
  getStageByCode(code) {
    if (!this.stages) {
      return null;
    }
    
    return this.stages[code] || null;
  }

  /**
   * 批量获取关卡信息
   * @param {string[]} codes - 关卡代号数组
   * @returns {object} 关卡信息映射
   */
  getStagesByCodes(codes) {
    const result = {};
    
    codes.forEach(code => {
      const stage = this.getStageByCode(code);
      if (stage) {
        result[code] = stage;
      }
    });
    
    return result;
  }

  /**
   * 搜索关卡
   * @param {string} keyword - 搜索关键词
   * @returns {object[]} 匹配的关卡列表
   */
  searchStages(keyword) {
    if (!this.stages) {
      return [];
    }
    
    const lowerKeyword = keyword.toLowerCase();
    const results = [];
    
    Object.values(this.stages).forEach(stage => {
      if (
        stage.code.toLowerCase().includes(lowerKeyword) ||
        stage.name.toLowerCase().includes(lowerKeyword) ||
        stage.id.toLowerCase().includes(lowerKeyword)
      ) {
        results.push(stage);
      }
    });
    
    return results;
  }

  /**
   * 获取所有主线关卡
   * @returns {object[]} 主线关卡列表
   */
  getMainStages() {
    if (!this.stages) {
      return [];
    }
    
    return Object.values(this.stages).filter(stage => stage.isMainStage);
  }

  /**
   * 获取所有活动关卡
   * @returns {object[]} 活动关卡列表
   */
  getActivityStages() {
    if (!this.stages) {
      return [];
    }
    
    return Object.values(this.stages).filter(stage => stage.isActivityStage);
  }

  /**
   * 重新加载关卡数据
   */
  async reload() {
    logger.info('[StageData] 重新加载关卡数据...');
    await this.loadStages();
  }
}

export default new StageDataService();
