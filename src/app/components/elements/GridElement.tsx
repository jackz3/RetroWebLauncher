// GridElement.tsx
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { getElementDefaultProps } from '../../../themeUtils';
import { useFontLoader } from '../../hooks/useFontLoader';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import { useModalStore } from '@/app/store/modal';
import FsImage from '@/app/components/common/FsImage';

interface GridElementProps {
  element: any;
  themeVariables?: any;
  themeName?: string;
  items?: Array<{ name: string; image?: string; system?: string; screenshot?: boolean; [key: string]: any }>;
  selectedIndex?: number;
  onItemSelect?: (index: number) => void;
  onBack?: () => void;
  view?: 'system' | 'gamelist' | 'menu';
}

// 安全的颜色解析函数
function parseColorSafely(color: string | undefined): string {
  if (!color || typeof color !== 'string') {
    return '#FFFFFF';
  }
  
  // 移除所有非十六进制字符
  const cleanColor = color.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  
  // 验证十六进制格式
  if (!/^[0-9A-F]{6}([0-9A-F]{2})?$/.test(cleanColor)) {
    console.warn(`Invalid color format: ${color}, using default white`);
    return '#FFFFFF';
  }
  
  // 返回有效的十六进制颜色值
  if (cleanColor.length === 6) {
    return `#${cleanColor}`;
  }
  
  if (cleanColor.length === 8) {
    return `#${cleanColor.substring(0, 6)}`;
  }
  
  return '#FFFFFF';
}

