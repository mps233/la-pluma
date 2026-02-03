import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置存储目录
const CONFIG_STORAGE_DIR = path.join(__dirname, '../data/user-configs');

// 确保配置目录存在
async function ensureConfigDir() {
  try {
    await fs.mkdir(CONFIG_STORAGE_DIR, { recursive: true });
  } catch (error) {
    console.error('创建配置目录失败:', error);
  }
}

// 保存用户配置
export async function saveUserConfig(configType, data) {
  try {
    await ensureConfigDir();
    const configPath = path.join(CONFIG_STORAGE_DIR, `${configType}.json`);
    await fs.writeFile(configPath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true, message: '配置保存成功' };
  } catch (error) {
    console.error('保存配置失败:', error);
    return { success: false, error: error.message };
  }
}

// 读取用户配置
export async function loadUserConfig(configType) {
  try {
    const configPath = path.join(CONFIG_STORAGE_DIR, `${configType}.json`);
    const data = await fs.readFile(configPath, 'utf-8');
    return { success: true, data: JSON.parse(data) };
  } catch (error) {
    if (error.code === 'ENOENT') {
      // 文件不存在，返回空配置
      return { success: true, data: null };
    }
    console.error('读取配置失败:', error);
    return { success: false, error: error.message };
  }
}

// 获取所有配置
export async function getAllUserConfigs() {
  try {
    await ensureConfigDir();
    const files = await fs.readdir(CONFIG_STORAGE_DIR);
    const configs = {};
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const configType = file.replace('.json', '');
        const result = await loadUserConfig(configType);
        if (result.success && result.data) {
          configs[configType] = result.data;
        }
      }
    }
    
    return { success: true, data: configs };
  } catch (error) {
    console.error('获取所有配置失败:', error);
    return { success: false, error: error.message };
  }
}

// 删除配置
export async function deleteUserConfig(configType) {
  try {
    const configPath = path.join(CONFIG_STORAGE_DIR, `${configType}.json`);
    await fs.unlink(configPath);
    return { success: true, message: '配置删除成功' };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: true, message: '配置不存在' };
    }
    console.error('删除配置失败:', error);
    return { success: false, error: error.message };
  }
}
