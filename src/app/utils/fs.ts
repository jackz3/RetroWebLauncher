'use client'
import { BFSRequire, initialize } from 'browserfs';
import IndexedDBFileSystem from 'browserfs/dist/node/backend/IndexedDB';
import { promisify } from './help';
import { FSModule } from 'browserfs/dist/node/core/FS';
import FolderAdapter from 'browserfs/dist/node/backend/FolderAdapter';
import InMemoryFileSystem from 'browserfs/dist/node/backend/InMemory';
import AsyncMirror from 'browserfs/dist/node/backend/AsyncMirror';
import MountableFileSystem from 'browserfs/dist/node/backend/MountableFileSystem';
import ZipFS from 'browserfs/dist/node/backend/ZipFS';
import { arrayBuffer2Buffer } from 'browserfs/dist/node/core/util';

const Buffer = BFSRequire('buffer').Buffer;

// 工厂：将 IndexedDB.Create 变成 Promise
export const createIndexedDBFS = promisify<IndexedDBFileSystem>((options, callback) =>
  IndexedDBFileSystem.Create(options, callback)
);
const createZipFS = promisify<ZipFS>((options, callback) => ZipFS.Create(options, callback));
const createInMemoryFS = promisify<InMemoryFileSystem>((options, callback) => InMemoryFileSystem.Create(options, callback));
const createAsyncMirrorFS = promisify<AsyncMirror>((options, callback) => AsyncMirror.Create(options, callback));
const createFolderAdapterFS = promisify<FolderAdapter>((options, callback) => FolderAdapter.Create(options, callback));
const createMountableFS = promisify<MountableFileSystem>((options, callback) => MountableFileSystem.Create(options, callback));

// 单例服务封装
class BrowserFSService {
  private static instance: BrowserFSService;
  private fs: FSModule
  private initialized: boolean = false;
  readdir: (path: string) => Promise<string[]>;
  readFile: (fileName: string) => Promise<Buffer>;
  writeFile: (fileName: string, data: Buffer) => Promise<void>;
  stat: (path: string) => Promise<any>;
  unlink: (path: string) => Promise<void>;

  private constructor() {
      this.fs = BFSRequire('fs');
      this.readdir = promisify<string[]>(this.fs.readdir);
      this.readFile = promisify<Buffer>(this.fs.readFile);
      this.writeFile = promisify<void>(this.fs.writeFile);
  this.stat = promisify<any>(this.fs.stat);
  this.unlink = promisify<void>(this.fs.unlink);
  }

  static getInstance(): BrowserFSService {
    if (!BrowserFSService.instance) {
      BrowserFSService.instance = new BrowserFSService();
    }
    return BrowserFSService.instance;
  }

  // 初始化（只执行一次）
  async init() {
    if (this.initialized) return this;
    const idbfs = await createIndexedDBFS({ storeName: 'PlayRetro' });
    initialize(idbfs);
    this.initialized = true;
    return this;
  }

  // 重置（下次再 init 时会重新创建）
  async reset() {
    this.initialized = false;
    await this.init();
  }

  async initRetroFs(): Promise<void> {
    // Fetch the prepackaged bundle zip used by RetroArch
    const zipArrayBuf = await fetch('assets/frontend/bundle.zip').then((res) => res.arrayBuffer());
    const zipData = arrayBuffer2Buffer(zipArrayBuf);
    const zipFS = await createZipFS({ zipData });

    const idbfs = await createIndexedDBFS({ storeName: 'PlayRetro' });

    const inMemoryFSGame = await createInMemoryFS({});
    const inMemoryFSUserData = await createInMemoryFS({});

    const asyncMirrorFS = await createAsyncMirrorFS({ sync: inMemoryFSUserData, async: idbfs });
    const folderAdapter = await createFolderAdapterFS({ folder: "/userdata", wrapped: asyncMirrorFS});

    const mountableFS = await createMountableFS({
        '/home/web_user/retroarch/userdata': folderAdapter,
        '/home/web_user/retroarch/bundle': zipFS,
        '/home/web_user/retroarch/userdata/content/downloads': inMemoryFSGame,
    });
    initialize(mountableFS);
  }
  // 异步读取目录
  readDir(path: string): Promise<string[]> {
    return this.readdir(path).catch(() => []);
  }

  // 读取目录并返回带类型与大小的条目
  async readDirDetailed(path: string): Promise<Array<{ name: string; isDir: boolean; size?: number }>> {
    const names = await this.readDir(path);
    const entries: Array<{ name: string; isDir: boolean; size?: number }> = [];
    for (const name of names) {
      try {
        const s = await this.stat(`${path.endsWith('/') ? path.slice(0, -1) : path}/${name}`);
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
  ensureDir(dir: string): Promise<boolean> {
    const mkdir = promisify<void>(this.fs.mkdir);
    return new Promise<boolean>((resolve, reject) => {
      this.fs.exists(dir, (exists: boolean) => {
        if (exists) return resolve(true);
        mkdir(dir).then(() => resolve(true)).catch(reject);
      });
    });
  }

  // 保存文件
  saveGameFile(fileName: string, data: ArrayBuffer): Promise<void> {
    return this.writeFile(fileName, Buffer.from(data));
  }

  // 删除文件
  async deleteFile(path: string): Promise<void> {
    await this.unlink(path);
  }

}

// 导出单例实例
export const browserFS = BrowserFSService.getInstance();
