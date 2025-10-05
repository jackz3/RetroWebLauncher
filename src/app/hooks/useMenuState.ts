import { useReducer } from 'react';
import type { MenuItem } from '../components/menu/menuBuilder';

export interface SystemItem {
  id: string;
  label: string;
  isSelected: boolean;
}

export interface MenuState {
  stack: MenuItem[][];
  current: MenuItem[];
  title: string;
  systemList?: SystemItem[];
}

type Frame = MenuItem[];

type Action =
  | { type: 'RESET'; current: Frame; title?: string }
  | { type: 'PUSH'; next: Frame; title: string }
  | { type: 'POP' }
  | { type: 'REPLACE_CURRENT'; items: Frame }
  | { type: 'SET_TITLE'; title: string }
  | { type: 'SET_SYSTEM_LIST'; list?: SystemItem[] };

function computeTitleAfterPop(stack: MenuItem[][], current: MenuItem[]): string {
  const newStack = stack.slice(0, -1);
  if (newStack.length === 0) return 'MAIN MENU';
  const parent = newStack[newStack.length - 1];
  // if possible, set title to the label of the parent item that owns the current submenu
  const label = parent.find(item => item.subItems?.some(sub => sub.id === current[0]?.id))?.label;
  return label || 'MENU';
}

function reducer(state: MenuState, action: Action): MenuState {
  switch (action.type) {
    case 'RESET':
      return { stack: [], current: action.current, title: action.title ?? 'MAIN MENU' };
    case 'PUSH':
      return { stack: [...state.stack, state.current], current: action.next, title: action.title };
    case 'POP': {
      if (state.stack.length === 0) return state;
      const previousMenu = state.stack[state.stack.length - 1];
      const newTitle = computeTitleAfterPop(state.stack, state.current);
      return { stack: state.stack.slice(0, -1), current: previousMenu, title: newTitle, systemList: undefined };
    }
    case 'REPLACE_CURRENT':
      return { ...state, current: action.items };
    case 'SET_TITLE':
      return { ...state, title: action.title };
    case 'SET_SYSTEM_LIST':
      return { ...state, systemList: action.list };
    default:
      return state;
  }
}

export function useMenuState(initial: MenuState = { stack: [], current: [], title: 'MAIN MENU' }) {
  return useReducer(reducer, initial);
}

export { computeTitleAfterPop };
