# 游戏资源数据使用指南

本文档说明如何使用明日方舟游戏资源数据（干员、技能、物品等）。

## 📊 数据概览

通过运行 `npm run fetch-assets`，系统会自动获取以下数据：

| 资源类型 | 数量 | 文件路径 | 说明 |
|---------|------|---------|------|
| 干员 | 434 个 | `server/data/characters.json` | 包含头像、立绘、技能列表 |
| 技能 | 1598 个 | `server/data/skills.json` | 包含技能图标、等级数据 |
| 物品 | 1412 个 | `server/data/items.json` | 包含材料、道具图标 |
| 关卡 | 1894 个 | `server/data/stages.json` | 包含关卡信息 |

## 🎮 干员数据

### 数据结构

```json
{
  "char_002_amiya": {
    "id": "char_002_amiya",
    "name": "阿米娅",
    "rarity": 4,
    "profession": "CASTER",
    "subProfessionId": "caster",
    "avatar": "https://web.hycdn.cn/arknights/game/assets/char_avatar/char_002_amiya.png",
    "portrait": "https://web.hycdn.cn/arknights/game/assets/char_pic/char_002_amiya.png",
    "fullPortrait": "https://web.hycdn.cn/arknights/game/assets/char_pic/char_002_amiya_2.png",
    "skills": [
      {
        "skillId": "skchr_amiya_1",
        "levelUpCostCond": [...]
      }
    ]
  }
}
```

### 图片资源

- **头像**（Avatar）：`char_avatar/{charId}.png` - 小图标，用于列表显示
- **立绘**（Portrait）：`char_pic/{charId}.png` - 半身像，用于详情页
- **全身立绘**（Full Portrait）：`char_pic/{charId}_2.png` - 完整立绘

### 使用示例

```javascript
import gameAssetsService from './services/gameAssetsService.js';

// 获取单个干员
const amiya = gameAssetsService.getCharacter('char_002_amiya');
console.log(amiya.name); // "阿米娅"
console.log(amiya.avatar); // 头像 URL

// 搜索干员
const results = gameAssetsService.searchCharacters('阿米娅');

// 按稀有度筛选（5 = 6星）
const sixStars = gameAssetsService.getCharactersByRarity(5);

// 按职业筛选
const casters = gameAssetsService.getCharactersByProfession('CASTER');
```

### 稀有度对应关系

| rarity 值 | 星级 |
|-----------|------|
| 0 | 1星 |
| 1 | 2星 |
| 2 | 3星 |
| 3 | 4星 |
| 4 | 5星 |
| 5 | 6星 |

### 职业类型

- `PIONEER` - 先锋
- `WARRIOR` - 近卫
- `TANK` - 重装
- `SNIPER` - 狙击
- `CASTER` - 术师
- `MEDIC` - 医疗
- `SUPPORT` - 辅助
- `SPECIAL` - 特种

## 🎯 技能数据

### 数据结构

```json
{
  "skchr_amiya_1": {
    "id": "skchr_amiya_1",
    "name": "精神爆发",
    "icon": "https://web.hycdn.cn/arknights/game/assets/skill_icon/skchr_amiya_1.png",
    "levels": [
      {
        "name": "精神爆发",
        "description": "攻击力+30%",
        "spData": {
          "spType": "AUTO_RECOVERY",
          "spCost": 10
        },
        "duration": 30
      }
    ]
  }
}
```

### 使用示例

```javascript
// 获取单个技能
const skill = gameAssetsService.getSkill('skchr_amiya_1');
console.log(skill.name); // "精神爆发"
console.log(skill.icon); // 技能图标 URL

// 批量获取技能
const skills = gameAssetsService.getSkills(['skchr_amiya_1', 'skchr_amiya_2']);

// 搜索技能
const results = gameAssetsService.searchSkills('精神');
```

## 📦 物品数据

### 数据结构

```json
{
  "30012": {
    "id": "30012",
    "name": "固源岩",
    "description": "由源石衍生的人造物，是各种工业设备的动力源。",
    "rarity": 1,
    "itemType": "MATERIAL",
    "icon": "https://web.hycdn.cn/arknights/game/assets/item_icon/30012.png",
    "classifyType": "MATERIAL",
    "obtainApproach": "主线关卡掉落"
  }
}
```

### 物品类型

- `MATERIAL` - 材料
- `CARD_EXP` - 作战记录
- `GOLD` - 龙门币
- `DIAMOND` - 合成玉/源石
- `FURN` - 家具
- `ACTIVITY_ITEM` - 活动道具

### 使用示例

```javascript
// 获取单个物品
const item = gameAssetsService.getItem('30012');
console.log(item.name); // "固源岩"
console.log(item.icon); // 物品图标 URL

// 批量获取物品
const items = gameAssetsService.getItems(['30012', '30013']);

// 搜索物品
const results = gameAssetsService.searchItems('固源岩');

// 按类型筛选
const materials = gameAssetsService.getItemsByType('MATERIAL');

// 获取所有材料
const allMaterials = gameAssetsService.getMaterials();
```

## 🖼️ 图片代理

所有图片 URL 都指向官方 CDN，但可能存在防盗链问题。建议通过后端代理访问：

```javascript
// 前端使用
const proxyUrl = `/api/skland/avatar-proxy?url=${encodeURIComponent(imageUrl)}`;

// 示例
<img src={`/api/skland/avatar-proxy?url=${encodeURIComponent(char.avatar)}`} alt={char.name} />
```

## 🔄 更新数据

### 手动更新

