'use client';

import { useEffect, useState } from 'react';

interface DebugInfoOverlayProps {
  themeName: string;
  elementsCount: number;
  selectedLabel: string;
}

export default function DebugInfoOverlay({ themeName, elementsCount, selectedLabel }: DebugInfoOverlayProps) {
  const [userAgent, setUserAgent] = useState('');
  const [gamepadId, setGamepadId] = useState('');

  useEffect(() => {
    if (typeof navigator === 'undefined') return;

    const updateGamepad = () => {
      const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
      const firstPad = pads.find((pad) => Boolean(pad));
      setGamepadId(firstPad?.id || '');
    };

    setUserAgent(navigator.userAgent);
    updateGamepad();

    window.addEventListener('gamepadconnected', updateGamepad);
    window.addEventListener('gamepaddisconnected', updateGamepad);
    return () => {
      window.removeEventListener('gamepadconnected', updateGamepad);
      window.removeEventListener('gamepaddisconnected', updateGamepad);
    };
  }, []);

  return (
    <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white p-4 rounded text-sm">
      <div>UA: {userAgent || 'N/A'}</div>
      <div>Gamepad: {gamepadId || 'N/A'}</div>
      <div>Theme: {themeName}</div>
      <div>Elements: {elementsCount}</div>
      <div>Selected: {selectedLabel}</div>
    </div>
  );
}
