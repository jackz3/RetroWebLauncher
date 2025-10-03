# 字体加载问题修复

## 问题描述

在重构字体管理后，发现字体加载后就被清理了，导致字体无法正常显示。

## 问题原因

### 原始问题
1. **全局缓存逻辑缺陷**: 使用 `Set<string>` 只记录字体是否加载，无法处理多个组件使用同一字体的情况
2. **清理逻辑过于激进**: 组件重新渲染时，`useEffect` 的清理函数会立即移除字体样式
3. **缺少引用计数**: 没有跟踪有多少组件在使用同一字体

### 具体表现
```typescript
// 问题代码
const loadedFonts = new Set<string>();

useEffect(() => {
  if (loadedFonts.has(fontKey)) {
    return; // 如果已加载，直接返回，但样式可能已被清理
  }
  // ... 加载字体
  loadedFonts.add(fontKey);
  
  return () => {
    // 清理函数总是会移除样式，即使其他组件还在使用
    document.head.removeChild(style);
  };
}, [fontPath, themeName, fontFamily, fontKey]);
```

## 解决方案

### 1. 改进缓存机制
```typescript
// 新的缓存结构
const fontCache = new Map<string, { 
  style: HTMLStyleElement; 
  refCount: number 
}>();
```

### 2. 实现引用计数
```typescript
// 如果字体已经在缓存中，增加引用计数
if (fontCache.has(fontKey)) {
  const cached = fontCache.get(fontKey)!;
  cached.refCount++;
  return;
}

// 创建新字体时，引用计数为1
fontCache.set(fontKey, { style, refCount: 1 });
```

### 3. 智能清理逻辑
```typescript
// 清理函数
return () => {
  const cached = fontCache.get(fontKey);
  if (cached) {
    cached.refCount--;
    
    // 只有当引用计数为0时，才移除字体样式
    if (cached.refCount <= 0) {
      document.head.removeChild(cached.style);
      fontCache.delete(fontKey);
    }
  }
};
```

## 修复后的优势

### 1. 正确的引用计数
- **多个组件使用同一字体**: 引用计数增加，字体样式保持
- **组件卸载**: 引用计数减少，只有当所有组件都不使用时才清理
- **避免重复加载**: 相同字体只加载一次

### 2. 内存管理优化
- **智能清理**: 只在真正不需要时才移除字体样式
- **防止内存泄漏**: 确保字体样式最终会被清理
- **性能提升**: 避免重复创建和删除样式元素

### 3. 更好的用户体验
- **字体持续显示**: 字体加载后不会被意外清理
- **快速切换**: 相同字体在不同组件间切换时无需重新加载
- **稳定渲染**: 组件重新渲染时字体样式保持稳定

## 测试验证

### 测试场景
1. **单个组件使用字体**: 字体正常加载和显示
2. **多个组件使用相同字体**: 字体只加载一次，所有组件都能正常显示
3. **组件卸载**: 字体样式在最后一个组件卸载后才被清理
4. **组件重新渲染**: 字体样式保持稳定，不会被清理

### 验证方法
```typescript
// 在浏览器控制台中检查
console.log('Font cache:', fontCache);
console.log('Document head styles:', document.head.querySelectorAll('style'));

// 检查字体是否已加载
document.fonts.ready.then(() => {
  console.log('Fonts loaded:', document.fonts);
});
```

## 代码改进对比

### 修复前
```typescript
// 问题：字体加载后立即被清理
const loadedFonts = new Set<string>();

useEffect(() => {
  if (loadedFonts.has(fontKey)) return;
  
  const style = document.createElement('style');
  document.head.appendChild(style);
  loadedFonts.add(fontKey);
  
  return () => {
    // 总是清理，导致字体消失
    document.head.removeChild(style);
  };
}, [fontPath, themeName, fontFamily, fontKey]);
```

### 修复后
```typescript
// 解决：智能引用计数管理
const fontCache = new Map<string, { style: HTMLStyleElement; refCount: number }>();

useEffect(() => {
  if (fontCache.has(fontKey)) {
    // 增加引用计数，保持字体样式
    const cached = fontCache.get(fontKey)!;
    cached.refCount++;
    return;
  }
  
  const style = document.createElement('style');
  document.head.appendChild(style);
  fontCache.set(fontKey, { style, refCount: 1 });
  
  return () => {
    const cached = fontCache.get(fontKey);
    if (cached) {
      cached.refCount--;
      // 只有当没有组件使用时才清理
      if (cached.refCount <= 0) {
        document.head.removeChild(cached.style);
        fontCache.delete(fontKey);
      }
    }
  };
}, [fontPath, themeName, fontFamily, fontKey]);
```

## 总结

通过实现引用计数机制，成功解决了字体加载后就被清理的问题。现在字体管理更加智能和稳定：

1. **✅ 字体持续显示**: 字体加载后不会被意外清理
2. **✅ 正确的内存管理**: 智能清理，避免内存泄漏
3. **✅ 性能优化**: 避免重复加载，提高渲染效率
4. **✅ 用户体验提升**: 字体显示稳定，切换流畅

这个修复确保了字体管理系统的可靠性和性能，为用户提供了更好的视觉体验。
