import { ThemeJson } from '../../../themeUtils';

// Shared type for menu items
export type MenuMeta =
  | { kind: 'emulators-root' }
  | { kind: 'emulator-system'; systemId: string }
  | { kind: 'emulator-core'; systemId: string; core: string }
  | { kind: 'games-root' }
  | { kind: 'games-select-system' }
  | { kind: 'games-system'; systemId: string }
  | { kind: 'games-upload' }
  | { kind: 'games-file'; systemId: string; fileName: string };

export interface MenuItem {
  id: string;
  label: string;
  subItems?: MenuItem[];
  disabled?: boolean;
  coreName?: string; // for emulator menu
  isSelected?: boolean; // for core selection
  meta?: MenuMeta; // discriminated metadata for routing
}

// Constants
export const AVAILABLE_THEMES = [
  'analogue-os-menu-es-de',
  'atari-50-menu-es-de',
  'mania-menu-es-de',
];

export const MENU_STRUCTURE: MenuItem[] = [
  { id: 'source', label: 'SOURCE' },
  {
    id: 'ui-settings',
    label: 'UI SETTINGS',
    subItems: []
  },
  { id: 'scraper', label: 'SCRAPER' },
  { id: 'systems', label: 'MANAGE SYSTEMS' },
  // 动态设置 disabled，初始为 false
  { id: 'emulators', label: 'MANAGE EMULATORS' },
  {
    id: 'games',
    label: 'MANAGE GAMES',
    subItems: [
      { id: 'select-system', label: 'SELECT SYSTEM' },
      { id: 'upload', label: 'UPLOAD', disabled: true },
      // 文件列表项将在运行时动态插入
    ]
  },
  { id: 'filesystem', label: 'VIRTUAL FILE SYSTEM' },
  { id: 'onedrive', label: 'CONNECT ONEDRIVE' }
];

// Utility functions
export const formatThemeName = (themeId: string): string => {
  return themeId.replace('-menu-es-de', '').replace(/-/g, ' ').toUpperCase();
};

export const formatCapabilityName = (name: string): string => {
  return name.replace(/-/g, ' ').toUpperCase();
};

export const buildCapabilitiesMenu = (themeJson: ThemeJson | null): MenuItem[] => {
  const capabilities = themeJson?.capabilities || {};
  return [
    {
      id: 'theme',
      label: 'THEME',
      subItems: AVAILABLE_THEMES.map(theme => ({
        id: theme,
        label: formatThemeName(theme)
      }))
    },
    {
      id: 'theme-variant',
      label: 'THEME VARIANT',
      subItems: capabilities.variants?.map((variant: string) => ({
        id: variant,
        label: formatCapabilityName(variant)
      })) || [],
      disabled: !capabilities.variants?.length
    },
    {
      id: 'theme-color-scheme',
      label: 'THEME COLOR SCHEME',
      subItems: capabilities.colorSchemes?.map((scheme: string) => ({
        id: scheme,
        label: formatCapabilityName(scheme)
      })) || [],
      disabled: !capabilities.colorSchemes?.length
    },
    {
      id: 'theme-aspect-ratio',
      label: 'THEME ASPECT RATIO',
      subItems: capabilities.aspectRatios?.map((ratio: string) => ({
        id: ratio,
        label: ratio
      })) || [],
      disabled: !capabilities.aspectRatios?.length
    },
    {
      id: 'theme-font-size',
      label: 'THEME FONT SIZE',
      subItems: [],
      disabled: true // TODO: Implement font size options
    },
    {
      id: 'theme-transition',
      label: 'THEME TRANSITION',
      subItems: [],
      disabled: true // TODO: Implement transition options
    }
  ];
};
