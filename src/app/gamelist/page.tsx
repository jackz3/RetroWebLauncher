'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../ThemeProvider';
import { getViewElements } from '../../themeUtils';
import { useSearchParams } from 'next/navigation';
import ElementRenderer from '../components/ElementRenderer';
import { useThemeStore } from '../store/theme';
import { useKeyboardStore } from '../store/keyboard';
import { browserFS } from '../utils/fs';
import { oneDrive } from '../utils/onedrive';

export default function GameListPage() {
  const { themeJson, selectedVariant, selectedColorScheme, selectedAspectRatio } = useTheme();
  const { setView, gameListRefreshKey } = useThemeStore();
  const { focusedElement } = useKeyboardStore();
  const searchParams = useSearchParams();
  const selectedSystem = searchParams.get('system');
  const router = useRouter();

  const [gameFiles, setGameFiles] = useState<string[]>([]);

  useEffect(() => {
    setView('gamelist');
  }, [setView]);

  useEffect(() => {
    let mounted = true;
    async function fetchGames() {
      if (!selectedSystem) {
        if (mounted) setGameFiles([]);
        return;
      }
      // Determine data source from localStorage
      const source = typeof window !== 'undefined' ? localStorage.getItem('source') : 'vfs';
      try {
        if (source === 'onedrive') {
          // Build path: onedrive-rootdir + '/roms/' + systemid
          const root = localStorage.getItem('onedrive-rootdir') || '';
          const path = `${root}/roms/${selectedSystem}`;

          // Ensure OneDrive is initialized and attempt to load items
          await oneDrive.init();
          if (!oneDrive.isSignedIn()) {
            console.warn('OneDrive selected but user is not signed in.');
            if (mounted) setGameFiles([]);
            return;
          }
          const entries = await oneDrive.listChildren(path);
          // Filter files only and map to names
          const files = entries.filter((e) => !e.isDir).map((e) => e.name);
          if (mounted) setGameFiles(files);
        } else {
          // Default to virtual FS
          await browserFS.init();
          const files = await browserFS.readDir(`/roms/${selectedSystem}`);
          if (mounted) setGameFiles(files);
        }
      } catch (err) {
        console.error('Failed to fetch game list:', err);
        if (mounted) setGameFiles([]);
      }
    }
    fetchGames();
    return () => { mounted = false; };
  }, [selectedSystem, gameListRefreshKey]);

  // Map file names to objects for ElementRenderer compatibility
  const gameList = gameFiles.map(file => ({
    name: file,
    system: selectedSystem || ''
  }));

  const handleBack = () => {
    router.push('/system');
  };

  const handleGameSelect = (index: number) => {
    const selectedGame = gameList[index];
    console.log('Selected Game:', selectedGame);
    // setSystemAndGame(selectedGame.system, selectedGame.name);

    router.push(`/play?s=${selectedGame.system}&g=${selectedGame.name}`);
  };

  if (!themeJson || !selectedVariant || !selectedAspectRatio) {
    return <div>Loading...</div>;
  }
  const { elements: gamelistElements, variables: mergedThemeVariables } = getViewElements(
    themeJson,
    'gamelist',
    selectedVariant,
    selectedAspectRatio,
    selectedColorScheme
  );

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* 渲染主题元素 */}
      {gamelistElements.map((element: any) => {
        const isList = element.type === 'textlist' || element.type === 'carousel' || element.type === 'grid';
        const selectedIndex = focusedElement?.selectedIndex ?? 0;
        const selectedGame = gameList[selectedIndex] || gameList[0];

        return (
          <ElementRenderer
            key={element.name}
            element={element}
            themeVariables={mergedThemeVariables}
            themeName={themeJson.name}
            items={gameList}
            item={element.type === 'text' ? selectedGame : undefined}
            onItemSelect={isList ? handleGameSelect : undefined}
            onBack={handleBack}
            view="gamelist"
          />
        );
      })}

      {/* 调试信息覆盖层 */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white p-4 rounded text-sm">
        <div>Theme: {themeJson.name}</div>
        <div>Elements: {gamelistElements.length}</div>
        <div>Selected: {gameList[0]?.name}</div>
        <div>System: {selectedSystem || 'All Systems'}</div>
      </div>
    </div>
  );
}
