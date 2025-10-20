'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTheme } from '../../ThemeProvider';
import { getViewElements } from '@/app/utils/themeUtils';
import ElementRenderer from '../../components/ElementRenderer';
import { useThemeStore } from '../../store/theme';
import { useKeyboardStore } from '../../store/keyboard';
import { useModalStore } from '../../store/modal';
import { focusManager } from '../../focusManager';
import { browserFS } from '@/app/utils/fs';
import { oneDrive } from '@/app/utils/onedrive';
import LoadingOverlay from '@/app/components/LoadingOverlay';

export default function GameListContent() {
  const { themeJson, selectedVariant, selectedColorScheme, selectedAspectRatio } = useTheme();
  const { setView, gameListRefreshKey } = useThemeStore();
  const { focusedElement } = useKeyboardStore();
  const router = useRouter();
  const params = useParams<{ system?: string }>();
  const selectedSystem = typeof params?.system === 'string' ? params.system : undefined;

  const [gameFiles, setGameFiles] = useState<string[]>([]);
  const [screenshotFiles, setScreenshotFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('Loading games...');
  const loadingLogsRef = useRef<string[]>([]);
  const [, forceRerender] = useState(0);

  const pushLog = (msg: string) => {
    loadingLogsRef.current.push(msg);
    forceRerender((n) => (n + 1) % 1000);

    console.log('[GAMELIST]', msg);
  };

  useEffect(() => {
    setView('gamelist');
    focusManager.clearFocusStack();
  }, [setView]);

  useEffect(() => {
    let mounted = true;
    async function fetchGames() {
      if (!selectedSystem) {
        if (mounted) setGameFiles([]);
        if (mounted) setScreenshotFiles([]);
        if (mounted) setLoading(false);
        return;
      }
      if (mounted) {
        setLoading(true);
        setLoadingMessage('Loading games...');
        pushLog(`Fetching games for system: ${selectedSystem}`);
      }
      const source = typeof window !== 'undefined' ? localStorage.getItem('source') : 'vfs';
      try {
        if (source === 'onedrive') {
          const root = localStorage.getItem('onedrive-rootdir') || '';
          const path = `${root}/roms/${selectedSystem}`;
          const screenshotsPath = `${root}/media/screenshots/${selectedSystem}`;

          if (mounted) setLoadingMessage('Connecting to OneDrive...');
          pushLog('Initializing OneDrive SDK...');
          await oneDrive.init();
          if (!oneDrive.isSignedIn()) {
            console.warn('OneDrive selected but user is not signed in.');
            pushLog('OneDrive selected but user is not signed in.');
            if (mounted) setGameFiles([]);
            if (mounted) setScreenshotFiles([]);
            if (mounted) setLoading(false);
            return;
          }
          if (mounted) setLoadingMessage('Listing games from OneDrive...');
          pushLog(`Listing directory: ${path}`);
          const entries = await oneDrive.listChildren(path);
          const files = entries.filter((e) => !e.isDir).map((e) => e.name);
          if (mounted) setGameFiles(files);

          try {
            if (mounted) setLoadingMessage('Loading screenshots...');
            pushLog(`Listing screenshots: ${screenshotsPath}`);
            const screenshotEntries = await oneDrive.listChildren(screenshotsPath);
            const pngs = screenshotEntries
              .filter((e) => !e.isDir && /\.png$/i.test(e.name))
              .map((e) => e.name);
            if (mounted) setScreenshotFiles(pngs);
          } catch (sErr) {
            console.warn('No screenshots found on OneDrive or failed to list:', sErr);
            pushLog(`No screenshots found or failed to list: ${String((sErr as any)?.message || sErr)}`);
            if (mounted) setScreenshotFiles([]);
          }
        } else {
          if (mounted) setLoadingMessage('Initializing virtual filesystem...');
          pushLog('Initializing BrowserFS...');
          await browserFS.init();
          if (mounted) setLoadingMessage('Reading game directory...');
          pushLog(`Reading directory: /roms/${selectedSystem}`);
          const files = await browserFS.readDir(`/roms/${selectedSystem}`);
          if (mounted) setGameFiles(files);

          try {
            if (mounted) setLoadingMessage('Reading screenshots...');
            pushLog(`Reading directory: /media/screenshots/${selectedSystem}`);
            const pngs = (await browserFS.readDir(`/media/screenshots/${selectedSystem}`))
              .filter((name: string) => /\.png$/i.test(name));
            if (mounted) setScreenshotFiles(pngs);
          } catch (sErr) {
            console.warn('No screenshots found in VFS or failed to read:', sErr);
            pushLog(`No screenshots found or failed to read: ${String((sErr as any)?.message || sErr)}`);
            if (mounted) setScreenshotFiles([]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch game list:', err);
        pushLog(`Failed to fetch game list: ${String((err as any)?.message || err)}`);
        if (mounted) setGameFiles([]);
        if (mounted) setScreenshotFiles([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchGames();
    return () => {
      mounted = false;
    };
  }, [selectedSystem, gameListRefreshKey]);

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

    router.push(`/play?s=${selectedGame.system}&g=${selectedGame.file}`);
  };

  const { openThemeSelector } = useModalStore();

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
      <LoadingOverlay
        show={loading}
        title="Loading games"
        message={loadingMessage}
        logs={loadingLogsRef.current}
      />
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
            onEscape={openThemeSelector}
            view="gamelist"
          />
        );
      })}
    </div>
  );
}
