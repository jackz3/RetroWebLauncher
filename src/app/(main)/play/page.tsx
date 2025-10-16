'use client'
import { useThemeStore } from '@/app/(main)/store/theme';
import { Suspense, useEffect } from 'react';
import { focusManager } from '../focusManager';
import { ElementNavigation } from '../store/keyboard';
import { useSearchParams, useRouter } from 'next/navigation';

declare global {
    interface Window {
        Module: any,
        FS: any,
        Buffer: any,
        exitGame: () => void,
    }
}

export default function PlayPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center text-white">Loading...</div>}>
            <PlayPageContent />
        </Suspense>
    );
}

function PlayPageContent() {
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
                router.push('/gamelist/' + (system || ''));
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
    }, [view, system, gameFile, router]);
    return (
        <iframe src={`/laucher?s=${system}&g=${gameFile}`} className='fixed w-full h-full'></iframe>
    );
}