# 键盘导航快速参考

## 核心概念

### 旧架构（已移除）
```
focusManager 维护全局焦点堆栈
  ├─ 元素注册/注销
  ├─ 焦点切换
  └─ 焦点恢复
```

### 新架构（当前）
```
useKeyboardNavigation (页面级)
  ├─ 本地状态: selectedIndex
  ├─ 控制参数: isEnabled
  └─ 回调: onSelect, onBack, onEscape
```

---

## 使用指南

### 在页面中使用

```tsx
import { useKeyboardNavigation } from '@/app/(main)/hooks/useKeyboardNavigation';

export default function YourPage() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // ✅ 方式 1: Hook 管理导航（推荐）
  const { selectedIndex: navIndex } = useKeyboardNavigation({
    elementId: 'your-view',
    elementType: 'textlist',      // 'textlist' | 'carousel' | 'grid' | 'menu' | 'play'
    totalItems: items.length,
    initialIndex: 0,
    isEnabled: true,              // 🔑 控制是否响应键盘
    onSelect: (index) => {
      console.log('Selected:', index);
    },
    onNavigate: (direction, index) => {
      console.log(`Navigated ${direction} to ${index}`);
    },
    onBack: () => {
      console.log('Back pressed');
    },
    onEscape: () => {
      console.log('Escape pressed');
    }
  });
  
  return (
    <div>
      <YourElement 
        items={items}
        selectedIndex={navIndex}
      />
    </div>
  );
}
```

### 在元素组件中使用

```tsx
// ✅ 正确：接收 selectedIndex 作为 props
interface YourElementProps {
  items: Array<{ name: string }>;
  selectedIndex: number;
  view?: 'system' | 'gamelist' | 'menu';
}

export default function YourElement({ items, selectedIndex, view }: YourElementProps) {
  // ❌ 不调用 useKeyboardNavigation
  
  return (
    <div>
      {items.map((item, index) => (
        <div
          key={index}
          style={{
            backgroundColor: index === selectedIndex ? 'blue' : 'gray'
          }}
        >
          {item.name}
        </div>
      ))}
    </div>
  );
}
```

---

## 配置选项详解

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `elementId` | string | ✅ | 唯一标识符，如 'system-view' |
| `elementType` | string | ✅ | 元素类型: 'textlist'\|'carousel'\|'grid'\|'menu'\|'play' |
| `totalItems` | number | ✅ | 列表项总数 |
| `initialIndex` | number | ❌ | 初始选中索引，默认 0 |
| `gridColumns` | number | ❌ | Grid 布局列数（仅 grid 类型需要） |
| `resetDeps` | any[] | ❌ | 依赖项数组，当数组变化时重置选中索引 |
| `isEnabled` | boolean | ❌ | 是否启用键盘导航，默认 true |
| `onSelect` | function | ❌ | 选择项时调用 |
| `onNavigate` | function | ❌ | 导航时调用 |
| `onBack` | function | ❌ | 按下返回键时调用 |
| `onEscape` | function | ❌ | 按下菜单/逃脱键时调用 |

---

## 返回值

```tsx
const { selectedIndex, setSelectedIndex, isFocused } = useKeyboardNavigation({...});

// selectedIndex: 当前选中项的索引
// setSelectedIndex: 手动设置选中索引（如需要）
// isFocused: 当前元素是否获得焦点（isEnabled 值）
```

---

## 控制导航启用/禁用

### 场景 1: 加载时禁用

```tsx
const [loading, setLoading] = useState(false);

const { selectedIndex } = useKeyboardNavigation({
  // ...
  isEnabled: !loading  // ✅ 加载时自动禁用
});
```

### 场景 2: 基于状态禁用

```tsx
const [isMenuOpen, setIsMenuOpen] = useState(false);

const { selectedIndex } = useKeyboardNavigation({
  // ...
  isEnabled: !isMenuOpen  // ✅ 菜单打开时禁用页面导航
});
```

### 场景 3: 菜单集成

```tsx
export default function MenuModal() {
  const { isThemeSelectorOpen } = useModalStore();
  
  const { selectedIndex } = useKeyboardNavigation({
    elementId: 'menu-modal',
    elementType: 'menu',
    totalItems: menuItems.length,
    isEnabled: isThemeSelectorOpen,  // ✅ 只在打开时启用
    onSelect: handleMenuSelect,
    onBack: handleMenuBack,
    onEscape: closeMenu
  });
  
  return isThemeSelectorOpen ? <MenuContent selectedIndex={selectedIndex} /> : null;
}
```

