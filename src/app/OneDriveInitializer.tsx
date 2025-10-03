'use client';

import { useEffect } from 'react';
import { oneDrive } from './utils/onedrive';

export default function OneDriveInitializer() {
  useEffect(() => {
    (async () => {
      try {
        await oneDrive.init();
      } catch (e) {
        // If env or config is missing, skip silently to avoid crashing the app
        console.warn('OneDrive init skipped:', e);
      }
    })();
  }, []);
  return null;
}
