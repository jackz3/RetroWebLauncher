import React, { useRef } from 'react';

type MenuItem = { id: string; label: string; disabled?: boolean };

type Props = {
  items: MenuItem[];
  selectedIndex: number;
  onSelect: (item: MenuItem) => void;
  onUploadFiles: (files: FileList, done: () => void) => void;
  selectedSystem: string | null;
  gameFiles: string[];
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  onSelectIndex?: (index: number) => void;
  isPendingFile?: (file: string) => boolean;
};

export function ManageGames({ items, selectedIndex, onSelect, onUploadFiles, selectedSystem, gameFiles, scrollContainerRef, onSelectIndex, isPendingFile }: Props) {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const isItemFocused = (index: number) => index === selectedIndex;
  return (
    <>
      {/* 隐藏的上传 input，仅供点击触发 */}
      <input
        ref={uploadInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={(e) => {
          const files = e.target.files;
          if (!selectedSystem || !files || files.length === 0) return;
          onUploadFiles(files, () => {
            if (uploadInputRef.current) uploadInputRef.current.value = '';
          });
        }}
      />
      <div ref={scrollContainerRef} className="border border-gray-200 rounded-md max-h-[calc(60vh-200px)] overflow-y-auto">
        <ul className="overflow-hidden">
          {items.map((item, index) => (
            <li key={item.id} data-index={index}>
              <button
                className={`w-full text-left px-4 py-3 flex justify-between items-center ${
                  item.disabled
                    ? 'text-gray-400 cursor-not-allowed'
                    : isItemFocused(index)
                      ? 'bg-blue-50 border-l-4 border-blue-300'
                      : 'hover:bg-gray-50'
                }`}
                onClick={() => {
                  if (item.disabled) return;
                  if (item.id === 'upload') {
                    if (uploadInputRef.current) {
                      uploadInputRef.current.value = '';
                      uploadInputRef.current.click();
                    }
                  } else {
                    onSelect(item);
                  }
                }}
                disabled={item.disabled}
              >
                <span>{item.label}</span>
                {item.id === 'select-system' && (
                  <span className={item.disabled ? 'text-gray-300' : 'text-gray-400'}>{'>'}</span>
                )}
              </button>
            </li>
          ))}
          {/* 展示文件列表 */}
          {selectedSystem && gameFiles.map((file, idx) => {
            const index = items.length + idx;
            const focused = isItemFocused(index);
            const pending = isPendingFile?.(file) ?? false;
            return (
              <li key={`gamefile-${file}`} data-index={index}>
                <button
                  className={`w-full text-left px-4 py-3 flex justify-between items-center ${focused ? 'bg-blue-50 border-l-4 border-blue-300' : 'hover:bg-gray-50'}`}
                  onClick={() => onSelectIndex?.(index)}
                >
                  <span>{file}</span>
                  {pending && (
                    <span className="text-red-600">[Delete?]</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