---

## 按键映射

### 支持的导航动作

| 动作 | 描述 |
|------|------|
| `navigateUp` | 向上导航 |
| `navigateDown` | 向下导航 |
| `navigateLeft` | 向左导航 |
| `navigateRight` | 向右导航 |
| `select` | 选择项目 |
| `back` | 返回/后退 |
| `menu` / `action` | 打开菜单/执行动作 |

### 按键映射位置

默认映射在 `keyboardManager.ts` 和 `useKeyboardStore` 中配置。

---

## 导航算法

### TextList / Carousel
- **上/左**: 向前移动（支持循环）
- **下/右**: 向后移动（支持循环）

### Grid
- **上**: 向上一行移动（不循环）
- **下**: 向下一行移动（不循环）
- **左/右**: 在行内移动（支持循环）

### 自定义列数

```tsx
const { selectedIndex } = useKeyboardNavigation({
  // ...
  elementType: 'grid',
  gridColumns: 3,  // ✅ 指定列数
});
```

---

## 常见问题

### Q1: 如何在多个元素中使用？

```tsx
// ❌ 错误：每个元素各自调用 Hook
<TextList1 />  // 内部调用 useKeyboardNavigation
<TextList2 />  // 内部调用 useKeyboardNavigation

// ✅ 正确：页面级管理，条件切换
const view = useThemeStore((s) => s.view);

if (view === 'system') {
  const { selectedIndex } = useKeyboardNavigation({...system options...});
  return <SystemView selectedIndex={selectedIndex} />;
} else if (view === 'gamelist') {
  const { selectedIndex } = useKeyboardNavigation({...gamelist options...});
  return <GameListView selectedIndex={selectedIndex} />;
}
```

### Q2: 如何在加载数据时保留选中位置？

```tsx
const [gameList, setGameList] = useState([]);
const [selectedIndex, setSelectedIndex] = useState(0);

const { selectedIndex: navIndex } = useKeyboardNavigation({
  elementId: 'gamelist',
  elementType: 'textlist',
  totalItems: gameList.length,
  initialIndex: selectedIndex,
  isEnabled: gameList.length > 0,  // ✅ 有数据才启用
  resetDeps: [gameList]  // ✅ 刷新时重置
});
```

### Q3: 如何处理异步操作后的选择？

```tsx
const handleSelect = async (index: number) => {
  const item = items[index];
  try {
    // 执行异步操作
    await launchGame(item);
  } catch (err) {
    console.error('Failed:', err);
  }
};

const { selectedIndex } = useKeyboardNavigation({
  // ...
  onSelect: handleSelect  // ✅ 自动处理异步
});
```

---

## 调试技巧

### 1. 启用日志

```tsx
const { selectedIndex } = useKeyboardNavigation({
  // ...
  onNavigate: (direction, index) => {
    console.log(`[NAVIGATION] ${direction} → ${index}`);
  }
});
```

### 2. 监控状态变化

```tsx
useEffect(() => {
  console.log('Selected index changed:', selectedIndex);
}, [selectedIndex]);
```

### 3. 检查键盘事件

在浏览器开发者工具中：
```js
// 临时启用所有键盘事件日志
document.addEventListener('keydown', (e) => {
  console.log(`Key: ${e.code} → Action: ${getActionFromCode(e.code)}`);
});
```

---

## 迁移检查清单

如果你要迁移现有组件，参考这个清单：

- [ ] 从组件中移除 `useKeyboardNavigation` 调用
- [ ] 移除 `onItemSelect`, `onBack`, `onEscape` props
- [ ] 在页面级添加 `useKeyboardNavigation` Hook
- [ ] 从页面级传递 `selectedIndex` 给组件
- [ ] 测试导航是否正常工作
- [ ] 删除组件中任何 `focusManager` 相关代码
- [ ] 验证 TypeScript 编译无错误

---

## 相关文件

- 📄 **Hook 实现**: `src/app/(main)/hooks/useKeyboardNavigation.ts`
- 📄 **键盘管理**: `src/app/(main)/keyboardManager.ts`
- 📄 **存储**: `src/app/(main)/store/keyboard.ts`
- 📄 **示例1**: `src/app/(main)/system/page.tsx`
- 📄 **示例2**: `src/app/(main)/gamelist/[system]/page.tsx`

---

**最后更新**: 2025-10-20  
**版本**: 2.0 (无焦点管理器)
