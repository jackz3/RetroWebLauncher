import { create } from 'zustand';
import { ThemeJson } from '../../themeUtils';

interface ThemeState {
  themeName: string;
  themeJson: ThemeJson | null;
  selectedVariant: string;
  selectedColorScheme: string;
  selectedAspectRatio: string;
  view: 'system' | 'gamelist' | 'menu' | 'play'; // Add view state
  selectedSystem: string | null;
  systems: Record<string, string>; // 已选系统列表，格式 { systemId: coreName }
  setSelectedSystem: (system: string | null) => void;
  setSystems: (systems: Record<string, string>) => void;
  setThemeName: (name: string) => void;
  setThemeJson: (json: ThemeJson | null) => void;
  setSelectedVariant: (variant: string) => void;
  setSelectedColorScheme: (colorScheme: string) => void;
  setSelectedAspectRatio: (aspectRatio: string) => void;
  setView: (view: ThemeState['view']) => void; // Add setView function
  clearPersistedSettings: () => void; // Add function to clear persisted settings
  gameListRefreshKey: number;
  incrementGameListRefreshKey: () => void;
}

// Define the structure for persisted theme settings
interface PersistedThemeSettings {
  themeName: string;
  selectedVariant: string;
  selectedColorScheme: string;
  selectedAspectRatio: string;
}

// localStorage key for theme settings
const THEME_SETTINGS_KEY = 'theme-settings';

// Helper function to save theme settings to localStorage
const saveThemeSettings = (settings: PersistedThemeSettings) => {
  try {
    // Only save if we're in a browser environment
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(THEME_SETTINGS_KEY, JSON.stringify(settings));
    }
  } catch (error) {
    console.warn('Failed to save theme settings to localStorage:', error);
  }
};

// Helper function to load theme settings from localStorage
const loadThemeSettings = (): PersistedThemeSettings | null => {
  try {
    // Only load if we're in a browser environment
    if (typeof window !== 'undefined' && window.localStorage) {
      const settings = localStorage.getItem(THEME_SETTINGS_KEY);
      return settings ? JSON.parse(settings) : null;
    }
    return null;
  } catch (error) {
    console.warn('Failed to load theme settings from localStorage:', error);
    return null;
  }
};

// Helper function to save current theme settings
const saveCurrentSettings = (state: ThemeState) => {
  saveThemeSettings({
    themeName: state.themeName,
    selectedVariant: state.selectedVariant,
    selectedColorScheme: state.selectedColorScheme,
    selectedAspectRatio: state.selectedAspectRatio
  });
};

// Load persisted settings on initialization
const persistedSettings = loadThemeSettings();

export const useThemeStore = create<ThemeState>((set) => ({
  themeName: persistedSettings?.themeName || 'analogue-os-menu-es-de',
  themeJson: null,
  selectedVariant: persistedSettings?.selectedVariant || 'gamelist-list', // Set a default variant
  selectedColorScheme: persistedSettings?.selectedColorScheme || 'dark', // Set a default color scheme
  selectedAspectRatio: persistedSettings?.selectedAspectRatio || '16:9', // Set a default aspect ratio
  view: 'system', // Default view
  selectedSystem: null,
  systems: (typeof window !== 'undefined' && window.localStorage && localStorage.getItem('systems'))
    ? JSON.parse(localStorage.getItem('systems')!)
    : {},
  gameListRefreshKey: 0,
  incrementGameListRefreshKey: () => set((state) => ({
    gameListRefreshKey: state.gameListRefreshKey + 1
  })),
  setThemeName: (themeName) => set((state) => {
    const newState = { themeName };
    // Save to localStorage
    saveCurrentSettings({ ...state, themeName });
    return newState;
  }),
  setThemeJson: (themeJson) => set((state) => {
    const newState: Partial<ThemeState> = { themeJson };

    if (themeJson) {
      // Set default color scheme if not already set
      if (!state.selectedColorScheme && themeJson.capabilities?.colorSchemes?.length) {
        newState.selectedColorScheme = themeJson.capabilities.colorSchemes[0];
      }
      // Set default variant if not already set
      if (!state.selectedVariant && themeJson.capabilities?.variants?.length) {
        newState.selectedVariant = themeJson.capabilities.variants[0];
      }
      // Set default aspect ratio if not already set
      if (!state.selectedAspectRatio && themeJson.capabilities?.aspectRatios?.length) {
        newState.selectedAspectRatio = themeJson.capabilities.aspectRatios[0];
      }
    }
    return newState;
  }),
  setSelectedVariant: (selectedVariant) => set((state) => {
    // Save to localStorage
    saveCurrentSettings({ ...state, selectedVariant });
    return { selectedVariant };
  }),
  setSelectedColorScheme: (selectedColorScheme) => set((state) => {
    // Save to localStorage
    saveCurrentSettings({ ...state, selectedColorScheme });
    return { selectedColorScheme };
  }),
  setSelectedAspectRatio: (selectedAspectRatio) => set((state) => {
    // Save to localStorage
    saveCurrentSettings({ ...state, selectedAspectRatio });
    return { selectedAspectRatio };
  }),
  setView: (view) => set({ view }), // Add setView function
  setSelectedSystem: (selectedSystem) => set({ selectedSystem }),
  setSystems: (systems) => set({ systems }),
  clearPersistedSettings: () => set((state) => {
    try {
      // Only clear if we're in a browser environment
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(THEME_SETTINGS_KEY);
      }
    } catch (error) {
      console.warn('Failed to clear theme settings from localStorage:', error);
    }
    return state;
  }),
}));
