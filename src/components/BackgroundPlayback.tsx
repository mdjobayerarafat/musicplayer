'use client';

import { useEffect } from 'react';
import { usePlayerStore } from '@/store/playerStore';

export default function BackgroundPlayback() {
  const { currentSong, isPlaying, togglePlay, nextSong, prevSong } = usePlayerStore();

  useEffect(() => {
    if (!currentSong) return;

    // ── MediaSession API (system-level controls) ──────
    if ('mediaSession' in navigator) {
      const thumbnailUrl = currentSong.coverImage ||
        (currentSong.youtubeVideoId
          ? `https://i.ytimg.com/vi/${currentSong.youtubeVideoId}/mqdefault.jpg`
          : '');

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: 'Freebuff',
        artwork: thumbnailUrl
          ? [{ src: thumbnailUrl, sizes: '512x512', type: 'image/jpeg' }]
          : [],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        usePlayerStore.getState().play();
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        usePlayerStore.getState().pause();
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        prevSong();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        nextSong();
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime != null) {
          usePlayerStore.getState().setCurrentTime(details.seekTime);
        }
      });
    }

    // ── Visibility change — resume audio when tab comes back ──
    const handleVisibility = () => {
      if (!document.hidden && isPlaying) {
        // Try to resume YouTube player
        try {
          const ytFrame = document.querySelector('iframe[src*="youtube"]') as HTMLIFrameElement | null;
          if (ytFrame?.contentWindow) {
            ytFrame.contentWindow.postMessage(
              JSON.stringify({ event: 'command', func: 'playVideo', args: '' }),
              '*'
            );
          }
        } catch (_) {}

        // Try to resume AudioContext
        try {
          const ctx = new AudioContext();
          if (ctx.state === 'suspended') ctx.resume();
          ctx.close();
        } catch (_) {}
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    // ── Prevent sleep/wake lock ──────────────────────
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && isPlaying) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (_) {}
    };

    if (isPlaying) requestWakeLock();

    // Re-request wake lock when tab becomes visible
    const handleWakeLock = () => {
      if (!document.hidden && isPlaying) requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleWakeLock);

    // ── Service Worker registration for background audio ──
    if ('serviceWorker' in navigator && !navigator.serviceWorker.controller) {
      // Register a minimal service worker for background audio
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('visibilitychange', handleWakeLock);
      if (wakeLock) wakeLock.release();
    };
  }, [currentSong, isPlaying]);

  return null;
}
