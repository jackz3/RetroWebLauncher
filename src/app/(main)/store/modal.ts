import { create } from 'zustand';

interface ModalState {
  isThemeSelectorOpen: boolean;
  openThemeSelector: () => void;
  closeThemeSelector: () => void;
  toggleThemeSelector: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  isThemeSelectorOpen: false,
  openThemeSelector: () => set({ isThemeSelectorOpen: true }),
  closeThemeSelector: () => set({ isThemeSelectorOpen: false }),
  toggleThemeSelector: () => set((state) => ({ isThemeSelectorOpen: !state.isThemeSelectorOpen })),
}));
