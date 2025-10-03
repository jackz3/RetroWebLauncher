'use client';

import { useEffect, useRef } from 'react';
import { processFontPath } from '../components/elements/fontUtils';

interface FontInfo {
  fontFamily: string;
  fontPath: string;
  themeName: string;
}

// 全局字体缓存，记录已加载的字体和引用计数
const fontCache = new Map<string, { style: HTMLStyleElement; refCount: number }>();

/**
 * Hook for loading custom fonts
 * @param fontPath - The path to the font file
 * @param themeName - The theme name
 * @returns The CSS font family name
 */
export function useFontLoader(fontPath?: string, themeName?: string): string | undefined {
  const fontFamily = processFontPath(fontPath);
  const fontKey = `${themeName}/${fontPath}`;
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!fontPath || !themeName || !fontFamily) {
      return;
    }

    // 如果字体已经在缓存中，增加引用计数
    if (fontCache.has(fontKey)) {
      const cached = fontCache.get(fontKey)!;
      cached.refCount++;
      isInitialized.current = true;
      return;
    }

    // 创建新的字体样式
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: '${fontFamily}';
        src: url('/themes/${themeName}/${fontPath}') format('woff2'),
             url('/themes/${themeName}/${fontPath}') format('woff'),
             url('/themes/${themeName}/${fontPath}') format('truetype');
        font-display: swap;
      }
    `;

    // 添加到 head
    document.head.appendChild(style);

    // 缓存字体信息
    fontCache.set(fontKey, { style, refCount: 1 });
    isInitialized.current = true;

    // 清理函数
    return () => {
      if (!isInitialized.current) return;

      const cached = fontCache.get(fontKey);
      if (cached) {
        cached.refCount--;
        
        // 如果引用计数为0，移除字体样式
        if (cached.refCount <= 0) {
          if (document.head.contains(cached.style)) {
            document.head.removeChild(cached.style);
          }
          fontCache.delete(fontKey);
        }
      }
    };
  }, [fontPath, themeName, fontFamily, fontKey]);

  return fontFamily;
}

/**
 * Component for preloading fonts
 * @param fonts - Array of font information
 */
export function FontPreloader({ fonts }: { fonts: FontInfo[] }) {
  useEffect(() => {
    fonts.forEach(({ fontFamily, fontPath, themeName }) => {
      const fontKey = `${themeName}/${fontPath}`;
      
      // 如果字体还没有加载，预加载它
      if (!fontCache.has(fontKey)) {
        const style = document.createElement('style');
        style.textContent = `
          @font-face {
            font-family: '${fontFamily}';
            src: url('/themes/${themeName}/${fontPath}') format('woff2'),
                 url('/themes/${themeName}/${fontPath}') format('woff'),
                 url('/themes/${themeName}/${fontPath}') format('truetype');
            font-display: swap;
          }
        `;
        document.head.appendChild(style);
        fontCache.set(fontKey, { style, refCount: 1 });
      } else {
        // 如果已经加载，增加引用计数
        const cached = fontCache.get(fontKey)!;
        cached.refCount++;
      }
    });

    // 清理函数
    return () => {
      fonts.forEach(({ fontPath, themeName }) => {
        const fontKey = `${themeName}/${fontPath}`;
        const cached = fontCache.get(fontKey);
        if (cached) {
          cached.refCount--;
          if (cached.refCount <= 0) {
            if (document.head.contains(cached.style)) {
              document.head.removeChild(cached.style);
            }
            fontCache.delete(fontKey);
          }
        }
      });
    };
  }, [fonts]);

  return null;
}
