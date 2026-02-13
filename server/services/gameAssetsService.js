/**
 * 游戏资源服务
 * 提供干员、技能、物品等资源查询功能
 */

import { readJsonFile } from '../utils/fileHelper.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('GameAssetsService');

class GameAssetsService {
  constructor() {
    this.charactersPath = 'data/characters.json';
    this.skillsPath = 'data/skills.json';
    this.itemsPath = 'data/items.json';
    
    this.characters = null;
    this.skills = null;
    this.items = null;
    
    this.loadAssets();
  }

  /**
   * 加载所有资源数据
   */
  async loadAssets() {
    try {
      // 加载干员数据
      this.characters = await readJsonFile(this.charactersPath);
      logger.info(`[GameAssets] 已加载 ${Object.keys(this.characters).length} 个干员数据`);
      
      // 加载技能数据
      this.skills = await readJsonFile(this.skillsPath);
      logger.info(`[GameAssets] 已加载 ${Object.keys(this.skills).length} 个技能数据`);
      
      // 加载物品数据
      this.items = await readJsonFile(this.itemsPath);
      logger.info(`[GameAssets] 已加载 ${Object.keys(this.items).length} 个物品数据`);
      
    } catch (error) {
      logger.error('[GameAssets] 加载资源数据失败:', error.message);
      this.characters = {};
      this.skills = {};
      this.items = {};
    }
  }

  // ==================== 干员相关 ====================

  /**
   * 根据 ID 获取干员信息
   */
  getCharacter(charId) {
    if (!this.characters) return null;
    return this.characters[charId] || null;
  }

  /**
   * 根据名称搜索干员
   */
  searchCharacters(keyword) {
    if (!this.characters) return [];
    
    const lowerKeyword = keyword.toLowerCase();
    const results = [];
    
    Object.values(this.characters).forEach(char => {
      if (
        char.name.toLowerCase().includes(lowerKeyword) ||
        char.id.toLowerCase().includes(lowerKeyword)
      ) {
        results.push(char);
      }
    });
    
    return results;
  }

  /**
   * 获取所有干员
   */
  getAllCharacters() {
    if (!this.characters) return [];
    return Object.values(this.characters);
  }

  /**
   * 根据稀有度获取干员
   */
  getCharactersByRarity(rarity) {
    if (!this.characters) return [];
    return Object.values(this.characters).filter(char => char.rarity === rarity);
  }

  /**
   * 根据职业获取干员
   */
  getCharactersByProfession(profession) {
    if (!this.characters) return [];
    return Object.values(this.characters).filter(char => char.profession === profession);
  }

  // ==================== 技能相关 ====================

  /**
   * 根据 ID 获取技能信息
   */
  getSkill(skillId) {
    if (!this.skills) return null;
    return this.skills[skillId] || null;
  }

  /**
   * 批量获取技能信息
   */
  getSkills(skillIds) {
    const result = {};
    skillIds.forEach(skillId => {
      const skill = this.getSkill(skillId);
      if (skill) {
        result[skillId] = skill;
      }
    });
    return result;
  }

  /**
   * 搜索技能
   */
  searchSkills(keyword) {
    if (!this.skills) return [];
    
    const lowerKeyword = keyword.toLowerCase();
    const results = [];
    
    Object.values(this.skills).forEach(skill => {
      if (
        skill.name.toLowerCase().includes(lowerKeyword) ||
        skill.id.toLowerCase().includes(lowerKeyword)
      ) {
        results.push(skill);
      }
    });
    
    return results;
  }

  // ==================== 物品相关 ====================

  /**
   * 根据 ID 获取物品信息
   */
  getItem(itemId) {
    if (!this.items) return null;
    return this.items[itemId] || null;
  }

  /**
   * 批量获取物品信息
   */
  getItems(itemIds) {
    const result = {};
    itemIds.forEach(itemId => {
      const item = this.getItem(itemId);
      if (item) {
        result[itemId] = item;
      }
    });
    return result;
  }

  /**
   * 搜索物品
   */
  searchItems(keyword) {
    if (!this.items) return [];
    
    const lowerKeyword = keyword.toLowerCase();
    const results = [];
    
    Object.values(this.items).forEach(item => {
      if (
        item.name.toLowerCase().includes(lowerKeyword) ||
        item.id.toLowerCase().includes(lowerKeyword) ||
        (item.description && item.description.toLowerCase().includes(lowerKeyword))
      ) {
        results.push(item);
      }
    });
    
    return results;
  }

  /**
   * 根据类型获取物品
   */
  getItemsByType(itemType) {
    if (!this.items) return [];
    return Object.values(this.items).filter(item => item.itemType === itemType);
  }

  /**
   * 获取所有材料（排除其他类型）
   */
  getMaterials() {
    if (!this.items) return [];
    return Object.values(this.items).filter(item => 
      item.itemType === 'MATERIAL' || 
      item.classifyType === 'MATERIAL'
    );
  }

  // ==================== 工具方法 ====================

  /**
   * 重新加载所有资源
   */
  async reload() {
    logger.info('[GameAssets] 重新加载资源数据...');
    await this.loadAssets();
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      characters: this.characters ? Object.keys(this.characters).length : 0,
      skills: this.skills ? Object.keys(this.skills).length : 0,
      items: this.items ? Object.keys(this.items).length : 0
    };
  }
}

export default new GameAssetsService();
