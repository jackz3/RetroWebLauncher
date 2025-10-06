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
  // Gamepad 相关
  private gamepadPolling = false;
  private prevGamepadButtons: Record<number, boolean> = {};
  private prevGamepadAxes: { [key: string]: boolean } = {};
  private gamepadButtonMap: Record<number, KeyboardAction> = {
    12: 'navigateUp',    // D-pad up
    13: 'navigateDown',  // D-pad down
    14: 'navigateLeft',  // D-pad left
    15: 'navigateRight', // D-pad right
    0: 'select',         // A
    1: 'back',           // B
    2: 'action',         // X
    3: 'settings',           // Y
    9: 'menu',       // Start
    // 可根据需要扩展
  };
  
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

    // Gamepad 监听
    window.addEventListener('gamepadconnected', this.handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
    this.startGamepadPolling();
  }
  
  // 停止键盘监听
  stopListening(): void {
    if (!this.isListening) return;
    
    document.removeEventListener('keydown', this.handleKeyDown);
    this.isListening = false;

    window.removeEventListener('gamepadconnected', this.handleGamepadConnected);
    window.removeEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
    this.stopGamepadPolling();
  }
  // Gamepad 事件处理
  private handleGamepadConnected = () => {
    this.startGamepadPolling();
  };

  private handleGamepadDisconnected = () => {
    // 若无 gamepad 则停止轮询
    if (navigator.getGamepads && Array.from(navigator.getGamepads()).filter(Boolean).length === 0) {
      this.stopGamepadPolling();
    }
  };

  private startGamepadPolling() {
    if (this.gamepadPolling) return;
    this.gamepadPolling = true;
    this.pollGamepad();
  }

  private stopGamepadPolling() {
    this.gamepadPolling = false;
  }

  private pollGamepad = () => {
    if (!this.gamepadPolling) return;
    const { isEnabled } = useKeyboardStore.getState();
    if (!isEnabled) {
      requestAnimationFrame(this.pollGamepad);
      return;
    }
    const AXIS_THRESHOLD = 0.5;
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of gamepads) {
      if (!gp) continue;
      // 按钮映射
      gp.buttons.forEach((btn, idx) => {
        const action = this.gamepadButtonMap[idx];
        if (!action) return;
        const pressed = btn.pressed;
        const prevPressed = this.prevGamepadButtons[idx] || false;
        if (pressed && !prevPressed) {
          // 构造伪 KeyboardEvent
          const fakeEvent = new window.KeyboardEvent('gamepadbutton', { code: `GamepadButton${idx}` });
          this.dispatchAction(action, fakeEvent);
        }
        this.prevGamepadButtons[idx] = pressed;
      });
      // 左摇杆轴映射（一般为 axes[0]=左右, axes[1]=上下）
      if (gp.axes && gp.axes.length >= 2) {
        const axes = gp.axes;
        // 上下
        if (axes[1] < -AXIS_THRESHOLD) {
          if (!this.prevGamepadAxes['up']) {
            const fakeEvent = new window.KeyboardEvent('gamepadaxes', { code: 'GamepadAxisUp' });
            this.dispatchAction('navigateUp', fakeEvent);
            this.prevGamepadAxes['up'] = true;
          }
        } else {
          this.prevGamepadAxes['up'] = false;
        }
        if (axes[1] > AXIS_THRESHOLD) {
          if (!this.prevGamepadAxes['down']) {
            const fakeEvent = new window.KeyboardEvent('gamepadaxes', { code: 'GamepadAxisDown' });
            this.dispatchAction('navigateDown', fakeEvent);
            this.prevGamepadAxes['down'] = true;
          }
        } else {
          this.prevGamepadAxes['down'] = false;
        }
        // 左右
        if (axes[0] < -AXIS_THRESHOLD) {
          if (!this.prevGamepadAxes['left']) {
            const fakeEvent = new window.KeyboardEvent('gamepadaxes', { code: 'GamepadAxisLeft' });
            this.dispatchAction('navigateLeft', fakeEvent);
            this.prevGamepadAxes['left'] = true;
          }
        } else {
          this.prevGamepadAxes['left'] = false;
        }
        if (axes[0] > AXIS_THRESHOLD) {
          if (!this.prevGamepadAxes['right']) {
            const fakeEvent = new window.KeyboardEvent('gamepadaxes', { code: 'GamepadAxisRight' });
            this.dispatchAction('navigateRight', fakeEvent);
            this.prevGamepadAxes['right'] = true;
          }
        } else {
          this.prevGamepadAxes['right'] = false;
        }
      }
    }
    requestAnimationFrame(this.pollGamepad);
  };

  // 分发 action 给监听器和元素导航
  private dispatchAction(action: KeyboardAction, event: KeyboardEvent) {
    let handled = false;
    for (const listener of this.eventListeners) {
      if (listener(action, event)) {
        handled = true;
        break;
      }
    }
    const { focusedElement } = useKeyboardStore.getState();
    if (!handled && focusedElement) {
      this.handleElementNavigation(action, event, focusedElement);
    }
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
    const { isEnabled, keyMappings } = useKeyboardStore.getState();
    if (!isEnabled) return;
    const keyCode = event.code;
    const action = keyMappings[keyCode] as KeyboardAction;
    if (!action) return;
    if (this.shouldPreventDefault(action)) {
      event.preventDefault();
    }
    this.dispatchAction(action, event);
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