import { useKeyboardStore, ElementNavigation } from './store/keyboard';

// 焦点管理器
export class FocusManager {
  private static instance: FocusManager;
  private elements: Map<string, ElementNavigation> = new Map();
  private focusStack: string[] = [];
  
  private constructor() {}
  
  static getInstance(): FocusManager {
    if (!FocusManager.instance) {
      FocusManager.instance = new FocusManager();
    }
    return FocusManager.instance;
  }
  
  // 注册可聚焦元素
  registerElement(element: ElementNavigation): void {
    this.elements.set(element.id, element);
    
    // 如果这是第一个元素，设置为聚焦状态
    if (this.elements.size === 1) {
      this.focusElement(element.id);
    }
  }
  
  // 注销元素
  unregisterElement(elementId: string): void {
    const wasFocused = this.getFocusedElement()?.id === elementId;
    
    this.elements.delete(elementId);
    
    // 如果删除的是当前聚焦元素，聚焦到下一个
    if (wasFocused) {
      const nextElement = this.getNextFocusableElement();
      if (nextElement) {
        this.focusElement(nextElement.id);
      } else {
        useKeyboardStore.getState().setFocusedElement(null);
      }
    }
  }
  
  // 聚焦特定元素
  focusElement(elementId: string): void {
    const element = this.elements.get(elementId);
    if (!element) return;
    
    // 更新聚焦状态
    useKeyboardStore.getState().setFocusedElement(element);
    
    // 更新焦点堆栈
    const index = this.focusStack.indexOf(elementId);
    if (index > -1) {
      this.focusStack.splice(index, 1);
    }
    this.focusStack.push(elementId);
    
    // 触发焦点变化事件
    this.notifyFocusChange(element);
  }
  
  // 聚焦下一个元素
  focusNext(): void {
    const currentElement = this.getFocusedElement();
    if (!currentElement) return;
    
    const nextElement = this.getNextFocusableElement();
    if (nextElement) {
      this.focusElement(nextElement.id);
    }
  }
  
  // 聚焦上一个元素
  focusPrevious(): void {
    const currentElement = this.getFocusedElement();
    if (!currentElement) return;
    
    const previousElement = this.getPreviousFocusableElement();
    if (previousElement) {
      this.focusElement(previousElement.id);
    }
  }
  
  // 获取当前聚焦元素
  getFocusedElement(): ElementNavigation | null {
    return useKeyboardStore.getState().focusedElement;
  }
  
  // 获取所有可聚焦元素
  getFocusableElements(): ElementNavigation[] {
    return Array.from(this.elements.values());
  }
  
  // 获取下一个可聚焦元素
  private getNextFocusableElement(): ElementNavigation | null {
    const elements = this.getFocusableElements();
    if (elements.length === 0) return null;
    
    const current = this.getFocusedElement();
    if (!current) return elements[0];
    
    const currentIndex = elements.findIndex(el => el.id === current.id);
    const nextIndex = (currentIndex + 1) % elements.length;
    return elements[nextIndex];
  }
  
  // 获取上一个可聚焦元素
  private getPreviousFocusableElement(): ElementNavigation | null {
    const elements = this.getFocusableElements();
    if (elements.length === 0) return null;
    
    const current = this.getFocusedElement();
    if (!current) return elements[0];
    
    const currentIndex = elements.findIndex(el => el.id === current.id);
    const previousIndex = currentIndex === 0 ? elements.length - 1 : currentIndex - 1;
    return elements[previousIndex];
  }
  
  // 通知焦点变化
  private notifyFocusChange(element: ElementNavigation): void {
    // 可以在这里触发自定义事件或回调
    console.log(`Focus changed to element: ${element.id} (${element.type}) stack:`, this.focusStack);
  }
  
  // 更新元素导航信息
  updateElementNavigation(elementId: string, updates: Partial<ElementNavigation>): void {
    const element = this.elements.get(elementId);
    if (!element) return;
    
    const updatedElement = { ...element, ...updates };
    this.elements.set(elementId, updatedElement);
    
    // 如果这是当前聚焦元素，更新store
    if (this.getFocusedElement()?.id === elementId) {
      useKeyboardStore.getState().setFocusedElement(updatedElement);
    }
  }
}

// 导出单例实例
export const focusManager = FocusManager.getInstance();