export default function GridElement({
  element,
  themeVariables = {},
  themeName = '',
  items = [],
  selectedIndex: externalSelectedIndex = 0,
  onItemSelect,
  onBack,
  view = 'system',
}: GridElementProps) {
  const defaults = getElementDefaultProps('grid');
  const props = { ...defaults, ...element.properties };
  
  const { openThemeSelector } = useModalStore();
  // 使用键盘导航钩子
  const { selectedIndex, setSelectedIndex, isFocused } = useKeyboardNavigation({
    elementId: `grid-${element.name || 'default'}`,
    elementType: 'grid',
    totalItems: items.length,
    initialIndex: externalSelectedIndex,
    onSelect: onItemSelect,
    onEscape: openThemeSelector,
    onBack: onBack,
    onNavigate: (direction, index) => {
      console.log(`Grid navigated ${direction} to index ${index}`);
    }
  });
  
  // 使用新的字体加载Hook
  const fontFamily = useFontLoader(props.fontPath, themeName);
  
  // 滚动状态管理
  const [scrollOffset, setScrollOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 防御性处理：items 为空时不渲染内容
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  // 解析位置和尺寸
  const [posX, posY] = (props.pos || '0 0.1').split(' ').map(Number);
  const [sizeW, sizeH] = (props.size || '1 0.8').split(' ').map(Number);
  const [originX, originY] = (props.origin || '0 0').split(' ').map(Number);

  const left = `${posX * 100}%`;
  const top = `${posY * 100}%`;
  const width = `${sizeW * 100}%`;
  const height = `${sizeH * 100}%`;

  // 网格项尺寸
  const [itemW, itemH] = (props.itemSize || '0.15 0.25').split(' ').map(Number);
  const itemWidth = itemW * 100;
  const itemHeight = itemH * 100;

  // 选中项缩放
  const itemScale = parseFloat(props.itemScale || '1.05');
  
  // 间距 - 两个值，格式与itemSize相同
  const [spacingW, spacingH] = (props.itemSpacing || '0 0').split(' ').map(Number);
  const spacingWidth = spacingW * itemWidth; // vw
  const spacingHeight = spacingH * itemHeight; // vh
  
  // 未选中项效果
  const unfocusedItemOpacity = parseFloat(props.unfocusedItemOpacity || '1');
  const unfocusedItemSaturation = parseFloat(props.unfocusedItemSaturation || '1');
  const unfocusedItemDimming = parseFloat(props.unfocusedItemDimming || '1');

  // 图片圆角
  const imageCornerRadius = parseFloat(props.imageCornerRadius || '0');

  // 图片适应
  const imageFit = props.imageFit || 'contain';

  // 颜色处理
  const imageColor = parseColorSafely(props.imageColor || 'FFFFFFFF');
  const imageSelectedColor = parseColorSafely(props.imageSelectedColor || props.imageColor || 'FFFFFFFF');
  
  // 背景色处理
  const backgroundColor = parseColorSafely(props.backgroundColor || '00000000');
  const backgroundSelectedColor = parseColorSafely(props.backgroundSelectedColor || props.backgroundColor || '00000000');

  // 文字颜色处理
  const textColor = parseColorSafely(props.textColor || '000000FF');
  const textSelectedColor = parseColorSafely(props.textSelectedColor || props.textColor || '000000FF');
  const textBackgroundColor = parseColorSafely(props.textBackgroundColor || 'FFFFFF00');
  const textSelectedBackgroundColor = parseColorSafely(props.textSelectedBackgroundColor || props.textBackgroundColor || 'FFFFFF00');
  
  const fontSize = parseFloat(props.fontSize || '0.045') * 100; // vh
  const imageType = (props.imageType || '').toString().toLowerCase(); // screenshot | fanart | miximage | cover

  // Using shared FsImage component for BrowserFS-loaded images

  // 计算网格布局参数
  const containerWidth = sizeW * 100; // vw
  const containerHeight = sizeH * 100; // vh
  const effectiveItemWidth = itemWidth + spacingWidth; // vw
  const effectiveItemHeight = itemHeight + spacingHeight; // vh
  
  const itemsPerRow = Math.floor(containerWidth / effectiveItemWidth) || 1;
  const itemsPerColumn = Math.floor(containerHeight / effectiveItemHeight) || 1;
  const maxItems = itemsPerRow * itemsPerColumn;

  // 获取当前显示的项目（考虑滚动偏移）
  const displayItems = items.slice(scrollOffset, scrollOffset + maxItems);
  
  // 监听selectedIndex变化，自动滚动到选中项
  useEffect(() => {
    if (selectedIndex >= 0 && items.length > 0) {
      // 计算选中项所在的行
      const selectedRow = Math.floor(selectedIndex / itemsPerRow);
      
      // 计算当前可见的第一行和最后一行
      const firstVisibleRow = Math.floor(scrollOffset / itemsPerRow);
      const visibleRows = itemsPerColumn;
      const lastVisibleRow = firstVisibleRow + visibleRows - 1;
      
      // 计算最大滚动偏移量，确保不会滚动过头
      const totalRows = Math.ceil(items.length / itemsPerRow);
      const maxScrollRow = Math.max(0, totalRows - visibleRows);
      const maxScrollOffset = maxScrollRow * itemsPerRow;
      
      // 如果选中项在可见区域上方，向上滚动
      if (selectedRow < firstVisibleRow) {
        const newScrollOffset = Math.max(0, selectedRow * itemsPerRow);
        setScrollOffset(newScrollOffset);
      }
      // 如果选中项在可见区域下方，向下滚动
      else if (selectedRow > lastVisibleRow) {
        // 确保选中项所在的行可见
        const targetRow = selectedRow - visibleRows + 1;
        const newScrollOffset = Math.min(maxScrollOffset, Math.max(0, targetRow * itemsPerRow));
        setScrollOffset(newScrollOffset);
      }
    }
  }, [selectedIndex, items.length, itemsPerRow, itemsPerColumn, scrollOffset, maxItems]);

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
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      <div className="w-full h-full relative overflow-hidden" ref={containerRef}>
        {displayItems.map((item, displayIndex) => {
          const actualIndex = scrollOffset + displayIndex;
          const isSelected = actualIndex === selectedIndex;
          const scale = isSelected ? itemScale : 1;
          
          // 计算网格位置
          const row = Math.floor(displayIndex / itemsPerRow);
          const col = displayIndex % itemsPerRow;
          
          const itemLeft = col * (itemWidth + spacingWidth);
          const itemTop = row * (itemHeight + spacingHeight);
          
          return (
            <div
              key={actualIndex}
              className="absolute flex flex-col items-center justify-center transition-all duration-200"
              style={{
                left: `${itemLeft}vw`,
                top: `${itemTop}vh`,
                width: `${itemWidth}vw`,
                height: `${itemHeight}vh`,
                transform: `scale(${scale})`,
                zIndex: isSelected ? 2 : 1,
                cursor: isSelected ? 'pointer' : 'default',
                backgroundColor: isSelected ? backgroundSelectedColor : backgroundColor,
                borderRadius: `${imageCornerRadius * 100}%`,
                transition: 'all 0.2s cubic-bezier(.4,2,.6,1)',
                opacity: isSelected ? 1 : unfocusedItemOpacity,
                filter: isSelected ? 'none' : `saturate(${unfocusedItemSaturation}) brightness(${unfocusedItemDimming})`,
              }}
              onClick={() => {
                setSelectedIndex(actualIndex);
                onItemSelect?.(actualIndex);
              }}
            >
              {(() => {
                const imgStyle: React.CSSProperties = {
                  width: '100%',
                  height: '70%',
                  objectFit: imageFit,
                  borderRadius: `${imageCornerRadius * 100}%`,
                  backgroundColor: isSelected ? imageSelectedColor : imageColor,
                  opacity: isSelected ? 1 : unfocusedItemOpacity,
                };
                if (imageType === 'screenshot' && item?.screenshot && item?.system && item?.name) {
                  return <FsImage system={item.system} name={item.name} alt={item.name} style={imgStyle} />;
                }
                if (item.image) {
                  return <img src={item.image} alt={item.name} style={imgStyle} />;
                }
                return null;
              })()}
              <div 
                className='w-full h-full flex items-center justify-center'
                style={{
                  color: isSelected ? textSelectedColor : textColor,
                  backgroundColor: isSelected ? textSelectedBackgroundColor : textBackgroundColor,
                  fontWeight: isSelected ? 'bold' : 'normal',
                  fontSize: `${fontSize}vh`,
                  textAlign: 'center',
                  textShadow: isSelected ? '0 2px 8px rgba(255, 255, 255, 0.5)' : 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  opacity: isSelected ? 1 : unfocusedItemOpacity,
                  fontFamily: fontFamily,
                }}
              >
                {item.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}