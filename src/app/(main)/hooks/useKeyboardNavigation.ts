import { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { keyboardManager, KeyboardAction } from '../keyboardManager';

interface UseKeyboardNavigationOptions {
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
  elementType,
  totalItems,
  initialIndex = 0,
  gridColumns,
  resetDeps = [],
  resetToIndex,
  onSelect,
  onEscape,
  onBack,
  onNavigate,
  isEnabled = true
}: UseKeyboardNavigationOptions) => {
  // ✅ 使用本地状态管理选中索引，完全移除焦点管理器依赖
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const handlerRef = useRef<((action: KeyboardAction, event: KeyboardEvent) => boolean) | null>(null);
  
  // 计算网格列数
  const cols = useMemo(() => {
    if (gridColumns) return gridColumns;
    if (elementType !== 'grid') return 1;
    
    // 根据 totalItems 智能计算列数
    if (totalItems <= 4) return Math.ceil(Math.sqrt(totalItems));
    if (totalItems <= 9) return 3;
    return 4;
  }, [gridColumns, totalItems, elementType]);
  
  const isGrid = elementType === 'grid';
  
  // ✅ 重置选中索引
  useEffect(() => {
    if (typeof resetToIndex === 'number') {
      setSelectedIndex(resetToIndex);
    } else {
      setSelectedIndex(initialIndex);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIndex, resetToIndex, ...(Array.isArray(resetDeps) ? resetDeps : [])]);
  
  // ✅ 处理导航逻辑
  const handleNavigation = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    let newIndex = selectedIndex;
    
    if (isGrid) {
      newIndex = gridNavigationUtils.getNewIndex(selectedIndex, direction, cols, totalItems);
    } else {
      // TextList / Carousel：支持循环导航
      switch (direction) {
        case 'up':
        case 'left':
          newIndex = (selectedIndex - 1 + totalItems) % totalItems;
          break;
        case 'down':
        case 'right':
          newIndex = (selectedIndex + 1) % totalItems;
          break;
      }
    }
    
    if (newIndex !== selectedIndex) {
      setSelectedIndex(newIndex);
      onNavigate?.(direction, newIndex);
    }
  }, [selectedIndex, totalItems, cols, isGrid, onNavigate]);
  
  // ✅ 创建键盘事件处理器
  useEffect(() => {
    if (!isEnabled || totalItems === 0) {
      if (handlerRef.current) {
        keyboardManager.removeEventListener(handlerRef.current);
        handlerRef.current = null;
      }
      return;
    }
    
    const handler = (action: KeyboardAction, event: KeyboardEvent): boolean => {
      if (!isEnabled) return false;
      
      switch (action) {
        case 'navigateUp':
          event.preventDefault();
          handleNavigation('up');
          return true;
        
        case 'navigateDown':
          event.preventDefault();
          handleNavigation('down');
          return true;
        
        case 'navigateLeft':
          event.preventDefault();
          handleNavigation('left');
          return true;
        
        case 'navigateRight':
          event.preventDefault();
          handleNavigation('right');
          return true;
        
        case 'select':
          event.preventDefault();
          onSelect?.(selectedIndex);
          return true;
        
        case 'back':
          event.preventDefault();
          onBack?.();
          return true;
        
        case 'menu':
        case 'action':
          event.preventDefault();
          onEscape?.();
          return true;
        
        default:
          return false;
      }
    };
    
    handlerRef.current = handler;
    keyboardManager.addEventListener(handler);
    
    return () => {
      if (handlerRef.current) {
        keyboardManager.removeEventListener(handlerRef.current);
        handlerRef.current = null;
      }
    };
  }, [isEnabled, totalItems, selectedIndex, handleNavigation, onSelect, onBack, onEscape]);
  
  // ✅ 启动键盘监听（仅在应用首次加载时启动一次）
  useEffect(() => {
    keyboardManager.startListening();
    // 不在cleanup中调用stopListening()，避免完全停止监听
  }, []);
  
  return {
    selectedIndex,
    setSelectedIndex,
    isFocused: isEnabled
  };
};
