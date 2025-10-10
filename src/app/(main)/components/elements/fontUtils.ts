// fontUtils.ts
'use client';

// 字体缓存，避免重复处理
const fontFamilyCache = new Map<string, string>();

/**
 * Processes a font path and returns a CSS font family name
 * @param fontPath - The path to the font file
 * @returns A CSS-safe font family name or undefined if no font path provided
 */
export function processFontPath(fontPath?: string): string | undefined {
  if (!fontPath) return undefined;
  
  // 检查缓存
  if (fontFamilyCache.has(fontPath)) {
    return fontFamilyCache.get(fontPath);
  }
  
  // 创建 CSS 安全的字体族名称
  const fontFamily = `customFont_${fontPath.replace(/[^\w]/g, '_')}`;
  
  // 缓存结果
  fontFamilyCache.set(fontPath, fontFamily);
  
  return fontFamily;
}

/**
 * Generates CSS @font-face rule
 * @param fontFamily - The font family name
 * @param fontPath - The path to the font file
 * @param themeName - The theme name
 * @returns CSS @font-face rule string
 */
export function generateFontFaceRule(fontFamily: string, fontPath: string, themeName: string): string {
  return `
    @font-face {
      font-family: '${fontFamily}';
      src: url('/themes/${themeName}/${fontPath}') format('woff2'),
           url('/themes/${themeName}/${fontPath}') format('woff'),
           url('/themes/${themeName}/${fontPath}') format('truetype');
      font-display: swap;
    }
  `;
}

/**
 * Creates a style element for font loading
 * @param fontFamily - The font family name
 * @param fontPath - The path to the font file
 * @param themeName - The theme name
 * @returns HTMLStyleElement
 */
export function createFontStyleElement(fontFamily: string, fontPath: string, themeName: string): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = generateFontFaceRule(fontFamily, fontPath, themeName);
  return style;
}

/**
 * Checks if a font is already loaded
 * @param fontPath - The path to the font file
 * @param themeName - The theme name
 * @returns boolean
 */
export function isFontLoaded(fontPath: string, themeName: string): boolean {
  const fontKey = `${themeName}/${fontPath}`;
  return document.querySelector(`style[data-font="${fontKey}"]`) !== null;
}

/**
 * Marks a font as loaded
 * @param fontPath - The path to the font file
 * @param themeName - The theme name
 * @param styleElement - The style element
 */
export function markFontAsLoaded(fontPath: string, themeName: string, styleElement: HTMLStyleElement): void {
  const fontKey = `${themeName}/${fontPath}`;
  styleElement.setAttribute('data-font', fontKey);
}

