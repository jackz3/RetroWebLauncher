'use client';
import { useEffect, useRef } from 'react';
import { useModalStore } from '@/app/store/modal';
import { getElementDefaultProps } from '../../../themeUtils';
import { useFontLoader } from '../../hooks/useFontLoader';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';

interface TextListElementProps {
  element: any;
  themeVariables?: any;
  items?: Array<{ name: string; [key: string]: any }>;
  selectedIndex?: number;
  onItemSelect?: (index: number) => void;
  onBack?: () => void;
  fontPath?: string;
  themeName?: string;
  view?: 'system' | 'gamelist' | 'menu';
}

export default function TextListElement({ 
  element, 
  themeVariables = {}, 
  themeName = '',
  items = [],
  selectedIndex: externalSelectedIndex = 0,
  onItemSelect,
  onBack,
  view = 'system'
}: TextListElementProps) {
  const defaults = getElementDefaultProps('textlist');
  const props = { ...defaults, ...element.properties };
  
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<HTMLDivElement[]>([]);
  
  const { openThemeSelector } = useModalStore();
  // 使用键盘导航钩子
  const { selectedIndex, setSelectedIndex, isFocused } = useKeyboardNavigation({
    elementId: `textlist-${element.name || 'default'}`,
    elementType: 'textlist',
    totalItems: items.length,
    initialIndex: externalSelectedIndex,
    onSelect: onItemSelect,
    onEscape: openThemeSelector,
    onBack: onBack,
    onNavigate: (direction, index) => {
      console.log(`TextList navigated ${direction} to index ${index}`);
    }
  });
  
  // 当选中项改变时，滚动到该位置
  useEffect(() => {
    if (listRef.current && itemRefs.current[selectedIndex]) {
      const listElement = listRef.current;
      const selectedItem = itemRefs.current[selectedIndex];
      
      // 计算选中项相对于列表的位置
      const itemTop = selectedItem.offsetTop;
      const itemHeight = selectedItem.offsetHeight;
      const listHeight = listElement.clientHeight;
      
      // 滚动到使选中项居中位置
      const scrollPosition = itemTop - (listHeight / 2) + (itemHeight / 2);
      listElement.scrollTo({
        top: Math.max(0, scrollPosition),
        behavior: 'smooth'
      });
    }
  }, [selectedIndex]);
  
  // 使用新的字体加载Hook
  const fontFamily = useFontLoader(props.fontPath, themeName);
  
  // 解析位置和尺寸
  const [posX, posY] = props.pos.split(' ').map(Number);
  const [sizeW, sizeH] = props.size.split(' ').map(Number);
  const [originX, originY] = props.origin.split(' ').map(Number);
  
  // 计算实际位置（考虑 origin 锚点）
  const left = `${posX * 100}%`;
  const top = `${posY * 100}%`;
  const width = `${sizeW * 100}%`;
  const height = `${sizeH * 100}%`;
  
  // 解析 selectedBackgroundMargins
  const [marginL, marginR] = (props.selectedBackgroundMargins || '0 0').split(' ').map(Number);
  
  // 处理圆角
  const cornerRadius = parseFloat(props.selectedBackgroundCornerRadius || '0');

  const fontSize = parseFloat(props.fontSize || '0.045') * 100; // 转换为百分比
  const lineHeight = (parseFloat(props.selectorHeight) * 100) || (fontSize * 1.5); // 选择器高度，默认为字体大小的1.5倍
  const lineSpacing = parseFloat(props.lineSpacing || '1.5') * 16;

  return (
    <div
      className="absolute"
      style={{
        left,
        top,
        width,
        height,
        transform: `translate(-${originX * 100}%, -${originY * 100}%)`,
        zIndex: props.zIndex,
      }}
    >
      <div 
        ref={listRef} 
        data-testid="textlist-container"
        className="h-full overflow-y-auto overflow-x-hidden" 
        style={{ 
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        } as React.CSSProperties}
      >
        <style>{`
          [data-testid="textlist-container"]::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {items.map((item, index) => (
          <div
            key={index}
            ref={el => { if (el) itemRefs.current[index] = el; }}
            className={`p-4 cursor-pointer transition-all duration-200 relative`}
            onClick={() => onItemSelect?.(index)}
            style={{
              height: `${lineHeight}vh`,
              marginBottom: `${lineSpacing}px`,
            }}
          >
            {(
              <div 
                className="absolute inset-y-0"
                style={{
                  paddingLeft: `${marginL * 100}%`,
                  paddingRight: `${marginR * 100}%`,
                  backgroundColor:index === selectedIndex ? `#${props.selectedBackgroundColor}`: 'transparent',
                  borderRadius: `${cornerRadius * 100}vw`, // 使用vw单位，更接近原始ES-DE行为
                }}
              >
              <div 
                className=""
                style={{
                  color: index === selectedIndex ? `#${props.selectedColor}` : `#${props.primaryColor}`,
                  fontFamily: fontFamily,
                  fontSize: `${fontSize}vh`,
                  lineHeight: `${lineHeight}vh`
                }}
              >
                {props.letterCaseAutoCollections === 'capitalize' 
                  ? item.name.charAt(0).toUpperCase() + item.name.slice(1)
                  : item.name
                }
              </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
