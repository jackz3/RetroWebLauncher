import { useKeyboardStore } from './store/keyboard';
import { elementNavigationRegistry } from './elementNavigation';

// 键盘事件处理器类型
export type KeyboardAction = 
  | 'navigateUp'
  | 'navigateDown' 
  | 'navigateLeft'
  | 'navigateRight'
  | 'select'
  | 'back'
  | 'action'
  | 'menu'
  | 'settings';

// 键盘管理器类
export class KeyboardManager {
  private static instance: KeyboardManager;
  private isListening = false;
  private eventListeners: ((action: KeyboardAction, event: KeyboardEvent) => boolean)[] = [];
  
  private constructor() {}
  
  static getInstance(): KeyboardManager {
    if (!KeyboardManager.instance) {
      KeyboardManager.instance = new KeyboardManager();
    }
    return KeyboardManager.instance;
  }
  
  // 启动键盘监听
  startListening(): void {
    if (this.isListening) return;
    
    document.addEventListener('keydown', this.handleKeyDown);
    this.isListening = true;
  }
  
  // 停止键盘监听
  stopListening(): void {
    if (!this.isListening) return;
    
    document.removeEventListener('keydown', this.handleKeyDown);
    this.isListening = false;
  }
  
  // 添加事件监听器
  addEventListener(listener: (action: KeyboardAction, event: KeyboardEvent) => boolean): void {
    this.eventListeners.push(listener);
  }
  
  // 移除事件监听器
  removeEventListener(listener: (action: KeyboardAction, event: KeyboardEvent) => boolean): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }
  
  // 键盘事件处理
  private handleKeyDown = (event: KeyboardEvent): void => {
    const { isEnabled, keyMappings, focusedElement } = useKeyboardStore.getState();
    
    // 检查键盘是否启用
    if (!isEnabled) return;
    
    // 获取键盘映射
    const keyCode = event.code;
    const action = keyMappings[keyCode] as KeyboardAction;
    
    if (!action) return;
    
    // 防止默认行为
    if (this.shouldPreventDefault(action)) {
      event.preventDefault();
    }
    
    // 通知所有监听器
    let handled = false;
    for (const listener of this.eventListeners) {
      if (listener(action, event)) {
        handled = true;
        break;
      }
    }
    
    // 如果没有被处理，尝试使用元素导航
    if (!handled && focusedElement) {
      this.handleElementNavigation(action, event, focusedElement);
    }
  };
  
  // 处理元素导航
  private handleElementNavigation(
    action: KeyboardAction, 
    event: KeyboardEvent, 
    element: any
  ): void {
    const navigator = elementNavigationRegistry.get(element.type);
    if (!navigator) return;
    
    switch (action) {
      case 'navigateUp':
        if (element.canNavigate.up) {
          navigator.navigateUp(element);
        }
        break;
      case 'navigateDown':
        if (element.canNavigate.down) {
          navigator.navigateDown(element);
        }
        break;
      case 'navigateLeft':
        if (element.canNavigate.left) {
          navigator.navigateLeft(element);
        }
        break;
      case 'navigateRight':
        if (element.canNavigate.right) {
          navigator.navigateRight(element);
        }
        break;
      case 'select':
        if (element.canNavigate.select) {
          navigator.select(element);
        }
        break;
      case 'back':
        if (element.canNavigate.back) {
          navigator.back(element);
        }
        break;
    }
  }
  
  // 判断是否需要阻止默认行为
  private shouldPreventDefault(action: KeyboardAction): boolean {
    const preventDefaultActions: KeyboardAction[] = [
      'navigateUp', 'navigateDown', 'navigateLeft', 'navigateRight', 
      'select', 'back', 'action', 'menu', 'settings'
    ];
    return preventDefaultActions.includes(action);
  }
}

// 导出单例实例
export const keyboardManager = KeyboardManager.getInstance();