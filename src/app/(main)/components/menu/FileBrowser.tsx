import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import type { FsAdapter, FsEntry } from './fsTypes';

type Props<T extends FsEntry = FsEntry> = {
  adapter: FsAdapter<T>;
  path: string;
  setPath: (p: string) => void;
  selectedIndex: number;
  setSelectedIndex: (i: number) => void;
  onTitle: (title: string) => void; // caller controls title text like "VFS: <path>"
  titlePrefix: string; // e.g., "VFS" or "ONEDRIVE"
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  enableDelete?: boolean; // show delete affordance for files when navigating left
  onEnter?: (fullPath: string, entry: T | null) => void; // notify when user enters/open (dir only)
  enterRequestedAt?: number; // bump this number to request an enter at the current selectedIndex
  onEntriesChange?: (entries: T[]) => void;
  onPendingDeleteChange?: (pending: string | null) => void;
};

export type FileBrowserHandle = {
  requestDelete: (index: number) => Promise<void>;
  enter: (index: number) => Promise<void>;
  refresh: () => Promise<void>;
};

export const FileBrowser = forwardRef(function FileBrowserInner<T extends FsEntry = FsEntry>({
  adapter,
  path,
  setPath,
  selectedIndex,
  setSelectedIndex,
  onTitle,
  titlePrefix,
  scrollContainerRef,
  enableDelete,
  onEnter,
  enterRequestedAt,
  onEntriesChange,
  onPendingDeleteChange
}: Props<T>, ref: React.Ref<FileBrowserHandle>) {
  const [entries, setEntries] = useState<T[]>([]);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const hasParent = useMemo(() => !adapter.isRoot(path), [adapter, path]);
  const offset = hasParent ? 1 : 0;

  const refresh = useCallback(async () => {
    const list = await adapter.list(path);
    setEntries(list);
    onEntriesChange?.(list);
  }, [adapter, path, onEntriesChange]);

  useEffect(() => {
    void refresh();
    onTitle(`${titlePrefix}: ${path}`);
    // reset local UI flags when path changes
    setPendingDelete(null);
  }, [path, onTitle, titlePrefix, refresh]);

  // auto-clear pending delete when selection moves
  useEffect(() => {
    if (pendingDelete) setPendingDelete(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex]);

  useEffect(() => {
    onPendingDeleteChange?.(pendingDelete);
  }, [pendingDelete, onPendingDeleteChange]);

  const goParent = useCallback(async () => {
    const parent = adapter.parent(path);
    setPath(parent);
    setSelectedIndex(0);
  }, [adapter, path, setPath, setSelectedIndex]);

  const downloadEntry = useCallback(async (entry: T) => {
    if (!adapter.readFile) return;
    if (typeof window === 'undefined') return;
    try {
      const fullPath = adapter.join(path, entry.name);
      const data = await adapter.readFile(fullPath);
      const blob = coerceToBlob(data);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = entry.name;
      // use a temporary anchor to prompt the browser download dialog
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('FileBrowser download failed', error);
    }
  }, [adapter, path]);

  const enter = useCallback(async (index: number) => {
    if (hasParent && index === 0) return goParent();
    const entry = entries[index - offset];
    if (!entry) return;
    if (entry.isDir) {
      const next = adapter.join(path, entry.name);
      setPath(next);
      setSelectedIndex(0);
      onEnter?.(next, entry);
    } else {
      await downloadEntry(entry);
    }
  }, [adapter, downloadEntry, entries, goParent, hasParent, offset, onEnter, path, setPath, setSelectedIndex]);

  // allow external request to trigger enter on current selection
  useEffect(() => {
    if (!enterRequestedAt) return;
    // only act when timestamp bumps; attempt to enter selectedIndex
    enter(selectedIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enterRequestedAt]);

  // expose a helper for MenuModal to call on left-key to request delete
  const requestDelete = useCallback(async (index: number) => {
    if (!enableDelete) return;
    const entry = entries[index - offset];
    if (!entry || entry.isDir) return;
    const full = adapter.join(path, entry.name);
    if (pendingDelete === full) {
      if (adapter.delete) await adapter.delete(full);
      setPendingDelete(null);
      await refresh();
    } else {
      setPendingDelete(full);
    }
  }, [enableDelete, entries, offset, adapter, path, pendingDelete, refresh]);

  useImperativeHandle(ref, () => ({ requestDelete, enter, refresh }), [requestDelete, enter, refresh]);

  // Render UI
  return (
    <div ref={scrollContainerRef} className="border border-gray-200 rounded-md max-h-[calc(60vh-200px)] overflow-y-auto">
      <ul className="overflow-hidden">
        {hasParent && (
          <li data-index={0}>
            <button
              className={`w-full text-left px-4 py-3 flex justify-between items-center ${selectedIndex===0 ? 'bg-blue-50 border-l-4 border-blue-300' : 'hover:bg-gray-50'}`}
              onClick={goParent}
            >
              <span>..</span>
            </button>
          </li>
        )}
        {entries.map((entry, idx) => {
          const index = idx + offset;
          const focused = selectedIndex === index;
          const full = adapter.join(path, entry.name);
          const pending = pendingDelete === full;
          return (
            <li key={full} data-index={index}>
              <button
                className={`w-full text-left px-4 py-3 flex justify-between items-center ${focused ? 'bg-blue-50 border-l-4 border-blue-300' : 'hover:bg-gray-50'}`}
                onClick={() => enter(index)}
              >
                <span className="flex items-center gap-2">
                  {entry.isDir ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 6a2 2 0 012-2h3l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                  ) : (
                    <span className="inline-block w-5" />
                  )}
                  <span>{entry.name}</span>
                </span>
                <span className="flex items-center gap-2">
                  {'size' in entry && !entry.isDir && entry.size !== undefined && (
                    <span className="text-gray-500 text-sm">{formatBytes(entry.size)}</span>
                  )}
                  {!entry.isDir && pending && (
                    <span className="text-red-600">[Delete?]</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
});

function coerceToBlob(data: ArrayBuffer | ArrayBufferView | Blob | string): Blob | null {
  if (data instanceof Blob) return data;
  if (typeof data === 'string') return new Blob([data], { type: 'text/plain' });
  if (data instanceof ArrayBuffer) return new Blob([data], { type: 'application/octet-stream' });
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView;
    const copy = new Uint8Array(view.byteLength);
    copy.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
    return new Blob([copy.buffer], { type: 'application/octet-stream' });
  }
  return null;
}

// local helper to keep bytes formatting close; mirrors existing util in MenuModal
function formatBytes(bytes?: number): string {
  if (bytes === undefined || isNaN(bytes)) return '';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  const decimals = i === 0 ? 0 : value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(decimals)} ${units[i]}`;
}

export type { FsAdapter };
