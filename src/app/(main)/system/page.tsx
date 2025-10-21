'use client';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../ThemeProvider';
import { getViewElements } from '@/app/utils/themeUtils';
import ElementRenderer from '../components/ElementRenderer';
import { useModalStore } from '../store/modal';
import { useThemeStore } from '../store/theme';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import metadata from '../../metadata.json';
import DebugInfoOverlay from '../components/common/DebugInfoOverlay';

export default function SystemPage() {
  const { themeJson, selectedVariant, selectedColorScheme, selectedAspectRatio, themeName } = useTheme();
  const { setView, selectedSystem, setSelectedSystem, systems } = useThemeStore();
  const { openThemeSelector } = useModalStore();
  const router = useRouter();
  
  // 初始化视图
  useEffect(() => {
    setView('system');
  }, [setView]);

  // ✅ 计算系统列表
  const systemItems = useMemo(() => {
    return Object.keys(systems)
      .map(systemId => {
        const meta = (metadata as Record<string, any>)[systemId];
        return {
          name: meta?.systemName || systemId,
          description: `${meta?.games?.length ?? 0} games available`,
          system: systemId
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [systems]);

  // ✅ 确定初始选中索引
  const initialIndex = useMemo(() => {
    if (selectedSystem) {
      const index = systemItems.findIndex(item => item.system === selectedSystem);
      return index >= 0 ? index : 0;
    }
    return 0;
  }, [selectedSystem, systemItems]);

  // ✅ 键盘导航 Hook
  const { selectedIndex } = useKeyboardNavigation({
    elementType: 'textlist',
    totalItems: systemItems.length,
    initialIndex: initialIndex,
    isEnabled: true,
    onSelect: (index) => {
      const system = systemItems[index].system;
      setSelectedSystem(system);
      router.push(`/gamelist/${system}`);
    },
    onBack: () => {
      // System 页面没有返回功能
    },
    onEscape: openThemeSelector
  });

  if (!themeJson || !selectedVariant || !selectedAspectRatio) {
    return <div>Loading...</div>;
  }

  const { elements: systemElements, variables: mergedThemeVariables } = getViewElements(
    themeJson,
    'system',
    selectedVariant,
    selectedAspectRatio,
    selectedColorScheme
  );

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {systemElements.map((element: any) => {
        const isList = element.type === 'textlist' || element.type === 'carousel' || element.type === 'grid';
        
        return (
          <ElementRenderer
            key={element.name}
            element={element}
            themeVariables={mergedThemeVariables}
            themeName={themeName}
            items={isList ? systemItems : undefined}
            item={element.type === 'text' ? systemItems[selectedIndex] : undefined}
            selectedIndex={isList ? selectedIndex : undefined}
            view="system"
          />
        );
      })}
      
      <DebugInfoOverlay
        themeName={themeJson.name}
        elementsCount={systemElements.length}
        selectedLabel={systemItems[selectedIndex]?.system || 'N/A'}
      />
    </div>
  );
}
