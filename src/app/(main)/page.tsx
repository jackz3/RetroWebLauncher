'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserFS } from '@/app/utils/fs';
import { oneDrive } from '@/app/utils/onedrive';
import LoadingOverlay from '@/app/components/LoadingOverlay';
import cores from '../cores.json';

type DemoSpec = {
  media: string[];
  roms: Record<string, string[]>;
};

type SourceType = 'vfs' | 'onedrive';

export default function Page() {
  const router = useRouter();
  const [source, setSource] = useState<SourceType>('vfs');
  const [copyDemo, setCopyDemo] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [configured, setConfigured] = useState<boolean | null>(null); // null = not yet checked
  const logsRef = useRef<string[]>([]);
  const [, forceRerender] = useState(0);

  const pushLog = (msg: string) => {
    logsRef.current.push(msg);
    forceRerender((n) => (n + 1) % 1000);
    console.log('[SETUP]', msg);
  };

  // Defer localStorage access to effect to avoid hydration issues; then hard redirect to fully replace DOM
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasSource = !!localStorage.getItem('source');
    setConfigured(hasSource);
  }, []);

  useEffect(() => {
    if (configured) {
      // Use hard navigation to prevent mixed old/new content artifacts
      window.location.replace('/system');
    }
  }, [configured]);

  const ensureDirChain = useCallback(async (paths: string[]) => {
    for (const p of paths) {
      await browserFS.ensureDir(p);
    }
  }, []);

  const fetchArrayBufferIfExists = useCallback(async (url: string): Promise<ArrayBuffer | undefined> => {
    try {
      const res = await fetch(url);
      if (!res.ok) return undefined;
      return await res.arrayBuffer();
    } catch {
      return undefined;
    }
  }, []);

  const setDefaultSystems = useCallback((systems: string[]) => {
    const mapping: Record<string, string> = {};
    systems.forEach((sys) => {
      const arr = (cores as Record<string, string[]>)[sys];
      if (arr && arr.length) {
        mapping[sys] = arr[0];
      }
    });
    localStorage.setItem('systems', JSON.stringify(mapping));
  }, []);

  const handleStart = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    logsRef.current = [];
    try {
      // Load demo spec; we'll also use its system list to seed default cores
  setLoadingMessage('Loading demo config...');
  pushLog('Fetching demo specification...');
      const demoRes = await fetch('/demo/demo.json');
      const demo: DemoSpec = await demoRes.json();
      const targetSystems = Object.keys(demo.roms || {});

      if (source === 'onedrive') {
  setLoadingMessage('Initializing OneDrive...');
  pushLog('Initializing OneDrive...');
        await oneDrive.init();
        if (!oneDrive.isSignedIn()) {
          pushLog('Not signed in. Redirecting to Microsoft login...');
          await oneDrive.login();
          return; // Will redirect
        }
        const root = '/retro';
        localStorage.setItem('onedrive-rootdir', root);

        // Prepare folder structure
  setLoadingMessage('Creating OneDrive folders...');
  pushLog('Ensuring folder structure under /retro ...');
        const folders = [
          `${root}`,
          `${root}/roms`,
          `${root}/media`,
          ...targetSystems.map((s) => `${root}/roms/${s}`),
          ...((demo.media || []).map((m) => `${root}/media/${m}`)),
          ...((demo.media || []).flatMap((m) => targetSystems.map((s) => `${root}/media/${m}/${s}`))),
        ];
        for (const f of folders) {
          await oneDrive.ensureFolder(f);
        }

        if (copyDemo) {
          setLoadingMessage('Copying demo ROMs and media to OneDrive...');
          pushLog('Copying demo ROMs and media to OneDrive...');
          for (const system of targetSystems) {
            const romList = demo.roms[system] || [];
            for (const romFile of romList) {
              const romSrc = `/demo/roms/${system}/${encodeURIComponent(romFile)}`;
              const buf = await fetchArrayBufferIfExists(romSrc);
              if (buf) {
                await oneDrive.uploadFile(`${root}/roms/${system}/${romFile}`, buf);
                pushLog(`Uploaded ROM: ${system}/${romFile}`);
              } else {
                pushLog(`Skip ROM (missing): ${system}/${romFile}`);
              }
              const baseName = romFile.replace(/\.[^/.]+$/, '');
              for (const m of demo.media || []) {
                const mediaSrc = `/demo/media/${m}/${system}/${encodeURIComponent(baseName)}.png`;
                const mbuf = await fetchArrayBufferIfExists(mediaSrc);
                if (mbuf) {
                  await oneDrive.uploadFile(`${root}/media/${m}/${system}/${baseName}.png`, mbuf);
                  pushLog(`Uploaded ${m}: ${system}/${baseName}.png`);
                }
              }
            }
          }
        }
      } else {
        // Virtual filesystem
  setLoadingMessage('Initializing virtual filesystem...');
  pushLog('Initializing BrowserFS...');
        await browserFS.init();

        // Pre-create dirs
  setLoadingMessage('Creating directories...');
        await ensureDirChain([
          '/roms',
          '/media',
          ...targetSystems.map((s) => `/roms/${s}`),
          ...((demo.media || []).map((m) => `/media/${m}`)),
          ...((demo.media || []).flatMap((m) => targetSystems.map((s) => `/media/${m}/${s}`))),
        ]);

        if (copyDemo) {
          setLoadingMessage('Copying demo ROMs and media...');
          pushLog('Copying demo ROMs and media to VFS...');
          for (const system of targetSystems) {
            const romList = demo.roms[system] || [];
            for (const romFile of romList) {
              const romSrc = `/demo/roms/${system}/${encodeURIComponent(romFile)}`;
              const romDst = `/roms/${system}/${romFile}`;
              const buf = await fetchArrayBufferIfExists(romSrc);
              if (buf) {
                await browserFS.saveGameFile(romDst, buf);
                pushLog(`Saved ROM: ${system}/${romFile}`);
              } else {
                pushLog(`Skip ROM (missing): ${system}/${romFile}`);
              }
              const baseName = romFile.replace(/\.[^/.]+$/, '');
              for (const m of demo.media || []) {
                const mediaSrc = `/demo/media/${m}/${system}/${encodeURIComponent(baseName)}.png`;
                const mediaDst = `/media/${m}/${system}/${baseName}.png`;
                const mbuf = await fetchArrayBufferIfExists(mediaSrc);
                if (mbuf) {
                  await browserFS.saveGameFile(mediaDst, mbuf);
                  pushLog(`Saved ${m}: ${system}/${baseName}.png`);
                }
              }
            }
          }
        }
      }

      // Persist selection and default systems mapping
      localStorage.setItem('source', source);
      setDefaultSystems(targetSystems);

  setLoadingMessage('Setup complete. Opening system page...');
  pushLog('Setup complete. Redirecting...');
      router.push('/system');
    } catch (err) {
      console.error('Setup failed:', err);
      pushLog(`Setup failed: ${String((err as any)?.message || err)}`);
    } finally {
      setBusy(false);
    }
  }, [busy, source, copyDemo, ensureDirChain, fetchArrayBufferIfExists, setDefaultSystems, router]);

  // While determining config or redirecting, render nothing to avoid flicker / overlap
  if (configured === null || configured === true) return null;

  return (
    <>
    <div className="p-6 max-w-xl mx-auto">
      <LoadingOverlay show={busy} title="Setting up" message={loadingMessage} logs={logsRef.current} />
      <h1 className="text-2xl font-semibold mb-4">First-time Setup</h1>
      <div className="space-y-6">
        <div>
          <div className="mb-2 font-medium">Choose game source (required)</div>
          <label className="flex items-center gap-2 mb-2">
            <input
              type="radio"
              name="source"
              value="vfs"
              checked={source === 'vfs'}
              onChange={() => setSource('vfs')}
            />
            <span>Virtual Filesystem (browser storage)</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="source"
              value="onedrive"
              checked={source === 'onedrive'}
              onChange={() => setSource('onedrive')}
            />
            <span>OneDrive (/retro directory)</span>
          </label>
        </div>
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={copyDemo}
              onChange={(e) => setCopyDemo(e.target.checked)}
            />
            <span>Copy demo games and media</span>
          </label>
        </div>
        <div className="pt-2">
          <button
            onClick={handleStart}
            disabled={busy}
            className={`px-4 py-2 rounded text-white ${busy ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {busy ? 'Processing…' : 'Start'}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
