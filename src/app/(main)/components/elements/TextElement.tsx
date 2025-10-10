'use client';
import React from 'react';
import { getElementDefaultProps } from '@/app/utils/themeUtils';
import { useFontLoader } from '../../hooks/useFontLoader';
import systemMeta from '../../../metadata.json';

interface TextElementProps {
  element: {
    name: string;
    properties: TextProperties;
  };
  themeVariables?: Record<string, any>;
  themeName?: string;
  item?: { name: string; [key: string]: any };
  systemDataMap?: Record<string, string>;
}

interface TextProperties {
  pos?: string;
  size?: string;
  origin?: string;
  rotation?: number;
  rotationOrigin?: string;
  text?: string;
  systemdata?: string;
  metadata?: string;
  defaultValue?: string;
  fontPath?: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  backgroundCornerRadius?: number;
  glowColor?: string;
  glowSize?: number;
  glowOffset?: string;
  horizontalAlignment?: 'left' | 'center' | 'right';
  verticalAlignment?: 'top' | 'center' | 'bottom';
  letterCase?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  lineSpacing?: number;
  container?: boolean;
  containerStartDelay?: number;
  containerScrollSpeed?: number;
  containerReset?: boolean;
  visible?: boolean;
  zIndex?: number;
}

function resolveVariables(str?: string, variables?: Record<string, any>) {
  if (!str) return '';
  return str.replace(/\$\{(\w+)\}/g, (_, v) => variables?.[v] ?? '');
}

const TextElement = React.memo<TextElementProps>(
  ({
    element,
    themeVariables = {},
    themeName = '',
    item,
    systemDataMap,
  }) => {
    const defaults = getElementDefaultProps('text');
    const props = { ...defaults, ...element.properties };
    
    // 使用新的字体加载Hook
    const fontFamily = useFontLoader(props.fontPath, themeName);
    
    // 解析位置和尺寸
    const [posX, posY] = (props.pos || '0 0').split(' ').map(Number);
    const [sizeW, sizeH] = (props.size || '1 0.1').split(' ').map(Number);
    const [originX, originY] = (props.origin || '0 0').split(' ').map(Number);
    
    // 计算实际文本内容
    let content = props.text ?? '';
    if (props.systemdata && systemDataMap?.[props.systemdata]) {
      content = systemDataMap[props.systemdata];
    } else if (props.metadata && item) {
      if (props.metadata === 'sourceSystemFullname') {
        const systemId = item['system'];
        content = (systemMeta as Record<string, any>)[systemId]?.systemName || props.defaultValue || '';
      } else if (item[props.metadata]) {
        content = item[props.metadata] || props.defaultValue || '';
      }
    }
    content = resolveVariables(content, themeVariables) || props.defaultValue || '';

    // 字母大小写
    switch (props.letterCase) {
      case 'uppercase':
        content = content.toUpperCase();
        break;
      case 'lowercase':
        content = content.toLowerCase();
        break;
      case 'capitalize':
        content = content.replace(/\b\w/g, (c: string) => c.toUpperCase());
        break;
    }

    // 归一化坐标转百分比
    const left = `${posX * 100}%`;
    const top = `${posY * 100}%`;
    const width = `${sizeW * 100}%`;
    const height = `${sizeH * 100}%`;
    const transform = [
      `translate(-${originX * 100}%, -${originY * 100}%)`,
      props.rotation ? `rotate(${props.rotation}deg)` : '',
    ].join(' ');

    // 对齐
    const textAlign: React.CSSProperties['textAlign'] = props.horizontalAlignment || 'left';
    let alignItems: React.CSSProperties['alignItems'] = 'center';
    switch (props.verticalAlignment) {
      case 'top':
        alignItems = 'flex-start';
        break;
      case 'center':
        alignItems = 'center';
        break;
      case 'bottom':
        alignItems = 'flex-end';
        break;
    }

    // 发光效果
    const textShadow =
      props.glowColor && props.glowSize
        ? `${(props.glowOffset?.split(' ')[0] ?? 0)}px ${(props.glowOffset?.split(' ')[1] ?? 0)}px ${props.glowSize}px ${props.glowColor}`
        : undefined;

    // 容器滚动（简化，暂不实现自动滚动）
    const containerStyle: React.CSSProperties = props.container
      ? { overflow: 'auto', maxHeight: height }
      : {};

    if (props.visible === false) return null;

    return (
      <div
        style={{
          position: 'absolute',
          left,
          top,
          width,
          height,
          transform,
          zIndex: props.zIndex ?? 40,
          background: props.backgroundColor || 'transparent',
          borderRadius: props.backgroundCornerRadius,
          display: 'flex',
          justifyContent: textAlign,
          alignItems,
          ...containerStyle,
        }}
      >
        <span
          style={{
            width: '100%',
            height: '100%',
            fontFamily,
            fontSize: `${(props.fontSize ?? 0.045) * 100}vw`,
            color: `#${props.color}` || '#000',
            textAlign,
            textShadow,
            wordBreak: 'break-word',
            whiteSpace: 'pre-line',
          }}
        >
          {content}
        </span>
      </div>
    );
  }
);

TextElement.displayName = 'TextElement';

export default TextElement;
