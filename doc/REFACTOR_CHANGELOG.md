# 键盘导航重构 - 变更清单

## 🎯 重构目标

移除 `focusManager`，通过在页面层级使用 `useKeyboardNavigation` Hook 和 `isEnabled` 参数直接控制键盘导航，简化架构。

## ✅ 完成的变更

### 1️⃣ Core Hook 更新 - `useKeyboardNavigation.ts`

**移除：**
- `focusManager` 导入和所有相关调用
- `useKeyboardStore` 中的焦点检查（`focusedElement`）
- 元素的注册/注销逻辑
- 焦点堆栈管理

**保留：**
- 网格导航计算工具函数
- 导航状态管理（`selectedIndex`）
- 键盘事件监听器注册

**新增：**
- ✅ `isEnabled` 参数完全控制响应

### 2️⃣ 元素组件清理 - 从 UI 层移除导航

#### TextListElement.tsx
```diff
- import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
- const { selectedIndex } = useKeyboardNavigation({...});
+ // 仅接收 selectedIndex 作为 props

interface TextListElementProps {
  element: any;
  themeVariables?: any;
  items?: Array<{ name: string; [key: string]: any }>;
  selectedIndex?: number;  // ✅ 从上级传入
  view?: 'system' | 'gamelist' | 'menu';
}
```

#### CarouselElement.tsx
```diff
- import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
- const { selectedIndex } = useKeyboardNavigation({...});
+ // 使用传入的 externalSelectedIndex，移除 onClick 处理
```

#### GridElement.tsx
```diff
- import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
- const { selectedIndex } = useKeyboardNavigation({...});
+ // 仅使用 externalSelectedIndex 进行滚动计算
```

### 3️⃣ 页面层级导航集成

#### System Page (`system/page.tsx`)
```tsx
// ✅ 页面级 Hook - 管理所有导航
const { selectedIndex } = useKeyboardNavigation({
  elementId: 'system-view',
  elementType: 'textlist',
  totalItems: systemItems.length,
  initialIndex: initialIndex,
  isEnabled: true,
  onSelect: (index) => {
    const system = systemItems[index].system;
    setSelectedSystem(system);
    router.push(`/gamelist/${system}`);
  },
  onBack: () => {},
  onEscape: openThemeSelector
});
```

#### GameList Page (`gamelist/[system]/page.tsx`)
```tsx
// ✅ 页面级 Hook - 管理所有导航
const { selectedIndex } = useKeyboardNavigation({
  elementId: 'gamelist-view',
  elementType: 'textlist',
  totalItems: gameList.length,
  initialIndex: 0,
  isEnabled: !loading,  // ✅ 加载时禁用
  onSelect: (index) => {
    const selectedGame = gameList[index];
    router.push(`/play?s=${selectedGame.system}&g=${selectedGame.file}`);
  },
  onBack: () => router.push('/system'),
  onEscape: openThemeSelector
});

// ✅ 移除 focusManager.clearFocusStack()
```

### 4️⃣ ElementRenderer 简化

```diff
interface ElementRendererProps {
  element: any;
  themeVariables?: any;
  themeName?: string;
  items?: Array<{ name: string; [key: string]: any }>;
  item?: { name: string; [key: string]: any };
  selectedIndex?: number;
- onItemSelect?: (index: number) => void;
- onBack?: () => void;
- onEscape?: () => void;
  view: 'system' | 'gamelist' | 'menu';
}

// ✅ 组件调用更新
<TextListElement
  element={element}
  items={items}
  selectedIndex={selectedIndex}
  view={view}
/>
```

### 5️⃣ MenuModal 更新

```diff
- import { focusManager } from '../focusManager';

  // 打开菜单时
  setView('menu');
- focusManager.focusElement('menu-modal');  ❌ 移除

  // 关闭菜单时
- focusManager.popFocus();  ❌ 移除
  setView(previousViewRef.current);  ✅ 恢复视图

// ✅ 后续可集成 useKeyboardNavigation
// const { selectedIndex } = useKeyboardNavigation({
//   elementId: 'menu-modal',
//   elementType: 'menu',
//   totalItems: menuState.current.length,
//   isEnabled: isThemeSelectorOpen,
//   ...
// });
```

### 6️⃣ Play Page 清理

```diff
- import { focusManager } from '../focusManager';
- import { ElementNavigation } from '../store/keyboard';

  // ✅ 移除不必要的元素注册
- const playElement: ElementNavigation = {...};
- focusManager.registerElement(playElement);
- return () => focusManager.unregisterElement('play-canvas');
```

### 7️⃣ 文件删除

```bash
❌ rm src/app/(main)/focusManager.ts
```

## 📊 影响范围

| 文件 | 改动 | 行数 |
|------|------|------|
| `useKeyboardNavigation.ts` | 修改 | -150 |
| `TextListElement.tsx` | 修改 | -40 |
| `CarouselElement.tsx` | 修改 | -35 |
| `GridElement.tsx` | 修改 | -40 |
| `system/page.tsx` | 修改 | +20 |
| `gamelist/[system]/page.tsx` | 修改 | +30 |
| `ElementRenderer.tsx` | 修改 | -25 |
| `MenuModal.tsx` | 修改 | -8 |
| `play/page.tsx` | 修改 | -12 |
| `focusManager.ts` | 删除 | -217 |
| **总计** | | **-477 行代码** |

## 🔄 导航流程变化

### 旧流程
```
Key/Gamepad → KeyboardManager → focusManager (焦点堆栈)
           → useKeyboardNavigation (组件级)
           → selectedIndex (更新 UI)
```

### 新流程
```
Key/Gamepad → KeyboardManager → useKeyboardNavigation (页面级)
           → selectedIndex (更新 UI)
           → 回调：onSelect/onBack/onEscape (业务逻辑)
```

## 🧪 测试验证

- ✅ TypeScript 编译无错误
- ✅ 开发服务器正常启动 (port 3004)
- ⏳ 功能测试待进行：
  - [ ] System View: ↑↓ 导航、Enter 选择、Esc 菜单
  - [ ] GameList View: ↑↓ 导航、Enter 启动、B 返回、Esc 菜单
  - [ ] Menu View: ↑↓ 导航、Enter 选择、B/Esc 关闭

## 💡 架构优势

| 优势 | 说明 |
|------|------|
| **简洁** | 移除焦点堆栈管理，直接使用状态 |
| **清晰** | 导航逻辑集中在页面级，易于理解 |
| **可维护** | 减少跨层级通信，更易调试 |
| **轻量** | 移除 ~220 行代码和一个类 |
| **灵活** | `isEnabled` 可以根据任何条件动态控制 |

## 📝 后续优化

1. **MenuModal 完整集成**
   - [ ] 集成 `useKeyboardNavigation` Hook
   - [ ] 处理菜单嵌套导航

2. **EventListener 优化**
   - [ ] 确保多重调用 `startListening()` 时不会重复注册
   - [ ] 考虑使用 WeakMap 存储监听器

3. **文档更新**
   - [ ] 更新 `CLAUDE.md` 中的架构说明
   - [ ] 补充 `useKeyboardNavigation` 使用示例

---

**完成时间**: 2025-10-20  
**重构分支**: haiku  
**总代码删减**: 477 行
