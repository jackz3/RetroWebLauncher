import '@/app/globals.css';
import type { ReactNode } from 'react';
import cores from '@/app/cores.json';
import { ThemeProvider } from './ThemeProvider';
import MenuModal from './components/MenuModal';
import OneDriveInitializer from './OneDriveInitializer';
import type { Metadata } from 'next'
 
export const metadata: Metadata = {
  title: 'Retro Web Launcher',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <OneDriveInitializer />
          {children}
          <MenuModal />
        </ThemeProvider>
      </body>
    </html>
  );
}

export async function generateStaticParams() {
  return Object.keys(cores).map((system) => ({ system }));
}