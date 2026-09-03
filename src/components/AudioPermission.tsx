'use client';

import { useEffect, useState } from 'react';
import { FaVolumeUp, FaTimes } from 'react-icons/fa';

export default function AudioPermission() {
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if AudioContext is suspended (autoplay blocked)
    const checkAudioContext = () => {
      try {
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') {
          setShowBanner(true);
        }
        ctx.close();
      } catch (_) {}
    };

    // Check on first user interaction
    const handleInteraction = () => {
      // Resume any suspended AudioContexts
      try {
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') {
          ctx.resume().then(() => {
            setShowBanner(false);
          });
        }
        ctx.close();
      } catch (_) {}

      // Also try to resume the YouTube player if it exists
      try {
        const ytPlayer = document.querySelector('iframe[src*="youtube"]');
        if (ytPlayer) {
          (ytPlayer as HTMLIFrameElement).contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'playVideo', args: '' }),
            '*'
          );
        }
      } catch (_) {}
    };

    // Check after a short delay
    const timer = setTimeout(checkAudioContext, 1000);

    // Listen for first interaction
    document.addEventListener('click', handleInteraction, { once: true });
    document.addEventListener('keydown', handleInteraction, { once: true });
    document.addEventListener('touchstart', handleInteraction, { once: true });

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  const handleEnable = async () => {
    try {
      // Resume AudioContext
      const ctx = new AudioContext();
      await ctx.resume();
      ctx.close();

      // Play a silent audio to unlock audio
      const audio = new Audio();
      audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
      await audio.play();
      audio.pause();
      audio.remove();

      setShowBanner(false);
    } catch (_) {
      setShowBanner(false);
    }
  };

  if (dismissed || !showBanner) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] max-w-sm w-[calc(100%-2rem)]">
      <div className="glass rounded-2xl p-4 shadow-2xl shadow-black/50 border border-white/10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-600/20 flex items-center justify-center flex-shrink-0">
            <FaVolumeUp className="text-rose-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white mb-1">Enable Sound</p>
            <p className="text-xs text-gray-400 mb-3">
              Click below to enable audio playback for this site.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleEnable}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 rounded-lg text-xs font-semibold transition-all"
              >
                Enable
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="px-4 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-gray-400 transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-gray-500 hover:text-white transition-colors flex-shrink-0"
          >
            <FaTimes className="text-sm" />
          </button>
        </div>
      </div>
    </div>
  );
}
