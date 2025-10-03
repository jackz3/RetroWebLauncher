import { create } from 'zustand';

// 键盘映射配置
export interface KeyMapping {
  [key: string]: string; // key -> action
}

// 帮助条目
export interface HelpEntry {
  key: string;
  action: string;
  icon?: string;
}

// 元素导航信息
export interface ElementNavigation {
  id: string;
  type: 'textlist' | 'carousel' | 'grid' | 'menu' | 'play';
  totalItems: number;
  selectedIndex: number;
  canNavigate: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    select: boolean;
    back: boolean;
  };
}

// 键盘状态接口
interface KeyboardState {
  // 当前聚焦的元素
  focusedElement: ElementNavigation | null;
  
  // 全局键盘状态
  isEnabled: boolean;
  currentContext: 'system' | 'gamelist' | 'menu';
  
  // 键盘映射
  keyMappings: KeyMapping;
  
  // 当前上下文的帮助信息
  currentHelpEntries: HelpEntry[];
  
  // 动作
  setFocusedElement: (element: ElementNavigation | null) => void;
  setKeyboardEnabled: (enabled: boolean) => void;
  setCurrentContext: (context: 'system' | 'gamelist' | 'menu') => void;
  setKeyMappings: (mappings: KeyMapping) => void;
  setHelpEntries: (entries: HelpEntry[]) => void;
  updateElementNavigation: (id: string, updates: Partial<ElementNavigation>) => void;
}

// 默认键盘映射
const DEFAULT_KEY_MAPPINGS: KeyMapping = {
  'ArrowUp': 'navigateUp',
  'ArrowDown': 'navigateDown', 
  'ArrowLeft': 'navigateLeft',
  'ArrowRight': 'navigateRight',
  'Enter': 'select',
  ' ': 'select', // 空格键
  'Escape': 'menu',
  'Backspace': 'back',
  'KeyA': 'select', // 游戏手柄映射
  'KeyB': 'back',
  'KeyX': 'action',
  'KeyY': 'action',
  'F1': 'menu',
  'F2': 'settings'
};

// 默认帮助信息
const DEFAULT_HELP_ENTRIES: HelpEntry[] = [
  { key: 'UP/DOWN', action: 'Navigate', icon: 'updown' },
  { key: 'A', action: 'Select', icon: 'a' },
  { key: 'B', action: 'Back', icon: 'b' },
  { key: 'START', action: 'Menu', icon: 'start' }
];

export const useKeyboardStore = create<KeyboardState>((set, get) => ({
  focusedElement: null,
  isEnabled: true,
  currentContext: 'system',
  keyMappings: DEFAULT_KEY_MAPPINGS,
  currentHelpEntries: DEFAULT_HELP_ENTRIES,
  
  setFocusedElement: (element) => set({ focusedElement: element }),
  
  setKeyboardEnabled: (enabled) => set({ isEnabled: enabled }),
  
  setCurrentContext: (context) => set({ currentContext: context }),
  
  setKeyMappings: (mappings) => set({ keyMappings: mappings }),
  
  setHelpEntries: (entries) => set({ currentHelpEntries: entries }),
  
  updateElementNavigation: (id, updates) => set((state) => {
    if (!state.focusedElement || state.focusedElement.id !== id) {
      return state;
    }
    
    return {
      focusedElement: {
        ...state.focusedElement,
        ...updates
      }
    };
  })
}));