'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { usePlayerStore } from '@/store/playerStore';

// ── YouTube IFrame API loader (used as fallback) ──────────────────────────
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

/**
 * AudioPlayer — plays from the Appwrite bucket audioUrl via HTML5 <audio>.
 * Falls back to YouTube iframe when no audioUrl is available.
 */
export default function YouTubePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string>('');

  // YouTube refs (fallback mode)
  const ytPlayerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ytReadyRef = useRef(false);
  const lastVideoId = useRef<string>('');
  const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null);

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

  const audioUrl = currentSong?.audioUrl || '';
  const videoId = currentSong?.youtubeVideoId || '';

  // ── Mode detection ─────────────────────────────────────────────────────
  // Prefer audioUrl (Appwrite bucket) — only fall back to YouTube if unavailable
  const useAudio = !!audioUrl;

  // ── HTML5 Audio mode (Appwrite bucket) ──────────────────────────────────
  useEffect(() => {
    if (mobile || !useAudio) return;

    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audioRef.current = audio;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, [mobile, useAudio]);

  // Load and play from Appwrite bucket
  useEffect(() => {
    if (mobile || !useAudio || !audioRef.current || !currentSong) return;

    const audio = audioRef.current;
    const src = audioUrl;

    // Don't reload if already playing this URL
    if (currentUrlRef.current === src && !audio.ended) {
      if (isPlaying) audio.play().catch(() => {});
      else audio.pause();
      return;
    }

    currentUrlRef.current = src;
    audio.src = src;
    audio.load();

    if (isPlaying) {
      audio.play().catch(() => {
        // Autoplay blocked — waiting for user gesture
      });
    }
  }, [currentSong?.audioUrl, currentSong?.$id]);

  // Play/pause sync for audio mode
  useEffect(() => {
    if (mobile || !useAudio || !audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, mobile, useAudio]);

  // Volume sync for audio mode
  useEffect(() => {
    if (mobile || !useAudio || !audioRef.current) return;
    audioRef.current.volume = volume;
  }, [volume, mobile, useAudio]);

  // Seek sync for audio mode
  useEffect(() => {
    if (mobile || !useAudio || !audioRef.current) return;
    const diff = Math.abs(audioRef.current.currentTime - currentTime);
    if (diff > 2) {
      audioRef.current.currentTime = currentTime;
    }
  }, [currentTime, mobile, useAudio]);

  // Audio events for bucket mode
  useEffect(() => {
    if (mobile || !useAudio || !audioRef.current) return;

    const audio = audioRef.current;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => nextSong();
    const handleError = (e: Event) => console.error('Audio player error:', e);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [mobile, useAudio, nextSong, setCurrentTime, setDuration]);

  // ── YouTube IFrame mode (fallback when no audioUrl) ─────────────────────
  useEffect(() => {
    if (mobile || useAudio) return;

    let mounted = true;

    async function init() {
      await loadYtApi();
      if (!mounted || !containerRef.current) return;
      if (ytPlayerRef.current) return;

      const YT = (window as any).YT;
      if (!YT?.Player) {
        setTimeout(() => {
          if (mounted && containerRef.current && !ytPlayerRef.current) init();
        }, 500);
        return;
      }

      ytPlayerRef.current = new YT.Player('yt-player', {
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
        },
        events: {
          onReady: () => {
            ytReadyRef.current = true;
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
  }, [useAudio]); // Re-init when mode changes

  const loadVideo = useCallback((id: string) => {
    if (!ytPlayerRef.current || !ytReadyRef.current) return;
    if (!id || id.length !== 11) return;
    if (lastVideoId.current === id) return;

    lastVideoId.current = id;

    try {
      ytPlayerRef.current.loadVideoById({ videoId: id });
    } catch (e) {
      console.warn('Failed to load video:', id, e);
    }

    if (timeUpdateInterval.current) clearInterval(timeUpdateInterval.current);

    timeUpdateInterval.current = setInterval(() => {
      if (ytPlayerRef.current && ytReadyRef.current) {
        try {
          const ct = ytPlayerRef.current.getCurrentTime();
          const dur = ytPlayerRef.current.getDuration();
          if (ct !== undefined && ct !== null) setCurrentTime(ct);
          if (dur && dur > 0) setDuration(dur);
        } catch (_) {}
      }
    }, 500);
  }, [setCurrentTime, setDuration]);

  useEffect(() => {
    if (useAudio || mobile) return;
    if (videoId && videoId !== lastVideoId.current) {
      if (ytReadyRef.current) loadVideo(videoId);
    }
  }, [videoId, loadVideo, useAudio, mobile]);

  useEffect(() => {
    if (useAudio || mobile) return;
    if (!ytPlayerRef.current || !ytReadyRef.current) return;
    try {
      if (isPlaying) ytPlayerRef.current.playVideo();
      else ytPlayerRef.current.pauseVideo();
    } catch (_) {}
  }, [isPlaying, useAudio, mobile]);

  useEffect(() => {
    if (useAudio || mobile) return;
    if (!ytPlayerRef.current || !ytReadyRef.current) return;
    try { ytPlayerRef.current.setVolume(volume * 100); } catch (_) {}
  }, [volume, useAudio, mobile]);

  useEffect(() => {
    if (useAudio || mobile) return;
    if (!ytPlayerRef.current || !ytReadyRef.current) return;
    try {
      const pt = ytPlayerRef.current.getCurrentTime();
      if (Math.abs(pt - currentTime) > 3) ytPlayerRef.current.seekTo(currentTime, true);
    } catch (_) {}
  }, [currentTime, useAudio, mobile]);

  // Render YouTube iframe container (only when in YouTube fallback mode)
  if (useAudio || mobile) return null;

  return (
    <div ref={containerRef} className="absolute opacity-0 pointer-events-none" style={{ width: 0, height: 0 }}>
      <div id="yt-player" />
    </div>
  );
}
