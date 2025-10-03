export interface FsEntry {
  id?: string;
  name: string;
  isDir: boolean;
  size?: number;
}

export interface FsAdapter<T extends FsEntry = FsEntry> {
  root: string;
  isRoot(path: string): boolean;
  parent(path: string): string;
  join(dir: string, name: string): string;
  list(path: string): Promise<T[]>;
  delete?(path: string): Promise<void>;
}
