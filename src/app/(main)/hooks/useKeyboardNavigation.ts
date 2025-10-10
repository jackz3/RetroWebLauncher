import { useEffect, useCallback } from 'react';
import { useKeyboardStore, ElementNavigation } from '../store/keyboard';
import { keyboardManager, KeyboardAction } from '../keyboardManager';
import { focusManager } from '../focusManager';

interface UseKeyboardNavigationOptions {
  key?: any;
  elementId: string;
  elementType: 'textlist' | 'carousel' | 'grid' | 'menu' | 'play';
  totalItems: number;
  initialIndex?: number;
  // Number of columns in a grid; when provided, ArrowUp/Down will move by this step.
  gridColumns?: number;
  resetDeps?: any[]; // when these deps change, reset selectedIndex to initialIndex
  resetToIndex?: number; // override initialIndex on reset
  onSelect?: (index: number) => void;
  onEscape?: () => void;
  onBack?: () => void;
  onNavigate?: (direction: 'up' | 'down' | 'left' | 'right', index: number) => void;
  isEnabled?: boolean;
}

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
  const { focusedElement, updateElementNavigation } = useKeyboardStore();
  
  // 当前选中索引
  const selectedIndex = focusedElement?.id === elementId ? focusedElement.selectedIndex : initialIndex;
  
  // 更新元素导航状态
  const updateNavigation = useCallback((updates: Partial<ElementNavigation>) => {
    updateElementNavigation(elementId, updates);
  }, [elementId, updateElementNavigation]);
  
  // 注册元素
  useEffect(() => {
    // if (!isEnabled) {
    //   focusManager.unregisterElement(elementId);
    //   return;
    // }
    
    return () => {
      focusManager.unregisterElement(elementId);
    };
  }, [elementId, isEnabled]);
  
  useEffect(() => {
    if (!isEnabled) return;
    // 对于TextList等非Grid元素，上下导航总是可用（支持循环）
    const canNavigateUp = elementType === 'grid' ? initialIndex > 0 : true;
    const canNavigateDown = elementType === 'grid' ? initialIndex < totalItems - 1 : true;
    
    const elementNavigation: ElementNavigation = {
      id: elementId,
      type: elementType,
      totalItems,
      selectedIndex: initialIndex,
      canNavigate: {
        up: canNavigateUp,
        down: canNavigateDown,
        left: true,
        right: true,
        select: true,
        back: true
      }
    };
    
    focusManager.registerElement(elementNavigation);

  }, [elementId, elementType, totalItems, initialIndex, isEnabled]);

  // dependency-driven reset of selection index
  useEffect(() => {
    if (!isEnabled) return;
    const idx = typeof resetToIndex === 'number' ? resetToIndex : initialIndex;
    updateNavigation({ selectedIndex: idx });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, initialIndex, resetToIndex, ...(Array.isArray(resetDeps) ? resetDeps : [])]);
  // 键盘事件处理器
  const handleKeyboardAction = useCallback((action: KeyboardAction, event: KeyboardEvent): boolean => {
    if (focusedElement?.id !== elementId) return false;
    
    let newIndex = selectedIndex;
  const cols = Math.max(1, ((gridColumns ?? Math.floor(Math.sqrt(totalItems))) || 1));
    
    switch (action) {
      case 'navigateUp':
        if (elementType === 'grid') {
          // Grid元素的上导航：移动到上一行的同一列
          const itemsPerRow = cols;
          const currentRow = Math.floor(selectedIndex / itemsPerRow);
          const currentCol = selectedIndex % itemsPerRow;
          
          if (currentRow > 0) {
            newIndex = selectedIndex - itemsPerRow;
            // 确保不超过总项目数
            if (newIndex >= totalItems) {
              newIndex = (currentRow - 1) * itemsPerRow + Math.min(currentCol, (totalItems - 1) % itemsPerRow);
            }
          }
        } else {
          // 其他元素类型的上导航（支持循环）
          if (selectedIndex > 0) {
            newIndex = selectedIndex - 1;
          } else {
            // 如果在第一项，循环到最后一项
            newIndex = totalItems - 1;
          }
        }
        onNavigate?.('up', newIndex);
        break;
      case 'navigateDown':
        if (elementType === 'grid') {
          // Grid元素的下导航：移动到下一行的同一列
          const itemsPerRow = cols;
          const currentRow = Math.floor(selectedIndex / itemsPerRow);
          const currentCol = selectedIndex % itemsPerRow;
          const totalRows = Math.ceil(totalItems / itemsPerRow);
          
          if (currentRow < totalRows - 1) {
            newIndex = selectedIndex + itemsPerRow;
            // 确保不超过总项目数
            if (newIndex >= totalItems) {
              newIndex = (currentRow + 1) * itemsPerRow + Math.min(currentCol, (totalItems - 1) % itemsPerRow);
            }
          }
        } else {
          // 其他元素类型的下导航（支持循环）
          if (selectedIndex < totalItems - 1) {
            newIndex = selectedIndex + 1;
          } else {
            // 如果在最后一项，循环到第一项
            newIndex = 0;
          }
        }
        onNavigate?.('down', newIndex);
        break;
      case 'navigateLeft':
        // 处理网格布局的左导航；非 grid 转发给 onNavigate 以支持自定义行为（如 VFS 删除确认）
        if (elementType === 'grid') {
          const itemsPerRow = cols;
          // 修改为跨行移动：在行首时移动到上一行末尾
          if (selectedIndex % itemsPerRow > 0) {
            newIndex = selectedIndex - 1;
          } else {
            // 在行首时移动到上一行末尾
            newIndex = selectedIndex - 1;
          }
          // Clamp 至合法范围
          if (newIndex < 0) newIndex = 0;
          onNavigate?.('left', newIndex);
        } else {
          onNavigate?.('left', selectedIndex);
        }
        break;
      case 'navigateRight':
        // 处理网格布局的右导航；非 grid 转发给 onNavigate 以支持自定义行为
        if (elementType === 'grid') {
          const itemsPerRow = cols;
          // 修改为跨行移动：在行尾时移动到下一行开头
          if (selectedIndex % itemsPerRow < itemsPerRow - 1) {
            newIndex = selectedIndex + 1;
          } else {
            // 在行尾时移动到下一行开头
            newIndex = selectedIndex + 1;
          }
          // Clamp 至合法范围，避免落到不存在的位置（例如最后一项后面）
          if (newIndex >= totalItems) newIndex = totalItems - 1;
          onNavigate?.('right', newIndex);
        } else {
          onNavigate?.('right', selectedIndex);
        }
        break;
      case 'select':
        onSelect?.(selectedIndex);
        return true;
      case 'back':
        onBack?.();
        return true;
      case 'menu':
        onEscape?.()
        return true;
    }
    
    // 更新导航状态
    if (newIndex !== selectedIndex) {
      // 对于TextList等非Grid元素，上下导航总是可用（支持循环）
      let canNavigateUp = true;
      let canNavigateDown = true;
      const canNavigateLeft = true;
      const canNavigateRight = true;
      
      // Grid元素的导航状态更新
      if (elementType === 'grid') {
        const itemsPerRow = cols;
        const currentRow = Math.floor(newIndex / itemsPerRow);
        const totalRows = Math.ceil(totalItems / itemsPerRow);
        const currentCol = newIndex % itemsPerRow;
        
        canNavigateUp = currentRow > 0;
        canNavigateDown = currentRow < totalRows - 1;
        // 左右导航在Grid中总是可用，因为我们实现了跨行移动
      }
      
      updateNavigation({
        selectedIndex: newIndex,
        canNavigate: {
          up: canNavigateUp,
          down: canNavigateDown,
          left: canNavigateLeft,
          right: canNavigateRight,
          select: true,
          back: true
        }
      });
    }
    
    return true;
  }, [focusedElement, elementId, selectedIndex, totalItems, gridColumns, elementType, onNavigate, onSelect, onBack, onEscape, updateNavigation]);
  
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
  
  // 启动键盘监听
  useEffect(() => {
    keyboardManager.startListening();
    
    return () => {
      keyboardManager.stopListening();
    };
  }, []);
  
  return {
    selectedIndex,
    setSelectedIndex: (index: number) => {
      updateNavigation({ selectedIndex: index });
    },
    isFocused: focusedElement?.id === elementId
  };
};
