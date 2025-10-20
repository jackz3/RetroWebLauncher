import { useKeyboardStore } from './store/keyboard';
import { elementNavigationRegistry } from './elementNavigation';

// 键盘事件处理器类型
export type KeyboardAction = 
  | 'navigateUp' | 'navigateDown' | 'navigateLeft' | 'navigateRight'
  | 'select' | 'back' | 'action' | 'menu' | 'settings';

// 常量定义
const GAMEPAD_BUTTON_MAP: Record<number, KeyboardAction> = {
  12: 'navigateUp', 13: 'navigateDown', 14: 'navigateLeft', 15: 'navigateRight',
  0: 'select', 1: 'back', 2: 'action', 3: 'settings', 9: 'menu'
};

const AXIS_THRESHOLD = 0.5;
const GAMEPAD_DEBOUNCE_MS = 120; // 手柄按键防抖时间
const KEYBOARD_DEBOUNCE_MS = 50; // 键盘防抖时间
const PREVENT_DEFAULT_ACTIONS = new Set<KeyboardAction>([
  'navigateUp', 'navigateDown', 'navigateLeft', 'navigateRight', 'select', 'back', 'action', 'menu', 'settings'
]);

// 键盘管理器类
export class KeyboardManager {
  private static instance: KeyboardManager;
  private isListening = false;
  private eventListeners: ((action: KeyboardAction, event: KeyboardEvent) => boolean)[] = [];
  private gamepadPollingId: number | null = null;
  private gamepadAxisState: Record<string, boolean> = {};
  private gamepadButtonState: Record<number, boolean> = {}; // 追踪按钮按下状态
  private lastActionTime: Map<KeyboardAction, number> = new Map(); // 追踪每个动作的最后触发时间
  
  private constructor() {}
  
  static getInstance(): KeyboardManager {
    return KeyboardManager.instance ??= new KeyboardManager();
  }
  
  startListening(): void {
    if (this.isListening) return;
    
    this.isListening = true;
    document.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('gamepadconnected', this.startGamepadPolling);
    window.addEventListener('gamepaddisconnected', this.stopGamepadPolling);
    this.startGamepadPolling();
  }
  
  stopListening(): void {
    if (!this.isListening) return;
    
    this.isListening = false;
    document.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('gamepadconnected', this.startGamepadPolling);
    window.removeEventListener('gamepaddisconnected', this.stopGamepadPolling);
    this.stopGamepadPolling();
  }
  
  private startGamepadPolling = (): void => {
    if (this.gamepadPollingId !== null) return;
    
    const poll = (): void => {
      const { isEnabled } = useKeyboardStore.getState();
      if (isEnabled) this.pollGamepads();
      this.gamepadPollingId = requestAnimationFrame(poll);
    };
    
    this.gamepadPollingId = requestAnimationFrame(poll);
  };
  
  private stopGamepadPolling = (): void => {
    if (this.gamepadPollingId !== null) {
      cancelAnimationFrame(this.gamepadPollingId);
      this.gamepadPollingId = null;
    }
  };

  private pollGamepads(): void {
    const gamepads = navigator.getGamepads?.() ?? [];
    
    for (const gp of gamepads) {
      if (!gp) continue;
      this.handleGamepadButtons(gp);
      this.handleGamepadAxes(gp);
    }
  }
  
  private handleGamepadButtons(gp: Gamepad): void {
    gp.buttons.forEach((btn, idx) => {
      const action = GAMEPAD_BUTTON_MAP[idx];
      if (!action) return;
      
      const isPressed = btn.pressed;
      const wasPressed = this.gamepadButtonState[idx] ?? false;
      
      // 只在按键从未按下变为按下时触发（去抖处理）
      if (isPressed && !wasPressed) {
        if (this.canTriggerAction(action, GAMEPAD_DEBOUNCE_MS)) {
          const fakeEvent = new KeyboardEvent('gamepadbutton', { code: `GamepadButton${idx}` });
          this.dispatchAction(action, fakeEvent);
        }
      }
      
      this.gamepadButtonState[idx] = isPressed;
    });
  }
  
