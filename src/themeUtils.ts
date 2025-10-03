export interface ThemeJson {
  name: string;
  variables: any;
  capabilities: any;
  views: any[];
  assets: any;
  variant?: Array<{ name: string; views?: any[]; variables?: any }>;
  aspectRatio?: Array<{ name: string; views?: any[]; variables?: any }>;
}

export async function getThemeJson(themeName: string): Promise<ThemeJson> {
  const res = await fetch(`/themes/${themeName}.json`);
  if (!res.ok) throw new Error('Theme not found');
  return res.json();
}

export function getViewElements(
  themeJson: ThemeJson,
  viewName: string,
  currentVariant: string,
  currentAspectRatio: string,
  currentColorScheme: string
): { elements: any[]; variables: any } {
  const baseView = themeJson.views.find(v => v.name === viewName);
  let elements = baseView ? JSON.parse(JSON.stringify(baseView.elements)) : []; // Deep copy to avoid modifying original themeJson
  let mergedVariables = { ...themeJson.variables };

  // Merge color scheme-specific variables
  if (currentColorScheme && themeJson.variables?.colorSchemes?.[currentColorScheme]) {
    mergedVariables = { ...mergedVariables, ...themeJson.variables.colorSchemes[currentColorScheme] };
  }

  // Merge variant-specific variables and elements
  const variantConfig = themeJson.variant?.find((v: any) => v.name.split(',').includes(currentVariant));
  if (variantConfig) {
    mergedVariables = { ...mergedVariables, ...variantConfig.variables };
    const variantView = variantConfig.views?.find(v => v.name === viewName);
    if (variantView) {
      variantView.elements.forEach((variantElement: any) => {
        const existingElementIndex = elements.findIndex((el: any) => el.name === variantElement.name);
        if (existingElementIndex !== -1) {
          elements[existingElementIndex].properties = {
            ...elements[existingElementIndex].properties,
            ...variantElement.properties,
          };
        } else {
          elements.push(variantElement);
        }
      });
    }
  }

  // Merge aspect ratio-specific variables and elements
  const aspectRatioConfig = themeJson.aspectRatio?.find((ar: any) =>
    ar.name.split(',').includes(currentAspectRatio)
  );
  if (aspectRatioConfig) {
    mergedVariables = { ...mergedVariables, ...aspectRatioConfig.variables };
    const aspectRatioView = aspectRatioConfig.views?.find(v => v.name === viewName);
    if (aspectRatioView) {
      aspectRatioView.elements.forEach((aspectRatioElement: any) => {
        const existingElementIndex = elements.findIndex(
          (el: any) => el.name === aspectRatioElement.name
        );
        if (existingElementIndex !== -1) {
          elements[existingElementIndex].properties = {
            ...elements[existingElementIndex].properties,
            ...aspectRatioElement.properties,
          };
        } else {
          elements.push(aspectRatioElement);
        }
      });
    }
  }

  // 互斥与唯一性处理：textlist、carousel、grid 只能三选一且只保留最后出现的一个
  const mutuallyExclusiveTypes = ['textlist', 'carousel', 'grid'];
  let lastIdx: Record<string, number> = {};
  elements.forEach((el: any, idx: number) => {
    if (mutuallyExclusiveTypes.includes(el.type)) {
      lastIdx[el.type] = idx;
    }
  });
  // 找到三者中最后出现的那个
  let lastType = null;
  let lastTypeIdx = -1;
  for (const type of mutuallyExclusiveTypes) {
    if (typeof lastIdx[type] === 'number' && lastIdx[type] > lastTypeIdx) {
      lastType = type;
      lastTypeIdx = lastIdx[type];
    }
  }
  if (lastType !== null) {
    // 只保留最后出现的那个，移除其它两个类型
    elements = elements.filter((el: any, idx: number) => {
      if (!mutuallyExclusiveTypes.includes(el.type)) return true;
      return el.type === lastType && idx === lastTypeIdx;
    });
  }
  return { elements, variables: mergedVariables };
}

// 默认值参考 ES-DE 主题文档，可根据需要扩展
const elementDefaults: Record<string, any> = {
  image: {
    pos: '0 0',
    size: '1 1',
    origin: '0 0',
    tile: false,
    color: 'FFFFFFFF',
    gradientType: 'horizontal',
    zIndex: 30,
  },
  textlist: {
    pos: '0 0.1',
    size: '1 0.8',
    origin: '0 0',
    fontPath: '',
    fontSize: '0.045',
    lineSpacing: '1.5',
    selectorColor: '00000000',
    selectedBackgroundColor: 'fafafa',
    selectedColor: 'ffffff',
    selectedSecondaryColor: 'ffffff',
    primaryColor: 'ffffff',
    secondaryColor: 'cccccc',
    selectedBackgroundCornerRadius: '0.05',
    letterCaseAutoCollections: 'capitalize',
    zIndex: 50,
  },
  carousel: {
    pos: '0 0.38378',
    size: '1 0.2324',
    origin: '0 0',
    type: 'horizontal',
    maxItemCount: '3',
    itemSize: '0.25 0.155',
    itemScale: '1.2',
    imageFit: 'contain',
    imageCornerRadius: '0',
    imageColor: 'FFFFFFFF',
    imageSelectedColor: 'FFFFFFFF',
    selectedItemOffset: '0 0', // [0,0]
    textColor: '000000FF',
    textSelectedColor: '000000FF',
    textBackgroundColor: 'FFFFFF00',
    textSelectedBackgroundColor: 'FFFFFF00',
    fontSize: '0.085',
    unfocusedItemOpacity: '0.5',
    unfocusedItemSaturation: '1',
    unfocusedItemDimming: '1',
    fastScrolling: 'false',
    color: 'FFFFFFD8', // Background panel color/gradient
    colorEnd: 'FFFFFFD8', // Background panel color/gradient
    text: '', // Fallback text when no image is found (system view)
    zIndex: 50,
  },
  grid: {
    pos: '0 0',
    size: '1 1',
    origin: '0 0',
    zIndex: 50,
  },
  text: {
    pos: '0 0',
    size: '1 1',
    origin: '0 0',
    color: 'ffffff',
    zIndex: 40,
  },
  video: {
    pos: '0 0',
    size: '1 1',
    origin: '0 0',
    zIndex: 30,
  },
  animation: {
    pos: '0 0',
    size: '1 1',
    origin: '0 0',
    zIndex: 35,
  },
  datetime: {
    pos: '0 0',
    size: '1 1',
    origin: '0 0',
    zIndex: 40,
  },
  rating: {
    pos: '0 0',
    size: '1 1',
    origin: '0 0',
    zIndex: 45,
  },
  clock: {
    pos: '0 0',
    size: '0 0',
    origin: '0 0',
    color: 'cccccc',
    backgroundColor: '222222',
    opacity: 1,
    zIndex: 40,
  },
  systemstatus: {
    pos: '0.982 0.016',
    size: '1 0.035',
    origin: '1 0',
    color: 'cccccc',
    backgroundColor: '222222',
    zIndex: 40,
  },
  helpsystem: {
    pos: '0.012 0.9515',
    origin: '0 0',
    textColor: '777777FF',
    iconColor: '777777FF',
    backgroundColor: 'transparent',
    zIndex: 999, // helpsystem 总是渲染在最上层
  },
};

export function getElementDefaultProps(type: string) {
  return elementDefaults[type] || {};
}
