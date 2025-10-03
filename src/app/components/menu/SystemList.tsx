import React from 'react';

export interface SystemListItem {
  id: string;
  label: string;
  isSelected: boolean;
}

type Props = {
  systems: SystemListItem[];
  selectedIndex: number;
  onToggle: (systemId: string) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
};

export function SystemList({ systems, selectedIndex, onToggle, scrollContainerRef }: Props) {
  const isItemFocused = (index: number) => index === selectedIndex;
  return (
    <div ref={scrollContainerRef} className="border border-gray-200 rounded-md max-h-[calc(60vh-200px)] overflow-y-auto">
      <ul className="overflow-hidden">
        {systems.map((system, index) => (
          <li key={system.id} data-index={index}>
            <button
              className={`w-full text-left px-4 py-3 flex justify-between items-center ${
                isItemFocused(index)
                  ? system.isSelected
                    ? 'bg-blue-100 text-blue-800 border-l-4 border-blue-500 font-bold'
                    : 'bg-blue-50 border-l-4 border-blue-300'
                  : system.isSelected
                    ? 'bg-blue-100 text-blue-800 font-bold'
                    : 'hover:bg-gray-50'
              }`}
              onClick={() => onToggle(system.id)}
            >
              <span>{system.label}</span>
              {system.isSelected && (
                <span className="text-green-500">✓</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
