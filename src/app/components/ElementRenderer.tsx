'use client';
import dynamic from 'next/dynamic';
import ImageElement from './elements/ImageElement';
import TextListElement from './elements/TextListElement';
import TextElement from './elements/TextElement';
// import ClockElement from './elements/ClockElement';
// import SystemStatusElement from './elements/SystemStatusElement';
import HelpSystemElement from './elements/HelpSystemElement';

const CarouselElement = dynamic(() => import('./elements/CarouselElement'), { ssr: false });
const GridElement = dynamic(() => import('./elements/GridElement'), { ssr: false });

interface ElementRendererProps {
  element: any;
  themeVariables?: any;
  themeName?: string;
  items?: Array<{ name: string; [key: string]: any }>;
  item?: { name: string; [key: string]: any };
  selectedIndex?: number;
  onItemSelect?: (index: number) => void;
  onBack?: () => void;
  view: 'system' | 'gamelist' | 'menu';
}

export default function ElementRenderer({
  element,
  themeVariables = {},
  themeName = '',
  selectedIndex = 0,
  items = [],
  item = undefined,
  onItemSelect,
  onBack,
  view,
}: ElementRendererProps) {
  const { type } = element;
  const { scope } = element.properties

  // 检查 scope 是否匹配当前视图
  if (view !== 'menu' && scope === 'menu') {
    return null;
  }

  // Function to replace variables in properties
  const replaceVariables = (properties: any, variables: any): any => {
    const newProperties: any = {};
    for (const key in properties) {
      if (Object.prototype.hasOwnProperty.call(properties, key)) {
        let value = properties[key];
        if (typeof value === 'string') {
          value = value.replace(/\${(\w+)}/g, (match, varName) => {
            return variables[varName] !== undefined ? variables[varName] : match;
          });
        } else if (typeof value === 'object' && value !== null) {
          value = replaceVariables(value, variables); // Recursively handle nested objects
        }
        newProperties[key] = value;
      }
    }
    return newProperties;
  };

  // Pre-process element properties to replace variables
  const processedElement = {
    ...element,
    properties: replaceVariables(element.properties, themeVariables),
  };

  // 根据元素类型渲染对应组件
  switch (type) {
    case 'image':
      return <ImageElement element={processedElement} themeVariables={themeVariables} themeName={themeName} />;
    
    case 'text':
      return <TextElement element={processedElement} themeVariables={themeVariables} themeName={themeName} item={item} />;
    case 'carousel':
      return (
        <CarouselElement
          element={processedElement}
          themeVariables={themeVariables}
          themeName={themeName}
          items={items}
          selectedIndex={selectedIndex}
          onItemSelect={onItemSelect}
          onBack={onBack}
          view={view}
        />
      );

    case 'textlist':
      return (
        <TextListElement
          element={processedElement}
          themeVariables={themeVariables}
          items={items}
          selectedIndex={selectedIndex}
          onItemSelect={onItemSelect}
          onBack={onBack}
          themeName={themeName}
        />
      );
    
    case 'grid':
      return (
        <GridElement
          element={processedElement}
          themeVariables={themeVariables}
          themeName={themeName}
          items={items}
          selectedIndex={selectedIndex}
          onItemSelect={onItemSelect}
          onBack={onBack}
          view={view}
        />
      );
    
    case 'clock':
    case 'systemstatus':
      return null;
    case 'helpsystem':
      return <HelpSystemElement
          element={processedElement}
          themeVariables={themeVariables}
       />
    
    default:
      // 未知元素类型，显示调试信息
      return (
        <div
          className="absolute border-2 border-red-500 bg-red-100 text-red-800 p-2 text-xs"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 9999,
          }}
        >
          <div>Unknown element type: {type}</div>
          <div>Name: {element.name}</div>
        </div>
      );
  }
}
