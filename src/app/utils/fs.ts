'use client'

import { promisify } from './help';
import type { FSModule } from 'browserfs/dist/node/core/FS';

type BufferCtor = typeof import('buffer').Buffer;

type BrowserFsDeps = {
  initialize: typeof import('browserfs')['initialize'];
  BFSRequire: typeof import('browserfs')['BFSRequire'];
  IndexedDBFileSystem: typeof import('browserfs/dist/node/backend/IndexedDB')['default'];
  FolderAdapter: typeof import('browserfs/dist/node/backend/FolderAdapter')['default'];
  InMemoryFileSystem: typeof import('browserfs/dist/node/backend/InMemory')['default'];
  AsyncMirror: typeof import('browserfs/dist/node/backend/AsyncMirror')['default'];
  MountableFileSystem: typeof import('browserfs/dist/node/backend/MountableFileSystem')['default'];
  ZipFS: typeof import('browserfs/dist/node/backend/ZipFS')['default'];
  arrayBuffer2Buffer: typeof import('browserfs/dist/node/core/util')['arrayBuffer2Buffer'];
};

let depsPromise: Promise<BrowserFsDeps> | null = null;

async function loadBrowserFsDeps(): Promise<BrowserFsDeps> {
  if (typeof window === 'undefined') {
    throw new Error('BrowserFS is only available in the browser runtime.');
  }

  if (!depsPromise) {
    depsPromise = (async () => {
      const [core, indexedDb, folderAdapter, inMemory, asyncMirror, mountable, zipFs, util] = await Promise.all([
        import('browserfs'),
        import('browserfs/dist/node/backend/IndexedDB'),
        import('browserfs/dist/node/backend/FolderAdapter'),
        import('browserfs/dist/node/backend/InMemory'),
        import('browserfs/dist/node/backend/AsyncMirror'),
        import('browserfs/dist/node/backend/MountableFileSystem'),
        import('browserfs/dist/node/backend/ZipFS'),
        import('browserfs/dist/node/core/util')
      ]);

      return {
        initialize: core.initialize,
        BFSRequire: core.BFSRequire,
        IndexedDBFileSystem: indexedDb.default,
        FolderAdapter: folderAdapter.default,
        InMemoryFileSystem: inMemory.default,
        AsyncMirror: asyncMirror.default,
        MountableFileSystem: mountable.default,
        ZipFS: zipFs.default,
        arrayBuffer2Buffer: util.arrayBuffer2Buffer
      } satisfies BrowserFsDeps;
    })();
  }

  return depsPromise;
}

function createBackend<T, O>(factory: { Create(options: O, callback: (err: unknown, result?: T) => void): void }, options: O): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    factory.Create(options, (err, result) => {
      if (err || !result) {
        if (err instanceof Error) {
          reject(err);
        } else {
          reject(new Error('Failed to create BrowserFS backend.'));
        }
        return;
      }
      resolve(result);
    });
  });
}

// 单例服务封装
class BrowserFSService {
  private static instance: BrowserFSService;
  private fs: FSModule | null = null;
  private bufferCtor: BufferCtor | null = null;
  private initialized = false;
  private deps: BrowserFsDeps | null = null;

  private readdirFn?: (path: string) => Promise<string[]>;
  private readFileFn?: (fileName: string) => Promise<Buffer>;
  private writeFileFn?: (fileName: string, data: Buffer) => Promise<void>;
  private statFn?: (path: string) => Promise<any>;
  private unlinkFn?: (path: string) => Promise<void>;

  private constructor() {}

  static getInstance(): BrowserFSService {
    if (!BrowserFSService.instance) {
      BrowserFSService.instance = new BrowserFSService();
    }
    return BrowserFSService.instance;
  }

  private async ensureDeps(): Promise<BrowserFsDeps> {
    if (this.deps) return this.deps;
    const deps = await loadBrowserFsDeps();
    this.deps = deps;
    return deps;
  }

  private async ensureFsBound(forceReload = false): Promise<void> {
    const deps = await this.ensureDeps();

    if (forceReload) {
      this.fs = null;
      this.bufferCtor = null;
      this.readdirFn = undefined;
      this.readFileFn = undefined;
      this.writeFileFn = undefined;
      this.statFn = undefined;
      this.unlinkFn = undefined;
    }

    if (this.fs && this.bufferCtor && this.readdirFn && this.readFileFn && this.writeFileFn && this.statFn && this.unlinkFn) {
      return;
    }

    const bufferMod = deps.BFSRequire('buffer');
    const fsMod = deps.BFSRequire('fs') as FSModule;

    this.bufferCtor = bufferMod.Buffer;
    this.fs = fsMod;
    this.readdirFn = promisify<string[]>(fsMod.readdir.bind(fsMod));
    this.readFileFn = promisify<Buffer>(fsMod.readFile.bind(fsMod));
    this.writeFileFn = promisify<void>(fsMod.writeFile.bind(fsMod));
    this.statFn = promisify<any>(fsMod.stat.bind(fsMod));
    this.unlinkFn = promisify<void>(fsMod.unlink.bind(fsMod));
  }

