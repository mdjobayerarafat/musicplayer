'use client';

import { useEffect, useState } from 'react';
import { usePlayerStore } from '@/store/playerStore';

function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    ('ontouchstart' in window && window.innerWidth < 1024)
  );
}

export default function BackgroundPlayback() {
  const { currentSong, isPlaying, togglePlay, nextSong, prevSong } = usePlayerStore();
  const [mobile] = useState(() => isMobileDevice());

  useEffect(() => {
    if (!currentSong) return;

    // ── MediaSession API (system-level controls) ──────
    // On mobile, MobileAudioPlayer also sets MediaSession metadata.
    // We set it here too as a fallback / for desktop.
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
    // On mobile, MobileAudioPlayer handles its own visibility resume.
    // This handler focuses on the YouTube iframe (desktop) and AudioContext.
    const handleVisibility = () => {
      if (!document.hidden && isPlaying) {
        // On desktop, try to resume YouTube player
        if (!mobile) {
          try {
            const ytFrame = document.querySelector('iframe[src*="youtube"]') as HTMLIFrameElement | null;
            if (ytFrame?.contentWindow) {
              ytFrame.contentWindow.postMessage(
                JSON.stringify({ event: 'command', func: 'playVideo', args: '' }),
                '*'
              );
            }
          } catch (_) {}
        }

        // Try to resume any suspended AudioContexts
        try {
          const ctx = new AudioContext();
          if (ctx.state === 'suspended') ctx.resume();
          ctx.close();
        } catch (_) {}
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    // ── Prevent sleep/wake lock ──────────────────────
    // On mobile, MobileAudioPlayer handles wake lock.
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      if (mobile) return; // MobileAudioPlayer handles this
      try {
        if ('wakeLock' in navigator && isPlaying) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (_) {}
    };

    if (isPlaying) requestWakeLock();

    const handleWakeLock = () => {
      if (!document.hidden && isPlaying) requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleWakeLock);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('visibilitychange', handleWakeLock);
      if (wakeLock) wakeLock.release();
    };
  }, [currentSong, isPlaying, mobile]);

  return null;
}
