'use client';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ElementRenderer from '../components/ElementRenderer';
import { useModalStore } from '../store/modal';
import { useThemeStore } from '../store/theme';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useViewNavigationConfig } from '../hooks/useViewNavigationConfig';
import metadata from '../../metadata.json';
import DebugInfoOverlay from '../components/common/DebugInfoOverlay';

export default function SystemPage() {
  const { setView, selectedSystem, setSelectedSystem, systems } = useThemeStore();
  const { openThemeSelector, isThemeSelectorOpen } = useModalStore();
  const router = useRouter();
  const {
    isThemeReady,
    themeJson,
    themeName,
    elements: systemElements,
    mergedThemeVariables,
    navigationElementType,
    navigationGridColumns
  } = useViewNavigationConfig('system');
  
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
    elementType: navigationElementType,
    totalItems: systemItems.length,
    initialIndex: initialIndex,
    gridColumns: navigationGridColumns,
    isEnabled: !isThemeSelectorOpen && systemItems.length > 0,
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

  if (!isThemeReady) {
    return <div>Loading...</div>;
  }

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
        themeName={themeJson?.name ?? themeName ?? 'Unknown Theme'}
        elementsCount={systemElements.length}
        selectedLabel={systemItems[selectedIndex]?.system || 'N/A'}
      />
    </div>
  );
}
