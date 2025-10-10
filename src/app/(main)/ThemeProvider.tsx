'use client';
import { ReactNode, createContext, useContext, useEffect } from 'react';
import { ThemeJson, getThemeJson } from '@/app/utils/themeUtils';
import { useThemeStore } from './store/theme';

interface ThemeContextProps {
  themeName: string;
  themeJson: ThemeJson | null;
  setThemeName: (name: string) => void;
  setThemeJson: (json: ThemeJson | null) => void;
  selectedVariant: string;
  setSelectedVariant: (variant: string) => void;
  selectedColorScheme: string;
  setSelectedColorScheme: (colorScheme: string) => void;
  selectedAspectRatio: string;
  setSelectedAspectRatio: (aspectRatio: string) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const {
    themeName,
    themeJson,
    selectedVariant,
    selectedColorScheme,
    selectedAspectRatio,
    setThemeName,
    setThemeJson,
    setSelectedVariant,
    setSelectedColorScheme,
    setSelectedAspectRatio,
  } = useThemeStore();

  // 自动加载主题
  useEffect(() => {
    if (themeName && !themeJson) {
      getThemeJson(themeName)
        .then(theme => {
          setThemeJson(theme);
          // Set default variant if available and not already set
          if (theme.capabilities?.variants && theme.capabilities.variants.length > 0 && !selectedVariant) {
            setSelectedVariant(theme.capabilities.variants[0]);
          }
          // Set default aspect ratio if available and not already set
          if (
            theme.capabilities?.aspectRatios &&
            theme.capabilities.aspectRatios.length > 0 &&
            !selectedAspectRatio
          ) {
            setSelectedAspectRatio(theme.capabilities.aspectRatios[0]);
          }
        });
    }
  }, [
    themeName,
    themeJson,
    setThemeJson,
    selectedVariant,
    setSelectedVariant,
    selectedAspectRatio,
    setSelectedAspectRatio,
  ]);

  return (
    <ThemeContext.Provider
      value={{
        themeName,
        themeJson,
        selectedVariant,
        selectedColorScheme,
        selectedAspectRatio,
        setThemeName,
        setThemeJson,
        setSelectedVariant,
        setSelectedColorScheme,
        setSelectedAspectRatio,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
