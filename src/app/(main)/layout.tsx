import '@/app/globals.css';
import type { ReactNode } from 'react';
import { ThemeProvider } from './ThemeProvider';
import MenuModal from './components/MenuModal';
import OneDriveInitializer from './OneDriveInitializer';

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
