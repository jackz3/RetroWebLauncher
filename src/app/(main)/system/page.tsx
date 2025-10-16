'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../ThemeProvider';
import { getViewElements } from '@/app/utils/themeUtils';
import ElementRenderer from '../components/ElementRenderer';
import { useModalStore } from '../store/modal';
import { useThemeStore } from '../store/theme'; // Import useThemeStore
import metadata from '../../metadata.json';
import DebugInfoOverlay from '../components/common/DebugInfoOverlay';

export default function SystemPage() {
  const { themeJson, selectedVariant, selectedColorScheme, selectedAspectRatio, themeName } = useTheme(); // Get selectedVariant and selectedColorScheme
  const { setView, selectedSystem, setSelectedSystem, systems } = useThemeStore(); // Get setView function
  
  // Set view to 'system' when component mounts
  useEffect(() => {
    setView('system');
  }, [setView]);

  const systemItems = Object.keys(systems).map(systemId => {
    const meta = (metadata as Record<string, any>)[systemId];
    return {
      name: meta?.systemName || systemId,
      description: `${meta?.games?.length ?? 0} games available`,
      system: systemId
    };
  });

  const unresolvedIndex = selectedSystem ? systemItems.findIndex(item => item.system === selectedSystem) : 0;
  const selectedIndex = unresolvedIndex >= 0 ? unresolvedIndex : 0;
  const router = useRouter(); // Initialize useRouter

  const handleSystemSelect = (index: number) => {
    const system = systemItems[index].system;
    setSelectedSystem(system);
    router.push(`/gamelist/${system}`); // Navigate to gamelist with system query param
  };

  const { openThemeSelector } = useModalStore();
  
  const handleBack = () => {
    // openThemeSelector();
  };

  if (!themeJson || !selectedVariant || !selectedAspectRatio) { // Add selectedVariant to loading check
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
      {/* 渲染主题元素 */}
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
            onItemSelect={isList ? handleSystemSelect : undefined}
            onBack={handleBack}
            view="system"
          />
        );
      })}
      
      {/* 调试信息覆盖层 */}
      <DebugInfoOverlay
        themeName={themeJson.name}
        elementsCount={systemElements.length}
        selectedLabel={systemItems[selectedIndex]?.system || 'N/A'}
      />
    </div>
  );
}
