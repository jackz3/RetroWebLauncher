import { useCallback, useEffect, useState } from 'react';
import { browserFS } from '../utils/fs';

export type GamesFileMeta = { systemId: string; fileName: string };

export function useManageGames() {
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!selectedSystem) {
      setFiles([]);
      return;
    }
    const list = await browserFS.readDir(`/roms/${selectedSystem}`);
    setFiles(list);
  }, [selectedSystem]);

  useEffect(() => {
    // auto refresh when selectedSystem changes
    refresh();
  }, [selectedSystem, refresh]);

  const clearPending = useCallback(() => setPendingDelete(null), []);

  const requestDeleteByMeta = useCallback(async (meta: GamesFileMeta): Promise<'pending' | 'deleted' | 'noop'> => {
    const full = `/roms/${meta.systemId}/${meta.fileName}`;
    if (pendingDelete === full) {
      await browserFS.deleteFile(full);
      setPendingDelete(null);
      await refresh();
      return 'deleted';
    } else {
      setPendingDelete(full);
      return 'pending';
    }
  }, [pendingDelete, refresh]);

  const isPending = useCallback((meta: GamesFileMeta) => {
    const full = `/${meta.systemId}/${meta.fileName}`;
    return pendingDelete === full;
  }, [pendingDelete]);

  return {
    selectedSystem,
    setSelectedSystem,
    files,
    pendingDelete,
    isPending,
    clearPending,
    refresh,
    requestDeleteByMeta,
  } as const;
}
