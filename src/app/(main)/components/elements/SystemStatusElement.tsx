'use client';
import { getElementDefaultProps } from '@/app/utils/themeUtils';

interface SystemStatusElementProps {
  element: any;
  themeVariables?: any;
}

export default function SystemStatusElement({ element, themeVariables = {} }: SystemStatusElementProps) {
  const defaults = getElementDefaultProps('systemstatus');
  const props = { ...defaults, ...element.properties };
  
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

  // 模拟系统状态数据
  const systemStatus = {
    battery: 85,
    wifi: true,
    bluetooth: true,
    cellular: false,
  };

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
        className="flex items-center justify-center h-full px-2 py-1 rounded"
        style={{
          backgroundColor: `#${bgColor}`,
          color: `#${textColor}`,
        }}
      >
        <div className="flex items-center space-x-2 text-xs">
          {/* WiFi 状态 */}
          {systemStatus.wifi && (
            <div className="flex items-center">
              <span className="mr-1">📶</span>
            </div>
          )}
          
          {/* 蓝牙状态 */}
          {systemStatus.bluetooth && (
            <div className="flex items-center">
              <span className="mr-1">🔵</span>
            </div>
          )}
          
          {/* 电池状态 */}
          <div className="flex items-center">
            <span className="mr-1">
              {systemStatus.battery > 80 ? '🔋' : 
               systemStatus.battery > 50 ? '🔋' : 
               systemStatus.battery > 20 ? '🔋' : '🔋'}
            </span>
            <span>{systemStatus.battery}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
