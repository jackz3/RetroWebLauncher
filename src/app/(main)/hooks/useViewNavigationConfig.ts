import { useMemo } from 'react';
import { useTheme } from '../ThemeProvider';
import { getViewElements } from '@/app/utils/themeUtils';

type NavigationElementType = 'textlist' | 'carousel' | 'grid';

type ViewNavigationConfig = {
  isThemeReady: boolean;
  themeJson: any;
  themeName?: string;
  elements: any[];
  mergedThemeVariables: Record<string, unknown>;
  navigationElementType: NavigationElementType;
  navigationGridColumns?: number;
};

export const useViewNavigationConfig = (view: string): ViewNavigationConfig => {
  const {
    themeJson,
    selectedVariant,
    selectedColorScheme,
    selectedAspectRatio,
    themeName
  } = useTheme();

  const isThemeReady = Boolean(themeJson && selectedVariant && selectedAspectRatio);

  const { elements, variables } = useMemo(() => {
    if (!isThemeReady || !themeJson) {
      return { elements: [] as any[], variables: {} as Record<string, unknown> };
    }

    return getViewElements(
      themeJson,
      view,
      selectedVariant,
      selectedAspectRatio,
      selectedColorScheme
    );
  }, [isThemeReady, themeJson, view, selectedVariant, selectedAspectRatio, selectedColorScheme]);

  const activeNavigationElement = useMemo(
    () =>
      elements.find(
        (element: { type?: string }) =>
          element && typeof element.type === 'string' && ['textlist', 'carousel', 'grid'].includes(element.type)
      ),
    [elements]
  );

  const navigationElementType = (activeNavigationElement?.type ?? 'textlist') as NavigationElementType;

  const navigationGridColumns =
    navigationElementType === 'grid'
      ? (() => {
          const raw =
            activeNavigationElement?.options?.columns ??
            activeNavigationElement?.props?.columns ??
            activeNavigationElement?.columns;
          const parsed = Number(raw);
          return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
        })()
      : undefined;

  return {
    isThemeReady,
    themeJson,
    themeName,
    elements,
    mergedThemeVariables: variables,
    navigationElementType,
    navigationGridColumns
  };
};
