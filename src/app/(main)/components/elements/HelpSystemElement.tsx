'use client';
import { HelpEntry, useKeyboardStore } from '@/app/(main)/store/keyboard';
import { getElementDefaultProps } from '@/app/utils/themeUtils';
import { useTheme } from '../../ThemeProvider';
import { useFontLoader } from '../../hooks/useFontLoader';

interface HelpSystemElementProps {
  element: any;
  themeVariables?: any;
  themeName?: string;
}

export default function HelpSystemElement({ element, themeVariables = {}, themeName = '' }: HelpSystemElementProps) {
  const { themeJson } = useTheme();
  const defaults = getElementDefaultProps('helpsystem');
  const props = { ...defaults, ...element.properties };
  
  // 使用新的字体加载Hook
  const fontFamily = useFontLoader(props.fontPath, themeName);

  // 获取间距属性，默认值参考 theme_guide.md
  const entrySpacing = props.entrySpacing ?? 0.00833;
  const iconTextSpacing = props.iconTextSpacing ?? 0.00416;
  
  // 将归一化的间距值转换为 CSS 可用的值
  const entrySpacingEm = `${entrySpacing * 100}vw`;
  const iconTextSpacingEm = `${iconTextSpacing * 100}vw`;
  
  // 按钮图标映射
  // 按钮图标映射，优先无主机名，其次 XBOX，路径为 public/ 下的 svg 文件
  const buttonIconMap: { [key: string]: string } = {
    'a': 'button_a_XBOX.svg',
    'b': 'button_b_XBOX.svg',
    'x': 'button_x_XBOX.svg',
    'y': 'button_y_XBOX.svg',
    'start': 'button_start_XBOX.svg',
    'back': 'button_back_XBOX.svg',
    'l1': 'button_l.svg',
    'r1': 'button_r.svg',
    'l2': 'button_lt.svg',
    'r2': 'button_rt.svg',
    'l3': 'thumbstick_click.svg',
    'r3': 'thumbstick_click.svg',
    'up': 'dpad_up.svg',
    'down': 'dpad_down.svg',
    'left': 'dpad_left.svg',
    'right': 'dpad_right.svg',
    'updown': 'dpad_updown.svg',
    'leftright': 'dpad_leftright.svg',
  };
  
  // 解析位置和尺寸
  const [posX, posY] = props.pos.split(' ').map(Number);
  const [originX, originY] = props.origin.split(' ').map(Number);
  
  // 计算实际位置（考虑 origin 锚点）
  const left = `${posX * 100}%`;
  const top = `${posY * 100}%`;
  
  const { textColor, iconColor, backgroundColor } = props;
  // 计算图标颜色的 invert 百分比，根据亮度决定是否反转
  const iconInvert = (() => {
    // 确保 iconColor 为 6 位十六进制字符串，缺失时补零
    const hex = (iconColor ?? '000000').padStart(6, '0');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const avg = (r + g + b) / 3;
    // 根据亮度计算更精细的 invert 百分比：亮度越低，invert 越高
    const invert = Math.round((255 - avg) * 100 / 255);
    return `${invert}%`;
  })();

  const defaultHelpEntries = [
    { key: 'UP/DOWN', action: 'Navigate' },
    { key: 'A', action: 'Select' },
    { key: 'B', action: 'Back' },
    { key: 'START', action: 'Menu' },
  ];

  const helpEntryMap: { [key: string]: { key: string; action: string } } = {
    up: { key: 'UP', action: 'Navigate' },
    down: { key: 'DOWN', action: 'Navigate' },
    left: { key: 'LEFT', action: 'Navigate' },
    right: { key: 'RIGHT', action: 'Navigate' },
    updown: { key: 'UP/DOWN', action: 'Navigate' },
    leftright: { key: 'LEFT/RIGHT', action: 'Navigate' },
    a: { key: 'A', action: 'Select' },
    b: { key: 'B', action: 'Back' },
    x: { key: 'X', action: 'Action' },
    y: { key: 'Y', action: 'Action' },
    start: { key: 'START', action: 'Menu' },
    back: { key: 'BACK', action: 'Option' },
    l1: { key: 'L1', action: 'Page' },
    r1: { key: 'R1', action: 'Page' },
    l2: { key: 'L2', action: 'Page' },
    r2: { key: 'R2', action: 'Page' },
    l3: { key: 'L3', action: 'Action' },
    r3: { key: 'R3', action: 'Action' },
  };

  // 获取按钮图标URL
  // 获取按钮图标URL
  const getButtonIconUrl = (buttonKey: string) => {
    // 保持自定义图标逻辑不变
    if (props.customButtonIcon) {
      const customIcons = Array.isArray(props.customButtonIcon) ? props.customButtonIcon : [props.customButtonIcon];
      const normalizedKey = buttonKey.toLowerCase().trim();
      const matchingIcon = customIcons.find((icon: any) => {
        const buttonName = icon.button?.toLowerCase() || '';
        return buttonName.includes(`button_${normalizedKey}`) ||
               buttonName.includes(`button_${normalizedKey}_`);
      });
      if (matchingIcon && themeJson) {
        const themeName = themeJson.name;
        const iconPath = matchingIcon._.startsWith('./') ? matchingIcon._.substring(2) : matchingIcon._;
        return `/themes/${themeName}/_inc/images/${iconPath}`;
      }
    }

    // 默认图标逻辑：直接返回 public/ 下的 svg 路径
    const normalizedKey = buttonKey.toLowerCase().trim();
    const iconPath = buttonIconMap[normalizedKey];
    if (!iconPath) return null;
    return  '/images/help/' + iconPath;
  };

  const helpEntries = props.entries
    ? props.entries.split(',').map((entryKey: string) => {
        const normalizedKey = entryKey.toLowerCase().trim();
        return helpEntryMap[normalizedKey] || { key: normalizedKey.toUpperCase(), action: 'Unknown' };
      })
    : defaultHelpEntries;
  // 获取帮助条目 - 支持动态更新
  const getHelpEntries = (): HelpEntry[] => {
    // 如果有动态帮助信息，使用动态的
    // if (dynamicHelpEntries && dynamicHelpEntries.length > 0) {
    //   return dynamicHelpEntries;
    // }
    
    // 否则使用默认帮助信息
    return props.entries
      ? props.entries.split(',').map((entryKey: string) => {
          const normalizedKey = entryKey.toLowerCase().trim();
          return helpEntryMap[normalizedKey] || { key: normalizedKey.toUpperCase(), action: 'Unknown' };
        })
      : defaultHelpEntries;
  };
  
  // const helpEntries = getHelpEntries();
  // 获取当前聚焦元素的帮助信息
  const getCurrentElementHelp = (): HelpEntry[] => {
    const { focusedElement } = useKeyboardStore();
    
    if (!focusedElement) {
      return helpEntries;
    }
    
    // 根据元素类型返回不同的帮助信息
    switch (focusedElement.type) {
      case 'grid':
        return [
          { key: 'UP/DOWN/LEFT/RIGHT', action: 'Navigate Grid', icon: 'updown' },
          { key: 'A', action: 'Select Game', icon: 'a' },
          { key: 'B', action: 'Back', icon: 'b' }
        ];
      case 'carousel':
        return [
          { key: 'LEFT/RIGHT', action: 'Navigate Items', icon: 'leftright' },
          { key: 'A', action: 'Select Item', icon: 'a' },
          { key: 'B', action: 'Back', icon: 'b' }
        ];
      case 'textlist':
        return [
          { key: 'UP/DOWN', action: 'Navigate List', icon: 'updown' },
          { key: 'A', action: 'Select Item', icon: 'a' },
          { key: 'B', action: 'Back', icon: 'b' }
        ];
      case 'menu':
        return [
          { key: 'UP/DOWN', action: 'Navigate Menu', icon: 'updown' },
          { key: 'A', action: 'Select', icon: 'a' },
          { key: 'B', action: 'Back', icon: 'b' }
        ];
      default:
        return helpEntries;
    }
  };
  
  const currentHelpEntries = getCurrentElementHelp();
  // 渲染帮助条目
  const renderHelpEntry = (entry: HelpEntry, index: number) => {
    // ... existing code ...
  };
    // {currentHelpEntries.map((entry, index) => 
    //   renderHelpEntry(entry, index)
    // )}
  
  const fontSize = `${props.fontSize * 100 || 3.5}vh`;
  return (
    <div
      className="absolute"
      style={{
        left,
        top,
        transform: `translate(-${originX * 100}%, -${originY * 100}%)`,
        backgroundColor: `#${backgroundColor}`,
        zIndex: props.zIndex,
      }}
    >
        <div 
          className="flex items-center"
          style={{ 
            gap: entrySpacingEm,
            fontSize
          }}
        >
          {helpEntries.map((entry: any, index: number) => {
            const iconUrl = getButtonIconUrl(entry.key);
            
            return (
              <div 
                key={index} 
                className="flex items-center"
                style={{ gap: iconTextSpacingEm }}
              >
                {iconUrl ? (
                  <img 
                    src={iconUrl} 
                    alt={entry.key} 
                    style={{
                      height: fontSize,
                      filter: `brightness(0) saturate(100%) invert(${iconInvert})` 
                    }}
                  />
                ) : (
                  <span
                    className="font-bold px-2 py-1 rounded border"
                    style={{ color: `#${iconColor}`, borderColor: `#${iconColor}`, fontFamily: fontFamily }}
                  >
                    {entry.key}
                  </span>
                )}
                <span style={{ color: `#${textColor}`, fontFamily: fontFamily }}>{entry.action}</span>
              </div>
            );
          })}
        </div>
    </div>
  );
}