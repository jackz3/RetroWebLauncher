'use client';
import React, { useMemo, useCallback } from 'react';
import { getElementDefaultProps } from '@/app/utils/themeUtils';

interface ImageElementProps {
  element: {
    name: string;
    properties: ImageProperties;
  };
  themeVariables?: Record<string, any>;
  themeName?: string;
}

interface ImageProperties {
  path?: string;
  pos?: string;
  size?: string;
  origin?: string;
  color?: string;
  colorEnd?: string;
  gradientType?: 'horizontal' | 'vertical';
  tile?: boolean;
  zIndex?: number;
  opacity?: number;
  brightness?: number;
  saturation?: number;
}

interface ParsedColor {
  hex: string;
  alpha: number;
  isDefault: boolean;
  isValid: boolean;
}

interface ColorConfig {
  color: ParsedColor;
  colorEnd: ParsedColor;
  hasGradient: boolean;
  needsOverlay: boolean;
  gradientType: 'horizontal' | 'vertical';
}

// 安全的颜色解析函数
function parseColorSafely(color: string | undefined): ParsedColor {
  if (!color || typeof color !== 'string') {
    return { hex: '#FFFFFF', alpha: 1, isDefault: true, isValid: false };
  }
  
  const cleanColor = color.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  
  // 验证十六进制格式
  if (!/^[0-9A-F]{6}([0-9A-F]{2})?$/.test(cleanColor)) {
    console.warn(`Invalid color format: ${color}, using default white`);
    return { hex: '#FFFFFF', alpha: 1, isDefault: true, isValid: false };
  }
  
  if (cleanColor === 'FFFFFF') {
    return { hex: '#FFFFFF', alpha: 1, isDefault: true, isValid: true };
  }
  
  if (cleanColor.length === 6) {
    return { hex: `#${cleanColor}`, alpha: 1, isDefault: false, isValid: true };
  }
  
  if (cleanColor.length === 8) {
    const hex = `#${cleanColor.substring(0, 6)}`;
    const alpha = parseInt(cleanColor.substring(6, 8), 16) / 255;
    return { hex, alpha, isDefault: false, isValid: true };
  }
  
  return { hex: '#FFFFFF', alpha: 1, isDefault: true, isValid: false };
}

// 创建颜色配置
function createColorConfig(props: ImageProperties): ColorConfig {
  const color = parseColorSafely(props.color);
  const colorEnd = parseColorSafely(props.colorEnd);
  
  const hasGradient = colorEnd.isValid && colorEnd.hex !== color.hex;
  const needsOverlay = (!color.isDefault && color.isValid) || hasGradient;
  
  return {
    color,
    colorEnd,
    hasGradient,
    needsOverlay,
    gradientType: props.gradientType || 'horizontal'
  };
}

// 创建渐变CSS
function createGradientCSS(config: ColorConfig): string {
  const { color, colorEnd, gradientType } = config;
  
  const direction = gradientType === 'horizontal' ? 'to right' : 'to bottom';
  
  const startColorWithAlpha = `${color.hex}${Math.round(color.alpha * 255).toString(16).padStart(2, '0')}`;
  const endColorWithAlpha = `${colorEnd.hex}${Math.round(colorEnd.alpha * 255).toString(16).padStart(2, '0')}`;
  
  return `linear-gradient(${direction}, ${startColorWithAlpha}, ${endColorWithAlpha})`;
}

// 获取叠加层样式
function getOverlayStyles(config: ColorConfig): React.CSSProperties {
  const baseStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    mixBlendMode: 'multiply'
  };
  
  if (config.hasGradient) {
    return {
      ...baseStyles,
      background: createGradientCSS(config)
    };
  } else {
    return {
      ...baseStyles,
      backgroundColor: config.color.hex,
      opacity: config.color.alpha
    };
  }
}

const ImageElement = React.memo<ImageElementProps>(({ element, themeVariables = {}, themeName = '' }) => {
  const defaults = getElementDefaultProps('image');
  const props = { ...defaults, ...element.properties };
  
  // 解析位置和尺寸
  const [posX, posY] = props.pos.split(' ').map(Number);
  const [sizeW, sizeH] = props.size.split(' ').map(Number);
  const [originX, originY] = props.origin.split(' ').map(Number);
  
  // 计算实际位置（考虑 origin 锚点）
  const containerStyles: React.CSSProperties = useMemo(() => ({
    position: 'absolute',
    left: `${posX * 100}%`,
    top: `${posY * 100}%`,
    width: `${sizeW * 100}%`,
    height: `${sizeH * 100}%`,
    transform: `translate(-${originX * 100}%, -${originY * 100}%)`,
    zIndex: props.zIndex,
  }), [posX, posY, sizeW, sizeH, originX, originY, props.zIndex]);
  
  // 转换路径：将 ./_inc/ 转换为 /themes/当前主题/_inc/
  const finalImagePath = useMemo(() => {
    if (!props.path) return '';
    
    if (props.path.startsWith('./_inc/')) {
      const fullPath = `/themes/${themeName}${props.path.substring(1)}`;
      return fullPath;
    }
    return props.path;
  }, [props.path, themeName]);
  
  // 创建颜色配置
  const colorConfig = useMemo(() => createColorConfig(props), [
    props.color,
    props.colorEnd,
    props.gradientType
  ]);
  
  // 叠加层样式
  const overlayStyles = useMemo(() => {
    return colorConfig.needsOverlay ? getOverlayStyles(colorConfig) : {};
  }, [colorConfig]);
  
  // 图片错误处理
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    console.warn(`Failed to load image: ${finalImagePath}`);
    e.currentTarget.style.display = 'none';
  }, [finalImagePath]);
  
  // 基础图片样式
  const imageStyles: React.CSSProperties = useMemo(() => {
    if (props.tile) {
      // 对于平铺效果，使用背景图片
      return {
        width: '100%',
        height: '100%',
        backgroundImage: `url(${finalImagePath})`,
        backgroundRepeat: 'repeat',
        backgroundSize: 'auto',
        display: 'block'
      };
    } else {
      return {
        width: '100%',
        height: '100%',
        objectFit: 'cover' as const,
        display: 'block'
      };
    }
  }, [props.tile, finalImagePath]);
  
  // 调试信息
  // if (process.env.NODE_ENV === 'development') {
  //   console.log(`ImageElement: ${element.name}`, {
  //     originalPath: element.properties.path,
  //     finalImagePath,
  //     themeName,
  //     colorConfig,
  //     needsOverlay: colorConfig.needsOverlay
  //   });
  // }
  
  return (
    <div style={containerStyles}>
      {props.tile ? (
        <div style={imageStyles} />
      ) : (
        <img
          src={finalImagePath}
          alt={element.name}
          style={imageStyles}
          onError={handleImageError}
        />
      )}
      {colorConfig.needsOverlay && colorConfig.color.isValid && (
        <div style={overlayStyles} />
      )}
    </div>
  );
});

ImageElement.displayName = 'ImageElement';

export default ImageElement;
