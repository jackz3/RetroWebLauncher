'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useThemeStore } from '../store/theme';
import { useModalStore } from '../store/modal';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { focusManager } from '../focusManager';
import { getAllSystems, getSelectedSystems, toggleSystemSelection, saveSelectedSystems } from '../utils/systemManager';
import { browserFS } from '../utils/fs';
import { oneDrive } from '../utils/onedrive';
import { FileBrowser, type FileBrowserHandle } from './menu/FileBrowser';
import { SystemList } from './menu/SystemList';
import { ManageGames } from './menu/ManageGames';
import { useManageGames } from './menu/useManageGames';
import type { FsAdapter, FsEntry } from './menu/fsTypes';

// Extracted types and builders
import {
  MENU_STRUCTURE,
  AVAILABLE_THEMES,
  buildCapabilitiesMenu,
  formatCapabilityName,
  formatThemeName,
  type MenuItem
} from './menu/menuBuilder';
import type { SystemItem } from './menu/useMenuState';
import { useMenuState } from './menu/useMenuState';
import cores from '../../cores.json';

const MenuModal = () => {
  // Store hooks
  const {
    themeName,
    setThemeName,
    setThemeJson,
    view,
    setView,
    themeJson,
    selectedVariant,
    selectedColorScheme,
    selectedAspectRatio,
    setSelectedVariant,
    setSelectedColorScheme,
    setSelectedAspectRatio
  } = useThemeStore();

  const { isThemeSelectorOpen, closeThemeSelector } = useModalStore();

  // Local state
  const [tempTheme, setTempTheme] = useState(themeName);
  const [tempVariant, setTempVariant] = useState(selectedVariant);
  const [tempColorScheme, setTempColorScheme] = useState(selectedColorScheme);
  const [tempAspectRatio, setTempAspectRatio] = useState(selectedAspectRatio);
  const [menuState, dispatchMenu] = useMenuState({ stack: [], current: [], title: 'MAIN MENU' });
  const [menuKey, setMenuKey] = useState(0); // Key to force reinitialization
  // VFS 状态
  const [vfsPath, setVfsPath] = useState<string>('/');
  const [vfsEntries, setVfsEntries] = useState<Array<{ name: string; isDir: boolean; size?: number }>>([]);
  const [vfsPendingDelete, setVfsPendingDelete] = useState<string | null>(null);
  // OneDrive 状态
  const [odUsername, setOdUsername] = useState<string | null>(null);
  const [odPath, setOdPath] = useState<string>('/');
  const [odEntries, setOdEntries] = useState<Array<{ id: string; name: string; isDir: boolean; size?: number }>>([]);
  // Source selection state: 'vfs' | 'onedrive' (persisted in localStorage)
  const [source, setSource] = useState<'vfs' | 'onedrive'>('vfs');
  // Trigger enter for FileBrowser without using ref
  const [fileBrowserEnterTick, setFileBrowserEnterTick] = useState<number>(0);
  // 上传对话框状态（已废弃，清理）
  // Manage Games 状态由 hook 管理
  const {
    selectedSystem: mgSelectedSystem,
    setSelectedSystem: setMgSelectedSystem,
    files: gameFiles,
    isPending: isGamePending,
    clearPending: clearGamePending,
    refresh: refreshGameFiles,
    requestDeleteByMeta
  } = useManageGames();
  // 文件上传 input ref
  const uploadInputRef = useRef<HTMLInputElement>(null);
  // 局部系统选择
  const [localSelectedSystem, setLocalSelectedSystem] = useState<string | null>(null);
  // 全局 selectedSystem
  const selectedSystem = useThemeStore(state => state.selectedSystem);

  // 同步局部选择到 manage games 钩子
  useEffect(() => {
    if (localSelectedSystem) {
      setMgSelectedSystem(localSelectedSystem);
    }
  }, [localSelectedSystem, setMgSelectedSystem]);

  // 初始化 BrowserFS
  useEffect(() => {
    browserFS.init();
  }, []);

  // Refs
  const previousViewRef = useRef<'system' | 'gamelist'>('system');
  const menuStateRef = useRef(menuState);
  const previousMenuLengthRef = useRef(menuState.current.length);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null); // Ref for scroll container
  const vfsBrowserRef = useRef<FileBrowserHandle>(null);
  const odBrowserRef = useRef<FileBrowserHandle>(null);
  const prevNavigateIndexRef = useRef<number | null>(null);

  // FsAdapters bridging to existing utilities
  const vfsAdapter: FsAdapter = useMemo(() => ({
    root: '/',
    isRoot: (p) => p === '/',
    parent: (p) => p.replace(/\/?[^/]+\/?$/, '') || '/',
    join: (dir, name) => (dir.endsWith('/') ? dir.slice(0, -1) : dir) + '/' + name,
    list: async (p) => browserFS.readDirDetailed(p),
    delete: async (p) => browserFS.deleteFile(p)
  }), []);
  type OdEntry = { id: string; name: string; isDir: boolean; size?: number } & FsEntry;
  const odAdapter: FsAdapter<OdEntry> = useMemo(() => ({
    root: '/',
    isRoot: (p) => p === '/',
    parent: (p) => p.replace(/\/?[^/]+\/?$/, '') || '/',
    join: (dir, name) => (dir.endsWith('/') ? dir.slice(0, -1) : dir) + '/' + name,
    list: async (p) => (await oneDrive.listChildren(p)) as OdEntry[]
  }), []);

  const setVfsTitle = useCallback((t: string) => {
    if (menuState.title !== t) {
      dispatchMenu({ type: 'SET_TITLE', title: t });
    }
  }, [menuState.title, dispatchMenu]);

  const setOdTitle = useCallback((t: string) => {
    if (menuState.title !== t) {
      dispatchMenu({ type: 'SET_TITLE', title: t });
    }
  }, [menuState.title, dispatchMenu]);

  // Helper functions
  const getParentMenuItemId = useCallback((menuStack: MenuItem[][], currentMenu: MenuItem[]): string | null => {
    if (menuStack.length === 0) return null;
    
    const parentMenu = menuStack[menuStack.length - 1];
    const parentItem = parentMenu.find(item => 
      item.subItems?.some(subItem => subItem.id === currentMenu[0]?.id)
    );
    
    return parentItem?.id || null;
  }, []);

  // buildCapabilitiesMenu moved to menuBuilder

  // Event handlers
  const handleApply = useCallback((themeNameToApply?: string, newTempVariant?: string, newTempColorScheme?: string, newTempAspectRatio?: string) => {
    const variantToApply = newTempVariant ?? tempVariant;
    const colorSchemeToApply = newTempColorScheme ?? tempColorScheme;
    const aspectRatioToApply = newTempAspectRatio ?? tempAspectRatio;
    
    // Only apply if the values have changed or if it's an immediate apply from the capabilities menu.
    // Note: themeNameToApply is used for immediate apply in theme list.
    if (themeNameToApply !== undefined && themeNameToApply !== themeName) {
      setThemeJson(null);
      setThemeName(themeNameToApply);
    } else if (tempTheme !== themeName) {
      setThemeJson(null);
      setThemeName(tempTheme);
    }

    if (variantToApply !== selectedVariant) {
      setSelectedVariant(variantToApply);
    }
    if (colorSchemeToApply !== selectedColorScheme) {
      setSelectedColorScheme(colorSchemeToApply);
    }
    if (aspectRatioToApply !== selectedAspectRatio) {
      setSelectedAspectRatio(aspectRatioToApply);
    }
    
    closeThemeSelector();
  }, [tempTheme, tempVariant, tempColorScheme, tempAspectRatio, themeName, selectedVariant, selectedColorScheme, selectedAspectRatio, setThemeJson, setThemeName, closeThemeSelector, setSelectedVariant, setSelectedColorScheme, setSelectedAspectRatio]);

  const handleClose = useCallback(() => {
    setTempTheme(themeName);
    setTempVariant(selectedVariant);
    setTempColorScheme(selectedColorScheme);
    setTempAspectRatio(selectedAspectRatio);
    closeThemeSelector();
  }, [themeName, selectedVariant, selectedColorScheme, selectedAspectRatio, closeThemeSelector]);

  const handleBack = useCallback(() => {
    const prev = menuState;
    if (prev.stack.length === 0) return;
    // Reset temp selections when going back from specific menus
    if (prev.stack.length === 2) {
      const parentId = getParentMenuItemId(prev.stack, prev.current);
      if (parentId === 'theme-variant') {
        setTempVariant(selectedVariant);
      } else if (parentId === 'theme-color-scheme') {
        setTempColorScheme(selectedColorScheme);
      } else if (parentId === 'theme-aspect-ratio') {
        setTempAspectRatio(selectedAspectRatio);
      }
    }
    dispatchMenu({ type: 'POP' });
  }, [menuState, selectedVariant, selectedColorScheme, selectedAspectRatio, getParentMenuItemId, dispatchMenu]);

  // 自动同步 MANAGE GAMES 第二层菜单项（select-system、upload、文件列表项）
  useEffect(() => {
    // 仅在 MANAGE GAMES 第二层时重建菜单项
    if (
      menuState.title === 'MANAGE GAMES' &&
      menuState.stack.length > 0 &&
      menuState.stack[menuState.stack.length - 1].some(item => item.id === 'games')
    ) {
      const currentSystem = localSelectedSystem || selectedSystem;
      const selectSystemLabel = currentSystem
        ? `SELECT SYSTEM     ${currentSystem}`
        : 'SELECT SYSTEM';
      const gamesMenu: MenuItem[] = [
        { id: 'select-system', label: selectSystemLabel, meta: { kind: 'games-select-system' as const } },
        { id: 'upload', label: 'UPLOAD', disabled: !currentSystem, meta: { kind: 'games-upload' as const } },
      ];
      if (currentSystem && gameFiles.length > 0) {
        gamesMenu.push(
          ...gameFiles.map((file) => ({
            id: `gamefile-${file}`,
            label: file,
            disabled: false,
            meta: { kind: 'games-file' as const, systemId: currentSystem, fileName: file }
          }))
        );
      }
      dispatchMenu({ type: 'REPLACE_CURRENT', items: gamesMenu });
    }
  }, [gameFiles, localSelectedSystem, selectedSystem, menuState.title, menuState.stack]);

  // Keyboard navigation
  const { selectedIndex, setSelectedIndex } = useKeyboardNavigation({
    elementId: 'menu-modal',
    elementType: 'menu',
    totalItems: menuState.title.startsWith('VFS:')
      ? (vfsEntries.length + (vfsPath !== '/' ? 1 : 0))
      : menuState.title.startsWith('ONEDRIVE:')
      ? (odEntries.length + (odPath !== '/' ? 1 : 0))
      : (menuState.systemList ? menuState.systemList.length : menuState.current.length),
    initialIndex: 0,
    resetDeps: [
      menuState.title,
      menuState.systemList ? menuState.systemList.length : -1,
      menuState.current.length,
      vfsPath,
      odPath
    ],
    onSelect: (index) => {
      // VFS 视图内处理回车：0 为返回上级；目录则进入
      if (menuState.title.startsWith('VFS:')) {
        // 请求 FileBrowser 进入当前项
        setFileBrowserEnterTick(t => t + 1);
        return;
      }
      // OneDrive 浏览视图内处理回车
      if (menuState.title.startsWith('ONEDRIVE:')) {
        setFileBrowserEnterTick(t => t + 1);
        return;
      }
      // Handle system list selection
      if (menuState.systemList && menuState.systemList.length > 0) {
        const selectedSystem = menuState.systemList[index];
        if (selectedSystem) {
          handleSystemToggle(selectedSystem.id);
        }
        return;
      }
      
      const currentItem = menuState.current[index];
      if (!currentItem?.disabled) {
        const parentId = getParentMenuItemId(menuState.stack, menuState.current);
        
        // Handle immediate apply cases
        if (menuState.stack.length === 2) {
          if (parentId === 'theme' && AVAILABLE_THEMES.includes(currentItem.id)) {
            handleApply(currentItem.id);
            return;
          }
          if (parentId === 'theme-variant') {
            handleApply(undefined, currentItem.id);
            return;
          }
          if (parentId === 'theme-color-scheme') {
            handleApply(undefined, undefined, currentItem.id);
            return;
          }
          if (parentId === 'theme-aspect-ratio') {
            handleApply(undefined, undefined, undefined, currentItem.id);
            return;
          }
        }
        
        handleMenuSelect(currentItem);
      }
    },
    onEscape: handleClose,
    onBack: () => {
      if (menuState.systemList) {
        // Exit system list view
        if (menuState.stack.length === 0) {
          dispatchMenu({ type: 'SET_SYSTEM_LIST', list: undefined });
          dispatchMenu({ type: 'SET_TITLE', title: 'MAIN MENU' });
        } else {
          dispatchMenu({ type: 'POP' });
          // current will be replaced by reducer POP; systemList cleared below
          dispatchMenu({ type: 'SET_SYSTEM_LIST', list: undefined });
        }
      } else if (menuState.title.startsWith('VFS:')) {
        if (vfsPath !== '/') {
          const parent = vfsAdapter.parent(vfsPath);
          setVfsPath(parent);
          dispatchMenu({ type: 'SET_TITLE', title: `VFS: ${parent}` });
          setSelectedIndex(0);
        } else {
          handleBack();
        }
      } else if (menuState.title.startsWith('ONEDRIVE:')) {
        if (odPath !== '/') {
          const parent = odAdapter.parent(odPath);
          setOdPath(parent);
          dispatchMenu({ type: 'SET_TITLE', title: `ONEDRIVE: ${parent}` });
          setSelectedIndex(0);
        } else {
          handleBack();
        }
      } else if (menuState.stack.length > 0) {
        handleBack();
      } else {
        handleClose();
      }
    },
    onNavigate: async (direction, index) => {
      setSelectedIndex(index);
      // 只有在 index 发生变化时（上下移动）才清除 Manage Games 删除 pending
      if (menuState.title === 'MANAGE GAMES' && prevNavigateIndexRef.current !== index) {
        clearGamePending();
      }
      prevNavigateIndexRef.current = index;
      
      // Scroll to the selected item
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const selectedItem = container.querySelector(`[data-index="${index}"]`) as HTMLElement;
        
        if (selectedItem) {
          const containerRect = container.getBoundingClientRect();
          const itemRect = selectedItem.getBoundingClientRect();
          
          // Check if item is outside the visible area and scroll if needed
          if (itemRect.bottom > containerRect.bottom) {
            container.scrollTop += itemRect.bottom - containerRect.bottom;
          } else if (itemRect.top < containerRect.top) {
            container.scrollTop -= containerRect.top - itemRect.top;
          }
        }
      }
      // 删除逻辑交由 FileBrowser 内部处理；这里只保留 rootdir 逻辑
      if (menuState.title.startsWith('VFS:') && direction === 'left') {
        await vfsBrowserRef.current?.requestDelete(index);
      }
      // 在 Manage Games 二级页面中，左键两次删除文件
      if (menuState.title === 'MANAGE GAMES' && direction === 'left') {
        const item = menuState.current[index];
        if (item?.meta && item.meta.kind === 'games-file') {
          const result = await requestDeleteByMeta({ systemId: item.meta.systemId, fileName: item.meta.fileName });
          if (result === 'deleted') {
            try { useThemeStore.getState().incrementGameListRefreshKey(); } catch {}
          }
        }
      }
      // 右键也触发删除请求（VFS 与 Manage Games 对齐）
      if (menuState.title.startsWith('VFS:') && direction === 'right') {
        await vfsBrowserRef.current?.requestDelete(index);
      }
      if (menuState.title === 'MANAGE GAMES' && direction === 'right') {
        const item = menuState.current[index];
        if (item?.meta && item.meta.kind === 'games-file') {
          const result = await requestDeleteByMeta({ systemId: item.meta.systemId, fileName: item.meta.fileName });
          if (result === 'deleted') {
            try { useThemeStore.getState().incrementGameListRefreshKey(); } catch {}
          }
        }
      }
      // 在 OneDrive 视图中，右键将选中的目录设置为 rootdir
      if (menuState.title.startsWith('ONEDRIVE:') && direction === 'right') {
        const offset = (odPath !== '/' ? 1 : 0);
        if (index < offset) return;
        const entry = odEntries[index - offset];
        if (!entry || !entry.isDir) return;
        const next = (odPath.endsWith('/') ? odPath.slice(0, -1) : odPath) + '/' + entry.name;
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('onedrive-rootdir', next);
          }
        } catch {}
      }
    },
    isEnabled: isThemeSelectorOpen // Pass the modal open state to the hook
  });

  useEffect(() => {
    menuStateRef.current = menuState;
    if (menuState.current.length !== previousMenuLengthRef.current) {
      previousMenuLengthRef.current = menuState.current.length;
      setMenuKey(prev => prev + 1); // Force reinitialization
    }
  }, [menuState]);

  // 已由 useManageGames.refresh 管理

  const handleMenuSelect = useCallback((item: MenuItem) => {
    // SOURCE 切换
    if (item.id === 'source') {
      const next: 'vfs' | 'onedrive' = source === 'vfs' ? 'onedrive' : 'vfs';
      setSource(next);
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('source', next);
        }
      } catch {}
      const newLabel = next === 'onedrive' ? 'SOURCE ONEDRIVE' : 'SOURCE VFS';
      dispatchMenu({ type: 'REPLACE_CURRENT', items: menuState.current.map(i => i.id === 'source' ? { ...i, label: newLabel } : i) });
      return;
    }
    // 连接 OneDrive（直接进入浏览，起始为保存的 rootdir 或根目录）
    if (item.id === 'onedrive') {
      (async () => {
        try {
          await oneDrive.init();
          if (!oneDrive.isSignedIn()) {
            await oneDrive.login(); // 将触发重定向
            return;
          }
          const profile = await oneDrive.getUserProfile();
          const username = profile?.displayName || oneDrive.getUsername() || null;
          if (username) setOdUsername(username);
          const savedRoot = (typeof window !== 'undefined' && window.localStorage.getItem('onedrive-rootdir')) || '/';
          const startPath = savedRoot && savedRoot.startsWith('/') ? savedRoot : `/${savedRoot || ''}`;
          const list = await oneDrive.listChildren(startPath);
          setOdPath(startPath);
          setOdEntries(list);
          dispatchMenu({ type: 'PUSH', next: [{ id: 'od-root', label: 'ROOT' }], title: `ONEDRIVE: ${startPath}` });
        } catch (e) {
          console.error('OneDrive connect error:', e);
        }
      })();
      return;
    }
    // 进入虚拟文件系统浏览
    if (item.id === 'filesystem') {
      (async () => {
        const root = '/';
        setVfsPath(root);
        const list = await browserFS.readDirDetailed(root);
        setVfsEntries(list);
        setVfsPendingDelete(null);
  dispatchMenu({ type: 'PUSH', next: [{ id: 'vfs-root', label: 'ROOT' }], title: `VFS: ${root}` });
      })();
      return;
    }
    // Handle "MANAGE GAMES" menu item
    if (item.id === 'games' || item.meta?.kind === 'games-root') {
      // 进入 MANAGE GAMES 第二层菜单
  setLocalSelectedSystem(selectedSystem);
  setMgSelectedSystem(selectedSystem);
      // 构建 select system 项，右侧显示当前系统
      const currentSystem = selectedSystem;
      const selectSystemLabel = currentSystem
        ? `SELECT SYSTEM     ${currentSystem}`
        : 'SELECT SYSTEM';
      const gamesMenu: MenuItem[] = [
  { id: 'select-system', label: selectSystemLabel, meta: { kind: 'games-select-system' as const } },
  { id: 'upload', label: 'UPLOAD', disabled: !currentSystem, meta: { kind: 'games-upload' as const } },
      ];
      // 动态插入游戏文件列表项
      if (currentSystem && gameFiles.length > 0) {
        gamesMenu.push(
          ...gameFiles.map((file) => ({
            id: `gamefile-${file}`,
            label: file,
            disabled: false,
            meta: { kind: 'games-file' as const, systemId: currentSystem, fileName: file }
          }))
        );
      }
      dispatchMenu({ type: 'PUSH', next: gamesMenu, title: item.label });
      return;
    }
    // MANAGE GAMES 第二层 select-system 进入第三层
    if (item.meta?.kind === 'games-select-system' || item.id === 'select-system') {
      // 获取 localStorage 'systems' 对象
      const systemsObj = getSelectedSystems();
      const systemItems = Object.keys(systemsObj).map(sys => ({
        id: sys,
        label: sys,
        disabled: false,
        meta: { kind: 'games-system' as const, systemId: sys as string }
      }));
      dispatchMenu({ type: 'PUSH', next: systemItems, title: 'SELECT SYSTEM' });
      return;
    }
    // MANAGE GAMES 第三层系统项点击处理
    if (item.meta?.kind === 'games-system') {
      // 选中系统，只设置局部 localSelectedSystem 并返回第二层
  setLocalSelectedSystem(item.meta.systemId);
  setMgSelectedSystem(item.meta.systemId);
      // 重新构建 MANAGE GAMES 第二层菜单，select system label 立即刷新
  const selectSystemLabel = `SELECT SYSTEM     ${item.meta.systemId}`;
      const gamesMenu: MenuItem[] = [
  { id: 'select-system', label: selectSystemLabel, meta: { kind: 'games-select-system' as const } },
  { id: 'upload', label: 'UPLOAD', disabled: false, meta: { kind: 'games-upload' as const } },
      ];
      // 文件列表继续作为菜单项插入（配合键盘导航和删除）
      dispatchMenu({ type: 'POP' });
      dispatchMenu({ type: 'REPLACE_CURRENT', items: gamesMenu });
      dispatchMenu({ type: 'SET_TITLE', title: 'MANAGE GAMES' });
      // reset handled by resetDeps; we keep index change by returning to menu where list is rebuilt
      return;
    }
    // MANAGE GAMES 第二层 upload 项点击处理
    if ((item.meta?.kind === 'games-upload' || item.id === 'upload') && !item.disabled) {
      if (uploadInputRef.current) {
        uploadInputRef.current.value = '';
        uploadInputRef.current.click();
      }
      return;
    }
    // Handle "MANAGE SYSTEMS" menu item
    if (item.id === 'systems') {
      // Get all systems and selected systems
      const allSystems = getAllSystems();
      const selectedSystems = getSelectedSystems();
      
      // Format systems for display (object format)
      const systemList: SystemItem[] = allSystems.map(system => ({
        id: system.id,
        label: `${system.id}: ${system.systemName}`,
        isSelected: !!selectedSystems[system.id]
      }));
      
      // Sort to show selected systems first
      systemList.sort((a, b) => {
        if (a.isSelected && !b.isSelected) return -1;
        if (!a.isSelected && b.isSelected) return 1;
        return 0;
      });
      
      dispatchMenu({ type: 'PUSH', next: [], title: item.label });
      dispatchMenu({ type: 'SET_SYSTEM_LIST', list: systemList });
      
      // index reset handled by resetDeps
      return;
    }

    // Handle "MANAGE EMULATORS" menu item
    if (item.id === 'emulators' || item.meta?.kind === 'emulators-root') {
      // 二级菜单：显示 selectedSystems，每项右侧显示 core
      const selectedSystemsObj = getSelectedSystems();
      const allSystems = getAllSystems();
      // 只显示已选系统
      const emulatorSystemList: MenuItem[] = Object.keys(selectedSystemsObj).map(systemId => {
        const sysInfo = allSystems.find(s => s.id === systemId);
        const coreName = selectedSystemsObj[systemId];
        return {
          id: `emu-sel-${systemId}`,
          label: `${systemId}${sysInfo ? `: ${sysInfo.systemName}` : ''}`,
          subItems: (cores as Record<string, string[]>)[systemId]?.map(core => ({
            id: `emu-core-${systemId}-${core}`,
            label: core,
            meta: { kind: 'emulator-core' as const, systemId, core }
          })) || [],
          // 右侧显示当前 core
          disabled: false,
          // 附加属性：当前 core
          coreName,
          meta: { kind: 'emulator-system' as const, systemId }
        } as MenuItem & { coreName: string };
      });
      dispatchMenu({ type: 'PUSH', next: emulatorSystemList, title: item.label });
      return;
    }

    // MANAGE EMULATORS 二级菜单项（系统）点击，进入三级 core 选择
    if (item.meta?.kind === 'emulator-system') {
      const systemId = item.meta.systemId;
      const coreList = (cores as Record<string, string[]>)[systemId] || [];
      const selectedCore = getSelectedSystems()[systemId];
      const coreMenu: MenuItem[] = coreList.map(core => ({
        id: `emu-core-${systemId}-${core}`,
        label: core,
        disabled: false,
        // 附加属性：高亮当前 core
        isSelected: core === selectedCore,
        meta: { kind: 'emulator-core' as const, systemId, core }
      }));
      dispatchMenu({ type: 'PUSH', next: coreMenu, title: `Select Core for ${systemId}` });
      return;
    }

    // MANAGE EMULATORS 三级菜单项（core）点击，保存并返回二级
    if (item.meta?.kind === 'emulator-core') {
      const { systemId, core } = item.meta;
      const selectedSystemsObj = getSelectedSystems();
      selectedSystemsObj[systemId] = core;
      saveSelectedSystems(selectedSystemsObj);
      // 同步到 Zustand store，确保后续启动游戏使用最新的内核
      useThemeStore.getState().setSystems(selectedSystemsObj);
      // 返回二级并刷新 coreName
      const allSystems = getAllSystems();
      const emulatorSystemList: MenuItem[] = Object.keys(selectedSystemsObj).map(systemId => {
        const sysInfo = allSystems.find(s => s.id === systemId);
        const coreName = selectedSystemsObj[systemId];
        return {
          id: `emu-sel-${systemId}`,
          label: `${systemId}${sysInfo ? `: ${sysInfo.systemName}` : ''}`,
          subItems: (cores as Record<string, string[]>)[systemId]?.map(core => ({
            id: `emu-core-${systemId}-${core}`,
            label: core,
            meta: { kind: 'emulator-core' as const, systemId, core }
          })) || [],
          disabled: false,
          coreName,
          meta: { kind: 'emulator-system' as const, systemId }
        } as MenuItem & { coreName: string };
      });
      dispatchMenu({ type: 'POP' });
      dispatchMenu({ type: 'REPLACE_CURRENT', items: emulatorSystemList });
      dispatchMenu({ type: 'SET_TITLE', title: 'MANAGE EMULATORS' });
      return;
    }
    if (item.subItems?.length) {
      let initialSubmenuSelectedIndex = 0; // Initialize outside the callback

      // Check if entering a UI setting submenu
      if (menuState.stack.length === 0 && item.id === 'ui-settings') {
        /* Removed setCurrentUiSettingsItem('theme'); */
      }

      // Determine the initial index for the submenu based on current selections
      if (item.id === 'ui-settings') {
        initialSubmenuSelectedIndex = item.subItems!.findIndex(subItem => subItem.id === themeName);
        if (initialSubmenuSelectedIndex === -1) initialSubmenuSelectedIndex = 0;
      } else if (item.id === 'theme-variant') {
        initialSubmenuSelectedIndex = item.subItems!.findIndex(subItem => subItem.id === selectedVariant);
        if (initialSubmenuSelectedIndex === -1) initialSubmenuSelectedIndex = 0;
      } else if (item.id === 'theme-color-scheme') {
        initialSubmenuSelectedIndex = item.subItems!.findIndex(subItem => subItem.id === selectedColorScheme);
        if (initialSubmenuSelectedIndex === -1) initialSubmenuSelectedIndex = 0;
      } else if (item.id === 'theme-aspect-ratio') {
        initialSubmenuSelectedIndex = item.subItems!.findIndex(subItem => subItem.id === selectedAspectRatio);
        if (initialSubmenuSelectedIndex === -1) initialSubmenuSelectedIndex = 0;
      }

      dispatchMenu({ type: 'PUSH', next: item.subItems!, title: item.label });
      // selection reset handled by resetDeps
    } else if (AVAILABLE_THEMES.includes(item.id)) {
      // Theme selection
      setTempTheme(item.id);
    } else if (item.id) {
      // Capability selection
      if (menuState.stack.length === 0) return;
      const parentId = getParentMenuItemId(menuState.stack, menuState.current);
      switch (parentId) {
        case 'theme':
          setTempTheme(item.id);
          break;
        case 'theme-variant':
          setTempVariant(item.id);
          break;
        case 'theme-color-scheme':
          setTempColorScheme(item.id);
          break;
        case 'theme-aspect-ratio':
          setTempAspectRatio(item.id);
          break;
        case 'theme-font-size':
        case 'theme-transition':
          handleBack();
          break;
        default:
          handleBack();
          break;
      }
    }
  }, [themeName, selectedVariant, selectedColorScheme, selectedAspectRatio, getParentMenuItemId, handleBack, menuState.stack.length, setSelectedIndex, source]);

  // Effects
  useEffect(() => {
    if (isThemeSelectorOpen) {
      // Initialize temp states with current selected values when modal opens
      setTempTheme(themeName);
      setTempVariant(selectedVariant);
      setTempColorScheme(selectedColorScheme);
      setTempAspectRatio(selectedAspectRatio);
      setLocalSelectedSystem(selectedSystem);

      console.log('MenuModal useEffect: themeName', themeName);
      console.log('MenuModal useEffect: selectedColorScheme', selectedColorScheme);
      console.log('MenuModal useEffect: themeJson', themeJson);
      console.log('MenuModal useEffect: tempColorScheme', tempColorScheme);
      console.log('MenuModal useEffect: previousViewRef', previousViewRef.current);
      console.log('MenuModal useEffect: current view', view);
      // 动态设置 MANAGE EMULATORS 的禁用状态
      const selectedSystemsObj = getSelectedSystems();
      const hasSelectedSystems = Object.keys(selectedSystemsObj).length > 0;
      // 初始化 source（默认 vfs）
      let initialSource: 'vfs' | 'onedrive' = 'vfs';
      try {
        if (typeof window !== 'undefined') {
          const s = window.localStorage.getItem('source');
          if (s === 'onedrive') initialSource = 'onedrive';
        }
      } catch {}
      setSource(initialSource);
      const updatedMenu = MENU_STRUCTURE.map(item => {
        if (item.id === 'ui-settings' && item.subItems) {
          return { ...item, subItems: buildCapabilitiesMenu(themeJson) };
        }
        if (item.id === 'emulators') {
          return { ...item, disabled: !hasSelectedSystems };
        }
        if (item.id === 'source') {
          return { ...item, label: initialSource === 'onedrive' ? 'SOURCE ONEDRIVE' : 'SOURCE VFS' };
        }
        if (item.id === 'onedrive') {
          return { ...item, label: odUsername ? `ONEDRIVE (${odUsername})` : 'CONNECT ONEDRIVE' };
        }
        return item;
      });
      dispatchMenu({ type: 'RESET', current: updatedMenu, title: 'MAIN MENU' });
      setView('menu'); // Set view to 'menu' when modal opens
      focusManager.focusElement('menu-modal');
      // 异步检查 OneDrive 登录状态并刷新菜单标题
      (async () => {
        try {
          await oneDrive.init();
          if (oneDrive.isSignedIn()) {
            const profile = await oneDrive.getUserProfile();
            const username = profile?.displayName || oneDrive.getUsername() || null;
            if (username) {
              setOdUsername(username);
              const curr = menuStateRef.current.current;
              dispatchMenu({ type: 'REPLACE_CURRENT', items: curr.map(i => i.id === 'onedrive' ? { ...i, label: `ONEDRIVE (${username})` } : i) });
            }
          } else {
            setOdUsername(null);
          }
        } catch {}
      })();
    } else {
      // Revert view only if it was set to 'menu' by this component
      if (view === 'menu') {
        console.log('MenuModal closing: restoring view to', previousViewRef.current);
        setView(previousViewRef.current);
      }
      // focusManager.clearFocusedElement();
    }
  }, [isThemeSelectorOpen]);

  // Helper for toggling and refreshing system list
  const handleSystemToggle = (systemId: string) => {
    toggleSystemSelection(systemId);
    const allSystems = getAllSystems();
    const updatedSelectedSystems = getSelectedSystems();
    // 同步到 Zustand store
    useThemeStore.getState().setSystems(updatedSelectedSystems);
    const updatedSystemList: SystemItem[] = allSystems.map(system => ({
      id: system.id,
      label: `${system.id}: ${system.systemName}`,
      isSelected: !!updatedSelectedSystems[system.id]
    }));
    updatedSystemList.sort((a, b) => {
      if (a.isSelected && !b.isSelected) return -1;
      if (!a.isSelected && b.isSelected) return 1;
      return 0;
    });
    dispatchMenu({ type: 'SET_SYSTEM_LIST', list: updatedSystemList });
  };

  // Render helpers
  const getCurrentValue = (itemId: string): string => {
    switch (itemId) {
      case 'theme':
        return formatThemeName(tempTheme);
      case 'theme-variant':
        return formatCapabilityName(tempVariant || selectedVariant);
      case 'theme-color-scheme':
        return formatCapabilityName(tempColorScheme || selectedColorScheme);
      case 'theme-aspect-ratio':
        return tempAspectRatio || selectedAspectRatio;
      default:
        return '';
    }
  };

  const isItemSelected = (item: MenuItem): boolean => {
    const parentId = getParentMenuItemId(menuState.stack, menuState.current);
    if (menuState.stack.length === 2) {
      if (parentId === 'theme' && item.id === tempTheme) return true;
      if (parentId === 'theme-variant' && item.id === tempVariant) return true;
      if (parentId === 'theme-color-scheme' && item.id === tempColorScheme) return true;
      if (parentId === 'theme-aspect-ratio' && item.id === tempAspectRatio) return true;
    }
    
    return false;
  };

  const isItemFocused = (index: number): boolean => {
    return index === selectedIndex;
  };

  if (!isThemeSelectorOpen) return null;

  const isUiSettingsLevel = menuState.stack.length === 1 && menuState.stack[0][1]?.id === 'ui-settings';
  // Check if we are inside a UI submenu (e.g., Theme, Theme Variant, Theme Color Scheme, etc.)
  const isUiSettingsSubLevel = menuState.stack.length === 2 && menuState.stack[1][0]?.id.startsWith('theme-');

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="bg-white rounded-lg p-4 w-1/2 max-w-[60vw] h-[60vh]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{menuState.title}</h2>
        </div>

        <div className="mb-6">
          {menuState.systemList ? (
            <SystemList
              systems={menuState.systemList}
              selectedIndex={selectedIndex}
              onToggle={handleSystemToggle}
              scrollContainerRef={scrollContainerRef}
            />
            ) : menuState.title.startsWith('VFS:') ? (
              <FileBrowser
                ref={vfsBrowserRef}
                adapter={vfsAdapter}
                path={vfsPath}
                setPath={(p) => {
                  setVfsPath(p);
                  // keep local list in sync for totalItems
                  browserFS.readDirDetailed(p).then(setVfsEntries);
                }}
                selectedIndex={selectedIndex}
                setSelectedIndex={setSelectedIndex}
                onTitle={setVfsTitle}
                titlePrefix="VFS"
                scrollContainerRef={scrollContainerRef}
                enableDelete
                enterRequestedAt={fileBrowserEnterTick}
              />
            ) : menuState.title.startsWith('ONEDRIVE:') ? (
              <FileBrowser
                ref={odBrowserRef}
                adapter={odAdapter}
                path={odPath}
                setPath={(p) => {
                  setOdPath(p);
                  oneDrive.listChildren(p).then(setOdEntries);
                }}
                selectedIndex={selectedIndex}
                setSelectedIndex={setSelectedIndex}
                onTitle={setOdTitle}
                titlePrefix="ONEDRIVE"
                scrollContainerRef={scrollContainerRef}
                enterRequestedAt={fileBrowserEnterTick}
              />
            ) : menuState.title === 'MANAGE GAMES' ? (
              <ManageGames
                items={menuState.current.filter(i => i.meta?.kind !== 'games-file') as any}
                selectedIndex={selectedIndex}
                onSelect={handleMenuSelect as any}
                onUploadFiles={(files, done) => {
                  if (!localSelectedSystem) return;
                  (async () => {
                    await browserFS.ensureDir(`/roms/${localSelectedSystem}`);
                    let total = files.length;
                    for (let i = 0; i < files.length; i++) {
                      const file = files[i];
                      const reader = new FileReader();
                      reader.readAsArrayBuffer(file);
                      reader.onload = async () => {
                        await browserFS.saveGameFile(`/roms/${localSelectedSystem}/${file.name}`, reader.result as ArrayBuffer);
                        total--;
                        if (total === 0) {
                          refreshGameFiles();
                          useThemeStore.getState().incrementGameListRefreshKey();
                          done();
                        }
                      };
                    }
                  })();
                }}
                selectedSystem={localSelectedSystem}
                gameFiles={gameFiles}
                scrollContainerRef={scrollContainerRef}
                onSelectIndex={(i) => {
                  setSelectedIndex(i);
                  clearGamePending();
                }}
                isPendingFile={(file) => !!(localSelectedSystem && isGamePending({ systemId: localSelectedSystem, fileName: file }))}
              />
            ) : (
              <div ref={scrollContainerRef} className="border border-gray-200 rounded-md max-h-[calc(60vh-200px)] overflow-y-auto">
                <ul className="overflow-hidden">
                  {menuState.current.map((item, index) => (
                    <li key={item.id} data-index={index}>
                      <button
                        className={`w-full text-left px-4 py-3 flex justify-between items-center ${
                          item.disabled
                            ? 'text-gray-400 cursor-not-allowed'
                            : isItemFocused(index) && isItemSelected(item)
                              ? 'bg-blue-100 text-blue-800 border-l-4 border-blue-500'
                              : isItemSelected(item)
                                ? 'bg-blue-100 text-blue-800'
                                : isItemFocused(index)
                                  ? 'bg-blue-50 border-l-4 border-blue-300'
                                  : 'hover:bg-gray-50'
                        }`}
                        onClick={() => {
                          if (item.disabled) return;
                          handleMenuSelect(item);
                        }}
                        disabled={item.disabled}
                      >
                        <span>{item.label}</span>
                        {typeof item.coreName === 'string' && (
                          <span className="text-gray-500 mr-2">{item.coreName}</span>
                        )}
                        {(() => {
                          // Determine if this item leads to a deeper view
                          const hasNextLevel = Boolean(item.subItems?.length) || ['systems','emulators','games','filesystem','onedrive'].includes(item.id);
                          return hasNextLevel ? (
                          <>
                            {(isUiSettingsLevel || isUiSettingsSubLevel) && getCurrentValue(item.id) && (
                              <span className="text-gray-500 mr-2">{getCurrentValue(item.id)}</span>
                            )}
                            <span className={item.disabled ? 'text-gray-300' : 'text-gray-400'}>
                              {'>'}
                            </span>
                          </>
                          ) : null;
                        })()}
                        {item.isSelected && (
                          <span className="text-green-500 ml-2">✓</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {(menuState.stack.length > 0 || menuState.systemList) && (
            <button
              className="mt-4 text-blue-600 hover:text-blue-800 flex items-center"
              onClick={() => {
                if (menuState.systemList) {
                  // Exit system list view
                  if (menuState.stack.length === 0) {
                    dispatchMenu({ type: 'SET_SYSTEM_LIST', list: undefined });
                    dispatchMenu({ type: 'SET_TITLE', title: 'MAIN MENU' });
                  } else {
                    const newStack = menuState.stack.slice(0, -1);
                    const previousMenu = menuState.stack[menuState.stack.length - 1];
                    const newTitle = newStack.length === 0 ? 'MAIN MENU' : 
                      newStack[newStack.length - 1].find(item => 
                        item.subItems?.some(subItem => subItem.id === menuState.current[0]?.id)
                      )?.label || 'MENU';
                    dispatchMenu({ type: 'POP' });
                    dispatchMenu({ type: 'REPLACE_CURRENT', items: previousMenu });
                    dispatchMenu({ type: 'SET_TITLE', title: newTitle });
                    dispatchMenu({ type: 'SET_SYSTEM_LIST', list: undefined });
                  }
                } else {
                  handleBack();
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back
            </button>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => handleApply()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuModal;
