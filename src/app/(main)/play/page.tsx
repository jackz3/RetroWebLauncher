'use client'
import { useThemeStore } from '@/app/(main)/store/theme';
import { Suspense, useEffect } from 'react';
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
            // ✅ 移除 focusManager.registerElement - 不需要焦点管理
        }
    return () => {
      // ✅ 移除 focusManager.unregisterElement
    }
    }, [view, system, gameFile, router]);
    return (
        <iframe src={`/laucher?s=${system}&g=${gameFile}`} className='fixed w-full h-full'></iframe>
    );
}