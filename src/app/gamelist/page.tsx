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
  const [screenshotFiles, setScreenshotFiles] = useState<string[]>([]);

  useEffect(() => {
    setView('gamelist');
  }, [setView]);

  useEffect(() => {
    let mounted = true;
    async function fetchGames() {
      if (!selectedSystem) {
        if (mounted) setGameFiles([]);
        if (mounted) setScreenshotFiles([]);
        return;
      }
      // Determine data source from localStorage
      const source = typeof window !== 'undefined' ? localStorage.getItem('source') : 'vfs';
      try {
        if (source === 'onedrive') {
          // Build path: onedrive-rootdir + '/roms/' + systemid
          const root = localStorage.getItem('onedrive-rootdir') || '';
          const path = `${root}/roms/${selectedSystem}`;
          const screenshotsPath = `${root}/media/screenshots/${selectedSystem}`;

          // Ensure OneDrive is initialized and attempt to load items
          await oneDrive.init();
          if (!oneDrive.isSignedIn()) {
            console.warn('OneDrive selected but user is not signed in.');
            if (mounted) setGameFiles([]);
            if (mounted) setScreenshotFiles([]);
            return;
          }
          const entries = await oneDrive.listChildren(path);
          // Filter files only and map to names
          const files = entries.filter((e) => !e.isDir).map((e) => e.name);
          if (mounted) setGameFiles(files);

          // Load screenshots (PNG files) for this system
          try {
            const screenshotEntries = await oneDrive.listChildren(screenshotsPath);
            const pngs = screenshotEntries
              .filter((e) => !e.isDir && /\.png$/i.test(e.name))
              .map((e) => e.name);
            if (mounted) setScreenshotFiles(pngs);
          } catch (sErr) {
            console.warn('No screenshots found on OneDrive or failed to list:', sErr);
            if (mounted) setScreenshotFiles([]);
          }
        } else {
          // Default to virtual FS
          await browserFS.init();
          const files = await browserFS.readDir(`/roms/${selectedSystem}`);
          if (mounted) setGameFiles(files);

          // Try to read screenshots directory from VFS
          try {
            const pngs = (await browserFS.readDir(`/media/screenshots/${selectedSystem}`))
              .filter((name: string) => /\.png$/i.test(name));
            if (mounted) setScreenshotFiles(pngs);
          } catch (sErr) {
            console.warn('No screenshots found in VFS or failed to read:', sErr);
            if (mounted) setScreenshotFiles([]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch game list:', err);
        if (mounted) setGameFiles([]);
        if (mounted) setScreenshotFiles([]);
      }
    }
    fetchGames();
    return () => { mounted = false; };
  }, [selectedSystem, gameListRefreshKey]);

  // Map file names to objects for ElementRenderer compatibility
  // Ensure name shows only the base filename without extension
  // Precompute screenshot base names (without extension) for quick lookup
  const screenshotBaseSet = new Set(
    screenshotFiles.map((f) => {
      const b = f.split('/').pop() || f;
      const d = b.lastIndexOf('.');
      return d > 0 ? b.slice(0, d) : b;
    })
  );

  const gameList = gameFiles.map((file) => {
    const base = file.split('/').pop() || file;
    const dot = base.lastIndexOf('.');
    const name = dot > 0 ? base.slice(0, dot) : base;
    const hasScreenshot = screenshotBaseSet.has(name);
    return {
      name,
      file,
      system: selectedSystem || '',
      screenshot: hasScreenshot,
    };
  });

  const handleBack = () => {
    router.push('/system');
  };

  const handleGameSelect = (index: number) => {
    const selectedGame = gameList[index];
    console.log('Selected Game:', selectedGame);
    // setSystemAndGame(selectedGame.system, selectedGame.name);

    router.push(`/play?s=${selectedGame.system}&g=${selectedGame.file}`);
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
