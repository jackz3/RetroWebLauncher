'use client';
import { useState, useEffect } from 'react';
import { getElementDefaultProps } from '../../../themeUtils';

interface ClockElementProps {
  element: any;
  themeVariables?: any;
}

export default function ClockElement({ element, themeVariables = {} }: ClockElementProps) {
  const defaults = getElementDefaultProps('clock');
  const props = { ...defaults, ...element.properties };
  
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // 更新时间的 useEffect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // 解析位置和尺寸
  const [posX, posY] = props.pos.split(' ').map(Number);
  const [sizeW, sizeH] = props.size.split(' ').map(Number);
  const [originX, originY] = props.origin.split(' ').map(Number);
  
  // 计算实际位置（考虑 origin 锚点）
  const left = `${posX * 100}%`;
  const top = `${posY * 100}%`;
  const width = `${sizeW * 100}%`;
  const height = `${sizeH * 100}%`;
  
  // 处理变量替换
  const textColor = props.color.replace(/\${(\w+)}/g, (match: string, varName: string) => {
    return themeVariables[varName] || match;
  });
  
  const bgColor = props.backgroundColor.replace(/\${(\w+)}/g, (match: string, varName: string) => {
    return themeVariables[varName] || match;
  });

  // 格式化时间
  const timeString = currentTime.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

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
        opacity: props.opacity,
      }}
    >
      <div 
        className="flex items-center justify-center h-full px-2 py-1 rounded"
        style={{
          backgroundColor: `#${bgColor}`,
          color: `#${textColor}`,
        }}
      >
        <span className="text-sm font-mono">{timeString}</span>
      </div>
    </div>
  );
}
