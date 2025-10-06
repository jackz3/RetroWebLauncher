'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../ThemeProvider';
import { getViewElements } from '../../themeUtils';
import ElementRenderer from '../components/ElementRenderer';
import { useModalStore } from '../store/modal';
import { useThemeStore } from '../store/theme'; // Import useThemeStore
import metadata from '../../metadata.json';

export default function SystemPage() {
  const { themeJson, selectedVariant, selectedColorScheme, selectedAspectRatio, themeName } = useTheme(); // Get selectedVariant and selectedColorScheme
  const { setView, selectedSystem, setSelectedSystem } = useThemeStore(); // Get setView function
  
  // Set view to 'system' when component mounts
  useEffect(() => {
    setView('system');
  }, [setView]);
  
  // 使用 Zustand store 的 systems
  const { systems } = useThemeStore();
  const systemItems = Object.keys(systems).map(systemId => {
    const meta = (metadata as Record<string, any>)[systemId];
    return {
      name: meta?.systemName || systemId,
      description: `${meta?.games?.length ?? 0} games available`,
      system: systemId
    };
  });

  const selectedIndex = selectedSystem ? systemItems.findIndex(item => item.system === selectedSystem) : 0;
  const router = useRouter(); // Initialize useRouter

  const handleSystemSelect = (index: number) => {
    const system = systemItems[index].system;
    setSelectedSystem(system);
    router.push(`/gamelist?system=${system}`); // Navigate to gamelist with system query param
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
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white p-4 rounded text-sm">
        <div>Theme: {themeJson.name}</div>
        <div>Elements: {systemElements.length}</div>
        <div>Selected: {Object.keys(systems)[0]}</div>
      </div>
    </div>
  );
}
