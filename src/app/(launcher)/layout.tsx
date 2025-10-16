import '@/app/globals.css';
import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>Retro Web Launcher</title>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
