'use client'
import { useThemeStore } from '@/app/(main)/store/theme';
import { useEffect, useRef, useState } from 'react';
import { focusManager } from '../focusManager';
import { ElementNavigation } from '../store/keyboard';
import { useSearchParams, useRouter } from 'next/navigation';
import { browserFS } from '@/app/utils/fs';
import { oneDrive } from '@/app/utils/onedrive';
// import LoadingOverlay from '@/app/components/common/LoadingOverlay';

declare global {
    interface Window {
        Module: any,
        FS: any,
        Buffer: any,
        exitGame: () => void,
    }
}

// Async init using BrowserFS.configure, with clean async/await flow
async function initRetroFs(platform: string, game: string): Promise<void> {
    const src = `/roms/${platform}/${game}`;
    const dst = `/home/web_user/retroarch/userdata/content/downloads/${game}`;

    // Decide data source
    const source = typeof window !== 'undefined' ? localStorage.getItem('source') : 'vfs';
    let gameBuf: Buffer;
    if (source === 'onedrive') {
        const root = localStorage.getItem('onedrive-rootdir') || '';
        const odPath = `${root}/roms/${platform}/${game}`;
        await oneDrive.init();
        if (!oneDrive.isSignedIn()) {
            throw new Error('OneDrive selected but user is not signed in');
        }
        const data = await oneDrive.readFile(odPath);
        gameBuf = Buffer.from(data);
    } else {
        gameBuf = await browserFS.readFile(src);
    }

    await browserFS.initRetroFs();

    await browserFS.writeFile(dst, gameBuf);
}

export default function PlayPage() {
    const searchParams = useSearchParams();
    const system = searchParams.get('s');
    const gameFile = searchParams.get('g');
    const { view, setView, systems } = useThemeStore();
    // const { systemId, gameFile, setSystemAndGame } = useModalStore();
    const router = useRouter();

    useEffect(() => {
        setView('play');
    }, [setView]);

    useEffect(() => {
        if (system && gameFile && view === 'play') {
            window.exitGame = () => {
                router.push('/gamelist?system=' + (system || ''));
            }
            const playElement: ElementNavigation = {
                id: 'play-canvas',
                type: 'play',
                totalItems: 0,
                selectedIndex: 0,
                canNavigate: {
                    up: false,
                    down: false,
                    left: false,
                    right: false,
                    select: false,
                    back: false,
                }
            }
            focusManager.registerElement(playElement);
        }
    return () => {
      focusManager.unregisterElement('play-canvas');
    }
    }, [view, system, gameFile]);
    return (
        <iframe src={`/laucher?s=${system}&g=${gameFile}`} className='fixed w-full h-full'></iframe>
    );
}