'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '@/store/playerStore';

// Global YouTube IFrame API state
let ytApiLoaded = false;
let ytApiLoading = false;
const ytApiCallbacks: Array<() => void> = [];

function loadYtApi(): Promise<void> {
  return new Promise((resolve) => {
    if (ytApiLoaded) {
      resolve();
      return;
    }
    
    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existingScript && !ytApiLoading) {
      ytApiLoading = true;
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    ytApiCallbacks.push(() => {
      ytApiLoaded = true;
      resolve();
    });

    // Also resolve if YT is already defined
    if (typeof window !== 'undefined' && (window as any).YT?.Player) {
      ytApiLoaded = true;
      resolve();
    }
  });
}

// This callback is called by the YouTube IFrame API
if (typeof window !== 'undefined') {
  (window as any).onYouTubeIframeAPIReady = () => {
    ytApiLoaded = true;
    ytApiCallbacks.forEach((cb) => cb());
    ytApiCallbacks.length = 0;
  };
}

export default function YouTubePlayer() {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(false);
  const lastVideoId = useRef<string>('');
  const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null);

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

  // Initialize player
  useEffect(() => {
    let mounted = true;

    async function init() {
      await loadYtApi();
      
      if (!mounted || !containerRef.current) return;
      if (playerRef.current) return;

      const YT = (window as any).YT;
      if (!YT?.Player) {
        // Retry after a short delay
        setTimeout(() => {
          if (mounted && containerRef.current && !playerRef.current) {
            init();
          }
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
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            readyRef.current = true;
            if (videoId && mounted) {
              loadVideo(videoId);
            }
          },
          onStateChange: (event: any) => {
            if (!mounted) return;
            const YT = (window as any).YT;
            
            if (event.data === YT?.PlayerState.ENDED) {
              nextSong();
            }
          },
          onError: (event: any) => {
            console.error('YouTube player error:', event.data);
          },
        },
      });
    }

    init();

    return () => {
      mounted = false;
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }
    };
  }, []);

  const loadVideo = useCallback((id: string) => {
    if (!playerRef.current || !readyRef.current) return;
    if (lastVideoId.current === id) return;
    
    lastVideoId.current = id;
    playerRef.current.loadVideoById(id);

    // Start time update polling
    if (timeUpdateInterval.current) {
      clearInterval(timeUpdateInterval.current);
    }
    
    timeUpdateInterval.current = setInterval(() => {
      if (playerRef.current && readyRef.current) {
        try {
          const currentTime = playerRef.current.getCurrentTime();
          const duration = playerRef.current.getDuration();
          if (currentTime !== undefined) setCurrentTime(currentTime);
          if (duration && duration > 0) setDuration(duration);
        } catch (e) {
          // Player not ready yet
        }
      }
    }, 250);
  }, [setCurrentTime, setDuration]);

  // Load new video when song changes
  useEffect(() => {
    if (videoId && videoId !== lastVideoId.current) {
      if (readyRef.current) {
        loadVideo(videoId);
      }
    }
  }, [videoId, loadVideo]);

  // Play/pause sync
  useEffect(() => {
    if (!playerRef.current || !readyRef.current) return;

    try {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch (e) {
      // Player not ready
    }
  }, [isPlaying]);

  // Volume sync
  useEffect(() => {
    if (!playerRef.current || !readyRef.current) return;

    try {
      playerRef.current.setVolume(volume * 100);
    } catch (e) {
      // Player not ready
    }
  }, [volume]);

  // Seek sync (from store to player)
  useEffect(() => {
    if (!playerRef.current || !readyRef.current) return;

    try {
      const playerTime = playerRef.current.getCurrentTime();
      if (Math.abs(playerTime - currentTime) > 2) {
        playerRef.current.seekTo(currentTime, true);
      }
    } catch (e) {
      // Player not ready
    }
  }, [currentTime]);

  return (
    <div ref={containerRef} className="absolute opacity-0 pointer-events-none" style={{ width: 0, height: 0 }}>
      <div id="yt-player" />
    </div>
  );
}
