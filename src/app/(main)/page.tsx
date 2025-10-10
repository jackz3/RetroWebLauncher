'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { browserFS } from '@/app/utils/fs';
import cores from '../cores.json';

type DemoSpec = {
  media: string[]; // e.g. ["screenshots"]
  roms: Record<string, string[]>; // { nes: ["elit.zip"], ... }
};

export default function Page() {
  const [initialized, setInitialized] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // 读取初始化标记
    if (typeof window !== 'undefined') {
      setInitialized(localStorage.getItem('rwl-initialized') === '1');
    }
  }, []);

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

  const handleInit = useCallback(async () => {
    if (initialized || busy) return;
    setBusy(true);
    try {
      // 初始化 BrowserFS（IndexedDB 后端）
      await browserFS.init();

  // 拉取 demo 规范
  const demoRes = await fetch('/demo.json');
  const demo: DemoSpec = await demoRes.json();
  const targetSystems = Object.keys(demo.roms || {});

      // 预创建目录结构
      await ensureDirChain([
        '/roms',
        '/media',
        ...targetSystems.map((s) => `/roms/${s}`),
        ...((demo.media || []).map((m) => `/media/${m}`)),
        ...((demo.media || []).flatMap((m) => targetSystems.map((s) => `/media/${m}/${s}`))),
      ]);

      // 下载并写入 ROMs 和媒体
      const tasks: Promise<any>[] = [];
      for (const system of targetSystems) {
        const romList = demo.roms[system] || [];
        for (const romFile of romList) {
          // ROM 源与目标路径
          const romSrc = `/demo/roms/${system}/${encodeURIComponent(romFile)}`;
          const romDst = `/roms/${system}/${romFile}`;
          tasks.push(
            (async () => {
              const buf = await fetchArrayBufferIfExists(romSrc);
              if (buf) await browserFS.saveGameFile(romDst, buf);
            })()
          );

          // 媒体（按类型、同名 png）
          const baseName = romFile.replace(/\.[^/.]+$/, '');
          for (const m of demo.media || []) {
            const mediaSrc = `/demo/media/${m}/${system}/${encodeURIComponent(baseName)}.png`;
            const mediaDst = `/media/${m}/${system}/${baseName}.png`;
            tasks.push(
              (async () => {
                const buf = await fetchArrayBufferIfExists(mediaSrc);
                if (buf) await browserFS.saveGameFile(mediaDst, buf);
              })()
            );
          }
        }
      }

      await Promise.all(tasks);

      // 配置本地存储的系统与默认核心
  setDefaultSystems(targetSystems);

      // 标记初始化完成
      localStorage.setItem('rwl-initialized', '1');
      setInitialized(true);
    } catch (err) {
      console.error('Init failed:', err);
      // 失败不写入完成标记
    } finally {
      setBusy(false);
    }
  }, [initialized, busy, ensureDirChain, fetchArrayBufferIfExists, setDefaultSystems]);

  return (
    <div className="p-4 space-x-2">
      {/* 初始化按钮 */}
      <button
        onClick={handleInit}
        disabled={busy || initialized}
        className={`px-4 py-2 rounded text-white ${
          initialized ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
        }`}
        aria-disabled={busy || initialized}
      >
        {initialized ? 'Initialized' : busy ? 'Initializing...' : 'Init'}
      </button>

      {/* 导航链接 */}
      <Link
        href="/system"
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        System View
      </Link>
    </div>
  );
}