  // 初始化（只执行一次）
  async init() {
    if (this.initialized) return this;
    const deps = await this.ensureDeps();
    const idbfs = await createBackend(deps.IndexedDBFileSystem, { storeName: 'RWL' });
    deps.initialize(idbfs);
    this.initialized = true;
    await this.ensureFsBound(true);
    return this;
  }

  // 重置（下次再 init 时会重新创建）
  async reset() {
    this.initialized = false;
    await this.init();
  }

  async initRetroFs(): Promise<void> {
    const deps = await this.ensureDeps();
    // Fetch the prepackaged bundle zip used by RetroArch
    const zipResponse = await fetch('assets/frontend/bundle.zip');
    if (!zipResponse.ok) {
      throw new Error(`Failed to fetch bundle.zip: ${zipResponse.status} ${zipResponse.statusText}`);
    }

    const zipArrayBuf = await zipResponse.arrayBuffer();
    const zipData = deps.arrayBuffer2Buffer(zipArrayBuf);
    const zipFS = await createBackend(deps.ZipFS, { zipData });

    const idbfs = await createBackend(deps.IndexedDBFileSystem, { storeName: 'RWL' });
    const inMemoryFSGame = await createBackend(deps.InMemoryFileSystem, {});
    const inMemoryFSUserData = await createBackend(deps.InMemoryFileSystem, {});

    const asyncMirrorFS = await createBackend(deps.AsyncMirror, { sync: inMemoryFSUserData, async: idbfs });
    const folderAdapter = await createBackend(deps.FolderAdapter, { folder: '/userdata', wrapped: asyncMirrorFS });
    const config = await createBackend(deps.FolderAdapter, { folder: '/config', wrapped: asyncMirrorFS });

    const mountableFS = await createBackend(deps.MountableFileSystem, {
      '/home/web_user/.config/retroarch': config,
      '/home/web_user/retroarch/userdata': folderAdapter,
      '/home/web_user/retroarch/bundle': zipFS,
      '/home/web_user/retroarch/userdata/content/downloads': inMemoryFSGame
    });

    deps.initialize(mountableFS);
    this.initialized = true;
    await this.ensureFsBound(true);
  }
  private assertReadSupport() {
    if (!this.readFileFn || !this.writeFileFn) {
      throw new Error('BrowserFS read/write methods are not ready.');
    }
  }

  // 读取文件内容（Buffer）
  async readFile(fileName: string): Promise<Buffer> {
    await this.ensureFsBound();
    this.assertReadSupport();
    return this.readFileFn!(fileName);
  }

  // 写入文件内容
  async writeFile(fileName: string, data: Buffer): Promise<void> {
    await this.ensureFsBound();
    this.assertReadSupport();
    await this.writeFileFn!(fileName, data);
  }

  // 异步读取目录
  async readDir(path: string): Promise<string[]> {
    await this.ensureFsBound();
    try {
      return await this.readdirFn!(path);
    } catch {
      return [];
    }
  }

  // 读取目录并返回带类型与大小的条目
  async readDirDetailed(path: string): Promise<Array<{ name: string; isDir: boolean; size?: number }>> {
    await this.ensureFsBound();
    const names = await this.readDir(path);
    const entries: Array<{ name: string; isDir: boolean; size?: number }> = [];
    for (const name of names) {
      try {
        const s = await this.statFn!(`${path.endsWith('/') ? path.slice(0, -1) : path}/${name}`);
        const isDir = typeof s.isDirectory === 'function' ? s.isDirectory() : s.type === 'DIRECTORY';
        entries.push({ name, isDir, size: isDir ? undefined : s.size });
      } catch {
        entries.push({ name, isDir: false });
      }
    }
    // 目录优先，然后按名称排序
    entries.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1));
    return entries;
  }

  // 确保目录存在（fs.exists 不是 err-first 回调，因此手写 Promise）
  async ensureDir(dir: string): Promise<boolean> {
    await this.ensureFsBound();
    const fs = this.fs!;
    const mkdir = promisify<void>(fs.mkdir.bind(fs));
    return new Promise<boolean>((resolve, reject) => {
      fs.exists(dir, (exists: boolean) => {
        if (exists) {
          resolve(true);
          return;
        }
        mkdir(dir).then(() => resolve(true)).catch(reject);
      });
    });
  }

  // 保存文件
  async saveGameFile(fileName: string, data: ArrayBuffer): Promise<void> {
    await this.ensureFsBound();
    this.assertReadSupport();
    if (!this.bufferCtor) {
      throw new Error('BrowserFS buffer module not initialized.');
    }
    await this.writeFileFn!(fileName, this.bufferCtor.from(data));
  }

  // 删除文件
  async deleteFile(path: string): Promise<void> {
    await this.ensureFsBound();
    await this.unlinkFn!(path);
  }

}

// 导出单例实例
export const browserFS = BrowserFSService.getInstance();
