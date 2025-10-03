'use client'
import { useThemeStore } from '@/app/store/theme';
import { useEffect } from 'react';
import { EmscriptenFS } from 'browserfs'
import { focusManager } from '../focusManager';
import { ElementNavigation } from '../store/keyboard';
import { useSearchParams, useRouter } from 'next/navigation';
import { browserFS } from '../utils/fs';
import { oneDrive } from '../utils/onedrive';

declare global {
    interface Window {
        Module: any,
        FS: any,
        Buffer: any,
        exitGame: Function,
    }
}

// Async init using BrowserFS.configure, with clean async/await flow
async function initRetroFs(platform: string, game: string): Promise<void> {
    const src = `/${platform}/${game}`;
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

    const BFS = new EmscriptenFS(window.Module.FS, window.Module.PATH, window.Module.ERRNO_CODES);
    window.Module.FS.mount(BFS, { root: '/home' }, '/home');
    console.log('WEBPLAYER: BrowserFS configured and mounted for RetroArch');
}

export default function PlayPage() {
    const searchParams = useSearchParams();
    const system = searchParams.get('s');
    const gameFile = searchParams.get('g');
    const { view, setView, systems } = useThemeStore();
    // const { systemId, gameFile, setSystemAndGame } = useModalStore();
    const router = useRouter();

    function initModule() {
        window.Module = {
            noInitialRun: true,
            arguments: ["-v", "--menu"],
            encoder: new TextEncoder(),
            message_queue: [],
            message_out: [],
            message_accum: "",
            retroArchSend: function (msg: any) {
                this.EmscriptenSendCommand(msg);
            },
            retroArchRecv: function () {
                return this.EmscriptenReceiveCommandReply();
            },
            onRuntimeInitialized: function () {
            },
            print: function (text: string) {
                console.log(text);
            },
            printErr: async function (text: string) {
                console.log(text);
                if (text === '[INFO] [Core]: Unloading core symbols..') {
                    console.log('Game exited');
                    await browserFS.reset();
                    router.push('/gamelist?system=' + (system || ''));
                    window.onbeforeunload = null;
                }
            },
            canvas: document.getElementById('canvas'),
            totalDependencies: 0,
            monitorRunDependencies: function (left: number) {
                this.totalDependencies = Math.max(this.totalDependencies, left);
            }
        }
    }
    useEffect(() => {
        setView('play');
    }, [setView]);

    useEffect(() => {
        if (system && gameFile && view === 'play') {
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
            const core = systems[system];// 'snes9x';
            console.log('Starting game', system, gameFile, core);
            initModule()
            window.Module.arguments = navigator.userAgent.indexOf('Chrome') > 0 ? ['-v', `/home/web_user/retroarch/userdata/content/downloads/${gameFile}`] : ["-v", "--menu"]
            window.Module.onRuntimeInitialized = async () => {
                // Initialize BrowserFS mounts and copy the selected game
                await initRetroFs(system, gameFile);
                window.onbeforeunload = function () {
                    return "Dude, are you sure you want to leave?";
                }
                window.Module.canvas.focus();
                window.Module.canvas.addEventListener("pointerdown", function () {
                    window.Module.canvas.focus();
                }, false);
                window.Module['callMain'](window.Module['arguments']);
            }
            import(`../../../public/cores/${core}_libretro.js`)
                .then((script: any) => {
                    script.default(window.Module)
                        .then((mod: any) => {
                            console.log('Core loaded', mod);
                            window.Module = mod;
                        }).catch((err: any) => {
                            console.error("Couldn't instantiate module", err);
                            throw err;
                        })
                }).catch(err => {
                    console.error("Couldn't load script", err);
                    throw err;
                });
        }
    return () => {
      focusManager.unregisterElement('play-canvas');
    }
    }, [view, system, gameFile]);
    return (
        <canvas id="canvas" tabIndex={1} style={{ width: '100vw', height: '100vh', zIndex: 99999, display: view === 'play' ? 'block' : 'none' }} onContextMenu={(event) => event.preventDefault()}></canvas>
    );
}