```bash
cd server
npm run fetch-assets
```

### 更新频率建议

- **游戏大版本更新后**：必须更新（新干员、新技能）
- **活动更新后**：可选更新（新物品、新关卡）
- **日常维护**：无需更新

### 自动重载

服务启动时会自动加载数据。如果更新了数据文件，需要重启服务：

```bash
npm run dev
```

或者调用重载方法：

```javascript
await gameAssetsService.reload();
```

## 📝 实际应用场景

### 1. Dashboard 显示干员头像

```typescript
// Dashboard.tsx
const getCharAvatarUrl = (charId: string) => {
  const char = gameAssetsService.getCharacter(charId);
  return char ? char.avatar : null;
}

// 使用
<img src={`/api/skland/avatar-proxy?url=${encodeURIComponent(getCharAvatarUrl(charId))}`} />
```

### 2. 材料计划显示物品图标

```typescript
// MaterialPlan.tsx
const getMaterialIcon = (itemId: string) => {
  const item = gameAssetsService.getItem(itemId);
  return item ? item.icon : null;
}

// 使用
<img src={`/api/skland/avatar-proxy?url=${encodeURIComponent(getMaterialIcon('30012'))}`} />
```

### 3. 干员养成显示技能图标

```typescript
// OperatorTraining.tsx
const getSkillIcon = (skillId: string) => {
  const skill = gameAssetsService.getSkill(skillId);
  return skill ? skill.icon : null;
}

// 使用
<img src={`/api/skland/avatar-proxy?url=${encodeURIComponent(getSkillIcon(skillId))}`} />
```

### 4. 搜索功能

```typescript
// Search.tsx
const handleSearch = async (keyword: string) => {
  const chars = gameAssetsService.searchCharacters(keyword);
  const items = gameAssetsService.searchItems(keyword);
  const skills = gameAssetsService.searchSkills(keyword);
  
  return { chars, items, skills };
}
```

## 🛠️ API 端点（可选）

如果需要前端直接查询，可以添加以下路由：

```javascript
// server/routes/assets.js
import express from 'express';
import gameAssetsService from '../services/gameAssetsService.js';

const router = express.Router();

// 获取干员
router.get('/api/assets/character/:id', (req, res) => {
  const char = gameAssetsService.getCharacter(req.params.id);
  res.json({ success: true, data: char });
});

// 搜索干员
router.get('/api/assets/characters/search', (req, res) => {
  const results = gameAssetsService.searchCharacters(req.query.q);
  res.json({ success: true, data: results });
});

// 获取物品
router.get('/api/assets/item/:id', (req, res) => {
  const item = gameAssetsService.getItem(req.params.id);
  res.json({ success: true, data: item });
});

// 获取技能
router.get('/api/assets/skill/:id', (req, res) => {
  const skill = gameAssetsService.getSkill(req.params.id);
  res.json({ success: true, data: skill });
});

// 获取统计信息
router.get('/api/assets/stats', (req, res) => {
  const stats = gameAssetsService.getStats();
  res.json({ success: true, data: stats });
});

export default router;
```

## 📊 数据统计

查看当前加载的资源数量：

```javascript
const stats = gameAssetsService.getStats();
console.log(stats);
// {
//   characters: 434,
//   skills: 1598,
//   items: 1412
// }
```

## ⚠️ 注意事项

1. **图片加载失败**：部分图片可能在 CDN 上不存在，需要做降级处理
2. **数据大小**：三个 JSON 文件总计约 10MB，加载到内存约占用 20-30MB
3. **性能优化**：数据在服务启动时加载到内存，查询速度快
4. **缓存策略**：图片通过代理时设置 24 小时缓存
5. **编码问题**：所有文本数据使用 UTF-8 编码

## 🔍 故障排除

### 问题：数据文件不存在

**解决方法**：
```bash
cd server
npm run fetch-assets
```

### 问题：图片无法显示

**可能原因**：
1. CDN 防盗链
2. 图片文件不存在
3. 网络问题

**解决方法**：
- 使用后端代理：`/api/skland/avatar-proxy?url=...`
- 添加降级处理：显示默认图标或首字母

### 问题：服务启动时报错

**可能原因**：
- 数据文件损坏
- JSON 格式错误

**解决方法**：
```bash
cd server
rm data/characters.json data/skills.json data/items.json
npm run fetch-assets
npm run dev
```

## 📚 相关文件

### 脚本
- `server/scripts/fetch-game-assets.js` - 数据获取脚本

### 服务
- `server/services/gameAssetsService.js` - 资源管理服务

### 数据文件
- `server/data/characters.json` - 干员数据（434 个）
- `server/data/skills.json` - 技能数据（1598 个）
- `server/data/items.json` - 物品数据（1412 个）
- `server/data/stages.json` - 关卡数据（1894 个）

## 🎯 未来扩展

可以添加的功能：
1. **干员详情页**：显示完整的干员信息、技能、天赋等
2. **材料图鉴**：显示所有材料的获取途径和用途
3. **技能模拟器**：计算技能伤害、效果等
4. **干员对比**：对比多个干员的属性和技能
5. **收藏系统**：收藏喜欢的干员和材料

## 📖 参考资料

- [ArknightsGameData](https://github.com/Kengxxiao/ArknightsGameData) - 游戏数据源
- [PRTS Wiki](https://prts.wiki/) - 明日方舟中文 Wiki
- [官方 CDN](https://web.hycdn.cn/arknights/) - 图片资源

---

**最后更新**: 2026-02-12  
**维护者**: @mps233
