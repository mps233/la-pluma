# 亮暗色模式样式迁移指南

## 已完成的全局更新
- ✅ Tailwind 配置（darkMode: 'class'）
- ✅ 全局背景色
- ✅ 导航栏
- ✅ 表单元素（input, select）
- ✅ 复选框
- ✅ 滚动条
- ✅ 主题切换器

## 样式替换规则

### 背景色
```
style={{ backgroundColor: '#070707' }} 
→ className="bg-gray-50 dark:bg-[#070707]"

style={{ backgroundColor: 'rgba(15, 15, 15, 0.6)' }}
→ className="bg-white dark:bg-[rgba(15,15,15,0.6)]"

style={{ backgroundColor: 'rgba(20, 20, 20, 0.6)' }}
→ className="bg-gray-50 dark:bg-[rgba(20,20,20,0.6)]"
```

### 文字颜色
```
text-white → text-gray-900 dark:text-white
text-gray-200 → text-gray-700 dark:text-gray-200
text-gray-300 → text-gray-600 dark:text-gray-300
text-gray-400 → text-gray-500 dark:text-gray-400
text-gray-500 → text-gray-400 dark:text-gray-500
```

### 边框
```
border-white/10 → border-gray-200 dark:border-white/10
border-white/20 → border-gray-300 dark:border-white/20
```

### 状态框和卡片
所有带 `style={{ backgroundColor: ... }}` 的元素都需要改为 Tailwind 类

## 需要更新的组件
- [ ] AutomationTasks.jsx
- [ ] CombatTasks.jsx
- [ ] RoguelikeTasks.jsx
- [ ] ConfigManager.jsx
- [ ] LogViewer.jsx
- [ ] ScreenMonitor.jsx
- [ ] Icons.jsx（可能不需要）
- [ ] MaaControl.jsx
