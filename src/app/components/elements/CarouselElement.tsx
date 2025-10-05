// CarouselElement.tsx
'use client';
import React from 'react';
import { getElementDefaultProps } from '../../../themeUtils';
import { useFontLoader } from '../../hooks/useFontLoader';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import { useModalStore } from '@/app/store/modal';
import FsImage from '@/app/components/common/FsImage';

interface CarouselElementProps {
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

export default function CarouselElement({
  element,
  themeVariables = {},
  themeName = '',
  items = [],
  selectedIndex: externalSelectedIndex = 0,
  onItemSelect,
  onBack,
  view = 'system',
}: CarouselElementProps) {
  const defaults = getElementDefaultProps('carousel');
  const props = { ...defaults, ...element.properties };
  
  const { openThemeSelector } = useModalStore();
  // 使用键盘导航钩子
  const { selectedIndex, setSelectedIndex, isFocused } = useKeyboardNavigation({
    elementId: `carousel-${element.name || 'default'}`,
    elementType: 'carousel',
    totalItems: items.length,
    initialIndex: externalSelectedIndex,
    onSelect: onItemSelect,
    onBack: onBack,
    onEscape: openThemeSelector,
    onNavigate: (direction, index) => {
      console.log(`Carousel navigated ${direction} to index ${index}`);
    }
  });
  
  // 使用新的字体加载Hook
  const fontFamily = useFontLoader(props.fontPath, themeName);
  console.log('CarouselElement props:', props); 
  // 防御性处理：items 为空时不渲染内容
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  // 解析位置和尺寸
  const [posX, posY] = (props.pos || '0 0.38378').split(' ').map(Number);
  const [sizeW, sizeH] = (props.size || '1 0.2324').split(' ').map(Number);
  const [originX, originY] = (props.origin || '0 0').split(' ').map(Number);

  const left = `${posX * 100}%`;
  const top = `${posY * 100}%`;
  const width = `${sizeW * 100}%`;
  const height = `${sizeH * 100}%`;

  // itemSize - 相对于整个屏幕的尺寸
  const [itemW, itemH] = (props.itemSize || '0.25 0.155').split(' ').map(Number);
  const itemWidth = `${itemW * 100}vw`;  // vw单位表示相对于视口宽度的百分比
  const itemHeight = `${itemH * 100}vh`; // vh单位表示相对于视口高度的百分比

  // 选中项缩放
  const itemScale = parseFloat(props.itemScale || '1.2');
  
  // 未选中项效果
  const unfocusedItemOpacity = parseFloat(props.unfocusedItemOpacity);
  const unfocusedItemSaturation = parseFloat(props.unfocusedItemSaturation);
  const unfocusedItemDimming = parseFloat(props.unfocusedItemDimming);

  // 图片圆角
  const imageCornerRadius = parseFloat(props.imageCornerRadius || '0');

  // 图片适应
  const imageFit = props.imageFit || 'contain';

  // 选中项偏移
  const [selectedOffsetX, selectedOffsetY] = (props.selectedItemOffset || '0 0').split(' ').map(Number);

  // 颜色处理 - 使用安全的颜色解析函数
  const imageColor = parseColorSafely(props.imageColor || 'FFFFFFFF');
  const imageSelectedColor = parseColorSafely(props.imageSelectedColor || props.imageColor || 'FFFFFFFF');

  // 文字颜色处理
  const textColor = parseColorSafely(props.textColor || '000000FF');
  const textSelectedColor = parseColorSafely(props.textSelectedColor || props.textColor || '000000FF');
  const textBackgroundColor = parseColorSafely(props.textBackgroundColor || 'FFFFFF00');
  const textSelectedBackgroundColor = parseColorSafely(props.textSelectedBackgroundColor || props.textBackgroundColor || 'FFFFFF00');
  
  const fontSize = parseFloat(props.fontSize || '0.085') * 100; // vh
  const imageType = (props.imageType || '').toString().toLowerCase(); // screenshot | fanart | miximage | cover

  // Using shared FsImage component for BrowserFS-loaded images

  // 只渲染 maxItemCount 个条目，居中排列
  const maxItemCount = parseInt(props.maxItemCount || '3', 10);
  const half = Math.floor(maxItemCount / 2);
  const displayItems = [];
  for (let i = -half; i <= half; i++) {
    // 防御性处理：idx 必须为有效数字
    const idx = ((selectedIndex ?? 0) + i + items.length) % items.length;
    displayItems.push({ ...items[idx], _carouselIndex: idx, _offset: i });
  }

  // 判断是否为垂直布局
  const isVertical = props.type === 'vertical';

  return (
    <div
      className="absolute flex items-center"
      style={{
        left,
        top,
        width,
        height,
        transform: `translate(-${originX * 100}%, -${originY * 100}%)`,
        zIndex: props.zIndex,
        overflow: 'visible',
        userSelect: 'none',
      }}
    >

      <div className="flex-1 flex justify-center items-center h-full relative">
        {displayItems.map((item) => {
          const isSelected = item._offset === 0;
          const scale = isSelected ? itemScale : 1;
          
          // 垂直时使用 itemHeight，水平时使用 itemWidth
          const baseOffset = isVertical ? (itemH * 100) : (itemW * 100);
          let offset = item._offset * baseOffset;
          if (isSelected) {
            offset += isVertical ? selectedOffsetY * 100 : selectedOffsetX * 100;
          }
          
          // Resolve image style and source based on imageType and item flags
          const imageStyle: React.CSSProperties = {
            width: '100%',
            height: '70%',
            objectFit: imageFit,
            borderRadius: `${imageCornerRadius * 100}%`,
            backgroundColor: isSelected ? imageSelectedColor : imageColor,
            opacity: isSelected ? 1 : unfocusedItemOpacity,
          };
          const resolvedImageSrc: string | undefined = imageType === 'screenshot' ? undefined : item.image;

          return (
            <div
              key={`${item._carouselIndex}_${item._offset}`}
              className="flex flex-col items-center justify-center transition-all duration-200"
              style={{
                position: 'absolute',
                left: isVertical ? '50%' : '50%',
                top: isVertical ? '50%' : '50%',
                width: itemWidth,
                height: itemHeight,
                transform: `translate(-50%, -50%) ${isVertical ? `translateY(${offset}vh)` : `translateX(${offset}vw)`} scale(${scale})`,
                zIndex: isSelected ? 2 : 1,
                cursor: isSelected ? 'pointer' : 'default',
                borderRadius: `${imageCornerRadius * 100}%`,
                background: isSelected ? parseColorSafely(props.color || 'FFFFFFD8') : 'transparent',
                boxShadow: isSelected ? '0 0 8px #aaa' : 'none',
                transition: 'all 0.2s cubic-bezier(.4,2,.6,1)',
                opacity: isSelected ? 1 : unfocusedItemOpacity,
                filter: isSelected ? 'none' : `saturate(${unfocusedItemSaturation}) brightness(${unfocusedItemDimming})`,
              }}
              onClick={() => {
                setSelectedIndex(item._carouselIndex);
                onItemSelect?.(item._carouselIndex);
              }}
            >
              {imageType === 'screenshot' && item?.screenshot && item?.system && item?.name ? (
                <FsImage system={item.system} name={item.name} alt={item.name} style={imageStyle} />
              ) : resolvedImageSrc ? (
                <img src={resolvedImageSrc} alt={item.name} style={imageStyle} />
              ) : null}
              <div className='w-full h-full flex items-center justify-center'
                style={{
                  color: isSelected ? textSelectedColor : textColor,
                  backgroundColor: isSelected ? textSelectedBackgroundColor : textBackgroundColor,
                  fontWeight: isSelected ? 'bold' : 'normal',
                  fontSize: `${fontSize}vh`,
                  textAlign: 'center',
                  textShadow: isSelected ? '0 2px 8px rgba(255, 255, 255, 0.5)' : 'none',
                  // whiteSpace: 'nowrap',
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