  private handleGamepadAxes(gp: Gamepad): void {
    if (!gp.axes || gp.axes.length < 2) return;
    
    const [axisX, axisY] = [gp.axes[0], gp.axes[1]];
    
    this.checkAxis('up', axisY < -AXIS_THRESHOLD, 'navigateUp');
    this.checkAxis('down', axisY > AXIS_THRESHOLD, 'navigateDown');
    this.checkAxis('left', axisX < -AXIS_THRESHOLD, 'navigateLeft');
    this.checkAxis('right', axisX > AXIS_THRESHOLD, 'navigateRight');
  }
  
  private checkAxis(direction: string, isTriggered: boolean, action: KeyboardAction): void {
    const wasTriggered = this.gamepadAxisState[direction] ?? false;
    
    // 只在轴状态从未触发变为触发时触发，并进行防抖
    if (isTriggered && !wasTriggered) {
      if (this.canTriggerAction(action, GAMEPAD_DEBOUNCE_MS)) {
        const fakeEvent = new KeyboardEvent('gamepadaxis', { code: `GamepadAxis${direction}` });
        this.dispatchAction(action, fakeEvent);
      }
    }
    
    this.gamepadAxisState[direction] = isTriggered;
  }
  
  private canTriggerAction(action: KeyboardAction, debounceMs: number): boolean {
    const now = Date.now();
    const lastTime = this.lastActionTime.get(action) ?? 0;
    
    if (now - lastTime >= debounceMs) {
      this.lastActionTime.set(action, now);
      return true;
    }
    
    return false;
  }

  private dispatchAction(action: KeyboardAction, event: KeyboardEvent): void {
    for (const listener of this.eventListeners) {
      if (listener(action, event)) return;
    }
    
    const { focusedElement } = useKeyboardStore.getState();
    if (focusedElement) {
      this.handleElementNavigation(action, event, focusedElement);
    }
  }
  
  addEventListener(listener: (action: KeyboardAction, event: KeyboardEvent) => boolean): void {
    this.eventListeners.push(listener);
  }
  
  removeEventListener(listener: (action: KeyboardAction, event: KeyboardEvent) => boolean): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) this.eventListeners.splice(index, 1);
  }
  
  private handleKeyDown = (event: KeyboardEvent): void => {
    const { isEnabled, keyMappings } = useKeyboardStore.getState();
    if (!isEnabled) return;
    
    const action = keyMappings[event.code] as KeyboardAction;
    if (!action) return;
    
    // 导航动作进行防抖处理（避免长按时多次触发）
    const isNavigationAction = action.startsWith('navigate');
    if (isNavigationAction && !this.canTriggerAction(action, KEYBOARD_DEBOUNCE_MS)) {
      return;
    }
    
    if (PREVENT_DEFAULT_ACTIONS.has(action)) {
      event.preventDefault();
    }
    this.dispatchAction(action, event);
  };
  
  private handleElementNavigation(
    action: KeyboardAction,
    event: KeyboardEvent,
    element: any
  ): void {
    const navigator = elementNavigationRegistry.get(element.type);
    if (!navigator) return;
    
    const canNavigate = element.canNavigate;
    
    switch (action) {
      case 'navigateUp':
        if (canNavigate.up) navigator.navigateUp?.(element);
        break;
      case 'navigateDown':
        if (canNavigate.down) navigator.navigateDown?.(element);
        break;
      case 'navigateLeft':
        if (canNavigate.left) navigator.navigateLeft?.(element);
        break;
      case 'navigateRight':
        if (canNavigate.right) navigator.navigateRight?.(element);
        break;
      case 'select':
        if (canNavigate.select) navigator.select?.(element);
        break;
      case 'back':
        if (canNavigate.back) navigator.back?.(element);
        break;
    }
  }
}

// 导出单例实例
export const keyboardManager = KeyboardManager.getInstance();