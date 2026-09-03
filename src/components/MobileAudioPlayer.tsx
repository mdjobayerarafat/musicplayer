'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { usePlayerStore } from '@/store/playerStore';

/**
 * MobileAudioPlayer → HtmlAudioPlayer
 *
 * Plays audio from a direct URL (Appwrite-hosted MP3) using an HTML5 <audio> element.
 * Works on ALL devices — mobile and desktop — whenever currentSong.audioUrl is set.
 *
 * Falls back to fetching from /api/mobile-audio only when audioUrl is missing
 * but a youtubeVideoId exists.
 *
 * When no audioUrl is available, this component is a no-op — YouTubePlayer
 * handles playback via the YouTube iframe instead.
 */
export default function MobileAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string>('');
  const isLoadingRef = useRef<boolean>(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const {
    currentSong,
    isPlaying,
    volume,
    currentTime,
    setCurrentTime,
    setDuration,
    nextSong,
  } = usePlayerStore();

  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount (used for MediaSession & wake lock decisions)
  useEffect(() => {
    const checkMobile = () => {
      const ua = navigator.userAgent;
      const mobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
        ('ontouchstart' in window && window.innerWidth < 1024);
      setIsMobile(mobile);
    };
    checkMobile();
  }, []);

  // ── Determine if this component should be active ─────────────────────
  // Active when: audioUrl exists (MP3 in Appwrite) OR on mobile with youtubeVideoId
  const hasAudioUrl = !!(currentSong?.audioUrl && currentSong.audioUrl.trim());
  const hasYoutubeId = !!(currentSong?.youtubeVideoId && currentSong.youtubeVideoId.trim());
  const shouldPlay = hasAudioUrl || (isMobile && hasYoutubeId);

  // ── Fetch direct audio URL for YouTube songs (mobile fallback only) ──
  const fetchAudioUrl = useCallback(
    async (videoId: string): Promise<string | null> => {
      try {
        const res = await fetch('/api/mobile-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.audioUrl || null;
      } catch (e) {
        console.error('HtmlAudioPlayer: Failed to fetch audio URL', e);
        return null;
      }
    },
    []
  );

  // ── Create audio element ──────────────────────────────────────────────
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      audioRef.current = audio;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  // ── Load and play a song ──────────────────────────────────────────────
  useEffect(() => {
    if (!shouldPlay || !audioRef.current || !currentSong) return;

    const audio = audioRef.current;

    const loadAndPlay = async () => {
      // Determine the audio source
      let audioSrc = currentSong.audioUrl;

      // If no direct audio URL, fetch from YouTube (mobile fallback)
      if (!audioSrc && currentSong.youtubeVideoId) {
        if (isLoadingRef.current) return;
        isLoadingRef.current = true;

        const fetchedUrl = await fetchAudioUrl(currentSong.youtubeVideoId);
        isLoadingRef.current = false;

        if (!fetchedUrl) {
          console.warn('HtmlAudioPlayer: Could not resolve audio URL for', currentSong.youtubeVideoId);
          return;
        }
        audioSrc = fetchedUrl;
      }

      if (!audioSrc) return;

      // Don't reload if already playing this URL
      if (currentUrlRef.current === audioSrc && !audio.ended) {
        if (isPlaying) {
          audio.play().catch(() => {});
        } else {
          audio.pause();
        }
        return;
      }

      currentUrlRef.current = audioSrc;
      audio.src = audioSrc;
      audio.load();

      if (isPlaying) {
        try {
          await audio.play();
        } catch (e) {
          console.warn('HtmlAudioPlayer: autoplay blocked, waiting for user gesture');
        }
      }
    };

    loadAndPlay();
  }, [currentSong?.audioUrl, currentSong?.youtubeVideoId, currentSong?.$id, shouldPlay]);

  // ── Play/pause sync ───────────────────────────────────────────────────
  useEffect(() => {
    if (!shouldPlay || !audioRef.current) return;

    const audio = audioRef.current;

    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying, shouldPlay]);

  // ── Volume sync ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!shouldPlay || !audioRef.current) return;
    audioRef.current.volume = volume;
  }, [volume, shouldPlay]);

  // ── Seek sync (store → audio) ─────────────────────────────────────────
  useEffect(() => {
    if (!shouldPlay || !audioRef.current) return;
    const diff = Math.abs(audioRef.current.currentTime - currentTime);
    if (diff > 2) {
      audioRef.current.currentTime = currentTime;
    }
  }, [currentTime, shouldPlay]);

  // ── Audio events (time update, metadata, ended) ───────────────────────
  useEffect(() => {
    if (!shouldPlay || !audioRef.current) return;

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      nextSong();
    };

    const handleError = (e: Event) => {
      console.error('HtmlAudioPlayer error:', e);
    };

    // Resume on visibility change (mobile background playback)
    const handleVisibility = () => {
      if (!document.hidden && isPlaying && audio.paused && audio.src) {
        audio.play().catch(() => {});
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [shouldPlay, nextSong, setCurrentTime, setDuration, isPlaying]);

  // ── MediaSession API — lock screen & notification controls ─────────────
  useEffect(() => {
    if (!shouldPlay || !currentSong || !('mediaSession' in navigator)) return;

    const thumbnailUrl =
      currentSong.coverImage ||
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
      usePlayerStore.getState().prevSong();
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      usePlayerStore.getState().nextSong();
    });

    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime != null) {
        usePlayerStore.getState().setCurrentTime(details.seekTime);
      }
    });
  }, [shouldPlay, currentSong]);

  // ── Wake Lock — prevent screen sleep while playing ────────────────────
  useEffect(() => {
    if (!shouldPlay) return;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && isPlaying) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (_) {}
    };

    const releaseWakeLock = () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };

    if (isPlaying) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibility = () => {
      if (!document.hidden && isPlaying) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [shouldPlay, isPlaying]);

  // ── iOS keep-alive hack: periodically check buffering ─────────────────
  useEffect(() => {
    if (!shouldPlay || !audioRef.current) return;

    let keepAliveInterval: NodeJS.Timeout;

    if (isPlaying) {
      keepAliveInterval = setInterval(() => {
        const audio = audioRef.current;
        if (audio && !audio.paused && audio.readyState >= 2) {
          if (audio.buffered.length > 0) {
            const buffered = audio.buffered.end(audio.buffered.length - 1);
            const remaining = buffered - audio.currentTime;
            if (remaining < 10) {
              // Safety net — audio about to stall
            }
          }
        }
      }, 15000);
    }

    return () => {
      if (keepAliveInterval) clearInterval(keepAliveInterval);
    };
  }, [shouldPlay, isPlaying]);

  // Don't render anything
  return null;
}
