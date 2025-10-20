import { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { useKeyboardStore, ElementNavigation } from '../store/keyboard';
import { keyboardManager, KeyboardAction } from '../keyboardManager';
import { focusManager } from '../focusManager';

interface UseKeyboardNavigationOptions {
  key?: any;
  elementId: string;
  elementType: 'textlist' | 'carousel' | 'grid' | 'menu' | 'play';
  totalItems: number;
  initialIndex?: number;
  gridColumns?: number;
  resetDeps?: any[];
  resetToIndex?: number;
  onSelect?: (index: number) => void;
  onEscape?: () => void;
  onBack?: () => void;
  onNavigate?: (direction: 'up' | 'down' | 'left' | 'right', index: number) => void;
  isEnabled?: boolean;
}

// 网格导航计算工具函数
const gridNavigationUtils = {
  getRowAndCol: (index: number, cols: number) => ({
    row: Math.floor(index / cols),
    col: index % cols
  }),
  
  getTotalRows: (totalItems: number, cols: number) => Math.ceil(totalItems / cols),
  
  getNewIndex: (index: number, direction: 'up' | 'down' | 'left' | 'right', cols: number, totalItems: number): number => {
    const { row, col } = gridNavigationUtils.getRowAndCol(index, cols);
    const totalRows = gridNavigationUtils.getTotalRows(totalItems, cols);
    let newIndex = index;
    
    switch (direction) {
      case 'up':
        if (row > 0) {
          newIndex = (row - 1) * cols + col;
          if (newIndex >= totalItems) newIndex = Math.min(col, totalItems - 1);
        }
        break;
      case 'down':
        if (row < totalRows - 1) {
          newIndex = (row + 1) * cols + col;
          if (newIndex >= totalItems) newIndex = totalItems - 1;
        }
        break;
      case 'left':
        newIndex = index > 0 ? index - 1 : 0;
        break;
      case 'right':
        newIndex = index < totalItems - 1 ? index + 1 : totalItems - 1;
        break;
    }
    
    return newIndex;
  },
  
  canNavigate: (index: number, direction: 'up' | 'down' | 'left' | 'right', cols: number, totalItems: number): boolean => {
    const { row } = gridNavigationUtils.getRowAndCol(index, cols);
    const totalRows = gridNavigationUtils.getTotalRows(totalItems, cols);
    
    switch (direction) {
      case 'up':
        return row > 0;
      case 'down':
        return row < totalRows - 1;
      case 'left':
      case 'right':
        return true;
    }
  }
};

export const useKeyboardNavigation = ({
  key,
  elementId,
  elementType,
  totalItems,
  initialIndex = 0,
  gridColumns,
  resetDeps,
  resetToIndex,
  onSelect,
  onEscape,
  onBack,
  onNavigate,
  isEnabled = true
}: UseKeyboardNavigationOptions) => {
  const { focusedElement } = useKeyboardStore();
  
  // 使用本地状态管理选中索引，避免依赖全局 focusedElement
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  
  const cols = useMemo(() => {
    if (gridColumns) return gridColumns;
    const defaultCols = Math.floor(Math.sqrt(totalItems)) || 1;
    return Math.max(1, defaultCols);
  }, [gridColumns, totalItems]);
  const isGrid = elementType === 'grid';
  
    // 注册元素
  useEffect(() => {
    return () => {
      focusManager.unregisterElement(elementId);
    };
  }, [elementId]);
  
  // 初始化时注册元素（仅依赖于 elementId）
  useEffect(() => {
    if (!isEnabled) return;
    
    const elementNavigation: ElementNavigation = {
      id: elementId,
      type: elementType,
      totalItems,
      selectedIndex,
      canNavigate: {
        up: true, down: true, left: true, right: true, select: true, back: true
      }
    };
    
    focusManager.registerElement(elementNavigation);
  }, [elementId, elementType, totalItems, isEnabled]);
  
  // 当 selectedIndex 变化时，更新焦点元素的信息
  useEffect(() => {
    if (!isEnabled) return;
    focusManager.updateElementNavigation(elementId, { selectedIndex });
  }, [elementId, selectedIndex, isEnabled]);

  // 依赖变化时重置选中索引
  useEffect(() => {
    if (!isEnabled) return;
    if (typeof resetToIndex === 'number') {
      setSelectedIndex(resetToIndex);
    } else {
      setSelectedIndex(initialIndex);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, initialIndex, resetToIndex, ...(Array.isArray(resetDeps) ? resetDeps : [])]);
  
  // 更新导航状态
  const updateNavigationState = useCallback((newIndex: number) => {
    setSelectedIndex(newIndex);
  }, []);

  // 键盘事件处理器（使用 ref 获取最新的焦点元素，避免依赖变化导致频繁重新创建）
  const focusedElementRef = useRef<ElementNavigation | null>(null);
  
  useEffect(() => {
    focusedElementRef.current = focusedElement;
  }, [focusedElement]);

  const handleKeyboardAction = useCallback((action: KeyboardAction, event: KeyboardEvent): boolean => {
    // 使用 ref 检查焦点，而不是依赖
    if (focusedElementRef.current?.id !== elementId) {
      console.log(`[useKeyboardNavigation] 焦点不匹配: focusedElement=${focusedElementRef.current?.id}, elementId=${elementId}`);
      return false;
    }
    
    console.log(`[useKeyboardNavigation] 处理 action=${action}, elementId=${elementId}, selectedIndex=${selectedIndex}`);
    
    let newIndex = selectedIndex;
    let shouldUpdate = false;
    
    switch (action) {
      case 'navigateUp':
      case 'navigateDown':
      case 'navigateLeft':
      case 'navigateRight': {
        if (isGrid) {
          newIndex = gridNavigationUtils.getNewIndex(selectedIndex, action.replace('navigate', '').toLowerCase() as any, cols, totalItems);
        } else {
          // 非Grid元素支持循环
          const directions: Record<string, number> = {
            navigateUp: -1,
            navigateDown: 1,
            navigateLeft: -1,
            navigateRight: 1
          };
          const step = directions[action] || 0;
          newIndex = (selectedIndex + step + totalItems) % totalItems;
        }
        shouldUpdate = newIndex !== selectedIndex;
        onNavigate?.(action.replace('navigate', '').toLowerCase() as any, newIndex);
        console.log(`[useKeyboardNavigation] navigated: direction=${action}, newIndex=${newIndex}, shouldUpdate=${shouldUpdate}`);
        break;
      }
      case 'select':
        onSelect?.(selectedIndex);
        return true;
      case 'back':
        onBack?.();
        return true;
      case 'menu':
        onEscape?.();
        return true;
      default:
        return false;
    }
    
    if (shouldUpdate) {
      console.log(`[useKeyboardNavigation] 更新状态: selectedIndex=${selectedIndex} -> ${newIndex}`);
      updateNavigationState(newIndex);
    }
    
    return true;
  }, [elementId, selectedIndex, totalItems, cols, isGrid, onNavigate, onSelect, onBack, onEscape, updateNavigationState]);
  
  // 注册键盘事件监听器
  useEffect(() => {
    if (isEnabled) {
      keyboardManager.addEventListener(handleKeyboardAction);
    } else {
      keyboardManager.removeEventListener(handleKeyboardAction);
    }
    
    return () => {
      keyboardManager.removeEventListener(handleKeyboardAction);
    };
  }, [handleKeyboardAction, isEnabled]);
  
  // 启动键盘监听（仅在应用首次加载时启动一次，之后不再停止）
  useEffect(() => {
    keyboardManager.startListening();
    // 不在cleanup中调用stopListening()，避免完全停止监听
    // stopListening会导致其他页面无法响应键盘和手柄
  }, []);
  
  return {
    selectedIndex,
    setSelectedIndex: (index: number) => {
      updateNavigationState(index);
    },
    isFocused: focusedElement?.id === elementId
  };
};
