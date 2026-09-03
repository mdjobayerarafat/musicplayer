'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { usePlayerStore } from '@/store/playerStore';

let ytApiLoaded = false;
let ytApiLoading = false;
const ytApiCallbacks: Array<() => void> = [];

function loadYtApi(): Promise<void> {
  return new Promise((resolve) => {
    if (ytApiLoaded) { resolve(); return; }

    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existingScript && !ytApiLoading) {
      ytApiLoading = true;
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    ytApiCallbacks.push(() => { ytApiLoaded = true; resolve(); });

    if (typeof window !== 'undefined' && (window as any).YT?.Player) {
      ytApiLoaded = true;
      resolve();
    }
  });
}

if (typeof window !== 'undefined') {
  (window as any).onYouTubeIframeAPIReady = () => {
    ytApiLoaded = true;
    ytApiCallbacks.forEach((cb) => cb());
    ytApiCallbacks.length = 0;
  };
}

function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    ('ontouchstart' in window && window.innerWidth < 1024)
  );
}

export default function YouTubePlayer() {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(false);
  const lastVideoId = useRef<string>('');
  const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  // Skip YouTube iframe on mobile — MobileAudioPlayer handles it
  const [mobile] = useState(() => isMobileDevice());

  const {
    currentSong,
    isPlaying,
    volume,
    currentTime,
    setCurrentTime,
    setDuration,
    nextSong,
  } = usePlayerStore();

  const videoId = currentSong?.youtubeVideoId || '';

  // On mobile, MobileAudioPlayer handles playback — don't initialize YouTube iframe
  useEffect(() => {
    if (mobile) return;

    let mounted = true;

    async function init() {
      await loadYtApi();
      if (!mounted || !containerRef.current) return;
      if (playerRef.current) return;

      const YT = (window as any).YT;
      if (!YT?.Player) {
        setTimeout(() => {
          if (mounted && containerRef.current && !playerRef.current) init();
        }, 500);
        return;
      }

      playerRef.current = new YT.Player('yt-player', {
        height: '0',
        width: '0',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          rel: 0,
          // NO origin param — YouTube auto-detects it
          // This avoids error 2 when origin doesn't match
        },
        events: {
          onReady: () => {
            readyRef.current = true;
            if (videoId && mounted) loadVideo(videoId);
          },
          onStateChange: (event: any) => {
            if (!mounted) return;
            if (event.data === YT?.PlayerState?.ENDED) nextSong();
          },
          onError: (event: any) => {
            console.warn('YouTube error:', event.data);
          },
        },
      });
    }

    init();

    return () => {
      mounted = false;
      if (timeUpdateInterval.current) clearInterval(timeUpdateInterval.current);
    };
  }, []);

  const loadVideo = useCallback((id: string) => {
    if (!playerRef.current || !readyRef.current) return;
    if (!id || id.length !== 11) return; // Validate video ID
    if (lastVideoId.current === id) return;

    lastVideoId.current = id;

    try {
      playerRef.current.loadVideoById({ videoId: id });
    } catch (e) {
      console.warn('Failed to load video:', id, e);
    }

    if (timeUpdateInterval.current) clearInterval(timeUpdateInterval.current);

    timeUpdateInterval.current = setInterval(() => {
      if (playerRef.current && readyRef.current) {
        try {
          const ct = playerRef.current.getCurrentTime();
          const dur = playerRef.current.getDuration();
          if (ct !== undefined && ct !== null) setCurrentTime(ct);
          if (dur && dur > 0) setDuration(dur);
        } catch (_) {}
      }
    }, 500);
  }, [setCurrentTime, setDuration]);

  useEffect(() => {
    if (videoId && videoId !== lastVideoId.current) {
      if (readyRef.current) loadVideo(videoId);
    }
  }, [videoId, loadVideo]);

  useEffect(() => {
    if (!playerRef.current || !readyRef.current) return;
    try {
      if (isPlaying) playerRef.current.playVideo();
      else playerRef.current.pauseVideo();
    } catch (_) {}
  }, [isPlaying]);

  useEffect(() => {
    if (!playerRef.current || !readyRef.current) return;
    try { playerRef.current.setVolume(volume * 100); } catch (_) {}
  }, [volume]);

  useEffect(() => {
    if (!playerRef.current || !readyRef.current) return;
    try {
      const pt = playerRef.current.getCurrentTime();
      if (Math.abs(pt - currentTime) > 3) playerRef.current.seekTo(currentTime, true);
    } catch (_) {}
  }, [currentTime]);

  return (
    <div ref={containerRef} className="absolute opacity-0 pointer-events-none" style={{ width: 0, height: 0 }}>
      <div id="yt-player" />
    </div>
  );
}
