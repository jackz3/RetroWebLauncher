// FsImage.tsx
'use client';
import React from 'react';
import { browserFS } from '@/app/utils/fs';

type FsImageProps = {
  system: string;
  name: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  // Optional override: provide explicit candidate paths (absolute in BrowserFS)
  candidates?: string[];
  // Optional mime type (default: image/png)
  mimeType?: string;
};

/**
 * FsImage loads an image from BrowserFS and renders it via an object URL.
 * It tries a set of candidate paths until one succeeds. Cleans up URL on unmount.
 */
export default function FsImage({ system, name, alt = '', className, style, candidates, mimeType = 'image/png' }: FsImageProps) {
  const [url, setUrl] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    let mounted = true;
    let objectUrl: string | undefined;

    async function load() {
      try {
        await browserFS.init();
        const paths = candidates && candidates.length > 0
          ? candidates
          : [
              `/media/screenshots/${system}/${name}.png`,
            //   `/media/${system}/screenshots/${name}.png`,
            ];
        for (const p of paths) {
          try {
            const buf = await browserFS.readFile(p);
            const blob = new Blob([buf as any], { type: mimeType });
            objectUrl = URL.createObjectURL(blob);
            break;
          } catch {
            // try next
          }
        }
      } finally {
        if (mounted) setUrl(objectUrl);
      }
    }

    load();
    return () => {
      mounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [system, name, mimeType, JSON.stringify(candidates)]);

  if (!url) return null;
  return <img src={url} alt={alt} className={className} style={style} />;
}
