import React from 'react';

export type EmulatorSystemItem = {
  id: string;
  label: string;
  coreName?: string;
  disabled?: boolean;
  subItems?: { id: string; label: string; isSelected?: boolean }[];
};

type Props = {
  items: EmulatorSystemItem[];
  selectedIndex: number;
  onSelect: (item: EmulatorSystemItem | { id: string; label: string; isSelected?: boolean }) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
};

export function EmulatorsManager({ items, selectedIndex, onSelect, scrollContainerRef }: Props) {
  const isItemFocused = (index: number) => index === selectedIndex;
  return (
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
              onClick={() => !item.disabled && onSelect(item)}
              disabled={item.disabled}
            >
              <span>{item.label}</span>
              {typeof item.coreName === 'string' && (
                <span className="text-gray-500 mr-2">{item.coreName}</span>
              )}
              {item.subItems?.length && (
                <span className={item.disabled ? 'text-gray-300' : 'text-gray-400'}>{'>'}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
